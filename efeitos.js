/**
 * Mundo Kids — Efeitos: sons, partículas, céu, ambiente
 */
window.FX = (function () {
  'use strict';

  let ctx = null;
  const partículas = [];

  function initAudio() {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }

  function tom(freq, dur, tipo = 'sine', vol = 0.15) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  const sons = {
    moeda: () => { tom(880, .08); setTimeout(() => tom(1320, .12), 60); },
    estrela: () => { tom(523, .1); setTimeout(() => tom(659, .1), 80); setTimeout(() => tom(784, .15), 160); },
    pular: () => tom(400, .08, 'square', .08),
    portal: () => { tom(330, .15); setTimeout(() => tom(440, .2), 100); },
    conquista: () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => tom(f,.12,'sine',.12), i*90)); },
    galinha: () => { tom(600,.1,'square',.08); setTimeout(()=>tom(800,.08,'square',.06),100); },
    emote: () => tom(600, .1, 'triangle', .1),
    baú: () => { tom(220,.1); setTimeout(()=>tom(440,.15),100); setTimeout(()=>tom(880,.2),200); }
  };

  function céu(scene) {
    const geo = new THREE.SphereGeometry(120, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x0077ff) },
        mid: { value: new THREE.Color(0x87CEEB) },
        bot: { value: new THREE.Color(0xffeedd) }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: `
        uniform vec3 top, mid, bot;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 col = h > 0.5 ? mix(mid, top, (h-0.5)*2.0) : mix(bot, mid, h*2.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(geo, mat);
    scene.add(sky);
    return sky;
  }

  function nuvens(scene, count = 8) {
    const grupo = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      [[0,0,0,2.5],[ -1.5,0.2,0,1.8],[1.5,0.1,0,2],[0,0.3,0.5,1.5]].forEach(([x,y,z,s]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat);
        m.position.set(x,y,z); g.add(m);
      });
      g.position.set((Math.random()-.5)*80, 18+Math.random()*12, (Math.random()-.5)*80);
      g.userData.vel = 0.3 + Math.random() * 0.5;
      grupo.add(g);
    }
    scene.add(grupo);
    return grupo;
  }

  function sol(scene) {
    const sol = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xFFE066 })
    );
    sol.position.set(40, 45, -30);
    scene.add(sol);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xFFE066, transparent: true, opacity: 0.25 })
    );
    glow.position.copy(sol.position);
    scene.add(glow);
    return sol;
  }

  function burst(scene, x, y, z, cor = 0xFFD700, n = 12) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 4, 4),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true })
      );
      m.position.set(x, y, z);
      const a = (i / n) * Math.PI * 2;
      partículas.push({
        mesh: m, life: 1,
        vx: Math.cos(a) * (1 + Math.random()),
        vy: 1 + Math.random() * 2,
        vz: Math.sin(a) * (1 + Math.random())
      });
      scene.add(m);
    }
  }

  function confete(scene, x, y, z) {
    const cores = [0xFF6B9D, 0x4ECDC4, 0xFFE66D, 0xA78BFA, 0xFB923C];
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: cores[i % cores.length] })
      );
      m.position.set(x, y + 1, z);
      partículas.push({
        mesh: m, life: 1.5,
        vx: (Math.random()-.5)*4, vy: 2+Math.random()*3, vz: (Math.random()-.5)*4,
        rot: Math.random()*0.2
      });
      scene.add(m);
    }
  }

  function updatePartículas(dt, scene) {
    for (let i = partículas.length - 1; i >= 0; i--) {
      const p = partículas[i];
      p.life -= dt;
      p.vy -= 6 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.rot) p.mesh.rotation.y += p.rot;
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        partículas.splice(i, 1);
      }
    }
  }

  function moverNuvens(nuvens, dt) {
    nuvens?.children.forEach(n => {
      n.position.x += n.userData.vel * dt;
      if (n.position.x > 60) n.position.x = -60;
    });
  }

  function luzes(scene) {
    scene.add(new THREE.HemisphereLight(0x9fd3ff, 0x4a6b3a, 0.55));
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const sol = new THREE.DirectionalLight(0xfff2df, 1.15);
    sol.position.set(30, 50, 20);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.near = 1;
    sol.shadow.camera.far = 100;
    sol.shadow.camera.left = -40;
    sol.shadow.camera.right = 40;
    sol.shadow.camera.top = 40;
    sol.shadow.camera.bottom = -40;
    sol.shadow.bias = -0.0015;
    sol.shadow.radius = 3;
    scene.add(sol);
    // Luz de preenchimento suave (lado oposto do sol) — sombras menos duras, mais realistas
    const preenchimento = new THREE.DirectionalLight(0xcfe8ff, 0.28);
    preenchimento.position.set(-25, 20, -15);
    scene.add(preenchimento);
    return sol;
  }

  return { initAudio, sons, céu, nuvens, sol, burst, confete, updatePartículas, moverNuvens, luzes };
})();
