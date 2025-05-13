const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configura a conexão com o PostgreSQL usando DATABASE_URL do Railway
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
   ssl: {
    rejectUnauthorized: false // Necessário para conexões no Railway
  }
});

// Configura o transportador do nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const HOST = process.env.RAILWAY_PUBLIC_DOMAIN || '0.0.0.0';
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 5 * 60 * 1000; // 5 minutos
const JWT_SECRET = 'segredo_do_token'; // Substitua pela sua chave secreta

// Função para adicionar token à blacklist
async function adicionarNaBlacklist(token) {
  try {
    await pool.query('INSERT INTO blacklist_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [token]);
    // console.log('Token adicionado à blacklist com sucesso.');
  } catch (err) {
    console.error('Erro ao adicionar token à blacklist:', err);
  }
}

// Função para verificar se o token está na blacklist
async function tokenEstaNaBlacklist(token) {
  try {
    const result = await pool.query('SELECT 1 FROM blacklist_tokens WHERE token = $1', [token]);
    return result.rowCount > 0;
  } catch (err) {
    console.error('Erro ao verificar blacklist:', err);
    throw err;
  }
}

// Rota de login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validações básicas
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ mensagem: 'E-mail inválido.' });
  }
  if (!password || password.trim() === '') {
    return res.status(400).json({ mensagem: 'Senha não pode ser vazia.' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const row = result.rows[0];

    if (!row) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    // Verifica se a conta está bloqueada
    const agora = Date.now();
    if (row.bloqueado_ate && agora < row.bloqueado_ate) {
      const tempoRestante = Math.ceil((row.bloqueado_ate - agora) / 60000);
      return res.status(403).json({
        mensagem: `Conta temporariamente bloqueada. Tente novamente em ${tempoRestante} minutos.`
      });
    }

    // Verifica se a conta está verificada
    if (!row.verificado) {
      return res.status(403).json({
        mensagem: 'Conta ainda não verificada. Verifique seu e-mail antes de fazer login.'
      });
    }

    // Comparação de senha
    const resultBcrypt = await bcrypt.compare(password, row.senha);
    if (resultBcrypt) {
      // Resetar tentativas e desbloqueio
      await pool.query('UPDATE usuarios SET tentativas_login = 0, bloqueado_ate = NULL WHERE email = $1', [email]);
      const { senha, ...userWithoutPassword } = row;
      return res.json({ mensagem: 'Login bem-sucedido!', user: userWithoutPassword });
    } else {
      let novasTentativas = (row.tentativas_login || 0) + 1;
      let updateQuery, updateParams;

      if (novasTentativas >= MAX_TENTATIVAS) {
        const bloqueioAte = agora + TEMPO_BLOQUEIO_MS;
        updateQuery = 'UPDATE usuarios SET tentativas_login = $1, bloqueado_ate = $2 WHERE email = $3';
        updateParams = [novasTentativas, bloqueioAte, email];
      } else {
        updateQuery = 'UPDATE usuarios SET tentativas_login = $1 WHERE email = $2';
        updateParams = [novasTentativas, email];
      }

      await pool.query(updateQuery, updateParams);
      const mensagemErro = novasTentativas >= MAX_TENTATIVAS
        ? `Conta bloqueada por ${TEMPO_BLOQUEIO_MS / 60000} minutos após ${MAX_TENTATIVAS} tentativas.`
        : 'Senha incorreta.';
      return res.status(401).json({ mensagem: mensagemErro });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ mensagem: 'Erro no servidor.' });
  }
});

// Rota de registro
router.post('/register', async (req, res) => {
  const { nome, sobrenome, funcao, email, senha } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rowCount > 0) {
      return res.status(400).json({ mensagem: 'Email já cadastrado!' });
    }

    const hash = await bcrypt.hash(senha, 10);

    console.log('Senha criptografada:', hash);

    const token = uuidv4();

    console.log('Token de verificação gerado:', token);

    await pool.query(
      `INSERT INTO usuarios (username, surname, role, email, senha, verificado, token_verificacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nome, sobrenome, funcao, email, hash, false, token]
    );

    console.log("Usuário registrado com sucesso!");

    const link = `http://${HOST}/api/auth/verify?token=${token}`;
    const mailOptions = {
      from: '"Sistemas Integrados" <procedimentos@esdeva.com.br>',
      to: email,
      subject: 'Confirme seu cadastro',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50;">Bem-vindo ao Sistema de Controle de Tintas</h2>
            <p style="font-size: 16px; color: #333;">Olá, <strong>${nome}</strong>!</p>
            <p style="font-size: 16px; color: #333;">
              Recebemos sua solicitação de cadastro. Para ativar sua conta e concluir o processo, por favor, confirme seu e-mail clicando no botão abaixo:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background-color: #3498db; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-size: 16px;">
                Confirmar Cadastro
              </a>
            </div>
            <p style="font-size: 14px; color: #777;">
              Caso você não tenha solicitado este cadastro, ignore este e-mail. Seu endereço não será utilizado para nenhum outro fim.
            </p>
            <p style="font-size: 14px; color: #999; margin-top: 30px; text-align: center;">
              © 2025 Controle de Tintas - Esdeva. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Erro ao enviar e-mail:', err);
        return res.status(500).json({ mensagem: 'Erro ao enviar e-mail.' });
      }
      return res.json({ mensagem: 'Cadastro criado! Confirme seu e-mail.' });
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({ mensagem: 'Erro ao cadastrar.' });
  }
});

