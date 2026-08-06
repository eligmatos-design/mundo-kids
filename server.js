// server.js — ponto de entrada usado pelo Render (render.yaml: startCommand "node server.js")
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

const db = require('./server/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3847;

const DATA_DIR = path.join(__dirname, 'data');
const WORLDS_FILE = path.join(DATA_DIR, 'mundos.json');
const worlds = new Map();

function carregarMundos() {
  try {
    if (!fs.existsSync(WORLDS_FILE)) return;
    const dados = JSON.parse(fs.readFileSync(WORLDS_FILE, 'utf8'));
    Object.entries(dados).forEach(([code, w]) => {
      worlds.set(code, { ...w, jogadores: new Map(), construcoes: w.construcoes || {} });
    });
    console.log('  Mundos carregados:', worlds.size);
  } catch (e) {
    console.warn('  Aviso: não foi possível carregar mundos salvos.');
  }
}

// Salva a lista de mundos no arquivo local do servidor (rápido, sempre disponível
// enquanto o servidor está de pé — mas não garantido entre redeploys no Render grátis).
function salvarMundos() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const dados = {};
    worlds.forEach((w, code) => {
      dados[code] = { code: w.code, nome: w.nome, pin: w.pin, max: w.max, voz: w.voz, criado: w.criado, construcoes: w.construcoes || {} };
    });
    fs.writeFileSync(WORLDS_FILE, JSON.stringify(dados, null, 2));
  } catch (e) {
    console.warn('  Aviso: não foi possível salvar mundos.');
  }
}

// Além do arquivo local, agenda (com atraso, para não sobrecarregar o banco a cada
// bloco colocado) um salvamento durável no MongoDB — só roda de verdade se
// MONGODB_URI estiver configurado; caso contrário db.salvarMundo() não faz nada.
const _timersMundo = {};
function agendarSalvarMundo(code) {
  salvarMundos();
  if (!db.disponivel()) return;
  clearTimeout(_timersMundo[code]);
  _timersMundo[code] = setTimeout(() => {
    const w = worlds.get(code);
    if (!w) return;
    db.salvarMundo(code, { nome: w.nome, pin: w.pin, max: w.max, voz: w.voz, criado: w.criado, construcoes: w.construcoes || {} });
  }, 3000);
}

// Na primeira vez que alguém entra num mundo nesta execução do servidor, tenta
// puxar do MongoDB uma versão mais completa/recente (ex: depois de um redeploy,
// quando o arquivo local pode ter sido resetado). Não sobrescreve nada se o
// banco não estiver configurado ou não tiver esse mundo ainda.
async function garantirMundoAtualizado(code) {
  const w = worlds.get(code);
  if (!w || w._carregadoDB || !db.disponivel()) return;
  w._carregadoDB = true;
  try {
    const doc = await db.carregarMundo(code);
    if (doc) {
      w.nome = doc.nome || w.nome;
      w.construcoes = { ...(doc.construcoes || {}), ...w.construcoes };
    }
  } catch (e) { /* já logado dentro de db.js */ }
}

carregarMundos();
db.conectar().then(ok => {
  if (!db.disponivel()) console.log('  Banco de dados: não configurado (progresso fica só no navegador/arquivo local) — veja MONGODB_URI.');
}).catch(() => {});

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function makeCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MUNDO-';
  for (let i = 0; i < 6; i++) code += c[Math.floor(Math.random() * c.length)];
  return worlds.has(code) ? makeCode() : code;
}

function cleanName(s) {
  return String(s || '').replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().slice(0, 16) || 'Jogador';
}

app.use(express.json());

