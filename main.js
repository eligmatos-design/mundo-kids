/**
 * Mundo Kids — Telas e fluxo (estilo Avatar World)
 */
(function () {
  'use strict';

  const sessao = {
    code: '', nome: '', nomeMundo: '',
    cor: '#FF1493', pele: 'clara', cabelo: 'spiky', corCabelo: 'castanho',
    expressao: 'feliz', top: 'basico', bottom: 'jeans', shoes: 'tenis',
    chapeu: 'nenhum', pet: 'cachorro'
  };

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  function tela(id) {
    $$('.tela').forEach(t => t.classList.remove('ativa'));
    $(id).classList.add('ativa');
    if (id === '#tela-entrar') { preencherCodigo(); setTimeout(iniciarPreviewAvatar, 100); }
  }

  window.toast = function (msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg; el.classList.remove('oculto');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('oculto'), 2500);
  };

  function sel(grupo, btn, campo, val) {
    $$(grupo + ' .opcao, ' + grupo + ' .cor').forEach(b => b.classList.remove('ativa'));
    btn.classList.add('ativa');
    sessao[campo] = val;
    atualizarPreviewAvatar();
  }

  function atualizarPreviewAvatar() {
    window.AvatarBuilder?.atualizarPreview(sessao);
  }

  function iniciarPreviewAvatar() {
    const cv = $('#preview-avatar');
    if (!cv || !window.AvatarBuilder) return;
    AvatarBuilder.iniciarPreview(cv, sessao);
  }

  // Abas do criador
  $$('.aba').forEach(b => b.onclick = () => {
    $$('.aba').forEach(x => x.classList.remove('ativa'));
    $$('.aba-painel').forEach(x => x.classList.remove('ativa'));
    b.classList.add('ativa');
    $('#aba-' + b.dataset.aba)?.classList.add('ativa');
  });

  $$('.cor').forEach(b => b.onclick = () => sel('#cores', b, 'cor', b.dataset.cor));
  $$('#cores-cabelo .cor').forEach(b => b.onclick = () => sel('#cores-cabelo', b, 'corCabelo', b.dataset.corCabelo));
  $$('#peles .opcao').forEach(b => b.onclick = () => sel('#peles', b, 'pele', b.dataset.pele));
  $$('#expressoes .opcao').forEach(b => b.onclick = () => sel('#expressoes', b, 'expressao', b.dataset.expressao));
  $$('#cabelos .opcao').forEach(b => b.onclick = () => sel('#cabelos', b, 'cabelo', b.dataset.cabelo));
  $$('#tops .opcao').forEach(b => b.onclick = () => sel('#tops', b, 'top', b.dataset.top));
  $$('#bottoms .opcao').forEach(b => b.onclick = () => sel('#bottoms', b, 'bottom', b.dataset.bottom));
  $$('#shoes .opcao').forEach(b => b.onclick = () => sel('#shoes', b, 'shoes', b.dataset.shoes));
  $$('#chapeus .opcao').forEach(b => b.onclick = () => sel('#chapeus', b, 'chapeu', b.dataset.chapeu));
  $$('#pets .opcao').forEach(b => b.onclick = () => sel('#pets', b, 'pet', b.dataset.pet));

  // Carregar avatar e último mundo salvos
  try {
    const salvo = JSON.parse(localStorage.getItem('mk_avatar') || 'null');
    if (salvo) Object.assign(sessao, salvo);
  } catch {}
  try {
    const ultimo = JSON.parse(localStorage.getItem('mk_ultimo_mundo') || 'null');
    if (ultimo?.code) {
      sessao.code = ultimo.code;
      sessao.nomeMundo = ultimo.nomeMundo || '';
      if (ultimo.nome) sessao.nome = ultimo.nome;
    }
  } catch {}

  function preencherCodigo() {
    const inp = $('#input-codigo');
    if (inp && sessao.code) inp.value = sessao.code;
    const n = $('#input-nome');
    if (n && sessao.nome && !n.value) n.value = sessao.nome;
  }

  function salvarUltimoMundo() {
    localStorage.setItem('mk_ultimo_mundo', JSON.stringify({
      code: sessao.code, nome: sessao.nome, nomeMundo: sessao.nomeMundo
    }));
  }

  $('#btn-entrar').onclick = () => tela('#tela-entrar');
  $('#btn-criar').onclick = () => tela('#tela-criar');
  $$('[data-voltar]').forEach(b => b.onclick = () => tela('#tela-inicio'));

  $('#btn-confirmar-criar').onclick = async () => {
    const nome = $('#input-nome-crianca').value.trim();
    const pin = $('#input-pin').value.trim();
    if (!nome) return alert('Digite o nome.');
    if (pin.replace(/\D/g, '').length < 4) return alert('PIN: mínimo 4 números.');
    try {
      const r = await fetch(window.apiUrl('/api/mundo/criar'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, pin })
      });
      const d = await r.json();
      if (!r.ok) return alert(d.erro);
      sessao.code = d.code; sessao.nome = nome; sessao.nomeMundo = d.nome;
      salvarUltimoMundo();
      $('#codigo-criado').textContent = d.code;
      $('#resultado-criar').classList.remove('oculto');
    } catch { alert('Servidor offline? Rode INICIAR-JOGO.bat'); }
  };

  $('#btn-jogar-criado').onclick = () => { preencherCodigo(); tela('#tela-entrar'); };
  $('#input-codigo').oninput = function () { this.value = this.value.toUpperCase(); };

  $('#btn-confirmar-entrar').onclick = async () => {
    const code = $('#input-codigo').value.trim().toUpperCase() || sessao.code;
    const nome = $('#input-nome').value.trim() || sessao.nome;
    const erro = $('#erro-entrar');
    if (!code) { erro.textContent = 'Digite o código.'; erro.classList.remove('oculto'); return; }
    if (!nome) { erro.textContent = 'Digite seu nome.'; erro.classList.remove('oculto'); return; }
    try {
      const r = await fetch(window.apiUrl('/api/mundo/entrar'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, nome })
      });
      const d = await r.json();
      if (!r.ok) { erro.textContent = d.erro; erro.classList.remove('oculto'); return; }
      erro.classList.add('oculto');
      sessao.code = d.code; sessao.nome = nome; sessao.nomeMundo = d.nome;
      localStorage.setItem('mk_avatar', JSON.stringify(sessao));
      salvarUltimoMundo();
      iniciarJogo();
    } catch { erro.textContent = 'Erro de conexão.'; erro.classList.remove('oculto'); }
  };

  function iniciarJogo() {
    tela('#tela-loading');
    setTimeout(() => {
      tela('#tela-jogo');
      $('#nome-mundo').textContent = sessao.nomeMundo;
      $('#codigo-mundo').textContent = sessao.code;
      const mini = $('#avatar-mini');
      if (mini) mini.textContent = sessao.pet === 'unicornio' ? '🦄' : sessao.pet === 'gato' ? '🐱' : '✨';
      window.MundoKids?.iniciar(sessao);
    }, 900);
  }

  window.sessao = sessao;
})();
