// server/db.js — camada opcional de persistência via MongoDB Atlas.
//
// Esta camada só liga quando a variável de ambiente MONGODB_URI está
// configurada (Render → aba "Environment" do serviço). Sem essa variável,
// todas as funções abaixo viram no-ops seguros e o jogo continua
// funcionando exatamente como antes (progresso no localStorage do
// navegador + arquivo local data/mundos.json no servidor).
//
// Com a variável configurada, o progresso do jogador (moedas, itens
// comprados, aparência do avatar) e o que é construído em cada mundo
// (móveis extras, blocos da cidade) passam a sobreviver a redeploys e
// reinícios do servidor — e não só à sessão atual.
'use strict';

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || '';

let client = null;
let dbInstance = null;
let conectandoPromise = null;

function disponivel() {
  return !!uri;
}

async function conectar() {
  if (!uri) return null;
  if (dbInstance) return dbInstance;
  if (conectandoPromise) return conectandoPromise;

  conectandoPromise = (async () => {
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const nomeDb = process.env.MONGODB_DB || 'mundokids';
      dbInstance = client.db(nomeDb);
      await Promise.all([
        dbInstance.collection('jogadores').createIndex({ deviceId: 1 }, { unique: true }),
        dbInstance.collection('mundos').createIndex({ code: 1 }, { unique: true })
      ]);
      console.log('  Banco de dados: conectado ao MongoDB Atlas (' + nomeDb + ')');
      return dbInstance;
    } catch (e) {
      console.warn('  Aviso: não foi possível conectar ao MongoDB —', e.message);
      dbInstance = null;
      return null;
    } finally {
      conectandoPromise = null;
    }
  })();

  return conectandoPromise;
}

async function carregarJogador(deviceId) {
  if (!deviceId) return null;
  const db = await conectar();
  if (!db) return null;
  try {
    return await db.collection('jogadores').findOne({ deviceId });
  } catch (e) {
    console.warn('  Aviso: falha ao carregar progresso do jogador —', e.message);
    return null;
  }
}

async function salvarJogador(deviceId, dados) {
  if (!deviceId) return;
  const db = await conectar();
  if (!db) return;
  try {
    await db.collection('jogadores').updateOne(
      { deviceId },
      { $set: { ...dados, deviceId, atualizadoEm: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.warn('  Aviso: falha ao salvar progresso do jogador —', e.message);
  }
}

async function carregarMundo(code) {
  if (!code) return null;
  const db = await conectar();
  if (!db) return null;
  try {
    return await db.collection('mundos').findOne({ code });
  } catch (e) {
    console.warn('  Aviso: falha ao carregar mundo do banco —', e.message);
    return null;
  }
}

async function salvarMundo(code, dados) {
  if (!code) return;
  const db = await conectar();
  if (!db) return;
  try {
    await db.collection('mundos').updateOne(
      { code },
      { $set: { ...dados, code, atualizadoEm: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.warn('  Aviso: falha ao salvar mundo no banco —', e.message);
  }
}

module.exports = { disponivel, conectar, carregarJogador, salvarJogador, carregarMundo, salvarMundo };