// Servir jogo — aceita pasta public/ OU arquivos na raiz do GitHub
function headersUtf8(res, filePath) {
  if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
  else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
  else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  else if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function configurarArquivosEstaticos() {
  const pub = path.join(__dirname, 'public');
  const indexPublic = path.join(pub, 'index.html');
  const indexRaiz = path.join(__dirname, 'index.html');
  const optsStatic = { setHeaders: headersUtf8 };

  if (fs.existsSync(indexPublic)) {
    app.use(express.static(pub, optsStatic));
    console.log('  Arquivos: pasta public/');
    return 'public';
  }
  if (fs.existsSync(indexRaiz)) {
    app.use('/css', express.static(path.join(__dirname, 'css'), optsStatic));
    app.use('/js', express.static(path.join(__dirname, 'js'), optsStatic));
    app.use(express.static(__dirname, { ...optsStatic, index: 'index.html' }));
    console.log('  Arquivos: raiz do projeto (css/, js/, index.html)');
    return 'raiz';
  }
  console.warn('  AVISO: index.html não encontrado! Envie a pasta public/ ao GitHub.');
  return null;
}
const modoStatic = configurarArquivosEstaticos();

// Atalhos — arquivos na raiz do GitHub (style.css, main.js...) funcionam em /css/ e /js/
function enviarArquivo(res, caminhos) {
  for (const p of caminhos) {
    if (p && fs.existsSync(p)) {
      let tipo = 'application/octet-stream; charset=utf-8';
      if (p.endsWith('.html')) tipo = 'text/html; charset=utf-8';
      else if (p.endsWith('.css')) tipo = 'text/css; charset=utf-8';
      else if (p.endsWith('.js')) tipo = 'application/javascript; charset=utf-8';
      res.set('Content-Type', tipo);
      return res.sendFile(p);
    }
  }
  res.status(404).end();
}

app.get('/css/style.css', (req, res) => enviarArquivo(res, [
  path.join(__dirname, 'public', 'css', 'style.css'),
  path.join(__dirname, 'css', 'style.css'),
  path.join(__dirname, 'style.css'),
  path.join(__dirname, 'estilo.css')
]));

['config', 'effects', 'avatar', 'game', 'main'].forEach(name => {
  const pt = { effects: 'efeitos', game: 'jogo' };
  app.get(`/js/${name}.js`, (req, res) => enviarArquivo(res, [
    path.join(__dirname, 'public', 'js', `${name}.js`),
    path.join(__dirname, 'js', `${name}.js`),
    path.join(__dirname, `${name}.js`),
    pt[name] ? path.join(__dirname, `${pt[name]}.js`) : null
  ]));
});

function enviarIndex(res) {
  const candidatos = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html')
  ];
  for (const p of candidatos) {
    if (fs.existsSync(p)) {
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(p);
    }
  }
  return false;
}

app.get('/api/status', (req, res) => {
  res.json({ ok: true, app: 'Mundo Kids', version: '1.0.0' });
});

app.get('/health', (req, res) => res.send('ok'));

app.get('/api/debug', (req, res) => {
  const pub = path.join(__dirname, 'public');
  res.json({
    modo: modoStatic,
    publicFolder: fs.existsSync(pub),
    indexEmPublic: fs.existsSync(path.join(pub, 'index.html')),
    indexNaRaiz: fs.existsSync(path.join(__dirname, 'index.html')),
    css: fs.existsSync(path.join(pub, 'css', 'style.css')) || fs.existsSync(path.join(__dirname, 'css', 'style.css')),
    js: fs.existsSync(path.join(pub, 'js', 'main.js')) || fs.existsSync(path.join(__dirname, 'js', 'main.js')),
    dica: modoStatic ? 'Arquivos OK' : 'Envie a pasta public/ ou index.html+css+js para o GitHub'
  });
});

