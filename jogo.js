/**
 * Mundo Kids — Estilo PK XD
 */
(function () {
  'use strict';

  let scene, camera, renderer, socket, meuId, nuvens;
  let camPos = null, camLook = null;
  let playerMesh, petMesh, skateMesh, outros = {};
  let jogoAtual = 'cidade';
  let plats = [], objs = [], cols = [], anims = [];
  let estado = {}, relogio = new THREE.Clock();
  let teclas = {}, sessao = {};
  let moedas = 0, emoteTimer = 0, emoteAtual = null;
  let noSkate = false, movelAtual = 'sofa', andando = false;
  let bonusPego = false;
  let alvoMov = null, marcadorAlvo = null;
  const raycaster = new THREE.Raycaster();
  const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pontoRay = new THREE.Vector3();

  const LOJA_ITENS = [
    { id: 'coroa', nome: 'Coroa', preco: 100, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'oculos', nome: 'Oculos', preco: 80, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'asa', nome: 'Asas', preco: 200, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'chapeu', nome: 'Chapeu', preco: 60, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'top_rosa', nome: 'Blusa Rosa', preco: 70, tipo: 'top', val: 'rosa', cat: 'roupas' },
    { id: 'top_verde', nome: 'Blusa Verde', preco: 70, tipo: 'top', val: 'verde', cat: 'roupas' },
    { id: 'bottom_saia', nome: 'Saia', preco: 65, tipo: 'bottom', val: 'saia', cat: 'roupas' },
    { id: 'shoes_botas', nome: 'Botas', preco: 55, tipo: 'shoes', val: 'botas', cat: 'roupas' },
    { id: 'unicornio', nome: 'Unicornio', preco: 150, tipo: 'pet', val: 'unicornio', cat: 'pets' },
    { id: 'dragao', nome: 'Dragao', preco: 250, tipo: 'pet', val: 'dragao', cat: 'pets' },
    { id: 'skate_dourado', nome: 'Skate Dourado', preco: 120, tipo: 'skate', cat: 'acessorios' }
  ];
  const MOVEL_CATALOG = [
    { id: 'sofa', nome: 'Sofa', cor: 0xFF69B4, w: 2, h: 0.8, d: 1, fbx: 'Couch_Medium1.fbx' },
    { id: 'cama', nome: 'Cama', cor: 0xFFB6D9, w: 2, h: 0.5, d: 2.5, fbx: 'Bed_Single.fbx' },
    { id: 'tv', nome: 'TV', cor: 0x222222, w: 1.5, h: 1, d: 0.2 },
    { id: 'mesa', nome: 'Mesa', cor: 0xDEB887, w: 1.2, h: 0.7, d: 1.2, fbx: 'Table_RoundSmall.fbx' },
    { id: 'planta', nome: 'Planta', cor: 0x98D8AA, w: 0.5, h: 0.8, d: 0.5, fbx: 'Houseplant_3.fbx' },
    { id: 'luminaria', nome: 'Lampada', cor: 0xFFE066, w: 0.4, h: 1.2, d: 0.4, fbx: 'Light_Floor1.fbx' }
  ];

  /** Blocos de construção — para a crianca montar suas proprias casinhas/muros na Cidade */
  const BLOCO_CATALOG = [
    { id: 'tijolo', nome: 'Bloco Tijolo', tex: 'tijolo' },
    { id: 'madeira', nome: 'Bloco Madeira', tex: 'madeira' },
    { id: 'pedra', nome: 'Bloco Pedra', cor: 0xB8BEC7 },
    { id: 'grama', nome: 'Bloco Grama', tex: 'grama' },
    { id: 'vidro', nome: 'Bloco Vidro', cor: 0xBEE7FA, vidro: true },
    { id: 'rosa', nome: 'Bloco Rosa', cor: 0xFF9ECD }
  ];
  let blocoIdx = 0;
  const BLOCO_LIMITE = 80;

  // ── Móveis 3D reais (Quaternius, CC0) ──
  const _fbxCache = {};
  let _fbxLoader = null;
  function obterFBXLoader() {
    if (!_fbxLoader && window.THREE && THREE.FBXLoader) _fbxLoader = new THREE.FBXLoader();
    return _fbxLoader;
  }
  function carregarFBX(arquivo) {
    if (_fbxCache[arquivo]) return _fbxCache[arquivo];
    const loader = obterFBXLoader();
    _fbxCache[arquivo] = new Promise((resolve, reject) => {
      if (!loader) { reject('FBXLoader indisponivel'); return; }
      loader.load('modelos/moveis/' + arquivo, resolve, undefined, reject);
    });
    return _fbxCache[arquivo];
  }
  // Substitui a caixa colorida de um movel por um modelo 3D real, mantendo as
  // mesmas dimensoes (w/h/d) e a cor do catalogo (tingida sobre o modelo cinza).
  function montarMovelFBX(placeholder, m, x, y, z) {
    carregarFBX(m.fbx).then(obj => {
      const clone = obj.clone(true);
      clone.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        o.material = M(m.cor);
      });
      const box1 = new THREE.Box3().setFromObject(clone);
      const tam = new THREE.Vector3(); box1.getSize(tam);
      const escala = Math.min(m.w / Math.max(tam.x, 0.01), m.h / Math.max(tam.y, 0.01) * 1.4, m.d / Math.max(tam.z, 0.01)) || 1;
      clone.scale.setScalar(escala);
      const box2 = new THREE.Box3().setFromObject(clone);
      const centro = new THREE.Vector3(); box2.getCenter(centro);
      clone.position.x += x - centro.x;
      clone.position.z += z - centro.z;
      clone.position.y += y - box2.min.y;
      clone.userData.movel = true;
      objs.push(clone); scene.add(clone);
      if (placeholder) { scene.remove(placeholder); objs.splice(objs.indexOf(placeholder), 1); }
    }).catch(() => { /* rede falhou — mantem a caixa colorida como reserva */ });
  }
  const comprados = new Set(JSON.parse(localStorage.getItem('mk_comprados') || '[]'));
  moedas = parseInt(localStorage.getItem('mk_moedas') || '50', 10);

  // Identificador anônimo do dispositivo — não é dado pessoal, é só uma string
  // aleatória gerada uma vez e guardada localmente, usada para o servidor saber
  // "este é o mesmo jogador de antes" e devolver o progresso salvo (moedas, itens,
  // aparência) quando o banco de dados estiver configurado. Sem cadastro, sem login.
  function obterDeviceId() {
    let id = localStorage.getItem('mk_device_id');
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('dev-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('mk_device_id', id);
    }
    return id;
  }
  const deviceId = obterDeviceId();

  const jog = { x: 0, y: 1, z: 0, rot: 0, velY: 0, chao: true, envio: 0 };
  const touch = { x: 0, z: 0, pular: false };
  let joyId = null, RAIO = 45;

  // ── Helpers 3D ──
  function M(cor, em = 0) {
    return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7, metalness: em ? 0.5 : 0, emissive: em ? cor : 0, emissiveIntensity: em ? 0.25 : 0 });
  }
  function mesh(g, cor, x, y, z, em) {
    const m = new THREE.Mesh(g, M(cor, em));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // Textura de grama gerada por canvas — deixa o chao mais realista que uma cor solida
  let texturaGrama = null;
  function obterTexturaGrama() {
    if (texturaGrama) return texturaGrama;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#6ecf6e'; cx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 128, y = Math.random() * 128;
      cx.strokeStyle = Math.random() > 0.5 ? '#5cb85c' : '#84e084';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(x, y);
      cx.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 3);
      cx.stroke();
    }
    texturaGrama = new THREE.CanvasTexture(cv);
    texturaGrama.wrapS = texturaGrama.wrapT = THREE.RepeatWrapping;
    return texturaGrama;
  }

  // ── Fábrica de texturas procedurais (canvas) — deixam superfícies planas com cara de material real ──
  const _texCache = {};
  function _tex(chave, montar) {
    if (_texCache[chave]) return _texCache[chave];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    montar(cv.getContext('2d'), cv);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    _texCache[chave] = t;
    return t;
  }
  function obterTexturaMadeira(corTabua = '#a8532e', corLinha = '#7a3a1e') {
    return _tex('madeira' + corTabua + corLinha, cx => {
      cx.fillStyle = corTabua; cx.fillRect(0, 0, 128, 128);
      cx.strokeStyle = corLinha; cx.lineWidth = 2;
      for (let x = 0; x <= 128; x += 16) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 128); cx.stroke(); }
      cx.strokeStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * 128;
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(128, y + (Math.random() - .5) * 5); cx.stroke();
      }
    });
  }
  function obterTexturaTelha(cor1 = '#8B3A1E', cor2 = '#6E2C15') {
    return _tex('telha' + cor1 + cor2, cx => {
      cx.fillStyle = cor1; cx.fillRect(0, 0, 128, 128);
      cx.strokeStyle = cor2; cx.lineWidth = 2;
      const h = 16;
      for (let row = 0, y = 0; y < 128; y += h, row++) {
        const off = (row % 2) * 12;
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(128, y); cx.stroke();
        for (let x = -off; x < 128; x += 24) { cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y + h); cx.stroke(); }
      }
    });
  }
  function obterTexturaTijolo(cor1 = '#D97A5C', cor2 = '#B5583D') {
    return _tex('tijolo' + cor1 + cor2, cx => {
      cx.fillStyle = cor2; cx.fillRect(0, 0, 128, 128);
      cx.fillStyle = cor1;
      const h = 16, w = 32;
      for (let row = 0, y = 0; y < 128; y += h, row++) {
        const off = (row % 2) * (w / 2);
        for (let x = -w + off; x < 128; x += w) cx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    });
  }
  function obterTexturaCalcada(cor1 = '#D9D9DC', cor2 = '#C4C4C9') {
    return _tex('calcada' + cor1 + cor2, cx => {
      cx.fillStyle = cor1; cx.fillRect(0, 0, 128, 128);
      cx.strokeStyle = cor2; cx.lineWidth = 3;
      for (let x = 0; x <= 128; x += 32) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 128); cx.stroke(); }
      for (let y = 0; y <= 128; y += 32) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(128, y); cx.stroke(); }
      cx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let i = 0; i < 60; i++) cx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    });
  }
  /** Aplica uma textura procedural numa malha existente, com repetição ajustável */
  function texturizar(m, tex, repX = 2, repY = 2) {
    const t = tex.clone(); t.needsUpdate = true;
    t.repeat.set(repX, repY);
    m.material.map = t;
    m.material.needsUpdate = true;
    return m;
  }

  function plat(w, h, d, cor, x, y, z, tipo) {
    const solido = tipo === true || tipo === 'grama';
    const p = mesh(new THREE.BoxGeometry(w, h, d), solido ? 0x5cb85c : cor, x, y, z);
    if (solido) {
      const topo = mesh(new THREE.BoxGeometry(w, 0.06, d), 0xffffff, 0, h / 2 + 0.03, 0);
      const tex = obterTexturaGrama().clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(d / 3)));
      topo.material.map = tex;
      topo.material.needsUpdate = true;
      p.add(topo);
    } else if (tipo === 'calcada') {
      const topo = mesh(new THREE.BoxGeometry(w, 0.06, d), 0xffffff, 0, h / 2 + 0.03, 0);
      texturizar(topo, obterTexturaCalcada(), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(d / 2)));
      p.add(topo);
    }
    p.userData.plat = true; plats.push(p); scene.add(p); return p;
  }

  function tonalidade(cor, fator) {
    const c = new THREE.Color(cor);
    if (fator > 0) c.lerp(new THREE.Color(0xffffff), fator);
    else c.lerp(new THREE.Color(0x000000), -fator);
    return c.getHex();
  }
  function hexCss(cor) { return '#' + new THREE.Color(cor).getHexString(); }

  function predio(nome, cor, x, z, w, h, d) {
    const g = new THREE.Group();
    const corClara = hexCss(tonalidade(cor, 0.3)), corEscura = hexCss(tonalidade(cor, -0.25));
    // Corpo com fachada de tijolo/reboco (base branca + textura carrega a cor real)
    const corpo = mesh(new THREE.BoxGeometry(w, h, d), 0xffffff, 0, h / 2, 0);
    texturizar(corpo, obterTexturaTijolo(corClara, corEscura), Math.max(1, Math.round(w / 1.4)), Math.max(1, Math.round(h / 1.4)));
    g.add(corpo);
    // Telhado com beiral
    g.add(mesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), tonalidade(cor, -0.4), 0, h + 0.15, 0));
    g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.1), tonalidade(cor, -0.15), 0, h + 0.35, 0));
    // Janelas com moldura + vidro
    const porJanela = Math.max(1, Math.min(3, Math.floor(w / 1.6)));
    for (let iy = 0; iy < 2; iy++) for (let ix = 0; ix < porJanela; ix++) {
      const px = (ix - (porJanela - 1) / 2) * 1.6;
      g.add(mesh(new THREE.BoxGeometry(0.95, 0.95, 0.06), 0xffffff, px, 1.4 + iy * 1.9, d / 2 + 0.01));
      const vidro = mesh(new THREE.BoxGeometry(0.75, 0.75, 0.05), 0xBEE7FA, px, 1.4 + iy * 1.9, d / 2 + 0.04);
      vidro.material.roughness = 0.15; vidro.material.metalness = 0.3;
      g.add(vidro);
    }
    // Porta com moldura
    g.add(mesh(new THREE.BoxGeometry(1.5, 2.15, 0.14), 0xffffff, 0, 1.075, d / 2 + 0.02));
    g.add(mesh(new THREE.BoxGeometry(1.2, 2, 0.1), 0x8B4513, 0, 1, d / 2 + 0.06));
    // Placa com fundo arredondado
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const cx = cv.getContext('2d');
    cx.fillStyle = 'rgba(255,255,255,0.95)';
    if (cx.roundRect) { cx.beginPath(); cx.roundRect(4, 4, 248, 56, 16); cx.fill(); }
    else cx.fillRect(4, 4, 248, 56);
    cx.strokeStyle = corEscura; cx.lineWidth = 4;
    if (cx.roundRect) { cx.beginPath(); cx.roundRect(4, 4, 248, 56, 16); cx.stroke(); }
    cx.fillStyle = corEscura;
    cx.font = 'bold 30px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(nome, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    sp.position.set(0, h + 0.9, d / 2 + 0.4); sp.scale.set(3, 0.75, 1);
    g.add(sp);
    g.position.set(x, 0, z);
    g.userData.predio = nome;
    objs.push(g); scene.add(g);
    return g;
  }

  // Avatar via AvatarBuilder
  function avatar(opts) {
    if (typeof opts === 'string' || !opts?.nome && typeof opts !== 'object') {
      return AvatarBuilder.criar({ cor: arguments[0], nome: arguments[1], cabelo: arguments[2], chapeu: arguments[3] });
    }
    return AvatarBuilder.criar(opts);
  }
  function pet(tipo) { return AvatarBuilder.criarPet(tipo); }

  function optsAvatar() {
    return {
      cor: sessao.cor, pele: sessao.pele, cabelo: sessao.cabelo, corCabelo: sessao.corCabelo,
      chapeu: sessao.chapeu, top: sessao.top, bottom: sessao.bottom, shoes: sessao.shoes,
      expressao: sessao.expressao, boca: sessao.boca, olhos: sessao.olhos, corOlhos: sessao.corOlhos,
      corpoTipo: sessao.corpoTipo, nome: sessao.nome,
      batom: sessao.batom, blush: sessao.blush, sombra: sessao.sombra
    };
  }

  function rebuildPlayer() {
    if (!playerMesh || !scene) return;
    const px = playerMesh.position.x, py = playerMesh.position.y, pz = playerMesh.position.z, pr = playerMesh.rotation.y;
    scene.remove(playerMesh);
    playerMesh = avatar(optsAvatar());
    playerMesh.position.set(px, py, pz);
    playerMesh.rotation.y = pr;
    scene.add(playerMesh);
    if (petMesh) scene.remove(petMesh);
    if (sessao.pet) { petMesh = pet(sessao.pet); scene.add(petMesh); }
    salvarProgresso();
  }

  let _timerSalvarServidor = null;
  function salvarProgresso() {
    localStorage.setItem('mk_moedas', moedas);
    localStorage.setItem('mk_comprados', JSON.stringify([...comprados]));
    localStorage.setItem('mk_avatar', JSON.stringify(sessao));
    agendarSalvarProgressoServidor();
  }

  // Guarda o progresso também no servidor (só tem efeito de verdade quando o
  // banco de dados está configurado — veja server/db.js). Usa um pequeno atraso
  // pra não mandar uma mensagem a cada moeda coletada.
  function agendarSalvarProgressoServidor() {
    if (!socket || !socket.connected) return;
    clearTimeout(_timerSalvarServidor);
    _timerSalvarServidor = setTimeout(enviarProgressoServidorAgora, 2000);
  }
  function enviarProgressoServidorAgora() {
    if (!socket || !socket.connected) return;
    socket.emit('salvar-progresso', { deviceId, moedas, comprados: [...comprados], avatar: sessao });
  }

  function limpar() {
    [...objs, ...cols, ...plats].forEach(o => {
      scene.remove(o);
      o.traverse?.(c => { c.geometry?.dispose(); c.material?.dispose?.(); });
    });
    objs = []; cols = []; plats = []; anims = []; estado = {};
    if (skateMesh) { scene.remove(skateMesh); skateMesh = null; }
    noSkate = false;
  }

  function moeda(x, y, z) {
    const m = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), 0xFFD700, x, y, z, 1);
    m.rotation.x = Math.PI / 2; m.userData.moeda = true;
    cols.push(m); scene.add(m);
    anims.push({ m, fn: t => { m.rotation.z = t * 3; m.position.y = y + Math.sin(t * 4) * 0.12; } });
  }

  /** Galinha 🐔 */
  function galinha(x, z, corpo = 0xF5F5F5, idx = 0) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.35, 8, 6), corpo, 0, 0.35, 0));
    g.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), corpo, 0, 0.55, 0.2));
    g.add(mesh(new THREE.ConeGeometry(0.06, 0.12, 4), 0xFF0000, 0, 0.72, 0.22)); // crista
    g.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4), 0xFF9500, 0, 0.52, 0.38)); // bico
    [[-0.08, 0.08, 0.15], [0.08, 0.08, 0.15]].forEach(([px, py, pz]) => {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 4), 0xFF9500, px, py, pz));
    });
    g.add(mesh(new THREE.SphereGeometry(0.04, 4, 4), 0x222222, -0.08, 0.58, 0.32));
    g.position.set(x, 0, z);
    g.userData.galinha = true;
    g.userData.idx = idx;
    g.userData.homeX = x;
    g.userData.homeZ = z;
    objs.push(g); scene.add(g);
    anims.push({ m: g, fn: t => {
      const i = g.userData.idx;
      g.position.x = g.userData.homeX + Math.sin(t * 0.8 + i * 2) * 2.5;
      g.position.z = g.userData.homeZ + Math.cos(t * 0.6 + i * 1.5) * 2.5;
      g.rotation.y = t * 0.5 + i;
      g.position.y = Math.abs(Math.sin(t * 4 + i)) * 0.03;
    }});
    return g;
  }

  /** Pintinho 🐤 */
  function pintinho(x, z, mamaX, mamaZ, idx = 0) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.18, 8, 6), 0xFFE066, 0, 0.18, 0));
    g.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), 0xFFE066, 0, 0.18, 0.12));
    g.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 4), 0xFF9500, 0, 0.16, 0.2));
    g.add(mesh(new THREE.SphereGeometry(0.025, 4, 4), 0x222222, -0.04, 0.22, 0.14));
    g.position.set(x, 0, z);
    g.userData.pintinho = true;
    g.userData.mamaX = mamaX;
    g.userData.mamaZ = mamaZ;
    g.userData.idx = idx;
    objs.push(g); scene.add(g);
    anims.push({ m: g, fn: t => {
      const i = g.userData.idx;
      g.position.x = g.userData.mamaX + Math.sin(t * 1.2 + i * 3) * 1.2;
      g.position.z = g.userData.mamaZ + Math.cos(t * 1.0 + i * 2) * 1.2;
      g.position.y = Math.abs(Math.sin(t * 6 + i)) * 0.08;
      g.rotation.y = t * 2 + i;
    }});
    return g;
  }

  /** Ovo 🥚 */
  function ovo(x, z) {
    const o = mesh(new THREE.SphereGeometry(0.15, 8, 6), 0xFFF8E7, x, 0.15, z);
    o.scale.set(1, 1.3, 1);
    o.userData.ovo = true;
    cols.push(o); scene.add(o);
    anims.push({ m: o, fn: t => { o.rotation.y = Math.sin(t * 2 + x) * 0.1; } });
    return o;
  }

  /** Cerca da fazenda */
  function cerca(x1, z1, x2, z2) {
    const passos = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
    for (let i = 0; i <= passos; i++) {
      const t = passos > 0 ? i / passos : 0;
      const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      const poste = mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), 0x8B4513, x, 0.35, z);
      objs.push(poste); scene.add(poste);
    }
  }

  // ── Animais 3D reais da fazenda (Quaternius, CC0) ──
  const _animalGltfCache = {};
  let _animalGltfLoader = null;
  function obterAnimalLoader() {
    if (!_animalGltfLoader && window.THREE && THREE.GLTFLoader) _animalGltfLoader = new THREE.GLTFLoader();
    return _animalGltfLoader;
  }
  function carregarAnimalGLTF(arquivo) {
    if (_animalGltfCache[arquivo]) return _animalGltfCache[arquivo];
    const loader = obterAnimalLoader();
    _animalGltfCache[arquivo] = new Promise((resolve, reject) => {
      if (!loader) { reject('loader indisponivel'); return; }
      loader.load('modelos/animais/' + arquivo, resolve, undefined, reject);
    });
    return _animalGltfCache[arquivo];
  }
  /** Coloca um animal 3D real (vaca, cavalo, jumento...) parado/pastando na cena */
  function animalFazenda(arquivo, x, z, alturaAlvo, rotY) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8), 0xCCCCCC, 0, 0.4, 0));
    g.position.set(x, 0, z);
    g.rotation.y = rotY || 0;
    g.userData.animalFazenda = true;
    objs.push(g); scene.add(g);
    carregarAnimalGLTF(arquivo).then(gltf => {
      const clone = THREE.SkeletonUtils.clone(gltf.scene);
      clone.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        if (o.material) o.material = o.material.clone();
      });
      const box1 = new THREE.Box3().setFromObject(clone);
      const tam = new THREE.Vector3(); box1.getSize(tam);
      const escala = alturaAlvo / Math.max(tam.y, 0.01);
      clone.scale.setScalar(escala);
      const box2 = new THREE.Box3().setFromObject(clone);
      clone.position.y -= box2.min.y;
      while (g.children.length) g.remove(g.children[0]);
      g.add(clone);
      const mixer = new THREE.AnimationMixer(clone);
      const clipeIdle = THREE.AnimationClip.findByName(gltf.animations, 'Eating') ||
        THREE.AnimationClip.findByName(gltf.animations, 'Idle_Headlow') ||
        THREE.AnimationClip.findByName(gltf.animations, 'Idle');
      if (clipeIdle) mixer.clipAction(clipeIdle).play();
      g.userData.mixer = mixer;
    }).catch(() => { /* rede falhou — mantem o cone cinza como reserva */ });
    anims.push({ m: g, fn: t => {
      const mx = g.userData.mixer;
      if (!mx) return;
      if (g.userData._lastT == null) g.userData._lastT = t;
      const dt = Math.min(Math.max(t - g.userData._lastT, 0), 0.1);
      g.userData._lastT = t;
      mx.update(dt);
    }});
    return g;
  }

  // ── Apartamento estilo Angela ──
  const CHAO = 0xFFE4EC, PAREDE = 0xFFF8F0, ROSA = 0xFFB6D9, MINT = 0xB8E6D5;

  function apAngela(w, d, chao, parede) {
    plat(w, 0.12, d, chao, 0, -0.06, 0);
    const hw = w / 2, hd = d / 2;
    [[0, 1.35, -hd, w, 2.7, 0.12], [-hw, 1.35, 0, 0.12, 2.7, d], [hw, 1.35, 0, 0.12, 2.7, d]].forEach(([x, y, z, ww, h, dd]) => {
      const p = mesh(new THREE.BoxGeometry(ww, h, dd), parede, x, y, z);
      objs.push(p); scene.add(p);
    });
    const rodape = mesh(new THREE.BoxGeometry(w, 0.06, 0.08), ROSA, 0, 0.03, -hd + 0.06);
    objs.push(rodape); scene.add(rodape);
  }

  function porta(x, z, cor, destino, label) {
    const p = mesh(new THREE.BoxGeometry(1.4, 2.2, 0.15), cor, x, 1.1, z);
    p.userData.porta = destino; p.userData.predio = label;
    objs.push(p); scene.add(p);
    const placa = mesh(new THREE.BoxGeometry(1.2, 0.35, 0.05), 0xFFFFFF, x, 2.35, z);
    objs.push(placa); scene.add(placa);
  }

  function checkPortas() {
    objs.forEach(o => {
      if (!o.userData.porta) return;
      if (Math.abs(jog.x - o.position.x) < 2 && Math.abs(jog.z - o.position.z) < 2) {
        const z = o.userData.porta;
        if (z && z !== jogoAtual) { irPara(z); toast(o.userData.predio); }
      }
    });
  }

  const ZONAS = {
    cidade: {
      nome: 'Mapa',
      load() {
        plat(24, 0.1, 24, CHAO, 0, -0.05, 0);
        apAngela(22, 22, CHAO, PAREDE);
        objs.push(mesh(new THREE.BoxGeometry(8, 0.08, 8), ROSA, 0, 0.04, 0));
        scene.add(objs[objs.length - 1]);
        porta(-6, -8, 0xFF69B4, 'casa', 'Sala');
        porta(6, -8, 0xC084FC, 'escola', 'Quarto');
        porta(-6, 8, 0xFDE047, 'pizza', 'Cozinha');
        porta(6, 8, 0x67E8F9, 'praia', 'Banheiro');
        porta(0, -9, 0xFF1493, 'parque', 'Closet');
        porta(0, 9, 0x86EFAC, 'skate', 'Cidade');
        for (let i = 0; i < 8; i++) moeda((Math.random() - .5) * 16, 0.5, (Math.random() - .5) * 16);
        pontos('Mapa do apartamento - va ate uma porta!');
      },
      update() { checkPortas(); colidirMoedas(); }
    },
    casa: {
      nome: 'Sala',
      load() {
        apAngela(18, 16, 0xF5E6D3, 0xFFF0F5);
        colocarMovelFixo('sofa', -2, 0.4, 1);
        colocarMovelFixo('tv', 0, 1, -6);
        colocarMovelFixo('planta', 5, 0.4, 2);
        colocarMovelFixo('luminaria', -5, 0.6, -1);
        objs.push(mesh(new THREE.BoxGeometry(2, 0.08, 1), 0xDEB887, 2, 0.45, 0));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.BoxGeometry(3, 1.8, 0.08), 0x87CEEB, 0, 1.2, 7.5));
        scene.add(objs[objs.length - 1]);
        const pista = mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.06, 20), 0xFF85C0, 2, 0.03, 0, 1);
        pista.userData.danca = true;
        objs.push(pista); scene.add(pista);
        anims.push({ m: pista, fn: t => { pista.material.emissiveIntensity = 0.15 + Math.sin(t * 3) * 0.1; } });
        for (let i = 0; i < 5; i++) moeda((Math.random() - .5) * 12, 0.5, (Math.random() - .5) * 10);
        estado.moveis = 4;
        pontos('Sala - sofa, TV e pista de danca rosa!');
        document.getElementById('btn-movel')?.classList.remove('oculto');
      },
      update() { colidirMoedas(); }
    },
    escola: {
      nome: 'Quarto',
      load() {
        apAngela(16, 14, 0xE8DAFF, 0xFDF4FF);
        const cama = mesh(new THREE.BoxGeometry(3, 0.5, 2.2), 0xFF69B4, -4, 0.25, -3);
        objs.push(cama); scene.add(cama);
        plats.push(cama);
        objs.push(mesh(new THREE.BoxGeometry(3.2, 0.15, 2.4), 0xFFFFFF, -4, 0.55, -3));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), 0xDEB887, -4, 0.35, -5.5));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.BoxGeometry(2.5, 1.8, 0.08), 0xFFD700, 4, 1.5, -6));
        scene.add(objs[objs.length - 1]);
        const console = mesh(new THREE.BoxGeometry(1.2, 0.4, 0.6), 0x333333, 4, 0.5, 2);
        console.userData.danca = true;
        objs.push(console); scene.add(console);
        for (let i = 0; i < 6; i++) moeda((Math.random() - .5) * 10, 0.5, (Math.random() - .5) * 10);
        pontos('Quarto - cama rosa, poster e dancar no videogame!');
      },
      update() {
        if (jog.x < -2 && jog.z < -1 && jog.y <= 0.6) { jog.velY = 9; toast('Pula na cama!'); FX.sons.pular(); }
        objs.forEach(o => {
          if (o.userData.danca && dist(o) < 2.5) {
            if (!estado._dancaHint) { estado._dancaHint = true; toast('Toque ! para dancar!'); }
          }
        });
        colidirMoedas();
      }
    },
    pizza: {
      nome: 'Cozinha',
      load() {
        apAngela(16, 14, 0xFFF5E6, 0xFFFAF0);
        const geladeira = mesh(new THREE.BoxGeometry(1.2, 2.2, 0.8), 0xE0E0E0, -6, 1.1, -5);
        geladeira.userData.comida = true;
        objs.push(geladeira); scene.add(geladeira);
        objs.push(mesh(new THREE.BoxGeometry(3, 0.9, 0.6), 0xDEB887, 0, 0.45, -5));
        scene.add(objs[objs.length - 1]);
        const liquidificador = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8), 0xFF69B4, 2, 0.75, -4.5);
        liquidificador.userData.smoothie = true;
        objs.push(liquidificador); scene.add(liquidificador);
        [[-2, 0.5, 2], [2, 0.5, 2]].forEach(([x, y, z]) => {
          objs.push(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 8), 0x8B4513, x, y, z));
          scene.add(objs[objs.length - 1]);
          const fruta = mesh(new THREE.SphereGeometry(0.2, 8, 6), [0xFF6B35, 0xFFD700, 0xFF1493][Math.abs(x) % 3], x, 0.65, z);
          fruta.userData.fruta = true;
          cols.push(fruta); scene.add(fruta);
        });
        for (let i = 0; i < 5; i++) moeda((Math.random() - .5) * 10, 0.5, (Math.random() - .5) * 8);
        pontos('Cozinha - geladeira, liquidificador e frutas!');
      },
      update() {
        objs.forEach(o => {
          if (o.userData.comida && dist(o) < 2.5) { moedas += 10; atualizarMoedas(); FX.sons.moeda(); toast('Lanche! +10'); o.userData.comida = false; setTimeout(() => { o.userData.comida = true; }, 4000); }
          if (o.userData.smoothie && dist(o) < 2) { FX.sons.conquista(); toast('Smoothie pronto!'); FX.burst(scene, o.position.x, o.position.y, o.position.z, 0xFF69B4); }
        });
        cols.forEach(c => {
          if (c.userData.coletada || !c.userData.fruta) return;
          if (dist(c) < 1.2) { c.userData.coletada = true; scene.remove(c); moedas += 8; atualizarMoedas(); FX.sons.moeda(); toast('Fruta! +8'); }
        });
        colidirMoedas();
      }
    },
    praia: {
      nome: 'Banheiro',
      load() {
        apAngela(14, 12, 0xE0F7FA, 0xF0FFFF);
        const banheira = mesh(new THREE.BoxGeometry(2.2, 0.7, 1.2), 0xFFFFFF, -3, 0.35, -2);
        banheira.userData.banho = true;
        objs.push(banheira); scene.add(banheira);
        const agua = mesh(new THREE.BoxGeometry(1.8, 0.4, 0.9), 0x67E8F9, -3, 0.55, -2);
        agua.material.transparent = true; agua.material.opacity = 0.7;
        objs.push(agua); scene.add(agua);
        anims.push({ m: agua, fn: t => { agua.material.emissiveIntensity = 0.1 + Math.sin(t * 2) * 0.05; } });
        const vaso = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), 0xFFFFFF, 4, 0.25, -4);
        vaso.userData.vaso = true;
        objs.push(vaso); scene.add(vaso);
        objs.push(mesh(new THREE.BoxGeometry(1, 0.8, 0.4), 0xE0E0E0, 4, 0.8, 2));
        scene.add(objs[objs.length - 1]);
        const espelho = mesh(new THREE.BoxGeometry(1.5, 1.8, 0.06), 0xADD8E6, 0, 1.4, 5.5);
        espelho.userData.espelho = true;
        objs.push(espelho); scene.add(espelho);
        const pente = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.15), 0xFF69B4, -4, 0.9, 5);
        pente.userData.maquiagem = true;
        objs.push(pente); scene.add(pente);
        for (let i = 0; i < 4; i++) moeda((Math.random() - .5) * 8, 0.5, (Math.random() - .5) * 8);
        pontos('Banheiro - va ao espelho e toque ! para maquiagem!');
      },
      update() {
        objs.forEach(o => {
          if (o.userData.banho && dist(o) < 2.5) { toast('Banho de espuma!'); FX.burst(scene, o.position.x, 1, o.position.z, 0x67E8F9); FX.sons.pular(); }
        });
        colidirMoedas();
      }
    },
    parque: {
      nome: 'Closet',
      load() {
        apAngela(16, 14, 0xFCE7F3, 0xFFF1F2);
        objs.push(mesh(new THREE.BoxGeometry(4, 2.5, 0.6), 0xDEB887, -4, 1.25, -5));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.BoxGeometry(4, 2.5, 0.6), 0xDEB887, 4, 1.25, -5));
        scene.add(objs[objs.length - 1]);
        const espelhoGr = mesh(new THREE.BoxGeometry(2, 2.5, 0.08), 0xB0E0E6, 0, 1.5, 5);
        espelhoGr.userData.closet = true;
        espelhoGr.userData.maquiagem = true;
        objs.push(espelhoGr); scene.add(espelhoGr);
        objs.push(mesh(new THREE.BoxGeometry(1.5, 0.8, 0.8), 0xFF69B4, 0, 0.4, 0));
        scene.add(objs[objs.length - 1]);
        [[-3, 0.3, 2], [0, 0.3, 2], [3, 0.3, 2]].forEach(([x, y, z], i) => {
          const sap = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.5), [0xFF1493, 0xFFFFFF, 0xFFD700][i], x, y, z);
          objs.push(sap); scene.add(sap);
        });
        for (let i = 0; i < 6; i++) moeda((Math.random() - .5) * 10, 0.5, (Math.random() - .5) * 10);
        pontos('Closet - guarda-roupa e maquiagem! Toque R ou !');
      },
      update() {
        colidirMoedas();
      }
    },
    skate: {
      nome: 'Cidade',
      load() {
        plat(30, 0.15, 30, 0xCCCCCC, 0, -0.08, 0);
        plat(28, 0.1, 28, 0xE8E8E8, 0, 0, 0, 'calcada');
        predio('LOJA', 0xFF69B4, -8, -8, 4, 5, 4);
        predio('PARIS', 0xC084FC, 8, -8, 4, 6, 4);
        predio('PRAIA', 0x67E8F9, -8, 8, 4, 4, 4);
        predio('PARQUE', 0x86EFAC, 8, 8, 5, 4, 4);
        objs.push(mesh(new THREE.BoxGeometry(0.8, 5, 0.8), 0x888888, 0, 2.5, -10));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.ConeGeometry(1.2, 1.5, 4), 0xFF1493, 0, 6, -10));
        scene.add(objs[objs.length - 1]);
        for (let i = 0; i < 10; i++) moeda((Math.random() - .5) * 22, 0.5, (Math.random() - .5) * 22);
        pontos('🧱 Toque no tijolo para construir!');
      },
      update() {
        objs.forEach(o => {
          if (!o.userData.predio) return;
          if (Math.abs(jog.x - o.position.x) < 4 && Math.abs(jog.z - o.position.z) < 4) {
            const map = { LOJA: 'cidade', PARIS: 'fazenda', PRAIA: 'pesca', PARQUE: 'parquediversoes' };
            const z = map[o.userData.predio];
            if (z) { irPara(z); toast('Viajando: ' + o.userData.predio); }
          }
        });
        colidirMoedas();
      }
    },
    pesca: {
      nome: '🎣 Pesca',
      load() {
        plat(20, 0.3, 20, 0x5cb85c, 0, -0.15, 0, true);
        const lago = mesh(new THREE.CylinderGeometry(7, 7, 0.2, 20), 0x4aadee, 0, -0.05, 0);
        lago.material.transparent = true; lago.material.opacity = 0.85;
        objs.push(lago); scene.add(lago);
        anims.push({ m: lago, fn: t => { lago.material.emissiveIntensity = 0.08 + Math.sin(t * 1.5) * 0.04; } });
        estado.peixes = 0;
        for (let i = 0; i < 6; i++) {
          const peixe = mesh(new THREE.SphereGeometry(0.3, 6, 4), [0xFF6B35, 0xFF1493, 0xFFD700][i % 3], (Math.random() - .5) * 8, -0.2, (Math.random() - .5) * 8);
          peixe.userData.peixe = true; peixe.userData.vivo = true;
          cols.push(peixe); scene.add(peixe);
          anims.push({ m: peixe, fn: t => {
            if (!peixe.userData.vivo) return;
            peixe.position.x += Math.sin(t + i) * 0.02;
            peixe.position.z += Math.cos(t * 0.7 + i) * 0.02;
          }});
        }
        pontos('🎣 Chegue perto da água e toque ✋!');
      },
      update() {
        if (jog.y <= 0.5 && dist({ position: { x: 0, z: 0 } }) < 8) {
          cols.forEach(p => {
            if (!p.userData.peixe || !p.userData.vivo) return;
            if (dist(p) < 2) {
              p.userData.vivo = false; scene.remove(p);
              estado.peixes = (estado.peixes || 0) + 1;
              moedas += 20; atualizarMoedas();
              FX.sons.moeda(); toast('🐟 Peixe! +20 moedas');
              pontos('🎣 Peixes: ' + estado.peixes);
            }
          });
        }
      }
    },
    fazenda: {
      nome: '🌾 Fazenda',
      load() {
        plat(35, 0.3, 35, 0, 0, -0.15, 0, true);
        const celeiro = new THREE.Group();
        const paredeCeleiro = mesh(new THREE.BoxGeometry(8, 4, 6), 0xffffff, 0, 2, -8);
        texturizar(paredeCeleiro, obterTexturaMadeira('#C23B22', '#8B2A18'), 4, 2);
        celeiro.add(paredeCeleiro);
        const telhado = mesh(new THREE.ConeGeometry(5.5, 2.5, 4), 0xffffff, 0, 5.2, -8);
        texturizar(telhado, obterTexturaTelha('#5B3A29', '#432A1D'), 4, 2);
        telhado.rotation.y = Math.PI / 4;
        celeiro.add(telhado);
        const gableCeleiro = mesh(new THREE.BoxGeometry(2, 2.5, 0.2), 0xFFFFFF, 0, 1.25, -4.9);
        celeiro.add(gableCeleiro);
        const janelaCeleiro = mesh(new THREE.CircleGeometry(0.55, 12), 0xBEE7FA, 0, 3.2, -4.85);
        celeiro.add(janelaCeleiro);
        objs.push(celeiro); scene.add(celeiro);
        const galinheiro = new THREE.Group();
        const paredeGalinheiro = mesh(new THREE.BoxGeometry(5, 2, 4), 0xffffff, 6, 1, 5);
        texturizar(paredeGalinheiro, obterTexturaMadeira('#DDB27A', '#B98950'), 3, 1.5);
        galinheiro.add(paredeGalinheiro);
        const telhadoGalinheiro = mesh(new THREE.ConeGeometry(3.5, 1.5, 4), 0xffffff, 6, 2.8, 5);
        texturizar(telhadoGalinheiro, obterTexturaTelha('#8B5A2B', '#6E4520'), 3, 2);
        galinheiro.add(telhadoGalinheiro);
        galinheiro.add(mesh(new THREE.BoxGeometry(1.2, 1, 0.1), 0x654321, 6, 0.6, 7));
        objs.push(galinheiro); scene.add(galinheiro);
        cerca(-15, -15, 15, -15); cerca(15, -15, 15, 15);
        cerca(15, 15, -15, 15); cerca(-15, 15, -15, -15);
        animalFazenda('Cow.gltf', 11, 11, 1.15, Math.PI * 0.75);
        animalFazenda('Horse.gltf', -11, 11, 1.5, -Math.PI / 4);
        animalFazenda('Donkey.gltf', 11, -11, 1.3, Math.PI / 2);
        [[-8, 3], [8, -3], [-5, -10]].forEach(([x, z]) => {
          const feno = mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 8), 0xFFD700, x, 0.6, z);
          feno.rotation.z = Math.PI / 2; objs.push(feno); scene.add(feno);
        });
        for (let i = 0; i < 8; i++) {
          const mx = -12 + i * 3.5, mz = -12;
          objs.push(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 4), 0x228B22, mx, 0.6, mz));
          scene.add(objs[objs.length - 1]);
          objs.push(mesh(new THREE.SphereGeometry(0.15, 6, 4), 0xFFD700, mx, 1.3, mz));
          scene.add(objs[objs.length - 1]);
        }
        const trator = new THREE.Group();
        trator.add(mesh(new THREE.BoxGeometry(2, 1.2, 1.5), 0x2ECC71, 0, 0.6, -2));
        trator.add(mesh(new THREE.BoxGeometry(1, 0.8, 1), 0x27AE60, -0.8, 1.1, -2));
        [[-0.6, 0.35, -2.8], [0.6, 0.35, -2.8], [-0.6, 0.35, -1.2], [0.6, 0.35, -1.2]].forEach(([x, y, z]) => {
          trator.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8), 0x222222, x, y, z));
        });
        trator.position.set(-10, 0, 0); objs.push(trator); scene.add(trator);
        const galinhasPos = [[-3, 2], [2, 5], [5, 0], [-2, -4], [8, 3], [-6, 6]];
        const coresG = [0xF5F5F5, 0xDEB887, 0xFFFFFF, 0xD2B48C, 0xF5F5F5, 0x8B7355];
        galinhasPos.forEach(([x, z], i) => {
          galinha(x, z, coresG[i], i);
          pintinho(x + 0.5, z + 0.5, x, z, i * 2);
          pintinho(x - 0.4, z + 0.3, x, z, i * 2 + 1);
        });
        estado.ovos = 0; estado.totalOvos = 12;
        for (let i = 0; i < 12; i++) ovo((Math.random() - .5) * 22, (Math.random() - .5) * 22);
        const balde = mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.5, 8), 0x888888, 0, 0.25, 8);
        balde.userData.racao = true; objs.push(balde); scene.add(balde);
        for (let i = 0; i < 6; i++) moeda((Math.random() - .5) * 25, 0.5, (Math.random() - .5) * 25);
        pontos('🐔 Colete ovos! Alimente as galinhas ✋');
      },
      update() {
        cols.forEach(o => {
          if (o.userData.coletada || !o.userData.ovo) return;
          const dx = jog.x - o.position.x, dz = jog.z - o.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
            o.userData.coletada = true; scene.remove(o);
            estado.ovos = (estado.ovos || 0) + 1;
            moedas += 8; atualizarMoedas();
            FX.sons.moeda(); FX.burst(scene, o.position.x, 0.2, o.position.z, 0xFFF8E7);
            pontos('🥚 Ovos: ' + estado.ovos + '/' + estado.totalOvos);
            if (estado.ovos >= estado.totalOvos) {
              FX.sons.conquista(); FX.confete(scene, jog.x, jog.y + 1, jog.z);
              toast('🎉 Todos os ovos! Novos ovos em breve...');
              setTimeout(() => {
                if (jogoAtual !== 'fazenda') return;
                for (let i = 0; i < 8; i++) ovo((Math.random() - .5) * 22, (Math.random() - .5) * 22);
                estado.ovos = 0; estado.totalOvos = 8;
                pontos('🥚 Novos ovos apareceram!');
              }, 3000);
            }
          }
        });
        objs.forEach(o => {
          if (o.userData.racao && dist(o) < 2 && !estado.alimentou) {
            estado.alimentou = true; moedas += 25; atualizarMoedas();
            FX.sons.conquista(); toast('🌽 Galinhas felizes! +25');
            setTimeout(() => { estado.alimentou = false; }, 5000);
          }
          if (o.userData.galinha && dist(o) < 1.5 && !o.userData.cocorico) {
            o.userData.cocorico = true; toast('🐔 Cocoricó!'); FX.sons.galinha();
            setTimeout(() => { o.userData.cocorico = false; }, 4000);
          }
        });
        colidirMoedas();
      }
    },
    parquediversoes: {
      nome: '🎡 Parque',
      load() {
        plat(28, 0.3, 28, 0x5cb85c, 0, -0.15, 0, true);
        // Roda gigante
        const roda = new THREE.Group();
        roda.add(mesh(new THREE.TorusGeometry(4, 0.15, 6, 24), 0xFF1493, 0, 5, -5));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          roda.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), 0xFFD700, Math.cos(a) * 4, 5 + Math.sin(a) * 4, -5));
        }
        anims.push({ m: roda, fn: t => { roda.rotation.z = t * 0.3; } });
        objs.push(roda); scene.add(roda);
        // Trampolim
        const tramp = mesh(new THREE.CylinderGeometry(2, 2, 0.15, 12), 0x00CED1, 5, 0.1, 5);
        tramp.userData.tramp = true; objs.push(tramp); scene.add(tramp);
        // Escorregador
        const esc = mesh(new THREE.BoxGeometry(1.5, 0.1, 5), 0xFF6B35, -5, 1, 0);
        esc.rotation.x = -0.4; plats.push(esc); objs.push(esc); scene.add(esc);
        for (let i = 0; i < 10; i++) moeda((Math.random() - .5) * 22, 0.5 + Math.random(), (Math.random() - .5) * 22);
        pontos('🎡 Roda gigante, trampolim e escorregador!');
      },
      update() {
        objs.forEach(o => {
          if (o.userData.tramp && dist(o) < 2.5 && jog.chao) {
            jog.velY = 14; jog.chao = false; FX.sons.pular(); toast('🦘 Boing!');
          }
        });
        colidirMoedas();
      }
    }
  };

  function dist(o) {
    const dx = jog.x - o.position.x, dz = jog.z - o.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function colidirMoedas() {
    cols.forEach(m => {
      if (m.userData.coletada || !m.userData.moeda) return;
      const dx = jog.x - m.position.x, dy = jog.y - m.position.y, dz = jog.z - m.position.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.5) {
        m.userData.coletada = true; scene.remove(m);
        moedas += 10; atualizarMoedas();
        FX.sons.moeda(); FX.burst(scene, m.position.x, m.position.y, m.position.z);
      }
    });
  }

  function colidePlat(p) {
    const { width: w, depth: d, height: h } = p.geometry.parameters;
    const py = p.position.y + h / 2;
    return Math.abs(jog.x - p.position.x) < w / 2 + .35 && Math.abs(jog.z - p.position.z) < d / 2 + .35 &&
      jog.y <= py + .15 && jog.y >= py - 1.2;
  }

  function colocarMovelFixo(tipo, x, y, z) {
    const m = MOVEL_CATALOG.find(v => v.id === tipo);
    if (!m) return;
    const o = mesh(new THREE.BoxGeometry(m.w, m.h, m.d), m.cor, x, y + m.h / 2, z);
    o.userData.movel = true; objs.push(o); scene.add(o);
    if (m.fbx) montarMovelFBX(o, m, x, y, z); // troca a caixa por um modelo 3D real assim que carregar
  }

  function colocarMovel() {
    if (jogoAtual !== 'casa' || (estado.moveis || 0) >= 20) return;
    const m = MOVEL_CATALOG.find(v => v.id === movelAtual) || MOVEL_CATALOG[0];
    const x = Math.round(jog.x + Math.sin(jog.rot) * 2);
    const z = Math.round(jog.z + Math.cos(jog.rot) * 2);
    colocarMovelFixo(m.id, x, 0, z);
    estado.moveis = (estado.moveis || 0) + 1;
    FX.sons.moeda();
    toast(m.nome + ' colocado!');
    pontos('🛋️ Móveis: ' + estado.moveis + '/20');
    movelAtual = MOVEL_CATALOG[(estado.moveis || 0) % MOVEL_CATALOG.length].id;
    // Guarda no servidor: sobrevive a reload e aparece em tempo real pra quem
    // mais estiver na mesma sala (antes isso sumia ao trocar de zona).
    socket?.emit('construir', { jogo: jogoAtual, item: { tipo: 'movel', modelo: m.id, x, y: 0, z } });
  }

  /** Desenha um cubo de construção (usado tanto ao colocar um bloco novo quanto
   * ao "replayar" blocos já salvos vindos do servidor). Não mexe em estado/rede. */
  function desenharBloco(b, x, y, z) {
    const cubo = mesh(new THREE.BoxGeometry(1, 1, 1), b.cor || 0xffffff, x, y, z);
    if (b.tex === 'tijolo') texturizar(cubo, obterTexturaTijolo(), 1, 1);
    else if (b.tex === 'madeira') texturizar(cubo, obterTexturaMadeira(), 1, 1);
    else if (b.tex === 'grama') texturizar(cubo, obterTexturaGrama(), 1, 1);
    if (b.vidro) { cubo.material.transparent = true; cubo.material.opacity = 0.55; cubo.material.roughness = 0.1; cubo.material.metalness = 0.2; }
    cubo.userData.blocoCidade = true; cubo.userData.plat = true;
    objs.push(cubo); plats.push(cubo); scene.add(cubo);
    return cubo;
  }

  /** Coloca um bloco de construção na Cidade, na frente da crianca. Toques repetidos no
   * mesmo lugar empilham blocos (a crianca pode subir em cima e continuar construindo). */
  function colocarBloco() {
    if (jogoAtual !== 'skate') return;
    if ((estado.blocos || 0) >= BLOCO_LIMITE) { toast('Limite de ' + BLOCO_LIMITE + ' blocos! Va em outro lugar.'); return; }
    const b = BLOCO_CATALOG[blocoIdx % BLOCO_CATALOG.length];
    const x = Math.round(jog.x + Math.sin(jog.rot) * 2.2);
    const z = Math.round(jog.z + Math.cos(jog.rot) * 2.2);
    const chave = x + ',' + z;
    estado.blocoAlturas = estado.blocoAlturas || {};
    const nivel = estado.blocoAlturas[chave] || 0;
    if (nivel >= 8) { toast('Essa pilha ja esta bem alta!'); return; }
    const y = nivel + 0.5;
    desenharBloco(b, x, y, z);
    estado.blocoAlturas[chave] = nivel + 1;
    estado.blocos = (estado.blocos || 0) + 1;
    FX.sons.moeda();
    toast(b.nome + ' colocado! (' + estado.blocos + '/' + BLOCO_LIMITE + ')');
    blocoIdx++;
    socket?.emit('construir', { jogo: jogoAtual, item: { tipo: 'bloco', modelo: b.id, x, y, z, nivel: estado.blocoAlturas[chave] } });
  }

  /** Recria um bloco já salvo (vindo do servidor) sem emitir de volta pra rede
   * nem tocar som/toast — usado ao entrar numa sala que já tinha construções. */
  function restaurarBloco(item) {
    const b = BLOCO_CATALOG.find(v => v.id === item.modelo) || BLOCO_CATALOG[0];
    desenharBloco(b, item.x, item.y, item.z);
    const chave = item.x + ',' + item.z;
    estado.blocoAlturas = estado.blocoAlturas || {};
    estado.blocoAlturas[chave] = Math.max(estado.blocoAlturas[chave] || 0, item.nivel || ((estado.blocoAlturas[chave] || 0) + 1));
    estado.blocos = (estado.blocos || 0) + 1;
  }

  /** Aplica uma construção que veio do servidor (histórico da sala ou em tempo
   * real de outro jogador) — móvel extra na Casa ou bloco na Cidade. */
  function aplicarConstrucaoRemota(item) {
    if (!item) return;
    if (item.tipo === 'movel') {
      colocarMovelFixo(item.modelo, item.x, item.y, item.z);
      estado.moveis = (estado.moveis || 0) + 1;
    } else if (item.tipo === 'bloco') {
      restaurarBloco(item);
    }
  }

  function irPara(id) {
    if (!ZONAS[id]) return;
    limpar(); jogoAtual = id; ZONAS[id].load();
    jog.x = 0; jog.y = 2; jog.z = 0;
    const nm = document.getElementById('nome-mundo');
    if (nm && ZONAS[id]) nm.textContent = ZONAS[id].nome;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('ativo', b.dataset.jogo === id));
    document.getElementById('btn-movel')?.classList.toggle('oculto', id !== 'casa');
    document.getElementById('btn-skate')?.classList.toggle('oculto', id !== 'skate');
    document.getElementById('btn-bloco')?.classList.toggle('oculto', id !== 'skate');
    socket?.emit('trocar-jogo', id);
    FX.sons.portal();
  }

  function pontos(t) { const el = document.getElementById('hud-pontos'); if (el) el.textContent = t; }
  function atualizarMoedas() {
    document.getElementById('hud-moedas').textContent = '$ ' + moedas;
    const lm = document.getElementById('loja-moedas'); if (lm) lm.textContent = moedas;
    salvarProgresso();
  }

  // ── Minigames Angela ──
  const SETAS = { cima: '^', baixo: 'v', esq: '<', dir: '>' };
  let dancaAtiva = false, dancaSeq = [], dancaIdx = 0, dancaPontos = 0;

  function pertoDe(tipo) {
    return objs.some(o => o.userData[tipo] && dist(o) < 2.8);
  }

  function initMaquiagem() {
    const painel = document.getElementById('maquiagem');
    if (!painel) return;
    function pick(grupo, attr, campo) {
      painel.querySelectorAll(grupo + ' .cor').forEach(b => {
        b.onclick = () => {
          painel.querySelectorAll(grupo + ' .cor').forEach(x => x.classList.remove('ativa'));
          b.classList.add('ativa');
          sessao[campo] = b.dataset[attr];
        };
      });
    }
    pick('#cores-batom', 'batom', 'batom');
    pick('#cores-blush', 'blush', 'blush');
    pick('#cores-sombra', 'sombra', 'sombra');
    document.getElementById('btn-aplicar-maquiagem')?.addEventListener('click', () => {
      rebuildPlayer();
      try { localStorage.setItem('mk_avatar', JSON.stringify(sessao)); } catch {}
      FX.sons.conquista();
      FX.confete?.(scene, jog.x, jog.y + 1, jog.z);
      toast('Maquiagem aplicada!');
      fecharMaquiagem();
    });
  }

  window.abrirMaquiagem = function () {
    const painel = document.getElementById('maquiagem');
    if (!painel) return;
    ['batom', 'blush', 'sombra'].forEach(c => {
      painel.querySelectorAll('[data-' + c + ']').forEach(b => {
        b.classList.toggle('ativa', b.dataset[c] === (sessao[c] || 'rosa'));
      });
    });
    painel.classList.remove('oculto');
  };
  window.fecharMaquiagem = () => document.getElementById('maquiagem')?.classList.add('oculto');

  function mostrarSetaDanca() {
    const alvo = document.getElementById('danca-alvo');
    const barra = document.getElementById('danca-barra');
    const msg = document.getElementById('danca-msg');
    if (!dancaAtiva) return;
    if (dancaIdx >= dancaSeq.length) { finalizarDanca(); return; }
    const s = dancaSeq[dancaIdx];
    if (alvo) alvo.textContent = SETAS[s];
    if (barra) barra.style.width = ((dancaIdx / dancaSeq.length) * 100) + '%';
    if (msg) msg.textContent = 'Toque: ' + SETAS[s] + '  (' + (dancaIdx + 1) + '/' + dancaSeq.length + ')';
    document.getElementById('danca-pontos').textContent = dancaPontos;
  }

  function toqueSetaDanca(dir) {
    if (!dancaAtiva) return;
    const btns = document.querySelectorAll('.danca-btn');
    if (dir === dancaSeq[dancaIdx]) {
      dancaPontos += 10;
      dancaIdx++;
      FX.sons.moeda();
      emoteAtual = 'dancar'; emoteTimer = 0.4;
      btns.forEach(b => b.classList.remove('erro', 'acerto'));
      document.querySelector('.danca-btn[data-seta="' + dir + '"]')?.classList.add('acerto');
      mostrarSetaDanca();
    } else {
      FX.sons.pular();
      btns.forEach(b => b.classList.remove('acerto'));
      document.querySelector('.danca-btn[data-seta="' + dir + '"]')?.classList.add('erro');
      toast('Errou! Tente de novo');
      dancaIdx = 0;
      dancaPontos = Math.max(0, dancaPontos - 5);
      mostrarSetaDanca();
    }
  }

  function finalizarDanca() {
    dancaAtiva = false;
    const ganho = Math.floor(dancaPontos / 5);
    moedas += ganho;
    atualizarMoedas();
    FX.sons.conquista();
    if (ganho > 0) FX.confete?.(scene, jog.x, jog.y + 1, jog.z);
    toast('Danca! +' + ganho + ' moedas (' + dancaPontos + ' pts)');
    document.getElementById('danca-game')?.classList.add('oculto');
    emoteAtual = 'dancar'; emoteTimer = 2;
  }

  function initDanca() {
    document.querySelectorAll('.danca-btn').forEach(b => {
      b.addEventListener('click', () => toqueSetaDanca(b.dataset.seta));
    });
  }

  window.abrirDanca = function () {
    dancaAtiva = true;
    dancaPontos = 0;
    dancaIdx = 0;
    dancaSeq = [];
    const ops = ['cima', 'baixo', 'esq', 'dir'];
    for (let i = 0; i < 8; i++) dancaSeq.push(ops[Math.floor(Math.random() * ops.length)]);
    document.getElementById('danca-game')?.classList.remove('oculto');
    document.getElementById('danca-barra').style.width = '0%';
    mostrarSetaDanca();
  };
  window.fecharDanca = () => {
    dancaAtiva = false;
    document.getElementById('danca-game')?.classList.add('oculto');
  };

  // ── Emotes ──
  function emote(tipo) {
    if (tipo === 'dancar') { abrirDanca(); return; }
    emoteAtual = tipo; emoteTimer = 2.5;
    FX.sons.emote();
    socket?.emit('evento', { tipo: 'emote', emote: tipo });
    const msgs = { acenar: 'Oi!', dancar: 'Dancando!', pular: 'Pula!', comemorar: 'Uhuu!', rir: 'Haha!' };
    toast(msgs[tipo] || tipo);
  }

  function acao() {
    if (jogoAtual === 'casa') {
      if (pertoDe('danca')) abrirDanca();
      else colocarMovel();
    } else if (jogoAtual === 'parque') {
      if (pertoDe('maquiagem')) abrirMaquiagem();
      else { window.abrirGuardaRoupa?.(); toast('Guarda-roupa aberto!'); }
    } else if (jogoAtual === 'praia') {
      if (pertoDe('espelho') || pertoDe('maquiagem')) abrirMaquiagem();
      else toast('Va ate o espelho!');
    } else if (jogoAtual === 'escola') {
      if (pertoDe('danca')) abrirDanca();
      else toast('Va ao videogame para dancar!');
    } else if (jogoAtual === 'pizza') {
      objs.forEach(o => {
        if (o.userData.smoothie && dist(o) < 3) { moedas += 15; atualizarMoedas(); FX.sons.conquista(); toast('Smoothie! +15'); }
      });
    } else if (jogoAtual === 'pesca') {
      cols.forEach(p => {
        if (!p.userData.peixe || !p.userData.vivo) return;
        if (dist(p) < 3) { p.userData.vivo = false; scene.remove(p); moedas += 20; atualizarMoedas(); FX.sons.moeda(); toast('Peixe!'); }
      });
    } else if (jogoAtual === 'fazenda') {
      objs.forEach(o => {
        if (o.userData.racao && dist(o) < 3 && !estado.alimentou) {
          estado.alimentou = true; moedas += 25; atualizarMoedas();
          FX.sons.conquista(); toast('Galinhas alimentadas! +25');
          setTimeout(() => { estado.alimentou = false; }, 5000);
        }
      });
      toast('Procure ovos no chao!');
    } else if (jogoAtual === 'skate') {
      colocarBloco();
    } else emote('acenar');
  }

  let lojaCat = 'acessorios';

  window.abrirLoja = function () {
    const loja = document.getElementById('loja');
    renderLojaItens();
    document.querySelectorAll('.loja-aba').forEach(b => {
      b.onclick = () => { lojaCat = b.dataset.cat; document.querySelectorAll('.loja-aba').forEach(x => x.classList.remove('ativa')); b.classList.add('ativa'); renderLojaItens(); };
    });
    atualizarMoedas();
    loja.classList.remove('oculto');
  };

  function renderLojaItens() {
    const itens = document.getElementById('loja-itens');
    if (!itens) return;
    itens.innerHTML = '';
    LOJA_ITENS.filter(i => i.cat === lojaCat).forEach(item => {
      const div = document.createElement('div');
      const comp = comprados.has(item.id);
      div.className = 'loja-item' + (comp ? ' comprado' : '');
      div.innerHTML = `<span>${item.nome}</span><span>$ ${item.preco}</span>`;
      const btn = document.createElement('button');
      if (comp) { btn.textContent = 'Equipar'; btn.className = 'equipar'; btn.onclick = () => equipar(item); }
      else { btn.textContent = 'Comprar'; btn.disabled = moedas < item.preco; btn.onclick = () => comprar(item); }
      div.appendChild(btn);
      itens.appendChild(div);
    });
  }

  window.fecharLoja = () => document.getElementById('loja').classList.add('oculto');

  window.abrirGuardaRoupa = function () {
    const el = document.getElementById('guarda-roupa');
    const itens = document.getElementById('guarda-itens');
    itens.innerHTML = '';
    LOJA_ITENS.filter(i => comprados.has(i.id)).forEach(item => {
      const div = document.createElement('div');
      div.className = 'loja-item comprado';
      div.innerHTML = `<span>${item.nome}</span>`;
      const btn = document.createElement('button');
      btn.textContent = 'Equipar'; btn.className = 'equipar';
      btn.onclick = () => { equipar(item); fecharGuardaRoupa(); };
      div.appendChild(btn);
      itens.appendChild(div);
    });
    if (!itens.children.length) itens.innerHTML = '<p style="padding:12px;color:#888">Compre itens na loja</p>';
    el.classList.remove('oculto');
  };
  window.fecharGuardaRoupa = () => document.getElementById('guarda-roupa').classList.add('oculto');

  function equipar(item) {
    if (item.tipo === 'chapeu') sessao.chapeu = item.id;
    else if (item.tipo === 'top') sessao.top = item.val;
    else if (item.tipo === 'bottom') sessao.bottom = item.val;
    else if (item.tipo === 'shoes') sessao.shoes = item.val;
    else if (item.tipo === 'pet') sessao.pet = item.val || item.id;
    else if (item.tipo === 'skate') noSkate = true;
    rebuildPlayer();
    FX.sons.conquista(); toast('Equipado: ' + item.nome);
  }

  function comprar(item) {
    if (moedas < item.preco || comprados.has(item.id)) return;
    moedas -= item.preco; comprados.add(item.id);
    equipar(item);
    FX.sons.conquista(); toast('Comprou: ' + item.nome);
    abrirLoja();
  }

  function irParaAlvo(x, z) {
    alvoMov = { x, z };
    touch.x = touch.z = 0;
    if (!localStorage.getItem('mk_primeiro_clique')) {
      localStorage.setItem('mk_primeiro_clique', '1');
      toast('Boneco indo ate la!');
    }
    if (!marcadorAlvo) {
      marcadorAlvo = mesh(new THREE.RingGeometry(0.25, 0.55, 20), 0xFF69B4, x, 0.06, z, 1);
      marcadorAlvo.rotation.x = -Math.PI / 2;
      anims.push({ m: marcadorAlvo, fn: t => { marcadorAlvo.material.emissiveIntensity = 0.3 + Math.sin(t * 6) * 0.2; } });
      scene.add(marcadorAlvo);
    }
    marcadorAlvo.position.set(x, 0.06, z);
    marcadorAlvo.visible = true;
  }

  function initClickMove() {
    const cv = renderer.domElement;
    function apontar(clientX, clientY) {
      const rect = cv.getBoundingClientRect();
      const cx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const cy = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x: cx, y: cy }, camera);
      if (raycaster.ray.intersectPlane(planoChao, pontoRay)) {
        irParaAlvo(pontoRay.x, pontoRay.z);
      }
    }
    cv.addEventListener('click', e => {
      if (e.target !== cv) return;
      apontar(e.clientX, e.clientY);
    });
    cv.addEventListener('touchend', e => {
      if (e.target !== cv || joyId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      if (t.clientX < 160 && t.clientY > innerHeight - 220) return;
      if (t.clientX > innerWidth - 110 && t.clientY > innerHeight - 280) return;
      apontar(t.clientX, t.clientY);
    }, { passive: true });
    cv.style.cursor = 'crosshair';
  }

  function initTutorial() {
    const tut = document.getElementById('tutorial-controles');
    const btn = document.getElementById('btn-fechar-tutorial');
    const ajuda = document.getElementById('btn-ajuda');
    if (!tut) return;
    const fechar = () => {
      tut.classList.add('oculto');
      document.body.classList.add('tutorial-fechado');
      localStorage.setItem('mk_tutorial', '1');
    };
    if (localStorage.getItem('mk_tutorial')) {
      tut.classList.add('oculto');
      document.body.classList.add('tutorial-fechado');
    }
    btn?.addEventListener('click', fechar);
    ajuda?.addEventListener('click', () => tut.classList.remove('oculto'));
    window.fecharTutorial = fechar;
    window.mostrarTutorial = () => tut.classList.remove('oculto');
  }

  window.pegarBonus = function () {
    if (bonusPego) return;
    bonusPego = true;
    moedas += 50; atualizarMoedas();
    localStorage.setItem('bonus_' + new Date().toDateString(), '1');
    FX.sons.conquista(); FX.confete(scene, jog.x, jog.y + 1, jog.z);
    document.getElementById('bonus-diario').classList.add('oculto');
    toast('🎁 +50 moedas!');
  };

  // ── Touch / Teclado / Voz (compacto) ──
  function initTouch() {
    const area = document.getElementById('joystick-area'), fundo = document.getElementById('joystick-fundo'), bola = document.getElementById('joystick-bolinha');
    if (!area) return;
    const reset = () => { joyId = null; touch.x = touch.z = 0; bola.style.transform = 'translate(-50%,-50%)'; };
    area.addEventListener('touchstart', e => { e.preventDefault(); document.body.classList.add('tutorial-fechado'); alvoMov = null; if (marcadorAlvo) marcadorAlvo.visible = false; if (joyId !== null) return; joyId = e.changedTouches[0].identifier; moveJoy(e.changedTouches[0], fundo, bola); }, { passive: false });
    area.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joyId) { moveJoy(t, fundo, bola); break; } }, { passive: false });
    area.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === joyId) reset(); });
    document.getElementById('btn-pular')?.addEventListener('touchstart', e => { e.preventDefault(); touch.pular = true; }, { passive: false });
    document.getElementById('btn-pular')?.addEventListener('touchend', e => { e.preventDefault(); touch.pular = false; });
    document.getElementById('btn-acao')?.addEventListener('touchstart', e => { e.preventDefault(); acao(); }, { passive: false });
    document.getElementById('btn-skate')?.addEventListener('touchstart', e => { e.preventDefault(); noSkate = !noSkate; toast(noSkate ? '🛹 Skate ON!' : '🛹 Skate OFF'); }, { passive: false });
    document.getElementById('btn-movel')?.addEventListener('touchstart', e => { e.preventDefault(); colocarMovel(); }, { passive: false });
    document.getElementById('btn-bloco')?.addEventListener('touchstart', e => { e.preventDefault(); colocarBloco(); }, { passive: false });
    // Clique de mouse (desktop) — os toques acima ja cobrem celular/tablet
    document.getElementById('btn-acao')?.addEventListener('click', acao);
    document.getElementById('btn-movel')?.addEventListener('click', colocarMovel);
    document.getElementById('btn-bloco')?.addEventListener('click', colocarBloco);
  }
  function moveJoy(t, fundo, bola) {
    const r = fundo.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy, d = Math.sqrt(dx * dx + dy * dy);
    if (d > RAIO) { dx = dx / d * RAIO; dy = dy / d * RAIO; }
    bola.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    touch.x = dx / RAIO; touch.z = dy / RAIO;
  }
  function initTeclado() {
    document.addEventListener('keydown', e => {
      teclas[e.code] = true;
      if (e.code === 'KeyE') acao();
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'].includes(e.code)) {
        const zonas = ['casa', 'escola', 'pizza', 'praia', 'parque', 'cidade', 'skate'];
        irPara(zonas[parseInt(e.code.replace('Digit', '')) - 1] || 'cidade');
      }
    });
    document.addEventListener('keyup', e => { teclas[e.code] = false; });
  }
  function initVoz(sock, id) {
    const btn = document.getElementById('btn-voz');
    let stream = null; const peers = new Map();
    (async () => { try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); stream.getAudioTracks().forEach(t => { t.enabled = false; }); } catch { btn.textContent = '🔇'; } })();
    const f = () => { stream?.getAudioTracks().forEach(t => { t.enabled = true; }); btn.classList.add('falando'); };
    const c = () => { stream?.getAudioTracks().forEach(t => { t.enabled = false; }); btn.classList.remove('falando'); };
    btn.onmousedown = f; btn.onmouseup = btn.onmouseleave = c;
    btn.ontouchstart = e => { e.preventDefault(); f(); }; btn.ontouchend = c;
    function peer(pid) {
      if (peers.has(pid)) return peers.get(pid);
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      stream?.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = e => e.candidate && sock.emit('voz-ice', { para: pid, candidato: e.candidate });
      pc.ontrack = e => { let a = document.getElementById('aud-' + pid); if (!a) { a = document.createElement('audio'); a.id = 'aud-' + pid; a.autoplay = true; document.body.appendChild(a); } a.srcObject = e.streams[0]; };
      peers.set(pid, pc); return pc;
    }
    async function of(pid) { const pc = peer(pid); const o = await pc.createOffer(); await pc.setLocalDescription(o); sock.emit('voz-oferta', { para: pid, oferta: o }); }
    sock.on('entrou', p => { if (p.id !== id) of(p.id); });
    sock.on('estado', s => s.jogadores.forEach(p => { if (p.id !== id) of(p.id); }));
    sock.on('voz-oferta', async ({ de, oferta }) => { const pc = peer(de); await pc.setRemoteDescription(oferta); const r = await pc.createAnswer(); await pc.setLocalDescription(r); sock.emit('voz-resposta', { para: de, resposta: r }); });
    sock.on('voz-resposta', async ({ de, resposta }) => { peers.get(de)?.setRemoteDescription(resposta); });
    sock.on('voz-ice', async ({ de, candidato }) => { peers.get(de)?.addIceCandidate(candidato); });
  }

  // ── Loop ──
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(relogio.getDelta(), .05), t = relogio.getElapsedTime();
    const vel = noSkate ? 12 : 6.5;

    let dx = touch.x, dz = touch.z;
    if (!dx && !dz) {
      if (teclas.KeyW || teclas.ArrowUp) dz = -1;
      if (teclas.KeyS || teclas.ArrowDown) dz = 1;
      if (teclas.KeyA || teclas.ArrowLeft) dx = -1;
      if (teclas.KeyD || teclas.ArrowRight) dx = 1;
    }
    if (dx || dz) {
      alvoMov = null;
      if (marcadorAlvo) marcadorAlvo.visible = false;
      const l = Math.sqrt(dx * dx + dz * dz);
      if (l > 1) { dx /= l; dz /= l; }
      jog.x += dx * vel * dt; jog.z += dz * vel * dt; jog.rot = Math.atan2(dx, dz);
      andando = true;
    } else if (alvoMov) {
      const ax = alvoMov.x - jog.x, az = alvoMov.z - jog.z;
      const dist = Math.sqrt(ax * ax + az * az);
      if (dist < 0.7) {
        alvoMov = null;
        if (marcadorAlvo) marcadorAlvo.visible = false;
        andando = false;
      } else {
        jog.x += (ax / dist) * vel * dt;
        jog.z += (az / dist) * vel * dt;
        jog.rot = Math.atan2(ax / dist, az / dist);
        andando = true;
      }
    } else andando = false;
    if ((teclas.Space || touch.pular) && jog.chao) { jog.velY = 11; jog.chao = false; FX.sons.pular(); }
    jog.velY -= 25 * dt; jog.y += jog.velY * dt;
    jog.chao = false; let ch = 0;
    plats.forEach(p => { if (colidePlat(p)) { ch = Math.max(ch, p.position.y + p.geometry.parameters.height / 2); jog.chao = true; } });
    if (jog.y <= ch) { jog.y = ch; jog.velY = 0; jog.chao = true; }
    if (jog.y < -10) { jog.x = 0; jog.y = 5; jog.z = 0; }

    playerMesh.position.set(jog.x, jog.y, jog.z);
    playerMesh.rotation.y = jog.rot;
    AvatarBuilder.animarCaminhada(playerMesh, t, andando && !emoteAtual);
    if (emoteAtual) {
      emoteTimer -= dt;
      if (emoteTimer <= 0) emoteAtual = null;
      else if (emoteAtual === 'dancar') { playerMesh.rotation.y += dt * 8; playerMesh.position.y = jog.y + Math.abs(Math.sin(t * 10)) * 0.25; }
      else if (emoteAtual === 'pular') jog.velY = Math.max(jog.velY, 5);
    }
    if (petMesh) {
      petMesh.position.x += (jog.x - Math.sin(jog.rot) * 1.2 - petMesh.position.x) * 0.1;
      petMesh.position.z += (jog.z - Math.cos(jog.rot) * 1.2 - petMesh.position.z) * 0.1;
      petMesh.position.y = jog.y + Math.sin(t * 5) * 0.06;
      AvatarBuilder.animarCaminhada(petMesh, t, andando);
    }

    // Camera na frente do avatar (nao atras) — assim a crianca sempre ve o rosto do boneco enquanto anda
    const alvoCamX = jog.x + Math.sin(jog.rot) * 6.5, alvoCamY = jog.y + 3.4, alvoCamZ = jog.z + Math.cos(jog.rot) * 6.5;
    if (!camPos) { camPos = new THREE.Vector3(alvoCamX, alvoCamY, alvoCamZ); camLook = new THREE.Vector3(jog.x, jog.y + 1.5, jog.z); }
    const suaviza = 1 - Math.pow(0.0001, dt); // suavizacao independente de fps — camera cinematografica, sem "pulos"
    camPos.x += (alvoCamX - camPos.x) * suaviza;
    camPos.y += (alvoCamY - camPos.y) * suaviza;
    camPos.z += (alvoCamZ - camPos.z) * suaviza;
    camLook.x += (jog.x - camLook.x) * suaviza;
    camLook.y += (jog.y + 1.5 - camLook.y) * suaviza;
    camLook.z += (jog.z - camLook.z) * suaviza;
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    Object.values(outros).forEach(o => {
      const movendo = Math.abs(o.tx - o.mesh.position.x) > 0.03 || Math.abs(o.tz - o.mesh.position.z) > 0.03;
      o.mesh.position.x += (o.tx - o.mesh.position.x) * .15;
      o.mesh.position.y += (o.ty - o.mesh.position.y) * .15;
      o.mesh.position.z += (o.tz - o.mesh.position.z) * .15;
      o.mesh.rotation.y += (o.tr - o.mesh.rotation.y) * .15;
      AvatarBuilder.animarCaminhada(o.mesh, t, movendo);
    });

    anims.forEach(a => a.fn(t));
    FX.updatePartículas(dt, scene);
    FX.moverNuvens(nuvens, dt);
    ZONAS[jogoAtual]?.update();

    if (socket && Date.now() - jog.envio > 60) {
      jog.envio = Date.now();
      socket.emit('mover', { x: jog.x, y: jog.y, z: jog.z, rot: jog.rot, jogo: jogoAtual });
    }
    renderer.render(scene, camera);
  }

  function iniciar(s) {
    sessao = s;
    FX.initAudio();
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 50, 100);
    FX.céu(scene); nuvens = FX.nuvens(scene, 10); FX.sol(scene); FX.luzes(scene);

    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 200);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    camPos = null; camLook = null;

    playerMesh = avatar(optsAvatar());
    scene.add(playerMesh);
    if (s.pet) { petMesh = pet(s.pet); scene.add(petMesh); }

    atualizarMoedas();
    document.getElementById('btn-guarda-roupa')?.addEventListener('click', abrirGuardaRoupa);

    initTouch(); initTeclado(); initClickMove(); initTutorial(); initMaquiagem(); initDanca();
    document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => irPara(b.dataset.jogo));
    document.querySelectorAll('.btn-emote').forEach(b => b.onclick = () => emote(b.dataset.emote));

    const srv = window.getServerUrl();
    socket = srv ? io(srv, { transports: ['websocket', 'polling'] }) : io();
    socket.on('connect', () => { meuId = socket.id; socket.emit('entrar', { code: s.code, nome: s.nome, ...optsAvatar(), pet: s.pet, deviceId }); });
    socket.on('estado', st => {
      st.jogadores.forEach(j => { if (j.id !== meuId) addOutro(j); });
      document.getElementById('badge-online').textContent = st.jogadores.length + ' online';
      initVoz(socket, meuId);
      (st.construcoes || []).forEach(aplicarConstrucaoRemota);
    });
    socket.on('entrou', j => { addOutro(j); toast(j.nome + ' chegou!'); });
    socket.on('saiu', ({ id }) => { if (outros[id]) { scene.remove(outros[id].mesh); delete outros[id]; } });
    socket.on('moveu', d => { if (outros[d.id]) Object.assign(outros[d.id], { tx: d.x, ty: d.y, tz: d.z, tr: d.rot }); });
    socket.on('evento', ev => { if (ev.tipo === 'emote') toast('Alguém está se divertindo! 🎉'); });
    socket.on('erro', ({ msg }) => alert(msg));
    // Progresso salvo no servidor (moedas/itens/aparência) — só chega algo aqui
    // quando o banco de dados está configurado e já existe progresso salvo para
    // este dispositivo (ex: reabrindo o jogo depois de limpar o navegador não
    // ajuda, mas trocar de aba ou reconectar sim).
    socket.on('progresso', p => {
      if (!p) return;
      let mudouAvatar = false;
      if (typeof p.moedas === 'number') moedas = p.moedas;
      if (Array.isArray(p.comprados)) { comprados.clear(); p.comprados.forEach(id => comprados.add(id)); }
      if (p.avatar && typeof p.avatar === 'object' && Object.keys(p.avatar).length) { Object.assign(sessao, p.avatar); mudouAvatar = true; }
      atualizarMoedas();
      if (mudouAvatar) rebuildPlayer(); else salvarProgresso();
    });
    // Construções de outros jogadores/sessões anteriores nesta mesma sala —
    // chega ao trocar de zona (resposta a 'trocar-jogo') ou em tempo real quando
    // alguém constrói algo enquanto você está na mesma zona.
    socket.on('construcoes', ({ jogo, itens }) => { if (jogo === jogoAtual && Array.isArray(itens)) itens.forEach(aplicarConstrucaoRemota); });
    socket.on('construiu', ({ jogo, item }) => { if (jogo === jogoAtual) aplicarConstrucaoRemota(item); });

    // Ao fechar a aba / trocar de app, manda o progresso na hora em vez de
    // esperar o atraso normal — evita perder as últimas moedas coletadas.
    window.addEventListener('pagehide', enviarProgressoServidorAgora);
    document.addEventListener('visibilitychange', () => { if (document.hidden) enviarProgressoServidorAgora(); });

    irPara('casa'); loop();
    toast('Apartamento Angela v2 - toque no chao para andar!');

    // Bônus diário
    const hoje = new Date().toDateString();
    if (!localStorage.getItem('bonus_' + hoje)) {
      setTimeout(() => document.getElementById('bonus-diario').classList.remove('oculto'), 2000);
    }

    addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  }

  function addOutro(j) {
    if (outros[j.id]) return;
    const m = avatar({ cor: j.cor, nome: j.nome, cabelo: j.cabelo, chapeu: j.chapeu, pele: j.pele, top: j.top, bottom: j.bottom, shoes: j.shoes, corCabelo: j.corCabelo, expressao: j.expressao, boca: j.boca, olhos: j.olhos, corOlhos: j.corOlhos, corpoTipo: j.corpoTipo });
    m.position.set(j.x, j.y, j.z); scene.add(m);
    outros[j.id] = { mesh: m, tx: j.x, ty: j.y, tz: j.z, tr: j.rot || 0, jogo: j.jogo };
  }

  window.MundoKids = { iniciar };
})();
