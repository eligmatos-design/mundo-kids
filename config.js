/**
 * Configuração do app — Mundo Kids Android
 *
 * DESENVOLVIMENTO (PC local):
 *   serverUrl: ''  → usa o mesmo endereço do navegador
 *
 * ANDROID / PRODUÇÃO:
 *   Coloque a URL do servidor na nuvem (HTTPS obrigatório!)
 *   Exemplo: 'https://mundo-kids.seudominio.com'
 */
window.APP_CONFIG = {
  // ⚠️ ANTES DE PUBLICAR: coloque aqui a URL do servidor online
  serverUrl: '',

  appName: 'Mundo Kids',
  version: '1.0.0'
};

/** Retorna URL base da API */
window.getServerUrl = function () {
  const cfg = window.APP_CONFIG?.serverUrl || '';
  if (cfg) return cfg.replace(/\/$/, '');
  // Navegador / dev local
  if (location.protocol === 'file:') {
    // App Capacitor sem serverUrl configurado — aviso
    console.warn('Configure APP_CONFIG.serverUrl em config.js!');
    return 'http://192.168.1.8:3847'; // fallback LAN — troque pelo seu IP
  }
  return ''; // same origin
};

window.apiUrl = function (path) {
  const base = window.getServerUrl();
  return base ? base + path : path;
};