// Rota de verificação de e-mail
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Token de verificação inválido.');
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE token_verificacao = $1', [token]);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).send('Token não encontrado.');
    }

    // Marca o usuário como verificado
    await pool.query('UPDATE usuarios SET verificado = 1, token_verificacao = NULL WHERE id = $1', [row.id]);

    res.send(`
      <html>
        <head>
          <title>Cadastro Confirmado</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(to right, #4facfe, #00f2fe);
              color: #2c3e50;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 8px 20px rgba(0,0,0,0.1);
              text-align: center;
            }
            h1 {
              color: #27ae60;
            }
            p {
              font-size: 18px;
              margin-bottom: 20px;
            }
            a {
              background-color: #3498db;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              text-decoration: none;
              font-weight: bold;
            }
            a:hover {
              background-color: #2980b9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Cadastro Confirmado!</h1>
            <p>Sua conta foi ativada com sucesso. Você já pode fazer login no sistema.</p>
            <a href="http://${HOST}/tintas/login">Ir para Login</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Erro na verificação:', err);
    return res.status(500).send('Erro ao verificar o usuário.');
  }
});

// Rota para enviar o link de recuperação de senha
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ mensagem: 'E-mail não encontrado.' });
    }

    // Gerar o token de recuperação
    const token = jwt.sign({ email: row.email }, JWT_SECRET, { expiresIn: '1h' });

    // Criar o link de recuperação
    const recoveryLink = `http://${HOST}/tintas/redefinir-senha/${token}`;

    // Enviar o e-mail com HTML personalizado
    const mailOptions = {
      from: '"Controle de Tintas" <procedimentos@esdeva.com.br>',
      to: row.email,
      subject: 'Instruções de Recuperação de Senha',
      html: `
        <html>
          <head>
            <title>Redefinição de Senha</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background: linear-gradient(to right, #4facfe, #00f2fe);
                color: #2c3e50;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .container {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                text-align: center;
              }
              h1 {
                color: #e67e22;
              }
              p {
                font-size: 18px;
                margin-bottom: 20px;
              }
              a {
                background-color: #3498db;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                font-weight: bold;
              }
              a:hover {
                background-color: #2980b9;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Redefinição de Senha</h1>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta. Caso tenha sido você, clique no link abaixo para continuar o processo.</p>
              <a href="${recoveryLink}">Redefinir Senha</a>
              <p>Se você não solicitou a redefinição de senha, ignore este e-mail. Caso tenha dúvidas, entre em contato com o suporte.</p>
            </div>
          </body>
        </html>
      `
    };

    // Enviar o e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erro ao enviar e-mail:', error);
        return res.status(500).json({ mensagem: 'Erro ao enviar o e-mail.' });
      }
      res.status(200).json({ mensagem: 'Instruções de recuperação enviadas com sucesso!' });
    });
  } catch (err) {
    console.error('Erro no forgotpassword:', err);
    return res.status(500).json({ mensagem: 'Erro no servidor.' });
  }
});

// Rota para redefinir senha
router.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;

  // Verifica se token e nova senha foram fornecidos
  if (!token || !novaSenha) {
    return res.status(400).json({ mensagem: 'Token e nova senha são obrigatórios.' });
  }

  try {
    // Verifica a validade do token
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    // Criptografa a nova senha
    const hashSenha = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha do usuário no banco
    await pool.query('UPDATE usuarios SET senha = $1 WHERE email = $2', [hashSenha, email]);
    await adicionarNaBlacklist(token); // Adiciona o token à blacklist

    res.status(200).json({ mensagem: 'Senha atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro na redefinição de senha:', err);
    return res.status(400).json({ mensagem: 'Token inválido ou expirado.' });
  }
});

// Rota para verificar token
router.get('/verificar-token/:token', async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ valido: false, mensagem: 'Token não fornecido.' });
  }

  try {
    const estaNaBlacklist = await tokenEstaNaBlacklist(token);
    if (estaNaBlacklist) {
      return res.status(401).json({ valido: false, mensagem: 'Token foi invalidado.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valido: true, payload: decoded });
  } catch (err) {
    console.error('Erro ao verificar token:', err);
    return res.status(401).json({ valido: false, mensagem: 'Token inválido ou expirado.' });
  }
});

module.exports = router;