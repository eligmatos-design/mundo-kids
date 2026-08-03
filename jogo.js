/**
 * Mundo Kids — Estilo PK XD
 */
(function () {
  'use strict';

  let scene, camera, renderer, socket, meuId, nuvens;
  let playerMesh, petMesh, skateMesh, outros = {};
  let jogoAtual = 'cidade';
  let plats = [], objs = [], cols = [], anims = [];
  let estado = {}, relogio = new THREE.Clock();
  let teclas = {}, sessao = {};
  let moedas = 0, emoteTimer = 0, emoteAtual = null;
  let noSkate = false, movelAtual = 'sofa', andando = false;
  let bonusPego = false;

  const LOJA_ITENS = [
    { id: 'coroa', nome: '👑 Coroa', preco: 100, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'oculos', nome: '😎 Óculos', preco: 80, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'asa', nome: '🦋 Asas', preco: 200, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'chapeu', nome: '🎩 Chapéu', preco: 60, tipo: 'chapeu', cat: 'acessorios' },
    { id: 'top_rosa', nome: '💗 Blusa Rosa', preco: 70, tipo: 'top', val: 'rosa', cat: 'roupas' },
    { id: 'top_verde', nome: '💚 Blusa Verde', preco: 70, tipo: 'top', val: 'verde', cat: 'roupas' },
    { id: 'bottom_saia', nome: '👗 Saia', preco: 65, tipo: 'bottom', val: 'saia', cat: 'roupas' },
    { id: 'shoes_botas', nome: '🥾 Botas', preco: 55, tipo: 'shoes', val: 'botas', cat: 'roupas' },
    { id: 'unicornio', nome: '🦄 Unicórnio', preco: 150, tipo: 'pet', val: 'unicornio', cat: 'pets' },
    { id: 'dragao', nome: '🐉 Dragão', preco: 250, tipo: 'pet', val: 'dragao', cat: 'pets' },
    { id: 'skate_dourado', nome: '🛹 Skate Dourado', preco: 120, tipo: 'skate', cat: 'acessorios' }
  ];
  const MOVEL_CATALOG = [
    { id: 'sofa', nome: '🛋️ Sofá', cor: 0xFF69B4, w: 2, h: 0.8, d: 1 },
    { id: 'cama', nome: '🛏️ Cama', cor: 0x9B59B6, w: 2, h: 0.5, d: 2.5 },
    { id: 'tv', nome: '📺 TV', cor: 0x222222, w: 1.5, h: 1, d: 0.2 },
    { id: 'mesa', nome: '🪑 Mesa', cor: 0xDEB887, w: 1.2, h: 0.7, d: 1.2 },
    { id: 'planta', nome: '🪴 Planta', cor: 0x2ECC71, w: 0.5, h: 0.8, d: 0.5 },
    { id: 'luminaria', nome: '💡 Lâmpada', cor: 0xFFD700, w: 0.4, h: 1.2, d: 0.4 }
  ];
  const comprados = new Set(JSON.parse(localStorage.getItem('mk_comprados') || '[]'));
  moedas = parseInt(localStorage.getItem('mk_moedas') || '50', 10);
  const jog = { x: 0, y: 1, z: 0, rot: 0, velY: 0, chao: true, envio: 0 };
  const touch = { x: 0, z: 0, pular: false };
  let joyId = null, RAIO = 45;

  // ── Helpers 3D ──
  function M(cor, em = 0) {
    return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, metalness: em ? 0.5 : 0, emissive: em ? cor : 0, emissiveIntensity: em ? 0.25 : 0 });
  }
  function mesh(g, cor, x, y, z, em) {
    const m = new THREE.Mesh(g, M(cor, em));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function plat(w, h, d, cor, x, y, z, grama) {
    const p = mesh(new THREE.BoxGeometry(w, h, d), grama ? 0x5cb85c : cor, x, y, z);
    if (grama) { p.add(mesh(new THREE.BoxGeometry(w, 0.06, d), 0x6ecf6e, 0, h / 2 + 0.03, 0)); }
    p.userData.plat = true; plats.push(p); scene.add(p); return p;
  }

  function predio(nome, cor, x, z, w, h, d) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, h, d), cor, 0, h / 2, 0));
    // Janelas
    for (let iy = 0; iy < 2; iy++) for (let ix = -1; ix <= 1; ix++) {
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 0.05), 0xFFFFAA, ix * 1.5, 1.5 + iy * 2, d / 2 + 0.01));
    }
    // Porta
    g.add(mesh(new THREE.BoxGeometry(1.2, 2, 0.1), 0x8B4513, 0, 1, d / 2 + 0.02));
    // Placa
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
    const cx = cv.getContext('2d');
    cx.fillStyle = cor === 0xFF6B35 ? '#FF6B35' : '#fff';
    cx.font = 'bold 18px sans-serif'; cx.textAlign = 'center';
    cx.fillText(nome, 64, 22);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    sp.position.set(0, h + 0.8, 0); sp.scale.set(3, 0.75, 1);
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
      corpoTipo: sessao.corpoTipo, nome: sessao.nome
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

  function salvarProgresso() {
    localStorage.setItem('mk_moedas', moedas);
    localStorage.setItem('mk_comprados', JSON.stringify([...comprados]));
    localStorage.setItem('mk_avatar', JSON.stringify(sessao));
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

  // ── Zonas PK XD ──
  const ZONAS = {
    cidade: {
      nome: '🏙️ Cidade',
      load() {
        plat(60, 0.3, 60, 0x888888, 0, -0.15, 0);
        plat(50, 0.25, 50, 0x5cb85c, 0, 0, 0, true);
        // Ruas
        plat(4, 0.05, 50, 0x555555, 0, 0.16, 0);
        plat(50, 0.05, 4, 0x555555, 0, 0.16, 0);
        predio('PIZZA', 0xFF6B35, -15, -15, 5, 4, 5);
        predio('LOJA', 0xFF1493, 15, -15, 5, 5, 5);
        predio('CASA', 0x9B59B6, -15, 15, 5, 3.5, 5);
        predio('PRAIA', 0x00CED1, 15, 15, 5, 3, 5);
        predio('SKATE', 0xFFD700, 0, -20, 6, 2.5, 4);
        predio('PARQUE', 0x2ECC71, 0, 20, 7, 3, 6);
        predio('FAZENDA', 0x8B4513, -20, 0, 6, 3.5, 5);
        predio('ESCOLA', 0x3498DB, 20, 0, 7, 4, 6);
        // Fonte central
        const fonte = mesh(new THREE.CylinderGeometry(2, 2.5, 0.8, 12), 0xAAAAAA, 0, 0.4, 0);
        objs.push(fonte); scene.add(fonte);
        anims.push({ m: fonte, fn: t => { fonte.position.y = 0.4 + Math.sin(t * 2) * 0.05; } });
        for (let i = 0; i < 15; i++) moeda((Math.random() - .5) * 40, 0.6, (Math.random() - .5) * 40);
        // NPCs
        ['Lia', 'Pedro', 'Ana'].forEach((n, i) => {
          const npc = avatar({ cor: ['#FF1493', '#00CED1', '#FFD700'][i], nome: n, cabelo: 'spiky', chapeu: i === 0 ? 'coroa' : 'nenhum' });
          npc.position.set(-8 + i * 8, 0, 5);
          anims.push({ m: npc, fn: t => { npc.rotation.y = Math.sin(t + i) * 0.8; npc.position.y = Math.sin(t * 2 + i) * 0.04; } });
          objs.push(npc); scene.add(npc);
        });
        pontos('🏙️ Explore a cidade! Entre nos prédios!');
      },
      update() {
        objs.forEach(o => {
          if (!o.userData.predio) return;
          const dx = jog.x - o.position.x, dz = jog.z - o.position.z;
          if (Math.abs(dx) < 4 && Math.abs(dz) < 4) {
            const map = { PIZZA: 'pizza', LOJA: 'cidade', CASA: 'casa', PRAIA: 'praia', SKATE: 'skate', PARQUE: 'parque', FAZENDA: 'fazenda', ESCOLA: 'escola' };
            const z = map[o.userData.predio];
            if (z && z !== 'cidade') { irPara(z); toast('→ ' + o.userData.predio); }
          }
        });
        colidirMoedas();
      }
    },
    casa: {
      nome: '🏠 Minha Casa',
      load() {
        plat(20, 0.3, 20, 0xDEB887, 0, -0.15, 0);
        // Paredes da casa
        const paredeCor = 0xFFF0F5;
        [[0, 1.5, -6, 12, 3, 0.3], [-6, 1.5, 0, 0.3, 3, 12], [6, 1.5, 0, 0.3, 3, 12]].forEach(([x, y, z, w, h, d]) => {
          objs.push(mesh(new THREE.BoxGeometry(w, h, d), paredeCor, x, y, z));
          scene.add(objs[objs.length - 1]);
        });
        // Telhado
        const tel = mesh(new THREE.ConeGeometry(7, 2.5, 4), 0xFF69B4, 0, 4.2, -6);
        tel.rotation.y = Math.PI / 4; objs.push(tel); scene.add(tel);
        // Tapete
        objs.push(mesh(new THREE.BoxGeometry(4, 0.05, 3), 0xC084FC, 0, 0.03, 0));
        scene.add(objs[objs.length - 1]);
        // Móveis iniciais
        colocarMovelFixo('sofa', -2, 0.4, 2);
        colocarMovelFixo('tv', 0, 1, -5.5);
        colocarMovelFixo('planta', 4, 0.4, 3);
        colocarMovelFixo('luminaria', -4, 0.6, -2);
        for (let i = 0; i < 5; i++) moeda((Math.random() - .5) * 14, 0.5, (Math.random() - .5) * 14);
        estado.moveis = 4;
        pontos('🏠 Decore! Toque 🛋️ para colocar móveis');
        document.getElementById('btn-movel')?.classList.remove('oculto');
      },
      update() { colidirMoedas(); }
    },
    escola: {
      nome: '🏫 Escola',
      load() {
        plat(28, 0.3, 28, 0xE8F4FD, 0, -0.15, 0, true);
        // Prédio principal
        objs.push(mesh(new THREE.BoxGeometry(12, 5, 8), 0x3498DB, 0, 2.5, -5));
        scene.add(objs[objs.length - 1]);
        objs.push(mesh(new THREE.ConeGeometry(7, 2, 4), 0x2980B9, 0, 6, -5));
        scene.add(objs[objs.length - 1]);
        // Sala de aula
        plat(8, 0.2, 6, 0xF5DEB3, -8, 0, 5);
        for (let i = 0; i < 4; i++) {
          objs.push(mesh(new THREE.BoxGeometry(1, 0.6, 0.6), 0xDEB887, -10 + i * 2.5, 0.3, 6));
          scene.add(objs[objs.length - 1]);
        }
        objs.push(mesh(new THREE.BoxGeometry(3, 0.1, 1.5), 0x8B4513, -8, 0.55, 3));
        scene.add(objs[objs.length - 1]);
        // Quadro
        objs.push(mesh(new THREE.BoxGeometry(3, 1.5, 0.1), 0xFFFFFF, -8, 2, 8.5));
        scene.add(objs[objs.length - 1]);
        // Playground
        const escorregador = new THREE.Group();
        escorregador.add(mesh(new THREE.BoxGeometry(1, 2, 0.3), 0xFF69B4, 0, 1, 0));
        escorregador.add(mesh(new THREE.BoxGeometry(1.5, 0.1, 2), 0xFFD700, 0.5, 0.5, 1));
        escorregador.position.set(8, 0, 6);
        objs.push(escorregador); scene.add(escorregador);
        // NPCs estudantes
        ['Lucas', 'Julia', 'Theo'].forEach((n, i) => {
          const npc = avatar({ cor: ['#3498DB', '#FF69B4', '#2ECC71'][i], nome: n, cabelo: ['spiky', 'longo', 'ondas'][i], chapeu: 'nenhum' });
          npc.position.set(-4 + i * 4, 0, -2);
          anims.push({ m: npc, fn: t => { npc.rotation.y = Math.sin(t + i) * 0.5; } });
          objs.push(npc); scene.add(npc);
        });
        for (let i = 0; i < 10; i++) moeda((Math.random() - .5) * 22, 0.5, (Math.random() - .5) * 22);
        pontos('🏫 Explore a escola! Playground e sala de aula');
      },
      update() {
        if (jog.z > 7 && jog.x > 5 && jog.y <= 1) { jog.velY = 8; toast('🛝 Escorregou!'); FX.sons.pular(); }
        colidirMoedas();
      }
    },
    praia: {
      nome: '🏖️ Praia',
      load() {
        plat(30, 0.3, 30, 0xF4D03F, 0, -0.15, 0);
        const agua = mesh(new THREE.BoxGeometry(30, 0.2, 12), 0x4aadee, 0, -0.05, 15);
        agua.material.transparent = true; agua.material.opacity = 0.8;
        objs.push(agua); scene.add(agua);
        anims.push({ m: agua, fn: t => { agua.material.emissiveIntensity = 0.1 + Math.sin(t) * 0.05; } });
        // Guarda-sol
        [[-5, 0, 0], [5, 0, 3], [-3, 0, 5]].forEach(([x, y, z]) => {
          const gs = new THREE.Group();
          gs.add(mesh(new THREE.CylinderGeometry( 0.05, 0.05, 2.5, 4), 0x888888, 0, 1.25, 0));
          gs.add(mesh(new THREE.ConeGeometry(1.5, 0.8, 8), [0xFF1493, 0x00CED1, 0xFFD700][Math.abs(x) % 3], 0, 2.6, 0));
          gs.position.set(x, y, z); objs.push(gs); scene.add(gs);
        });
        for (let i = 0; i < 8; i++) moeda((Math.random() - .5) * 20, 0.4, (Math.random() - .5) * 10);
        for (let i = 0; i < 5; i++) {
          const cx = (Math.random() - .5) * 18, cz = (Math.random() - .5) * 8;
          const concha = mesh(new THREE.SphereGeometry(0.2, 8, 6), 0xFFE4C4, cx, 0.2, cz);
          concha.scale.set(1.2, 0.6, 1); concha.userData.concha = true;
          cols.push(concha); scene.add(concha);
        }
        pontos('🏖️ Pule na água! Colete conchas 🐚');
      },
      update() {
        if (jog.z > 8 && jog.y <= 0.5) { jog.y = -0.2; toast('🏊 Splash!'); FX.sons.pular(); }
        cols.forEach(c => {
          if (c.userData.coletada || !c.userData.concha) return;
          const dx = jog.x - c.position.x, dz = jog.z - c.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
            c.userData.coletada = true; scene.remove(c);
            moedas += 12; atualizarMoedas(); FX.sons.moeda(); toast('🐚 Concha! +12');
          }
        });
        colidirMoedas();
      }
    },
    pizza: {
      nome: '🍕 Pizzaria',
      load() {
        plat(14, 0.3, 14, 0xFF6B35, 0, -0.15, 0);
        // Forno
        const forno = mesh(new THREE.BoxGeometry(2, 1.5, 1), 0x888888, 0, 0.75, -4);
        objs.push(forno); scene.add(forno);
        // Mesas
        [[-3, 0, 2], [3, 0, 2], [0, 0, -1]].forEach(([x, y, z]) => {
          objs.push(mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 8), 0x8B4513, x, 0.5, z));
          scene.add(objs[objs.length - 1]);
          // Pizza na mesa
          const pz = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), 0xFFD700, x, 0.6, z);
          objs.push(pz); scene.add(pz);
          anims.push({ m: pz, fn: t => { pz.rotation.y = t; } });
        });
        for (let i = 0; i < 5; i++) moeda((Math.random() - .5) * 10, 0.5, (Math.random() - .5) * 10);
        pontos('🍕 Colete pizzas douradas!');
      },
      update() {
        cols.forEach(m => {
          if (m.userData.coletada || !m.userData.moeda) return;
          if (dist(m) < 1.5) {
            m.userData.coletada = true; scene.remove(m);
            moedas += 15; atualizarMoedas();
            FX.sons.moeda(); FX.burst(scene, m.position.x, m.position.y, m.position.z, 0xFF6B35);
            toast('🍕 Pizza! +15 moedas');
          }
        });
      }
    },
    skate: {
      nome: '🛹 Skate Park',
      load() {
        plat(25, 0.3, 25, 0x888888, 0, -0.15, 0);
        // Rampas
        for (let i = 0; i < 4; i++) {
          const r = mesh(new THREE.BoxGeometry(4, 0.2, 6), 0xFF1493, -8 + i * 5, 0.5 + i * 0.8, -5);
          r.rotation.x = -0.3; plats.push(r); objs.push(r); scene.add(r);
        }
        // Half-pipe
        const hp = mesh(new THREE.CylinderGeometry(6, 6, 0.2, 16, 1, false, 0, Math.PI), 0x00CED1, 0, 0.1, 8);
        hp.rotation.x = Math.PI / 2; hp.rotation.z = Math.PI / 2;
        plats.push(hp); objs.push(hp); scene.add(hp);
        // Skate spawn
        const sk = mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), 0xFFD700, 0, 0.5, 0, 1);
        sk.userData.skate = true; objs.push(sk); scene.add(sk);
        anims.push({ m: sk, fn: t => { sk.rotation.y = t * 2; sk.position.y = 0.5 + Math.sin(t * 3) * 0.1; } });
        for (let i = 0; i < 10; i++) moeda((Math.random() - .5) * 18, 0.5 + Math.random() * 2, (Math.random() - .5) * 18);
        document.getElementById('btn-skate')?.classList.remove('oculto');
        pontos('🛹 Pegue o skate e faça manobras!');
      },
      update() {
        objs.forEach(o => {
          if (o.userData.skate && dist(o) < 2 && !noSkate) {
            noSkate = true; toast('🛹 Skate equipado! Mais rápido!');
            FX.sons.conquista();
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
        celeiro.add(mesh(new THREE.BoxGeometry(8, 4, 6), 0xCC0000, 0, 2, -8));
        const telhado = mesh(new THREE.ConeGeometry(5.5, 2.5, 4), 0x8B0000, 0, 5.2, -8);
        telhado.rotation.y = Math.PI / 4;
        celeiro.add(telhado);
        celeiro.add(mesh(new THREE.BoxGeometry(2, 2.5, 0.2), 0xFFFFFF, 0, 1.25, -4.9));
        objs.push(celeiro); scene.add(celeiro);
        const galinheiro = new THREE.Group();
        galinheiro.add(mesh(new THREE.BoxGeometry(5, 2, 4), 0xDEB887, 6, 1, 5));
        galinheiro.add(mesh(new THREE.ConeGeometry(3.5, 1.5, 4), 0xCD853F, 6, 2.8, 5));
        galinheiro.add(mesh(new THREE.BoxGeometry(1.2, 1, 0.1), 0x654321, 6, 0.6, 7));
        objs.push(galinheiro); scene.add(galinheiro);
        cerca(-15, -15, 15, -15); cerca(15, -15, 15, 15);
        cerca(15, 15, -15, 15); cerca(-15, 15, -15, -15);
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
    parque: {
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
  }

  function irPara(id) {
    if (!ZONAS[id]) return;
    limpar(); jogoAtual = id; ZONAS[id].load();
    jog.x = 0; jog.y = 2; jog.z = 0;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('ativo', b.dataset.jogo === id));
    document.getElementById('btn-movel')?.classList.toggle('oculto', id !== 'casa');
    document.getElementById('btn-skate')?.classList.toggle('oculto', id !== 'skate');
    socket?.emit('trocar-jogo', id);
    FX.sons.portal();
  }

  function pontos(t) { const el = document.getElementById('hud-pontos'); if (el) el.textContent = t; }
  function atualizarMoedas() {
    document.getElementById('hud-moedas').textContent = '🪙 ' + moedas;
    const lm = document.getElementById('loja-moedas'); if (lm) lm.textContent = moedas;
    salvarProgresso();
  }

  // ── Emotes ──
  function emote(tipo) {
    emoteAtual = tipo; emoteTimer = 2.5;
    FX.sons.emote();
    socket?.emit('evento', { tipo: 'emote', emote: tipo });
    const msgs = { acenar: '👋 Oi!', dancar: '💃 Dançando!', pular: '🦘 Pula!', comemorar: '🎉 Uhuu!', rir: '😂 Haha!' };
    toast(msgs[tipo] || tipo);
  }

  function acao() {
    if (jogoAtual === 'casa') colocarMovel();
    else if (jogoAtual === 'pesca') {
      cols.forEach(p => {
        if (!p.userData.peixe || !p.userData.vivo) return;
        if (dist(p) < 3) { p.userData.vivo = false; scene.remove(p); moedas += 20; atualizarMoedas(); FX.sons.moeda(); toast('🐟 Peixe!'); }
      });
    } else if (jogoAtual === 'fazenda') {
      objs.forEach(o => {
        if (o.userData.racao && dist(o) < 3 && !estado.alimentou) {
          estado.alimentou = true; moedas += 25; atualizarMoedas();
          FX.sons.conquista(); toast('🌽 Galinhas alimentadas! +25');
          setTimeout(() => { estado.alimentou = false; }, 5000);
        }
      });
      toast('🐔 Procure ovos no chão!');
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
      div.innerHTML = `<span>${item.nome}</span><span>🪙 ${item.preco}</span>`;
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
    if (!itens.children.length) itens.innerHTML = '<p style="padding:12px;color:#888">Compre itens na loja 🛍️</p>';
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
    FX.sons.conquista(); toast('✨ Equipado: ' + item.nome);
  }

  function comprar(item) {
    if (moedas < item.preco || comprados.has(item.id)) return;
    moedas -= item.preco; comprados.add(item.id);
    equipar(item);
    FX.sons.conquista(); toast('🛍️ Comprou: ' + item.nome);
    abrirLoja();
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
    area.addEventListener('touchstart', e => { e.preventDefault(); if (joyId !== null) return; joyId = e.changedTouches[0].identifier; moveJoy(e.changedTouches[0], fundo, bola); }, { passive: false });
    area.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joyId) { moveJoy(t, fundo, bola); break; } }, { passive: false });
    area.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === joyId) reset(); });
    document.getElementById('btn-pular')?.addEventListener('touchstart', e => { e.preventDefault(); touch.pular = true; }, { passive: false });
    document.getElementById('btn-pular')?.addEventListener('touchend', e => { e.preventDefault(); touch.pular = false; });
    document.getElementById('btn-acao')?.addEventListener('touchstart', e => { e.preventDefault(); acao(); }, { passive: false });
    document.getElementById('btn-skate')?.addEventListener('touchstart', e => { e.preventDefault(); noSkate = !noSkate; toast(noSkate ? '🛹 Skate ON!' : '🛹 Skate OFF'); }, { passive: false });
    document.getElementById('btn-movel')?.addEventListener('touchstart', e => { e.preventDefault(); colocarMovel(); }, { passive: false });
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
        const zonas = ['cidade', 'casa', 'praia', 'pizza', 'skate', 'pesca', 'parque'];
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
      const l = Math.sqrt(dx * dx + dz * dz);
      if (l > 1) { dx /= l; dz /= l; }
      jog.x += dx * vel * dt; jog.z += dz * vel * dt; jog.rot = Math.atan2(dx, dz);
      andando = true;
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
    }

    camera.position.set(jog.x - Math.sin(jog.rot) * 9, jog.y + 5.5, jog.z - Math.cos(jog.rot) * 9);
    camera.lookAt(jog.x, jog.y + 1.5, jog.z);

    Object.values(outros).forEach(o => {
      o.mesh.position.x += (o.tx - o.mesh.position.x) * .15;
      o.mesh.position.y += (o.ty - o.mesh.position.y) * .15;
      o.mesh.position.z += (o.tz - o.mesh.position.z) * .15;
      o.mesh.rotation.y += (o.tr - o.mesh.rotation.y) * .15;
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

    playerMesh = avatar(optsAvatar());
    scene.add(playerMesh);
    if (s.pet) { petMesh = pet(s.pet); scene.add(petMesh); }

    atualizarMoedas();
    document.getElementById('btn-guarda-roupa')?.addEventListener('click', abrirGuardaRoupa);

    initTouch(); initTeclado();
    document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => irPara(b.dataset.jogo));
    document.querySelectorAll('.btn-emote').forEach(b => b.onclick = () => emote(b.dataset.emote));

    const srv = window.getServerUrl();
    socket = srv ? io(srv, { transports: ['websocket', 'polling'] }) : io();
    socket.on('connect', () => { meuId = socket.id; socket.emit('entrar', { code: s.code, nome: s.nome, ...optsAvatar(), pet: s.pet }); });
    socket.on('estado', st => { st.jogadores.forEach(j => { if (j.id !== meuId) addOutro(j); }); document.getElementById('badge-online').textContent = '👥 ' + st.jogadores.length; initVoz(socket, meuId); });
    socket.on('entrou', j => { addOutro(j); toast(j.nome + ' chegou! 🎉'); });
    socket.on('saiu', ({ id }) => { if (outros[id]) { scene.remove(outros[id].mesh); delete outros[id]; } });
    socket.on('moveu', d => { if (outros[d.id]) Object.assign(outros[d.id], { tx: d.x, ty: d.y, tz: d.z, tr: d.rot }); });
    socket.on('evento', ev => { if (ev.tipo === 'emote') toast('Alguém está se divertindo! 🎉'); });
    socket.on('erro', ({ msg }) => alert(msg));

    irPara('cidade'); loop();

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
