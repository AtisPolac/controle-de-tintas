require('dotenv').config(); // ou até remover essa linha se não usar localmente
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const request = require('request');
const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();  // Importando o sqlite3
const path = require('path');
const os = require('os');

const authRoutes = require('./rotas/auth');
const TintasRoutes = require('./rotas/tintas');

const app = express();
//const HOST = process.env.RAILWAY_PUBLIC_DOMAIN || '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Caminho do front-end compilado (o build do Angular)
//const frontEndPath = path.join(__dirname, '../pcp/dist');
const tintasPath = path.join(__dirname, '../controle-de-tintas/dist');

// Serve os arquivos estáticos nas rotas
//app.use('/fretes', express.static(frontEndPath));
app.use('/tintas', express.static(path.join(__dirname, '../controle-de-tintas/dist')));

// Fallback para /fretes
//app.get('/fretes/*', (req, res) => {
//  res.sendFile(path.join(frontEndPath, 'index.html'));
//});

// Fallback para /tintas
app.get('/tintas/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../controle-de-tintas/dist/index.html'));
});

const dbPath = process.env.DB_PATH || './database.db';
const db = new sqlite3.Database(dbPath);  
  
  // Fechar a conexão quando o processo for encerrado
  process.on('SIGINT', () => {
    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco:', err.message);
      } else {
      }
      process.exit(0);
    });
  });


// Abastecimento de formulários


// Inserir abastecimento
app.post('/api/abastecimento', (req, res) => {
  const {
    tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
    lote, pesodescarte, observacoes, centrallimpa, muitostambores, avaliacao
  } = req.body;

  const stmt = `
    INSERT INTO abastecimentos (
      tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
      lote, pesodescarte, observacoes, centrallimpa, muitostambores, avaliacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(stmt, [
    tinta, pesobruto, pesoliquido, quantidadeabastecida, embalagem,
    lote, pesodescarte || 0, observacoes || '', centrallimpa ? 1 : 0,
    muitostambores ? 1 : 0, avaliacao || 0
  ], function(err) {
    if (err) return res.status(500).send('Erro ao inserir abastecimento');
    res.sendStatus(200);
  });
});

// Inserir medição
app.post('/api/medicao', (req, res) => {
  const { yellow, magenta, cyan, black, hora } = req.body;

  const stmt = `
    INSERT INTO medicoes (
      yellow, magenta, cyan, black, hora
    ) VALUES (?, ?, ?, ?, ?)
  `;

  db.run(stmt, [yellow, magenta, cyan, black, hora], function(err) {
    if (err) return res.status(500).send('Erro ao inserir medição');
    res.sendStatus(200);
  });
});


// APIs de login (usadas só pelo controle-de-tintas)
app.use('/api/auth', authRoutes);
app.use('/api/tintas', TintasRoutes);


// Inicialização do servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em ${PORT}`);
});

  