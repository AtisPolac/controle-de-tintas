const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();


// Conecta ao banco
const path = require('path');
const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);


// Inserir abastecimento
router.post('/abastecimento', (req, res) => {
  const {
    tinta, pesoBruto, pesoLiquido, quantidadeAbastecida, embalagem,
    lote, pesoDescarte, observacoes, centralLimpa, muitosTambores, avaliacao, user
  } = req.body;

  const stmt = `
    INSERT INTO abastecimentos (
      tinta, pesoBruto, pesoLiquido, quantidadeAbastecida, embalagem,
      lote, pesoDescarte, observacoes, centralLimpa, muitosTambores, avaliacao, user
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(stmt, [
    tinta, pesoBruto, pesoLiquido, quantidadeAbastecida, embalagem,
    lote, pesoDescarte || 0, observacoes || '', centralLimpa ? 1 : 0,
    muitosTambores ? 1 : 0, avaliacao || 0, (user || '').toUpperCase() // Converte o usuário para maiúsculo
  ], function(err) {
    if (err) return res.status(500).send('Erro ao inserir abastecimento');
    res.sendStatus(200);
  });
});

// Inserir medição
router.post('/medicao', (req, res) => {
  const { yellow, magenta, cyan, black, hora, user, estoque } = req.body;

  if (
    yellow === undefined || magenta === undefined ||
    cyan === undefined || black === undefined || !hora || !user ||
    !estoque?.offset || !estoque?.plana
  ) {
    return res.status(400).send('Dados incompletos');
  }

  const dbTransaction = () => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const insertMedicao = `
        INSERT INTO medicoes (
          yellow, magenta, cyan, black, hora, user
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(insertMedicao, [
        yellow, magenta, cyan, black, hora, (user || '').toUpperCase()
      ], function(err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).send('Erro ao inserir medição');
        }

        const insertOffset = `
          INSERT INTO estoque_offset (
            amarelo, magenta, ciano, preto, hora, user
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(insertOffset, [
          estoque.offset.amarelo, estoque.offset.magenta,
          estoque.offset.ciano, estoque.offset.preto,
          hora, (user || '').toUpperCase()
        ], function(err2) {
          if (err2) {
            db.run("ROLLBACK");
            return res.status(500).send('Erro ao inserir estoque OFFSET');
          }

          const insertPlana = `
            INSERT INTO estoque_plana (
              amarelo, magenta, ciano, preto, hora, user
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;

          db.run(insertPlana, [
            estoque.plana.amarelo, estoque.plana.magenta,
            estoque.plana.ciano, estoque.plana.preto,
            hora, (user || '').toUpperCase()
          ], function(err3) {
            if (err3) {
              db.run("ROLLBACK");
              return res.status(500).send('Erro ao inserir estoque PLANA');
            }

            db.run("COMMIT");
            res.sendStatus(200);
          });
        });
      });
    });
  };

  dbTransaction();
});



  // Buscar todos os abastecimentos
router.get('/abastecimentos', (req, res) => {
  db.all('SELECT * FROM abastecimentos ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar abastecimentos:', err);
      return res.status(500).send('Erro ao buscar abastecimentos');
    }
    res.json(rows);
  });
});

// Buscar todas as medições
router.get('/medicoes', (req, res) => {
  db.all('SELECT * FROM medicoes ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar medicoes:', err);
      return res.status(500).send('Erro ao buscar medicoes');
    }
    res.json(rows);
  });
});

// Buscar todo o estoque offset
router.get('/estoque_offset', (req, res) => {
  db.all('SELECT * FROM estoque_offset ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar estoque offset:', err);
      return res.status(500).send('Erro ao buscar estoque offset');
    }
    res.json(rows);
  });
});

// Buscar todo o estoque plana
router.get('/estoque_plana', (req, res) => {
  db.all('SELECT * FROM estoque_plana ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar estoque plana:', err);
      return res.status(500).send('Erro ao buscar estoque plana');
    }
    res.json(rows);
  });
});



router.post('/send-report', async (req, res) => {
  const { subject, html, attachments } = req.body;

  // 🔍 DEBUG: veja exatamente o que chegou do frontend
  //console.log('●●● /send-report BODY:', JSON.stringify(req.body, null, 2));

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // envia com HTML e attachments INLINE via cid
    await transporter.sendMail({
      from:    '"Controle de Tintas" <procedimentos@esdeva.com.br>',
      to:      'andrey.souza@esdeva.com.br; arthur.oliveira@esdeva.com.br; salatiel.silva@esdeva.com.br; compras@esdeva.com.br; planejamento@esdeva.com.br; programacao@esdeva.com.br; almoxarifado3@esdeva.com.br; guilherme.bento@esdeva.com.br',      
      subject: subject,
      html:    html,           // corpo HTML vindo do frontend
      attachments                // array de { filename, content, encoding, cid, contentType }
    });

    //console.log('✅ E-mail enviado com sucesso!');
    res.status(200).json({ message: 'E-mail enviado com sucesso' });
  } catch (err) {
    //console.error('❌ Erro ao enviar e-mail:', err);
    res.status(500).send('Falha ao enviar e-mail');
  }
});

  module.exports = router;