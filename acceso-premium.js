/* Academia Mauro - control de acceso de la RUTA.
   Fuente de verdad: Apps Script + Google Sheets.
   No existe un premium=true que pueda activar el navegador por sí solo. */
(function () {
  'use strict';

  const cfg = window.MAURO_PREMIUM_CONFIG || {};
  const FREE_LIMIT = Number(cfg.FREE_LIMIT || 10);
  const API_URL = String(cfg.API_URL || '').trim();
  const TOKEN_KEY = cfg.SESSION_TOKEN_KEY || 'mauroPremiumSessionTokenV2';
  const DEVICE_KEY = cfg.DEVICE_ID_KEY || 'mauroPremiumDeviceIdV2';
  const EMAIL_KEY = cfg.EMAIL_KEY || 'mauroPremiumEmailV2';

  const state = {
    authorized: false,
    validating: false,
    plan: '',
    expires: '',
    email: ''
  };

  function configured(value) {
    return value && !/^PEGA_AQUI_/i.test(value);
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
  }
  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function randomId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(24);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  function deviceId() {
    let id = safeStorageGet(DEVICE_KEY);
    if (!id) {
      id = randomId();
      safeStorageSet(DEVICE_KEY, id);
    }
    return id;
  }

  async function api(payload) {
    if (!configured(API_URL)) {
      throw new Error('Falta configurar la URL de Google Apps Script.');
    }
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('El servidor respondió con error ' + response.status + '.');
    const text = await response.text();
    try { return JSON.parse(text); }
    catch (_) { throw new Error('La respuesta del servidor no es JSON válido.'); }
  }

  function topicNumber(card) {
    const attr = Number(card?.dataset?.topicNumber || 0);
    if (attr) return attr;
    const num = Number((card?.querySelector('.topic-num')?.textContent || '').replace(/\D/g, ''));
    if (num) return num;
    const href = card?.getAttribute('href') || '';
    const match = href.match(/tema-(\d+)-/i);
    return match ? Number(match[1]) : 0;
  }

  function ensureBadge(card, text, cls) {
    let badge = card.querySelector('.mauro-access-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'mauro-access-badge';
      card.appendChild(badge);
    }
    badge.className = 'mauro-access-badge ' + cls;
    badge.textContent = text;
  }

  function decorateCards() {
    document.querySelectorAll('.topic-card').forEach(card => {
      const n = topicNumber(card);
      if (!n) return;
      card.dataset.topicNumber = String(n);
      if (n <= FREE_LIMIT) {
        card.classList.add('mauro-free');
        card.classList.remove('mauro-premium', 'mauro-locked', 'mauro-unlocked');
        card.removeAttribute('aria-disabled');
        ensureBadge(card, 'GRATIS', 'free');
      } else {
        card.classList.add('mauro-premium');
        card.classList.toggle('mauro-unlocked', state.authorized);
        card.classList.toggle('mauro-locked', !state.authorized);
        if (state.authorized) {
          card.removeAttribute('aria-disabled');
          ensureBadge(card, 'PREMIUM', 'unlocked');
        } else {
          card.setAttribute('aria-disabled', 'true');
          ensureBadge(card, '🔒 PREMIUM', 'locked');
        }
      }
    });
    updateStatusUI();
  }

  function updateStatusUI(message) {
    const status = document.getElementById('mauroPremiumStatus');
    const loginBtn = document.getElementById('mauroOpenLogin');
    const logoutBtn = document.getElementById('mauroLogout');
    const account = document.getElementById('mauroAccountInfo');
    if (status) {
      if (message) status.textContent = message;
      else if (state.authorized) status.textContent = '✅ Acceso Premium activo';
      else status.textContent = '10 clases gratis · desde la clase 11 se requiere Premium';
      status.classList.toggle('ok', state.authorized);
    }
    if (loginBtn) loginBtn.style.display = state.authorized ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = state.authorized ? '' : 'none';
    if (account) {
      if (state.authorized) {
        const date = state.expires ? new Date(state.expires).toLocaleDateString('es-PE') : '';
        account.textContent = [state.email, state.plan && ('Plan ' + state.plan), date && ('hasta ' + date)].filter(Boolean).join(' · ');
      } else account.textContent = '';
    }
  }

  function openModal(message) {
    const modal = document.getElementById('mauroPremiumModal');
    const msg = document.getElementById('mauroLoginMessage');
    if (message && msg) msg.textContent = message;
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('mauro-modal-open');
    setTimeout(() => document.getElementById('mauroLoginEmail')?.focus(), 20);
  }

  function closeModal() {
    const modal = document.getElementById('mauroPremiumModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('mauro-modal-open');
  }

  function clearSession() {
    safeStorageRemove(TOKEN_KEY);
    state.authorized = false;
    state.plan = '';
    state.expires = '';
    decorateCards();
  }

  async function validateSavedSession(showMessage) {
    if (state.validating) return state.authorized;
    const token = safeStorageGet(TOKEN_KEY);
    if (!token) {
      state.authorized = false;
      decorateCards();
      return false;
    }
    if (!configured(API_URL)) {
      state.authorized = false;
      decorateCards();
      if (showMessage) updateStatusUI('⚠️ Falta configurar Apps Script');
      return false;
    }
    state.validating = true;
    try {
      const result = await api({ action: 'validarSesion', token, deviceId: deviceId() });
      if (!result.ok) {
        clearSession();
        if (showMessage) updateStatusUI(result.message || 'La sesión ya no es válida.');
        return false;
      }
      state.authorized = true;
      state.plan = String(result.plan || '');
      state.expires = String(result.vencimiento || '');
      state.email = String(result.email || safeStorageGet(EMAIL_KEY) || '');
      decorateCards();
      return true;
    } catch (error) {
      // Si la red falla no concedemos acceso nuevo; tampoco destruimos el token.
      state.authorized = false;
      decorateCards();
      if (showMessage) updateStatusUI('Sin conexión con el servidor de acceso.');
      return false;
    } finally {
      state.validating = false;
    }
  }

  async function login(event) {
    event.preventDefault();
    const emailInput = document.getElementById('mauroLoginEmail');
    const codeInput = document.getElementById('mauroLoginCode');
    const btn = document.getElementById('mauroLoginSubmit');
    const msg = document.getElementById('mauroLoginMessage');
    const email = String(emailInput?.value || '').trim().toLowerCase();
    const codigo = String(codeInput?.value || '').trim().toUpperCase();
    if (!email || !codigo) {
      if (msg) msg.textContent = 'Ingresa tu correo y código de acceso.';
      return;
    }
    if (!configured(API_URL)) {
      if (msg) msg.textContent = 'Falta configurar la URL de Apps Script en mauro-premium-config.js.';
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }
    if (msg) msg.textContent = 'Validando acceso…';
    try {
      const result = await api({ action: 'loginPremium', email, codigo, deviceId: deviceId() });
      if (!result.ok || !result.token) {
        if (msg) msg.textContent = '❌ ' + (result.message || 'Acceso no autorizado.');
        return;
      }
      safeStorageSet(TOKEN_KEY, result.token);
      safeStorageSet(EMAIL_KEY, email);
      state.authorized = true;
      state.email = email;
      state.plan = String(result.plan || '');
      state.expires = String(result.vencimiento || '');
      decorateCards();
      if (msg) msg.textContent = '✅ Acceso activado.';
      setTimeout(closeModal, 450);
    } catch (error) {
      if (msg) msg.textContent = 'No se pudo validar: ' + error.message;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
    }
  }

  function openPayment(plan) {
    const url = plan === 'ANUAL' ? cfg.CULQI_ANUAL_URL : cfg.CULQI_MENSUAL_URL;
    if (!configured(url)) {
      openModal('Aún falta pegar el CulqiLink de este plan en mauro-premium-config.js.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function isPremiumHref(href) {
    const match = String(href || '').match(/tema-(\d+)-/i);
    return match ? Number(match[1]) > FREE_LIMIT : false;
  }

  function installEvents() {
    // Captura: bloquea antes de los listeners existentes del HTML.
    document.addEventListener('click', function (event) {
      const card = event.target.closest?.('.topic-card');
      if (card && topicNumber(card) > FREE_LIMIT && !state.authorized) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openModal('🔒 Esta clase es Premium. Ingresa tu correo y código o elige un plan.');
        return;
      }
      const cont = event.target.closest?.('#continueBtn');
      if (cont && !state.authorized && isPremiumHref(cont.getAttribute('href'))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openModal('Has llegado al final de las 10 clases gratuitas.');
      }
    }, true);

    document.getElementById('mauroOpenLogin')?.addEventListener('click', () => openModal(''));
    document.getElementById('mauroCloseModal')?.addEventListener('click', closeModal);
    document.getElementById('mauroPremiumModal')?.addEventListener('click', e => {
      if (e.target.id === 'mauroPremiumModal') closeModal();
    });
    document.getElementById('mauroLoginForm')?.addEventListener('submit', login);
    document.querySelectorAll('[data-mauro-plan]').forEach(btn => {
      btn.addEventListener('click', () => openPayment(btn.dataset.mauroPlan));
    });
    document.getElementById('mauroLogout')?.addEventListener('click', async () => {
      const token = safeStorageGet(TOKEN_KEY);
      clearSession();
      if (token && configured(API_URL)) {
        try { await api({ action: 'cerrarSesion', token, deviceId: deviceId() }); } catch (_) {}
      }
      updateStatusUI('Sesión cerrada. Las clases Premium están bloqueadas.');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  async function init() {
    state.email = safeStorageGet(EMAIL_KEY);
    decorateCards();
    installEvents();
    const params = new URLSearchParams(location.search);
    if (params.get('login') === '1') openModal('Ingresa para continuar con tu clase Premium.');
    await validateSavedSession(false);
    // Revalidación periódica; evita que una sesión local siga abierta tras suspensión/vencimiento.
    setInterval(() => validateSavedSession(false), 5 * 60 * 1000);
    window.addEventListener('focus', () => validateSavedSession(false));
  }

  window.MauroPremium = Object.freeze({
    openLogin: openModal,
    validate: validateSavedSession,
    isAuthorized: () => state.authorized
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
