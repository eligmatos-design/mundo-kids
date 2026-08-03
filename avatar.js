/**
 * Mundo Kids — Avatar Builder v2 (estilo boneca / Avatar World)
 */
(function () {
  'use strict';

  const CORES_PELE = { clara: 0xFFDBAC, media: 0xE8B88A, morena: 0xC68642, escura: 0x8D5524 };
  const CORES_CABELO = { castanho: 0x4A3728, loiro: 0xFFD700, ruivo: 0xFF6B35, preto: 0x222222, rosa: 0xFF69B4, azul: 0x3498DB, roxo: 0x9B59B6 };
  const CORES_OLHOS = { castanho: 0x8B4513, azul: 0x3498DB, verde: 0x2ECC71, roxo: 0x9B59B6, preto: 0x222222, rosa: 0xFF69B4 };

  function M(cor, em) {
    return new THREE.MeshStandardMaterial({
      color: cor, roughness: 0.5, metalness: em ? 0.35 : 0,
      emissive: em ? cor : 0, emissiveIntensity: em ? 0.15 : 0
    });
  }
  function mesh(g, cor, x, y, z, em) {
    const m = new THREE.Mesh(g, M(cor, em));
    m.position.set(x, y, z); m.castShadow = true;
    return m;
  }

  function addOlhos(g, tipo, corOlhos, peleCor) {
    const corIris = CORES_OLHOS[corOlhos] || CORES_OLHOS.castanho;
    const configs = {
      grande:  { branco: 0.13, iris: 0.075, pupila: 0.04, brilho: 0.022, y: 1.34, z: 0.44 },
      normal:  { branco: 0.1, iris: 0.055, pupila: 0.03, brilho: 0.018, y: 1.32, z: 0.42 },
      anime:   { branco: 0.15, iris: 0.09, pupila: 0.025, brilho: 0.028, y: 1.35, z: 0.45 }
    };
    const o = configs[tipo] || configs.grande;
    [[-0.17, o.y, o.z], [0.17, o.y, o.z]].forEach(([x, y, z]) => {
      g.add(mesh(new THREE.SphereGeometry(o.branco, 10, 8), 0xffffff, x, y, z));
      g.add(mesh(new THREE.SphereGeometry(o.iris, 8, 6), corIris, x + 0.01, y, z + 0.04));
      g.add(mesh(new THREE.SphereGeometry(o.pupila, 6, 4), 0x111111, x + 0.02, y, z + 0.07));
      g.add(mesh(new THREE.SphereGeometry(o.brilho, 4, 4), 0xffffff, x + 0.05, y + 0.03, z + 0.09));
      // Cílios
      if (tipo === 'anime' || tipo === 'grande') {
        g.add(mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), 0x222222, x, y + o.branco * 0.7, z + 0.02));
      }
    });
    // Sobrancelhas
    [[-0.17, o.y + 0.12, o.z - 0.02], [0.17, o.y + 0.12, o.z - 0.02]].forEach(([x, y, z]) => {
      const sobr = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.03), 0x4A3728, x, y, z);
      sobr.rotation.z = x < 0 ? 0.15 : -0.15;
      g.add(sobr);
    });
    // Nariz pequeno
    g.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), peleCor, 0, 1.18, 0.48));
  }

  function addBoca(g, boca) {
    const y = 1.06, z = 0.46;
    if (boca === 'sorriso' || boca === 'feliz') {
      g.add(mesh(new THREE.TorusGeometry(0.11, 0.028, 4, 10, Math.PI), 0xFF6666, 0, y, z));
      g.add(mesh(new THREE.SphereGeometry(0.02, 4, 4), 0xFFAAAA, -0.06, y + 0.02, z - 0.01));
      g.add(mesh(new THREE.SphereGeometry(0.02, 4, 4), 0xFFAAAA, 0.06, y + 0.02, z - 0.01));
    } else if (boca === 'biquinho') {
      g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), 0xFF8888, 0, y - 0.02, z + 0.02));
    } else if (boca === 'surpresa') {
      g.add(mesh(new THREE.TorusGeometry(0.05, 0.025, 4, 8, Math.PI * 2), 0xFF6666, 0, y, z));
    } else if (boca === 'lingua') {
      g.add(mesh(new THREE.TorusGeometry(0.09, 0.025, 4, 8, Math.PI), 0xFF6666, 0, y, z));
      g.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), 0xFF4444, 0, y - 0.04, z + 0.02));
    } else {
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), 0xCC6666, 0, y, z));
    }
  }

  function addCabelo(g, estilo, cc) {
    if (estilo === 'spiky') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.09, 0.38, 4), cc, Math.cos(a) * 0.3, 1.7, Math.sin(a) * 0.3));
      }
    } else if (estilo === 'longo') {
      g.add(mesh(new THREE.SphereGeometry(0.58, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), cc, 0, 1.3, -0.05));
      g.add(mesh(new THREE.BoxGeometry(0.55, 0.7, 0.18), cc, 0, 0.9, -0.38));
      [[-0.22, 0.85, -0.32], [0.22, 0.85, -0.32]].forEach(([x, y, z]) => {
        g.add(mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 6), cc, x, y, z));
      });
    } else if (estilo === 'mega') {
      // Cabelo grande estilo boneca
      g.add(mesh(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.7), cc, 0, 1.32, -0.02));
      for (let i = -3; i <= 3; i++) {
        g.add(mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.9, 6), cc, i * 0.14, 0.75, -0.35 - Math.abs(i) * 0.05));
      }
      [[-0.35, 1.0, -0.2], [0.35, 1.0, -0.2]].forEach(([x, y, z]) => {
        g.add(mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.65, 6), cc, x, y, z));
      });
    } else if (estilo === 'cacheado') {
      for (let i = -4; i <= 4; i++) {
        for (let j = 0; j < 3; j++) {
          g.add(mesh(new THREE.SphereGeometry(0.12, 6, 5), cc, i * 0.15, 1.55 - j * 0.15, -0.1 + j * 0.08));
        }
      }
    } else if (estilo === 'rabo') {
      g.add(mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), cc, 0, 1.35, 0));
      const rabo = mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.5, 6), cc, 0, 1.5, -0.35);
      rabo.rotation.x = -0.8; g.add(rabo);
      g.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), cc, 0, 1.85, -0.55));
    } else if (estilo === 'tranca') {
      g.add(mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), cc, 0, 1.35, 0));
      [[-0.2, 1.1, -0.25], [0.2, 1.1, -0.25]].forEach(([x, y, z]) => {
        for (let i = 0; i < 4; i++) {
          const t = mesh(new THREE.TorusGeometry(0.07, 0.03, 4, 6, Math.PI), cc, x, y - i * 0.12, z - i * 0.04);
          t.rotation.y = Math.PI / 2; g.add(t);
        }
      });
    } else if (estilo === 'afro') {
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2, r = 0.2 + (i % 3) * 0.08;
        g.add(mesh(new THREE.SphereGeometry(0.14, 6, 5), cc, Math.cos(a) * r, 1.55 + (i % 2) * 0.08, Math.sin(a) * r));
      }
    } else if (estilo === 'ondas') {
      for (let i = -3; i <= 3; i++) {
        g.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), cc, i * 0.18, 1.65, 0.05));
      }
    } else if (estilo === 'moicano') {
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.3), cc, 0, 1.82, 0));
    }
  }

  function addCorpoBoneca(g, peleCor, topCor, bottomCor, shoesCor, tipo) {
    const escala = tipo === 'chibi' ? 0.85 : tipo === 'realista' ? 1.08 : 1;
    // Pescoço
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 8), peleCor, 0, 0.92, 0));
    // Torso boneca — cintura fina
    if (tipo === 'boneca') {
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 10), topCor, 0, 0.72, 0)); // busto
      g.add(mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 10), topCor, 0, 0.48, 0)); // cintura
      g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), topCor, -0.28, 0.68, 0.05)); // ombro L
      g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), topCor, 0.28, 0.68, 0.05));  // ombro R
    } else if (tipo === 'realista') {
      g.add(mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.5, 10), topCor, 0, 0.58, 0));
    } else {
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 10), topCor, 0, 0.58, 0));
    }
    // Cabeça proporcional
    const headR = tipo === 'boneca' ? 0.56 : tipo === 'chibi' ? 0.62 : 0.52;
    g.add(mesh(new THREE.SphereGeometry(headR, 18, 16), peleCor, 0, 1.28 * escala, 0));
    return { headR, escala };
  }

  function criar(opts = {}) {
    const {
      cor = '#FF1493', pele = 'clara', cabelo = 'mega', corCabelo = 'castanho',
      chapeu = 'nenhum', top = 'basico', bottom = 'jeans', shoes = 'tenis',
      expressao = 'feliz', boca, olhos = 'grande', corOlhos = 'castanho',
      corpoTipo = 'boneca', nome = 'Player'
    } = opts;

    const g = new THREE.Group();
    const c = parseInt(String(cor).replace('#', '0x'));
    const peleCor = CORES_PELE[pele] || CORES_PELE.clara;
    const cc = CORES_CABELO[corCabelo] || CORES_CABELO.castanho;
    const bocaFinal = boca || expressao || 'sorriso';

    const tops = { basico: c, listrado: 0x3498DB, rosa: 0xFF69B4, verde: 0x2ECC71, roxo: 0x9B59B6, vestido: 0xFF69B4 };
    const bots = { jeans: 0x334488, saia: 0xFF1493, shorts: 0x00CED1, preto: 0x222222, vestido: 0xFF69B4 };
    const sapatos = { tenis: 0xFFFFFF, botas: 0x8B4513, sandalia: 0xFFD700, rosa: 0xFF69B4, salto: 0xFF1493 };

    const topCor = tops[top] || c;
    const botCor = bots[bottom] || 0x334488;
    const sapCor = sapatos[shoes] || 0xFFFFFF;

    addCorpoBoneca(g, peleCor, topCor, botCor, sapCor, corpoTipo);

    // Bochechas rosadas
    [[-0.3, 1.12, 0.4], [0.3, 1.12, 0.4]].forEach(([x, y, z]) => {
      g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), 0xFFB6C1, x, y, z));
    });

    addOlhos(g, olhos, corOlhos, peleCor);
    addBoca(g, bocaFinal);
    addCabelo(g, cabelo, cc);

    // Acessórios
    if (chapeu === 'coroa') g.add(mesh(new THREE.TorusGeometry(0.38, 0.06, 4, 12), 0xFFD700, 0, 1.85, 0, 1));
    else if (chapeu === 'oculos') {
      g.add(mesh(new THREE.TorusGeometry(0.14, 0.025, 4, 12), 0x222222, -0.17, 1.34, 0.52));
      g.add(mesh(new THREE.TorusGeometry(0.14, 0.025, 4, 12), 0x222222, 0.17, 1.34, 0.52));
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.025, 0.02), 0x222222, 0, 1.34, 0.52));
    } else if (chapeu === 'asa') {
      [[-0.58, 1.05, -0.2], [0.58, 1.05, -0.2]].forEach(([x, y, z]) => {
        const asa = mesh(new THREE.BoxGeometry(0.7, 0.02, 0.5), 0xFF69B4, x, y, z);
        asa.rotation.z = x < 0 ? 0.5 : -0.5; g.add(asa);
      });
    } else if (chapeu === 'chapeu') {
      g.add(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 12), 0xFF1493, 0, 1.78, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12), 0xFF1493, 0, 1.88, 0));
    } else if (chapeu === 'laco') {
      [[-0.15, 1.75, 0.1], [0.15, 1.75, 0.1]].forEach(([x, y, z]) => {
        g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), 0xFF1493, x, y, z));
      });
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), 0xFF69B4, 0, 1.75, 0.1));
    }

    // Pernas boneca
    const pernaH = corpoTipo === 'boneca' ? 0.38 : 0.32;
    const pernaL = mesh(new THREE.CylinderGeometry(0.09, 0.11, pernaH, 8), botCor, -0.13, 0.14, 0);
    const pernaR = mesh(new THREE.CylinderGeometry(0.09, 0.11, pernaH, 8), botCor, 0.13, 0.14, 0);
    g.add(pernaL, pernaR);

    // Sapatos
    if (shoes === 'salto') {
      [[-0.13, 0.06, 0.05], [0.13, 0.06, 0.05]].forEach(([x, y, z]) => {
        g.add(mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), sapCor, x, y, z));
        g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 4), sapCor, x + 0.04, 0.02, z - 0.02));
      });
    } else {
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), sapCor, -0.13, 0.04, 0.05));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), sapCor, 0.13, 0.04, 0.05));
    }

    // Braços com mãozinhas
    const bracoL = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 6), peleCor, -0.32, 0.62, 0);
    const bracoR = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 6), peleCor, 0.32, 0.62, 0);
    g.add(bracoL, bracoR);
    g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), peleCor, -0.32, 0.4, 0));
    g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), peleCor, 0.32, 0.4, 0));

    if (nome) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(255,20,147,.85)'; ctx.fillRect(0, 0, 256, 48);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(nome, 128, 32);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
      sp.position.y = 2.2; sp.scale.set(2.2, 0.45, 1);
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

  let previewScene, previewCam, previewRen, previewMesh, previewPet, previewAnim;

  function iniciarPreview(canvas, opts) {
    if (!canvas || !window.THREE) return;
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0xE8F4FD);
    previewCam = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    previewCam.position.set(0, 1.5, 4.2);
    previewCam.lookAt(0, 1.1, 0);
    previewRen = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRen.setSize(canvas.clientWidth, canvas.clientHeight);
    previewRen.setPixelRatio(Math.min(devicePixelRatio, 2));
    previewScene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const luz = new THREE.DirectionalLight(0xffffff, 0.85);
    luz.position.set(2, 4, 3); previewScene.add(luz);
    const luz2 = new THREE.DirectionalLight(0xFFE4F0, 0.4);
    luz2.position.set(-2, 2, -1); previewScene.add(luz2);
    previewScene.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 24), 0xFFB6C1, 0, -0.05, 0));
    atualizarPreview(opts);
    cancelAnimationFrame(previewAnim);
    let t0 = 0;
    function loop(t) {
      previewAnim = requestAnimationFrame(loop);
      t0 = t;
      if (previewMesh) { previewMesh.rotation.y += 0.007; animarCaminhada(previewMesh, t / 200, true); }
      if (previewPet) {
        previewPet.position.x = Math.sin(t / 800) * 0.8 - 1.2;
        previewPet.position.z = Math.cos(t / 800) * 0.5;
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
    previewScene.add(previewMesh);
    if (opts.pet) {
      previewPet = criarPet(opts.pet);
      previewPet.position.set(-1.2, 0, 0.5);
      previewScene.add(previewPet);
    }
  }

  window.AvatarBuilder = { criar, criarPet, animarCaminhada, iniciarPreview, atualizarPreview, CORES_PELE, CORES_CABELO, CORES_OLHOS };
})();
