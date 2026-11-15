/* Academia Mauro · Menú de navegación compartido (v2)
   - Escritorio: 4 secciones con ícono, mega-menú de Practicar, chips de racha y XP,
     indicador animado y modo compacto al bajar.
   - Celular/tablet: barra inferior tipo app + panel lateral (☰) con entrenamientos,
     clase gratuita e instalar app.
   Sin librerías. Mantiene #mauroSharedHeader, .mauro-site-header y body.mauro-has-header. */
(function () {
  'use strict';
  if (document.querySelector('.mauro-site-header')) return;

  // ---------- Contenedor ----------
  let slot = document.getElementById('mauroSharedHeader');
  if (!slot) { slot = document.createElement('div'); slot.id = 'mauroSharedHeader'; document.body.prepend(slot); }
  document.querySelectorAll('nav.top-nav,.brand-header-kids').forEach(n => n.remove());
  document.body.classList.add('mauro-has-header');

  // ---------- Datos ----------
  const current = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
  const SECTIONS = [
    { id: 'home', url: 'index.html', label: 'INICIO', icon: '🏠', match: p => p === 'index.html' || p === '' },
    { id: 'learn', url: 'ruta-chess.html', label: 'APRENDER', icon: '📚', match: p => ['ruta-chess.html', 'rutaCompleta.html', 'miProgreso.html', 'progreso-historico.html'].includes(p) || /^tema-/.test(p) },
    { id: 'practice', url: 'practica.html', label: 'PRACTICAR', icon: '♟', match: p => PRACTICE_PAGES.includes(p) }
  ];
  const TRAININGS = [
    { url: 'tactica-del-dia.html', icon: '🔥', name: 'Táctica del día', desc: 'Un reto nuevo cada día', daily: true },
    { url: 'jugar.html', icon: '🤖', name: 'Jugar contra la máquina', desc: 'ELO 400–2000 o contra un amigo' },
    { url: 'practica.html#mates', icon: '♛', name: 'Mates', desc: 'Mate en 1 a 4 y mates básicos' },
    { url: 'pieza-indefensa.html', icon: '♞', name: 'Pieza indefensa', desc: 'Gana material sin caer en trampas' },
    { url: 'movimientos-legales.html', icon: '♝', name: 'Movimientos legales', desc: 'A dónde puede ir cada pieza' },
    { url: 'practiquemoseltableroycoordenadas.html', icon: '🎯', name: 'Coordenadas', desc: 'Encuentra la casilla que escuchas' },
    { url: 'dondeEstaLaPieza.html', icon: '👀', name: 'Reconoce las piezas', desc: 'Di en qué casilla está cada pieza' },
    { url: 'tableroDePractica.html', icon: '🧩', name: 'Tablero libre', desc: 'Explora y crea posiciones' }
  ];
  const PRACTICE_PAGES = ['practica.html', 'mate-en-1.html', 'mates.html', ...TRAININGS.map(t => t.url)];
  const CTA = { url: 'inicio-anterior.html#contacto', label: 'Clase gratuita de evaluación', short: 'Clase gratuita' };
  const activeId = (SECTIONS.find(s => s.match(current)) || {}).id || null;

  function todayKey(offset) {
    const d = new Date(); if (offset) d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function readJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || ''); return v ?? fallback; } catch (_) { return fallback; } }
  function playerStats() {
    const daily = readJSON('mauro_daily_tactic_v1', {}) || {};
    const sessions = readJSON('mauro_practice_sessions_v1', []);
    const list = Array.isArray(sessions) ? sessions : [];
    const alive = daily.date === todayKey() || daily.date === todayKey(-1);
    return {
      streak: alive ? (Number(daily.streak) || 0) : 0,
      xp: list.reduce((a, s) => a + (Number(s.correct) || 0), 0) * 10,
      dailyPending: daily.date !== todayKey()
    };
  }

  // ---------- Plantillas ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cur = id => id === activeId ? ' aria-current="page"' : '';
  const trainingItem = (t, cls) => `<a class="${cls}" href="${t.url}"${t.url === current ? ' aria-current="page"' : ''} role="menuitem"><span class="mh-ti-icon" aria-hidden="true">${t.icon}</span><span class="mh-ti-text"><b>${esc(t.name)}${t.daily ? '<span class="mh-badge mh-daily-badge" hidden>1</span>' : ''}</b><small>${esc(t.desc)}</small></span></a>`;

  const desktopLinks = SECTIONS.map(s => {
    const link = `<a class="mh-link" data-section="${s.id}" href="${s.url}"${cur(s.id)}><span class="mh-label">${s.label}</span>${s.id === 'practice' ? '<span class="mh-badge mh-daily-badge" hidden aria-label="Táctica del día pendiente">1</span>' : ''}</a>`;
    if (s.id !== 'practice') return link;
    return `<div class="mh-has-mega">${link}<button class="mh-mega-toggle" type="button" aria-label="Ver entrenamientos" aria-expanded="false" aria-controls="mhMega"><span aria-hidden="true">▾</span></button>
      <div class="mh-mega" id="mhMega" role="menu" aria-label="Entrenamientos">
        <div class="mh-mega-head"><strong>Entrena con Mauro</strong><a href="practica.html">Ver todo →</a></div>
        <div class="mh-mega-grid">${TRAININGS.map(t => trainingItem(t, 'mh-mega-item')).join('')}</div>
      </div></div>`;
  }).join('');

  const chips = `<a class="mh-chip mh-chip-streak" href="tactica-del-dia.html" title="Racha de la táctica del día"><span aria-hidden="true">🔥</span><b class="mh-streak">0</b><span class="mh-sr">días de racha</span></a><a class="mh-chip mh-chip-xp" href="practica.html" title="XP ganados en Práctica"><span aria-hidden="true">⭐</span><b class="mh-xp">0</b><span class="mh-xp-unit">XP</span></a>`;

  const header = document.createElement('nav');
  header.className = 'mauro-site-header';
  header.dataset.mauroNavigation = '';
  header.setAttribute('aria-label', 'Navegación principal');
  header.innerHTML = `<div class="mauro-header-inner">
    <a class="mauro-header-brand" href="index.html" aria-label="Academia Mauro · Inicio"><span class="mauro-header-logo" aria-hidden="true">♞</span><span>Academia Mauro<small>AJEDREZ & ESTRATEGIA</small></span></a>
    <div class="mauro-header-links" id="mauroHeaderLinks">${desktopLinks}<span class="mh-indicator" aria-hidden="true"></span></div>
    <div class="mh-chips">${chips}</div>
    <a class="mauro-header-cta" href="${CTA.url}"><span class="mh-cta-long">${CTA.label}</span><span class="mh-cta-short">${CTA.short}</span></a>
    <button class="mauro-header-toggle" type="button" aria-label="Abrir menú" aria-controls="mhDrawer" aria-expanded="false"><span aria-hidden="true">☰</span></button>
  </div>`;

  // Barra inferior (celular/tablet)
  const tabbar = document.createElement('nav');
  tabbar.className = 'mh-tabbar';
  tabbar.setAttribute('aria-label', 'Navegación inferior');
  tabbar.innerHTML = SECTIONS.map(s => `<a class="mh-tab" href="${s.url}"${cur(s.id)}><span class="mh-tab-label">${s.label}${s.id === 'practice' ? '<span class="mh-badge mh-daily-badge" hidden>1</span>' : ''}</span></a>`).join('');

  // Panel lateral
  const drawer = document.createElement('div');
  drawer.className = 'mh-drawer';
  drawer.id = 'mhDrawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Menú');
  drawer.hidden = true;
  drawer.innerHTML = `<div class="mh-drawer-backdrop" data-close></div>
    <div class="mh-drawer-panel" tabindex="-1">
      <div class="mh-drawer-head"><span class="mauro-header-logo" aria-hidden="true">♞</span><strong>Academia Mauro</strong><button class="mh-drawer-close" type="button" aria-label="Cerrar menú" data-close>✕</button></div>
      <div class="mh-drawer-chips">${chips}</div>
      <p class="mh-drawer-title">Navegación</p>
      <div class="mh-drawer-sections">${SECTIONS.map(s => `<a class="mh-drawer-link" href="${s.url}"${cur(s.id)}>${s.label}</a>`).join('')}</div>
      <p class="mh-drawer-title">Entrenamientos</p>
      <div class="mh-drawer-trainings" role="menu" aria-label="Entrenamientos">${TRAININGS.map(t => trainingItem(t, 'mh-drawer-item')).join('')}</div>
      <a class="mh-drawer-cta" href="${CTA.url}">🎓 ${CTA.label}</a>
      <button class="mh-install" type="button" hidden>📲 Instalar app</button>
    </div>`;

  slot.replaceChildren(header);
  document.body.append(tabbar, drawer);
  document.body.classList.add('mh-has-tabbar');

  // ---------- Chips y badge ----------
  function refreshStats() {
    const s = playerStats();
    document.querySelectorAll('.mh-streak').forEach(e => { e.textContent = s.streak; });
    document.querySelectorAll('.mh-xp').forEach(e => { e.textContent = s.xp >= 10000 ? (s.xp / 1000).toFixed(1) + 'k' : s.xp; });
    document.querySelectorAll('.mh-chip-streak').forEach(e => { e.classList.toggle('is-on', s.streak > 0); e.setAttribute('aria-label', `Racha: ${s.streak} ${s.streak === 1 ? 'día' : 'días'}`); });
    document.querySelectorAll('.mh-chip-xp').forEach(e => e.setAttribute('aria-label', `${s.xp} XP`));
    document.querySelectorAll('.mh-daily-badge').forEach(e => { e.hidden = !s.dailyPending || current === 'tactica-del-dia.html'; });
  }
  refreshStats();
  window.addEventListener('storage', refreshStats);
  window.addEventListener('pageshow', refreshStats);
  window.addEventListener('focus', refreshStats);

  // ---------- Indicador animado ----------
  const linksBox = header.querySelector('.mauro-header-links');
  const indicator = header.querySelector('.mh-indicator');
  function moveIndicator(target) {
    const el = target || header.querySelector('.mh-link[aria-current="page"]');
    if (!el || getComputedStyle(linksBox).display === 'none') { indicator.style.opacity = '0'; return; }
    const box = linksBox.getBoundingClientRect(), r = el.getBoundingClientRect();
    indicator.style.opacity = '1';
    indicator.style.width = Math.round(r.width - 24) + 'px';
    indicator.style.transform = `translateX(${Math.round(r.left - box.left + 12)}px)`;
  }
  header.querySelectorAll('.mh-link').forEach(a => {
    a.addEventListener('mouseenter', () => moveIndicator(a));
    a.addEventListener('focus', () => moveIndicator(a));
  });
  linksBox.addEventListener('mouseleave', () => moveIndicator());
  window.addEventListener('resize', () => moveIndicator());
  (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(() => moveIndicator()));

  // ---------- Mega-menú ----------
  const mega = header.querySelector('.mh-has-mega');
  const megaBtn = header.querySelector('.mh-mega-toggle');
  const megaItems = () => [...header.querySelectorAll('.mh-mega-item, .mh-mega-head a')];
  let hoverTimer = null;
  function setMega(open, focusFirst) {
    mega.classList.toggle('is-open', open);
    megaBtn.setAttribute('aria-expanded', String(open));
    if (open && focusFirst) requestAnimationFrame(() => setTimeout(() => megaItems()[1]?.focus(), 30));
  }
  mega.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover) and (min-width:1101px)').matches) { clearTimeout(hoverTimer); setMega(true); } });
  mega.addEventListener('mouseleave', () => { hoverTimer = setTimeout(() => setMega(false), 160); });
  megaBtn.addEventListener('click', () => setMega(!mega.classList.contains('is-open'), true));
  mega.addEventListener('focusout', e => { if (!mega.contains(e.relatedTarget)) setMega(false); });
  mega.addEventListener('keydown', e => {
    const items = megaItems(), i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { setMega(false); megaBtn.focus(); return; }
    if (e.key === 'ArrowDown' && (document.activeElement === megaBtn || document.activeElement.classList.contains('mh-link'))) { e.preventDefault(); setMega(true, true); return; }
    if (i < 0) return;
    const cols = matchMedia('(min-width:1101px)').matches ? 2 : 1;
    let n = null;
    if (e.key === 'ArrowDown') n = Math.min(items.length - 1, i + (i === 0 ? 1 : cols));
    if (e.key === 'ArrowUp') n = i <= 1 ? 0 : i - cols < 1 ? 0 : i - cols;
    if (e.key === 'ArrowRight') n = Math.min(items.length - 1, i + 1);
    if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = items.length - 1;
    if (n !== null) { e.preventDefault(); items[n].focus(); }
  });

  // ---------- Panel lateral ----------
  const toggle = header.querySelector('.mauro-header-toggle');
  const panel = drawer.querySelector('.mh-drawer-panel');
  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Cerrar menú');
    header.classList.add('menu-open');
    document.documentElement.classList.add('mh-lock');
    refreshStats();
    panel.focus();
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menú');
    header.classList.remove('menu-open');
    document.documentElement.classList.remove('mh-lock');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { drawer.hidden = true; }, reduce ? 0 : 200);
    (lastFocus && lastFocus.focus ? lastFocus : toggle).focus();
  }
  toggle.addEventListener('click', () => (drawer.hidden ? openDrawer() : closeDrawer()));
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target.closest('a')) closeDrawer(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!drawer.hidden) closeDrawer(); else if (mega.classList.contains('is-open')) { setMega(false); megaBtn.focus(); } }
    if (e.key === 'Tab' && !drawer.hidden) { // mantiene el foco dentro del panel
      const f = [...panel.querySelectorAll('a,button:not([hidden])')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === panel)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  matchMedia('(min-width:1101px)').addEventListener?.('change', ev => { if (ev.matches) closeDrawer(); moveIndicator(); });

  // ---------- Instalar app (PWA) ----------
  // Android/Chrome/Edge: usa el aviso nativo. iPhone/iPad (Safari) no lo tiene: se muestran los pasos.
  const installBtn = drawer.querySelector('.mh-install');
  let installEvent = null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = isIOS || /Android|Mobi/i.test(ua);
  const DISMISS_KEY = 'mauro_install_dismissed';
  const dismissedRecently = () => { try { return Date.now() - (+localStorage.getItem(DISMISS_KEY) || 0) < 7 * 864e5; } catch (_) { return false; } };
  let banner = null;
  function hideInstallUI() { installBtn.hidden = true; banner?.remove(); banner = null; }
  function installHelp() {
    const old = document.querySelector('.mh-install-help'); if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'mh-install-help'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Cómo instalar la app');
    const steps = isIOS
      ? ['Toca el botón <b>Compartir</b> <span class="mh-ih-ico">⬆︎</span> en la barra de Safari.', 'Baja y elige <b>«Agregar a pantalla de inicio»</b>.', 'Toca <b>Agregar</b>. ¡Listo! Abre Academia Mauro desde su icono ♞.']
      : ['Abre el menú del navegador <span class="mh-ih-ico">⋮</span> (arriba a la derecha).', 'Elige <b>«Instalar aplicación»</b> o <b>«Agregar a pantalla principal»</b>.', 'Confirma. ¡Listo! Abre Academia Mauro desde su icono ♞.'];
    box.innerHTML = `<div class="mh-ih-backdrop" data-x></div><div class="mh-ih-card"><button class="mh-ih-close" type="button" aria-label="Cerrar" data-x>✕</button>
      <p class="mh-ih-title">📲 Instala Academia Mauro</p><p class="mh-ih-sub">Abre más rápido, a pantalla completa y funciona sin internet.</p>
      <ol>${steps.map(x => `<li>${x}</li>`).join('')}</ol>${isIOS && !/Safari/.test(ua.replace(/CriOS|FxiOS|EdgiOS/, '')) ? '<p class="mh-ih-note">En iPhone hay que abrir esta página en <b>Safari</b> para poder instalarla.</p>' : ''}
      <button class="mh-ih-ok" type="button" data-x>Entendido</button></div>`;
    box.addEventListener('click', e => { if (e.target.closest('[data-x]')) box.remove(); });
    document.body.append(box); box.querySelector('.mh-ih-ok').focus();
  }
  async function doInstall() {
    if (installEvent) {
      installEvent.prompt();
      let ok = false; try { ok = (await installEvent.userChoice).outcome === 'accepted'; } catch (_) {}
      installEvent = null; if (ok) hideInstallUI();
    } else installHelp();
  }
  function showBanner() {
    if (banner || standalone || dismissedRecently() || !isMobile) return;
    banner = document.createElement('div'); banner.className = 'mh-install-banner'; banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'Instalar la app');
    banner.innerHTML = `<span class="mh-ib-logo" aria-hidden="true">♞</span><span class="mh-ib-text"><b>Instala Academia Mauro</b><small>Más rápida y funciona sin internet</small></span><button class="mh-ib-go" type="button">Instalar</button><button class="mh-ib-x" type="button" aria-label="Ahora no">✕</button>`;
    banner.querySelector('.mh-ib-go').addEventListener('click', doInstall);
    banner.querySelector('.mh-ib-x').addEventListener('click', () => { try { localStorage.setItem(DISMISS_KEY, Date.now()); } catch (_) {} banner.remove(); banner = null; });
    document.body.append(banner);
  }
  if (!standalone) {
    installBtn.hidden = false; // en el menú, siempre disponible mientras no esté instalada
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; showBanner(); });
    setTimeout(showBanner, 2500); // iPhone y navegadores sin aviso nativo
  }
  installBtn.addEventListener('click', () => { closeDrawer?.(); doInstall(); });
  window.addEventListener('appinstalled', hideInstallUI);
  window.MauroInstall = doInstall;

  // ---------- Modo compacto al bajar ----------
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { header.classList.toggle('is-compact', window.scrollY > 40); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
