const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configura a conexão com o PostgreSQL usando DATABASE_URL do Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões no Railway
  }
});

// Inserir abastecimento
router.post('/abastecimento', async (req, res) => {
  const {
    tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
    lote, pesodescarte, observacoes, centrallimpa, muitostambores, avaliacao, user
  } = req.body;

  // Validação básica
  if (!tinta || !pesobruto || !pesoliquido || !quantidadeabastecida || !embalagem || !user) {
    return res.status(400).json({ mensagem: 'Campos obrigatórios faltando' });
  }

  const query = `
    INSERT INTO abastecimentos (
      tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
      lote, pesodescarte, observacoes, centrallimpa, muitostambores, avaliacao, "user"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `;

  try {
    await pool.query(query, [
      tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
      lote || null, pesodescarte || 0, observacoes || '', !!centrallimpa,
      !!muitostambores, avaliacao || 0, user.toUpperCase()
    ]);
    res.status(200).json({ mensagem: 'Abastecimento inserido com sucesso' });
  } catch (err) {
    console.error('Erro ao inserir abastecimento:', err.message);
    res.status(500).json({ mensagem: 'Erro ao inserir abastecimento' });
  }
});

// Inserir medição
router.post('/medicao', async (req, res) => {
  const { yellow, magenta, cyan, black, hora, user, estoque } = req.body;

  // Validação básica
  if (
    yellow === undefined || magenta === undefined ||
    cyan === undefined || black === undefined || !hora || !user ||
    !estoque?.offset || !estoque?.plana ||
    estoque.offset.amarelo === undefined || estoque.offset.magenta === undefined ||
    estoque.offset.ciano === undefined || estoque.offset.preto === undefined ||
    estoque.plana.amarelo === undefined || estoque.plana.magenta === undefined ||
    estoque.plana.ciano === undefined || estoque.plana.preto === undefined
  ) {
    return res.status(400).json({ mensagem: 'Dados incompletos' });
  }

  try {
    // Iniciar transação
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Inserir medição
      const insertMedicao = `
        INSERT INTO medicoes (
          yellow, magenta, cyan, black, hora, "user"
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(insertMedicao, [
        yellow, magenta, cyan, black, hora, user.toUpperCase()
      ]);

      // Inserir estoque offset
      const insertOffset = `
        INSERT INTO estoque_offset (
          amarelo, magenta, ciano, preto, hora, "user"
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(insertOffset, [
        estoque.offset.amarelo, estoque.offset.magenta,
        estoque.offset.ciano, estoque.offset.preto,
        hora, user.toUpperCase()
      ]);

      // Inserir estoque plana
      const insertPlana = `
        INSERT INTO estoque_plana (
          amarelo, magenta, ciano, preto, hora, "user"
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(insertPlana, [
        estoque.plana.amarelo, estoque.plana.magenta,
        estoque.plana.ciano, estoque.plana.preto,
        hora, user.toUpperCase()
      ]);

      await client.query('COMMIT');
      res.status(200).json({ mensagem: 'Medição inserida com sucesso' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro ao inserir medição:', err.message);
      res.status(500).json({ mensagem: 'Erro ao inserir medição' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao conectar ao banco:', err.message);
    res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

// Buscar todos os abastecimentos
router.get('/abastecimentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM abastecimentos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar abastecimentos:', err.message);
    res.status(500).json({ mensagem: 'Erro ao buscar abastecimentos' });
  }
});

// Buscar todas as medições
router.get('/medicoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicoes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar medicoes:', err.message);
    res.status(500).json({ mensagem: 'Erro ao buscar medicoes' });
  }
});

// Buscar todo o estoque offset
router.get('/estoque_offset', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estoque_offset ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar estoque offset:', err.message);
    res.status(500).json({ mensagem: 'Erro ao buscar estoque offset' });
  }
});

// Buscar todo o estoque plana
router.get('/estoque_plana', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estoque_plana ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar estoque plana:', err.message);
    res.status(500).json({ mensagem: 'Erro ao buscar estoque plana' });
  }
});

// Enviar relatório por e-mail
router.post('/send-report', async (req, res) => {
  const { subject, html, attachments } = req.body;

  if (!subject || !html) {
    return res.status(400).json({ mensagem: 'Assunto e conteúdo HTML são obrigatórios' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"Controle de Tintas" <procedimentos@esdeva.com.br>',
      to: 'andrey.souza@esdeva.com.br, arthur.oliveira@esdeva.com.br,salatiel.silva@esdeva.com.br,compras@esdeva.com.br,planejamento@esdeva.com.br,programacao@esdeva.com.br,almoxarifado3@esdeva.com.br,guilherme.bento@esdeva.com.br',
      subject,
      html,
      attachments
    });

    res.status(200).json({ mensagem: 'E-mail enviado com sucesso' });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err.message);
    res.status(500).json({ mensagem: 'Falha ao enviar e-mail' });
  }
});

module.exports = router;