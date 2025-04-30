const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'




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


// Conecta ao banco
const path = require('path');
const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Rota de login

const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 5 * 60 * 1000; // 5 minutos

function adicionarNaBlacklist(token) {
  db.run(
    'INSERT OR IGNORE INTO blacklist_tokens (token) VALUES (?)',
    [token],
    (err) => {
      if (err) {
        console.error('Erro ao adicionar token à blacklist:', err);
      } else {
        //console.log('Token adicionado à blacklist com sucesso.');
      }
    }
  );
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validações básicas
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ mensagem: 'E-mail inválido.' });
  }
  if (!password || password.trim() === '') {
    return res.status(400).json({ mensagem: 'Senha não pode ser vazia.' });
  }

  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ mensagem: 'Erro no servidor.' });
    if (!row) return res.status(401).json({ mensagem: 'Usuário não encontrado.' });

    // Verifica se a conta está bloqueada
    const agora = Date.now();
    if (row.bloqueado_ate && agora < row.bloqueado_ate) {
      const tempoRestante = Math.ceil((row.bloqueado_ate - agora) / 60000);
      return res.status(403).json({
        mensagem: `Conta temporariamente bloqueada. Tente novamente em ${tempoRestante} minutos.`
      });
    }

    // Verifica se a conta está verificada
    if (row.verificado !== 1) {
      return res.status(403).json({
        mensagem: 'Conta ainda não verificada. Verifique seu e-mail antes de fazer login.'
      });
    }

    // Comparação de senha
    bcrypt.compare(password, row.senha, (err, result) => {
      if (result) {
        // Resetar tentativas e desbloqueio
        db.run('UPDATE usuarios SET tentativas_login = 0, bloqueado_ate = NULL WHERE email = ?', [email]);
        const { senha, ...userWithoutPassword } = row;
        return res.json({ mensagem: 'Login bem-sucedido!', user: userWithoutPassword });
      } else {
        let novasTentativas = (row.tentativas_login || 0) + 1;
        let updateQuery, updateParams;

        if (novasTentativas >= MAX_TENTATIVAS) {
          const bloqueioAte = agora + TEMPO_BLOQUEIO_MS;
          updateQuery = 'UPDATE usuarios SET tentativas_login = ?, bloqueado_ate = ? WHERE email = ?';
          updateParams = [novasTentativas, bloqueioAte, email];
        } else {
          updateQuery = 'UPDATE usuarios SET tentativas_login = ? WHERE email = ?';
          updateParams = [novasTentativas, email];
        }

        db.run(updateQuery, updateParams, () => {
          const mensagemErro = novasTentativas >= MAX_TENTATIVAS
            ? `Conta bloqueada por ${TEMPO_BLOQUEIO_MS / 60000} minutos após ${MAX_TENTATIVAS} tentativas.`
            : 'Senha incorreta.';
          return res.status(401).json({ mensagem: mensagemErro });
        });
      }
    });
  });
});

  // Rota de registro
router.post('/register', async (req, res) => {
    const { nome, sobrenome, funcao, email, senha } = req.body;
  
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, row) => {
      if (row) return res.status(400).json({ mensagem: "Email já cadastrado!" });
  
      const hash = await bcrypt.hash(senha, 10);
      const token = uuidv4();
  
      db.run(`INSERT INTO usuarios (username, surname, role, email, senha, verificado, token_verificacao)
              VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [nome, sobrenome, funcao, email, hash, token], (err) => {
          if (err) return res.status(500).json({ mensagem: "Erro ao cadastrar." });
  
          const link = `http://${HOST}:${PORT}/api/auth/verify?token=${token}`;
          const mailOptions = {
            from: '"Controle de Tintas" <procedimentos@esdeva.com.br>',
            to: email,
            subject: "Confirme seu cadastro",
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
                            &copy; 2025 Controle de Tintas - Esdeva. Todos os direitos reservados.
                        </p>
                        </div>
                    </div>
                `
          };
  
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ mensagem: "Erro ao enviar e-mail." });
            }
  
            return res.json({ mensagem: "Cadastro criado! Confirme seu e-mail." });
          });
        });
    });
  });

  const tokenEstaNaBlacklist = (token) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT 1 FROM blacklist_tokens WHERE token = ?', [token], (err, row) => {
        if (err) return reject(err);
        resolve(!!row); // true se encontrar, false se não
      });
    });
  };


  // Rota de verificação de e-mail
router.get('/verify', (req, res) => {
    const { token } = req.query;
  
    if (!token) {
      return res.status(400).send("Token de verificação inválido.");
    }
  
    db.get("SELECT * FROM usuarios WHERE token_verificacao = ?", [token], (err, row) => {
      if (err) return res.status(500).send("Erro no servidor.");
      if (!row) return res.status(404).send("Token não encontrado.");
  
      // Marca o usuário como verificado
      db.run("UPDATE usuarios SET verificado = 1, token_verificacao = NULL WHERE id = ?", [row.id], (err) => {
        if (err) return res.status(500).send("Erro ao verificar o usuário.");
  
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
                  <a href="http://${HOST}:${PORT}/tintas/login">Ir para Login</a>
                </div>
              </body>
            </html>
          `);          
      });
    });
  });
  

// Rota para enviar o link de recuperação de senha
router.post('/forgotpassword', (req, res) => {
  const { email } = req.body;

  // Verificar se o e-mail existe no banco de dados
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ mensagem: 'Erro no servidor.' });

    if (!row) return res.status(404).json({ mensagem: 'E-mail não encontrado.' });

    // Gerar o token de recuperação
    const token = jwt.sign({ email: row.email }, 'segredo_do_token', { expiresIn: '1h' });

    // Criar o link de recuperação
    const recoveryLink = `http://${HOST}:${PORT}/tintas/redefinir-senha/${token}`;

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
        return res.status(500).json({ mensagem: 'Erro ao enviar o e-mail.' });
      }
      res.status(200).json({ mensagem: 'Instruções de recuperação enviadas com sucesso!' });
    });
  });
});

router.post('/redefinir-senha', (req, res) => {
  const { token, novaSenha } = req.body;

  // Verifica se token e nova senha foram fornecidos
  if (!token || !novaSenha) {
    return res.status(400).json({ mensagem: 'Token e nova senha são obrigatórios.' });
  }

  // Verifica a validade do token usando a chave secreta
  jwt.verify(token, 'segredo_do_token', async (err, decoded) => {
    if (err) {
      return res.status(400).json({ mensagem: 'Token inválido ou expirado.' });
    }

    // Extrai o email do token decodificado
    const email = decoded.email;
    
    try {
      // Criptografa a nova senha
      const hashSenha = await bcrypt.hash(novaSenha, 10);

      // Atualiza a senha do usuário no banco
      db.run('UPDATE usuarios SET senha = ? WHERE email = ?', [hashSenha, email], function (err) {
        if (err) {
          console.error('Erro ao atualizar senha:', err);
          return res.status(500).json({ mensagem: 'Erro ao atualizar senha.' });
        }
        adicionarNaBlacklist(token); // Adiciona o token à blacklist
        res.status(200).json({ mensagem: 'Senha atualizada com sucesso!' });
      });
    } catch (error) {
      console.error('Erro na criptografia da senha:', error);
      return res.status(500).json({ mensagem: 'Erro interno ao processar a senha.' });
    }
  });
});


const JWT_SECRET = 'segredo_do_token'; // substitua pela sua


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
    //console.log('Erro ao verificar token:', err);
    return res.status(401).json({ valido: false, mensagem: 'Token inválido ou expirado.' });
  }
});

module.exports = router;