app.get('/', (req, res) => {
  if (enviarIndex(res)) return;
  res.status(503).send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mundo Kids</title>
<style>body{font-family:sans-serif;max-width:540px;margin:40px auto;padding:24px;background:#fdf2f8;color:#4a044e;line-height:1.7}
h1{color:#ec4899}.box{background:#fff;border-radius:16px;padding:20px;margin:16px 0;border:2px solid #f9a8d4}
code{background:#fae8ff;padding:3px 8px;border-radius:6px}ol{padding-left:20px}li{margin:10px 0}</style></head><body>
<h1>⚙️ Servidor ok — falta o jogo!</h1>
<div class="box"><ol>
<li>No PC: duplo clique em <strong>PREPARAR-GITHUB.bat</strong></li>
<li>Apague tudo no GitHub → Upload da pasta <strong>mundo-kids-github</strong></li>
<li>Aguarde 3 min no Render</li>
</ol></div></body></html>`);
});

app.get('/index.html', (req, res) => { if (!enviarIndex(res)) res.status(404).send('index.html nao encontrado'); });

app.post('/api/mundo/criar', (req, res) => {
  const nome = cleanName(req.body.nome);
  const pin = String(req.body.pin || '').replace(/\D/g, '').slice(0, 6);
  if (!nome) return res.status(400).json({ erro: 'Digite o nome da criança.' });
  if (pin.length < 4) return res.status(400).json({ erro: 'PIN dos pais: mínimo 4 dígitos.' });

  const code = makeCode();
  worlds.set(code, {
    code, nome, pin,
    jogadores: new Map(),
    max: 8,
    voz: true,
    criado: Date.now(),
    construcoes: {}
  });
  salvarMundos();
  res.json({ code, nome });
});

app.post('/api/mundo/entrar', (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  const world = worlds.get(code);
  if (!world) return res.status(404).json({ erro: 'Código não encontrado. Crie um mundo novo ou verifique se digitou certo (ex: MUNDO-ABC123).' });
  if (world.jogadores.size >= world.max) return res.status(403).json({ erro: 'Mundo cheio.' });
  res.json({ code, nome: world.nome, online: world.jogadores.size, voz: world.voz });
});

// Bloqueio total de chat de texto
const CHAT_BLOQUEADO = ['chat', 'message', 'text', 'typing', 'dm', 'send-message'];

io.on('connection', (socket) => {
  let mundo = null;

  CHAT_BLOQUEADO.forEach(ev => {
    socket.on(ev, () => socket.emit('erro', { msg: 'Sem chat! Use o botão de voz 🎤' }));
  });

  let deviceId = null;

  socket.on('entrar', async ({ code, nome, cor, pet, chapeu, cabelo, deviceId: devId }) => {
    code = String(code || '').toUpperCase().trim();
    const w = worlds.get(code);
    if (!w) return socket.emit('erro', { msg: 'Mundo não encontrado.' });
    if (w.jogadores.size >= w.max) return socket.emit('erro', { msg: 'Mundo cheio.' });

    mundo = code;
    deviceId = typeof devId === 'string' ? devId.slice(0, 80) : null;

    await garantirMundoAtualizado(code);

    const jogador = {
      id: socket.id,
      nome: cleanName(nome),
      cor: cor || '#FF1493',
      pet: pet || 'cachorro',
      chapeu: chapeu || 'nenhum',
      cabelo: cabelo || 'spiky',
      x: 0, y: 1, z: 0, rot: 0,
      jogo: 'cidade'
    };
    w.jogadores.set(socket.id, jogador);
    socket.join(code);

    socket.emit('estado', {
      jogadores: [...w.jogadores.values()],
      mundo: { nome: w.nome, code, voz: w.voz },
      construcoes: (w.construcoes && w.construcoes[jogador.jogo]) || []
    });
    socket.to(code).emit('entrou', jogador);

    // Progresso do jogador (moedas/itens/aparência) salvo no banco, se configurado —
    // devolve para o navegador restaurar, útil quando o cache local foi limpo ou
    // a criança está jogando de outro aparelho com o mesmo dispositivo salvo.
    if (deviceId && db.disponivel()) {
      const progresso = await db.carregarJogador(deviceId);
      if (progresso) {
        socket.emit('progresso', { moedas: progresso.moedas, comprados: progresso.comprados, avatar: progresso.avatar });
      }
    }
  });

  socket.on('salvar-progresso', (dados) => {
    if (!dados || !dados.deviceId) return;
    db.salvarJogador(String(dados.deviceId).slice(0, 80), {
      moedas: Number.isFinite(dados.moedas) ? dados.moedas : 0,
      comprados: Array.isArray(dados.comprados) ? dados.comprados.slice(0, 200).map(String) : [],
      avatar: dados.avatar && typeof dados.avatar === 'object' ? dados.avatar : {}
    });
  });

  // Construção do mundo (móveis extras na Casa, blocos na Cidade): guarda no
  // mundo em memória, replica em tempo real para quem mais estiver na sala, e
  // agenda salvar (arquivo local + banco, se configurado) para sobreviver a
  // reload/redeploy.
  socket.on('construir', ({ jogo, item } = {}) => {
    if (!mundo || !jogo || !item) return;
    const w = worlds.get(mundo);
    if (!w) return;
    w.construcoes = w.construcoes || {};
    const lista = w.construcoes[jogo] = w.construcoes[jogo] || [];
    if (lista.length >= 300) return; // limite de segurança por zona

    const clamp = (n) => Math.max(-200, Math.min(200, Number(n) || 0));
    const itemLimpo = {
      tipo: item.tipo === 'bloco' ? 'bloco' : 'movel',
      modelo: String(item.modelo || '').slice(0, 40),
      x: clamp(item.x), y: clamp(item.y), z: clamp(item.z)
    };
    if (item.nivel != null) itemLimpo.nivel = Math.max(0, Math.min(20, Number(item.nivel) || 0));

    lista.push(itemLimpo);
    socket.to(mundo).emit('construiu', { jogo, item: itemLimpo });
    agendarSalvarMundo(mundo);
  });

  socket.on('mover', (d) => {
    if (!mundo) return;
    const w = worlds.get(mundo);
    const j = w?.jogadores.get(socket.id);
    if (!j) return;
    Object.assign(j, { x: d.x, y: d.y, z: d.z, rot: d.rot, jogo: d.jogo || j.jogo, emote: d.emote });
    socket.to(mundo).emit('moveu', { id: socket.id, ...j });
  });

  socket.on('evento', (ev) => {
    if (mundo) io.to(mundo).emit('evento', { de: socket.id, ...ev });
  });

  socket.on('trocar-jogo', (jogo) => {
    if (!mundo) return;
    const w = worlds.get(mundo);
    const j = w?.jogadores.get(socket.id);
    if (!j) return;
    j.jogo = jogo;
    j.x = 0; j.y = 1; j.z = 0;
    socket.to(mundo).emit('trocou-jogo', { id: socket.id, jogo, nome: j.nome });
    socket.emit('construcoes', { jogo, itens: (w.construcoes && w.construcoes[jogo]) || [] });
  });

  // WebRTC voz
  socket.on('voz-oferta', ({ para, oferta }) => io.to(para).emit('voz-oferta', { de: socket.id, oferta }));
  socket.on('voz-resposta', ({ para, resposta }) => io.to(para).emit('voz-resposta', { de: socket.id, resposta }));
  socket.on('voz-ice', ({ para, candidato }) => io.to(para).emit('voz-ice', { de: socket.id, candidato }));
  socket.on('voz-mudo', ({ mudo }) => {
    if (mundo) socket.to(mundo).emit('voz-mudo', { id: socket.id, mudo });
  });

  socket.on('disconnect', () => {
    if (mundo) {
      const w = worlds.get(mundo);
      if (w) {
        w.jogadores.delete(socket.id);
        io.to(mundo).emit('saiu', { id: socket.id });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n  🌍 MUNDO KIDS — Estilo PK XD');
  console.log('  ─────────────────────────');
  console.log('  PC:      http://localhost:' + PORT);
  console.log('  Celular: http://' + ip + ':' + PORT);
  console.log('  Sem chat — só voz!\n');
});
