const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

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
      worlds.set(code, { ...w, jogadores: new Map() });
    });
    console.log('  Mundos carregados:', worlds.size);
  } catch (e) {
    console.warn('  Aviso: não foi possível carregar mundos salvos.');
  }
}

function salvarMundos() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const dados = {};
    worlds.forEach((w, code) => {
      dados[code] = { code: w.code, nome: w.nome, pin: w.pin, max: w.max, voz: w.voz, criado: w.criado };
    });
    fs.writeFileSync(WORLDS_FILE, JSON.stringify(dados, null, 2));
  } catch (e) {
    console.warn('  Aviso: não foi possível salvar mundos.');
  }
}

carregarMundos();

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
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({ ok: true, app: 'Mundo Kids', version: '1.0.0' });
});

app.get('/health', (req, res) => res.send('ok'));

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
    criado: Date.now()
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

  socket.on('entrar', ({ code, nome, cor, pet, chapeu, cabelo }) => {
    code = String(code || '').toUpperCase().trim();
    const w = worlds.get(code);
    if (!w) return socket.emit('erro', { msg: 'Mundo não encontrado.' });
    if (w.jogadores.size >= w.max) return socket.emit('erro', { msg: 'Mundo cheio.' });

    mundo = code;
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
      mundo: { nome: w.nome, code, voz: w.voz }
    });
    socket.to(code).emit('entrou', jogador);
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
