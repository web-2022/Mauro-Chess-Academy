/* Academia Mauro - guard para páginas de tema.
   IMPORTANTE: este guard evita el acceso normal por URL, pero si el HTML Premium
   sigue siendo público en GitHub, un usuario técnico puede descargar el archivo.
   Para protección fuerte, el contenido Premium debe dejar de publicarse como HTML estático. */
(function () {
  'use strict';
  const cfg = window.MAURO_PREMIUM_CONFIG || {};
  const FREE_LIMIT = Number(cfg.FREE_LIMIT || 10);
  const API_URL = String(cfg.API_URL || '').trim();
  const TOKEN_KEY = cfg.SESSION_TOKEN_KEY || 'mauroPremiumSessionTokenV2';
  const DEVICE_KEY = cfg.DEVICE_ID_KEY || 'mauroPremiumDeviceIdV2';

  const match = location.pathname.match(/tema-(\d+)-/i);
  const topic = match ? Number(match[1]) : 0;
  if (!topic || topic <= FREE_LIMIT) return;

  const lockStyle = document.createElement('style');
  lockStyle.id = 'mauroPremiumGuardStyle';
  lockStyle.textContent = 'html{visibility:hidden!important;background:#020617!important}';
  (document.head || document.documentElement).appendChild(lockStyle);

  function configured(value) { return value && !/^PEGA_AQUI_/i.test(value); }
  function get(key) { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } }
  function reveal() { lockStyle.remove(); document.documentElement.style.visibility = ''; }
  function deny(message) {
    document.documentElement.style.visibility = '';
    document.documentElement.innerHTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso Premium · Academia Mauro</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020617;color:#e5e7eb;font-family:system-ui,sans-serif;padding:24px}.box{max-width:620px;padding:30px;border:1px solid rgba(148,163,184,.22);border-radius:24px;background:#071124;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.4)}h1{margin:0 0 12px;font-size:2rem}p{color:#94a3b8;line-height:1.6}.btn{display:inline-block;margin-top:10px;padding:12px 18px;border-radius:12px;background:linear-gradient(90deg,#22c55e,#38bdf8);color:#03111d;font-weight:900;text-decoration:none}</style></head><body><div class="box"><h1>🔒 Clase Premium</h1><p>${String(message || 'Necesitas una suscripción activa para abrir esta clase.').replace(/[<>]/g,'')}</p><a class="btn" href="ruta-chess-premium.html?login=1">Ingresar o ver planes</a></div></body></html>`;
  }

  async function check() {
    const token = get(TOKEN_KEY);
    const deviceId = get(DEVICE_KEY);
    if (!token || !deviceId) return deny('Inicia sesión con el correo y código recibidos al activar tu plan.');
    if (!configured(API_URL)) return deny('El sistema Premium todavía no está configurado.');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({action:'validarSesion', token, deviceId, topicNumber: topic})
      });
      const result = JSON.parse(await response.text());
      if (!result.ok) return deny(result.message || 'Tu acceso Premium no está activo.');
      reveal();
    } catch (_) {
      deny('No se pudo verificar tu acceso. Revisa tu conexión e inténtalo nuevamente.');
    }
  }
  check();
})();
