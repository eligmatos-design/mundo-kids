/**
 * Mundo Kids — Avatar Builder (estilo Avatar World)
 */
(function () {
  'use strict';

  const CORES_PELE = { clara: 0xFFDBAC, media: 0xE8B88A, morena: 0xC68642, escura: 0x8D5524 };
  const CORES_CABELO = { castanho: 0x4A3728, loiro: 0xFFD700, ruivo: 0xFF6B35, preto: 0x222222, rosa: 0xFF69B4, azul: 0x3498DB };

  function M(cor, em) {
    return new THREE.MeshStandardMaterial({
      color: cor, roughness: 0.55, metalness: em ? 0.4 : 0,
      emissive: em ? cor : 0, emissiveIntensity: em ? 0.2 : 0
    });
  }
  function mesh(g, cor, x, y, z, em) {
    const m = new THREE.Mesh(g, M(cor, em));
    m.position.set(x, y, z); m.castShadow = true;
    return m;
  }

  function criar(opts = {}) {
    const {
      cor = '#FF1493', pele = 'clara', cabelo = 'spiky', corCabelo = 'castanho',
      chapeu = 'nenhum', top = 'basico', bottom = 'jeans', shoes = 'tenis',
      expressao = 'feliz', nome = 'Player'
    } = opts;

    const g = new THREE.Group();
    const c = parseInt(String(cor).replace('#', '0x'));
    const peleCor = CORES_PELE[pele] || CORES_PELE.clara;
    const cc = CORES_CABELO[corCabelo] || CORES_CABELO.castanho;

    const tops = { basico: c, listrado: 0x3498DB, rosa: 0xFF69B4, verde: 0x2ECC71, roxo: 0x9B59B6 };
    const bots = { jeans: 0x334488, saia: 0xFF1493, shorts: 0x00CED1, preto: 0x222222 };
    const sapatos = { tenis: 0xFFFFFF, botas: 0x8B4513, sandalia: 0xFFD700, rosa: 0xFF69B4 };

    // Corpo / camisa
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 10), tops[top] || c, 0, 0.55, 0));
    // Cabeça
    g.add(mesh(new THREE.SphereGeometry(0.52, 16, 14), peleCor, 0, 1.25, 0));

    // Olhos grandes
    [[-0.16, 1.32, 0.42], [0.16, 1.32, 0.42]].forEach(([x, y, z]) => {
      g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), 0xffffff, x, y, z));
      g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), 0x222222, x + 0.02, y, z + 0.06));
      g.add(mesh(new THREE.SphereGeometry(0.025, 4, 4), 0xffffff, x + 0.04, y + 0.02, z + 0.08));
    });

    // Bochechas
    [[-0.28, 1.15, 0.38], [0.28, 1.15, 0.38]].forEach(([x, y, z]) => {
      g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), 0xFFB6C1, x, y, z));
    });

    // Expressão
    if (expressao === 'feliz') {
      g.add(mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 8, Math.PI), 0xFF6666, 0, 1.1, 0.45));
    } else if (expressao === 'surpreso') {
      g.add(mesh(new THREE.TorusGeometry(0.06, 0.025, 4, 8, Math.PI * 2), 0xFF6666, 0, 1.05, 0.44));
    } else if (expressao === 'legal') {
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), 0xFF6666, 0, 1.08, 0.45));
    } else {
      g.add(mesh(new THREE.TorusGeometry(0.08, 0.025, 4, 8, Math.PI), 0x888888, 0, 1.05, 0.44));
    }

    // Cabelo
    if (cabelo === 'spiky') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.09, 0.35, 4), cc, Math.cos(a) * 0.28, 1.68, Math.sin(a) * 0.28));
      }
    } else if (cabelo === 'longo') {
      g.add(mesh(new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), cc, 0, 1.28, -0.05));
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.6, 0.15), cc, 0, 0.95, -0.35));
    } else if (cabelo === 'moicano') {
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.45, 0.28), cc, 0, 1.78, 0));
    } else if (cabelo === 'ondas') {
      for (let i = -2; i <= 2; i++) {
        g.add(mesh(new THREE.SphereGeometry(0.18, 8, 6), cc, i * 0.22, 1.62, 0));
      }
    }
    // careca = sem cabelo extra

    // Acessórios
    if (chapeu === 'coroa') g.add(mesh(new THREE.TorusGeometry(0.36, 0.06, 4, 12), 0xFFD700, 0, 1.78, 0, 1));
    else if (chapeu === 'oculos') {
      g.add(mesh(new THREE.TorusGeometry(0.13, 0.025, 4, 12), 0x222222, -0.16, 1.32, 0.5));
      g.add(mesh(new THREE.TorusGeometry(0.13, 0.025, 4, 12), 0x222222, 0.16, 1.32, 0.5));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), 0x222222, 0, 1.32, 0.5));
    } else if (chapeu === 'asa') {
      [[-0.55, 1.1, -0.2], [0.55, 1.1, -0.2]].forEach(([x, y, z]) => {
        const asa = mesh(new THREE.BoxGeometry(0.65, 0.02, 0.45), 0xFF69B4, x, y, z);
        asa.rotation.z = x < 0 ? 0.45 : -0.45; g.add(asa);
      });
    } else if (chapeu === 'chapeu') {
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 12), 0xFF1493, 0, 1.72, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12), 0xFF1493, 0, 1.82, 0));
    }

    // Pernas / calça
    const pernaL = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 6), bots[bottom] || 0x334488, -0.15, 0.16, 0);
    const pernaR = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 6), bots[bottom] || 0x334488, 0.15, 0.16, 0);
    g.add(pernaL, pernaR);

    // Sapatos
    const sapCor = sapatos[shoes] || 0xFFFFFF;
    const peL = mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), sapCor, -0.15, 0.04, 0.04);
    const peR = mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), sapCor, 0.15, 0.04, 0.04);
    g.add(peL, peR);

    // Braços
    const bracoL = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 6), peleCor, -0.38, 0.65, 0);
    const bracoR = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 6), peleCor, 0.38, 0.65, 0);
    g.add(bracoL, bracoR);

    // Nome
    if (nome) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(255,20,147,.85)'; ctx.fillRect(0, 0, 256, 48);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(nome, 128, 32);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
      sp.position.y = 2.15; sp.scale.set(2.2, 0.45, 1);
      g.add(sp);
    }

    g.userData.pernaL = pernaL;
    g.userData.pernaR = pernaR;
    g.userData.bracoL = bracoL;
    g.userData.bracoR = bracoR;
    return g;
  }

  function criarPet(tipo) {
    const g = new THREE.Group();
    const cores = { cachorro: 0xC68642, gato: 0x888888, coelho: 0xFFFFFF, unicornio: 0xFF69B4, dragao: 0x2ECC71 };
    const cor = cores[tipo] || 0xC68642;
    g.add(mesh(new THREE.SphereGeometry(0.35, 8, 6), cor, 0, 0.35, 0));
    g.add(mesh(new THREE.SphereGeometry(0.25, 8, 6), cor, 0, 0.35, 0.28));
    if (tipo === 'unicornio') g.add(mesh(new THREE.ConeGeometry(0.06, 0.35, 4), 0xFFD700, 0, 0.65, 0.1));
    if (tipo === 'dragao') g.add(mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), 0x27AE60, 0, 0.5, -0.2));
    if (tipo === 'coelho') {
      [[-0.08, 0.65, 0], [0.08, 0.65, 0]].forEach(([x, y, z]) => {
        g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 4), cor, x, y, z));
      });
    }
    [[-0.1, 0.5, 0], [0.1, 0.5, 0]].forEach(([x, y, z]) => {
      g.add(mesh(new THREE.ConeGeometry(0.06, 0.15, 4), cor, x, y, z));
    });
    return g;
  }

  function animarCaminhada(mesh, t, andando) {
    if (!mesh?.userData?.pernaL) return;
    const s = andando ? Math.sin(t * 12) * 0.4 : 0;
    mesh.userData.pernaL.rotation.x = s;
    mesh.userData.pernaR.rotation.x = -s;
    mesh.userData.bracoL.rotation.x = -s * 0.6;
    mesh.userData.bracoR.rotation.x = s * 0.6;
  }

  // Preview 3D ao vivo na tela de criação
  let previewScene, previewCam, previewRen, previewMesh, previewPet, previewAnim;

  function iniciarPreview(canvas, opts) {
    if (!canvas || !window.THREE) return;
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0xE8F4FD);
    previewCam = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    previewCam.position.set(0, 1.8, 4.5);
    previewCam.lookAt(0, 1, 0);
    previewRen = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRen.setSize(canvas.clientWidth, canvas.clientHeight);
    previewRen.setPixelRatio(Math.min(devicePixelRatio, 2));
    previewScene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const luz = new THREE.DirectionalLight(0xffffff, 0.8);
    luz.position.set(2, 4, 3); previewScene.add(luz);
    // Chão decorativo
    const chao = mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 24), 0xFFB6C1, 0, -0.05, 0);
    previewScene.add(chao);
    atualizarPreview(opts);
    cancelAnimationFrame(previewAnim);
    let t0 = 0;
    function loop(t) {
      previewAnim = requestAnimationFrame(loop);
      const dt = (t - t0) / 1000; t0 = t;
      if (previewMesh) { previewMesh.rotation.y += 0.008; animarCaminhada(previewMesh, t / 200, true); }
      if (previewPet) {
        previewPet.position.x = Math.sin(t / 800) * 0.8 - 1.2;
        previewPet.position.z = Math.cos(t / 800) * 0.5;
        previewPet.position.y = Math.sin(t / 400) * 0.05;
      }
      previewRen.render(previewScene, previewCam);
    }
    loop(0);
  }

  function atualizarPreview(opts) {
    if (!previewScene) return;
    if (previewMesh) previewScene.remove(previewMesh);
    if (previewPet) previewScene.remove(previewPet);
    previewMesh = criar({ ...opts, nome: '' });
    previewMesh.position.set(0, 0, 0);
    previewScene.add(previewMesh);
    if (opts.pet) {
      previewPet = criarPet(opts.pet);
      previewPet.position.set(-1.2, 0, 0.5);
      previewScene.add(previewPet);
    }
  }

  window.AvatarBuilder = { criar, criarPet, animarCaminhada, iniciarPreview, atualizarPreview, CORES_PELE, CORES_CABELO };
})();
