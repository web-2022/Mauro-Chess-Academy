/* Ajedrezia · Respaldo del avance en Google Sheets (piloto)
   - Cada alumno tiene un código (por ejemplo MAU-7K3P9Q) guardado en este dispositivo.
   - El avance (claves "mauro…" del navegador) se envía a la hoja «Respaldo» al salir de la página.
   - Con el código se recupera el avance en otro dispositivo o en el dominio nuevo.
   No guarda contraseñas ni datos personales: solo el avance y un nombre opcional. */
(function () {
  'use strict';
  const ENDPOINT = (window.MAURO_CONFIG && window.MAURO_CONFIG.googleSheetsWebAppUrl) ||
    'https://script.google.com/macros/s/AKfycbwMII06Sm70qSjqKVxKuE27Y42U3O43tol2Ze6XnuCWqXDYh37EC7TxQgmc6Xx4mpRcvQ/exec';
  const K_CODE = 'az_alumno', K_HASH = 'az_sync_hash', K_LAST = 'az_sync_last';
  const SKIP = /queue|history|analytics|events|review|az_/i;

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const academia = () => (window.ACADEMIA && window.ACADEMIA.slug) || (function () { try { return localStorage.getItem('az_academia') || 'mauro'; } catch (_) { return 'mauro'; } })();

  function newCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = ''; const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(6)) : Array.from({ length: 6 }, () => Math.random() * 256);
    for (let i = 0; i < 6; i++) s += abc[r[i] % abc.length];
    return academia().slice(0, 3).toUpperCase() + '-' + s;
  }
  function code() {
    let c = null; try { c = localStorage.getItem(K_CODE); } catch (_) {}
    if (!c) { c = newCode(); try { localStorage.setItem(K_CODE, c); } catch (_) {} }
    return c;
  }

  function snapshot() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/^mauro/i.test(k) || SKIP.test(k)) continue;
      out[k] = localStorage.getItem(k);
    }
    let s = JSON.stringify(out);
    if (s.length > 45000) { // límite de una celda de Sheets: se quitan los «retomar paso»
      Object.keys(out).filter(k => /resume/i.test(k)).forEach(k => delete out[k]);
      s = JSON.stringify(out);
    }
    return s;
  }
  function summary() {
    const prog = read('mauroChessProgressV1', {}) || {};
    const vals = Object.values(prog);
    return { topicsCompleted: vals.filter(t => t && t.completed).length, totalXP: vals.reduce((a, t) => a + (Number(t && t.xp) || 0), 0) };
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }

  function push(force) {
    if (!ENDPOINT || !navigator.onLine) return Promise.resolve(false);
    const snap = snapshot(), h = hash(snap);
    let prev = null; try { prev = localStorage.getItem(K_HASH); } catch (_) {}
    if (!force && prev === h) return Promise.resolve(true);
    const prof = read('mauro_chess_profile_v1', {}) || {};
    const ev = Object.assign({
      type: 'backup', alumnoCode: code(), academia: academia(), userId: prof.userId || '',
      displayName: prof.displayName || '', device: /Mobi/i.test(navigator.userAgent) ? 'celular' : 'computadora',
      timestamp: new Date().toISOString(), snapshot: snap
    }, summary());
    return fetch(ENDPOINT, { method: 'POST', mode: 'cors', keepalive: snap.length < 60000, cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ source: 'Ajedrezia', events: [ev] }) })
      .then(r => r.json()).then(j => {
        if (j && j.ok) { try { localStorage.setItem(K_HASH, h); localStorage.setItem(K_LAST, ev.timestamp); } catch (_) {} return true; }
        return false;
      }).catch(() => false);
  }

  // Fusiona el avance recuperado con el de este dispositivo sin perder nada.
  function merge(remote) {
    let n = 0;
    Object.keys(remote).forEach(k => {
      const rv = remote[k]; const lv = localStorage.getItem(k);
      if (lv == null) { localStorage.setItem(k, rv); n++; return; }
      if (k === 'mauroChessProgressV1') {
        let a = {}, b = {}; try { a = JSON.parse(lv) || {}; b = JSON.parse(rv) || {}; } catch (_) {}
        Object.keys(b).forEach(t => {
          const x = a[t], y = b[t];
          if (!x) { a[t] = y; n++; }
          else if (y && ((y.completed && !x.completed) || (Number(y.xp) || 0) > (Number(x.xp) || 0))) { a[t] = Object.assign({}, x, y, { completed: !!(x.completed || y.completed) }); n++; }
        });
        localStorage.setItem(k, JSON.stringify(a));
        return;
      }
      try { const x = JSON.parse(lv), y = JSON.parse(rv); if (y && y.completed && !(x && x.completed)) { localStorage.setItem(k, rv); n++; } } catch (_) {}
    });
    return n;
  }

  function restore(c) {
    c = String(c || '').trim().toUpperCase();
    if (!c) return Promise.resolve({ ok: false, msg: 'Escribe tu código.' });
    return fetch(ENDPOINT + '?action=load&code=' + encodeURIComponent(c), { cache: 'no-store' })
      .then(r => r.json()).then(j => {
        if (!j || !j.ok) return { ok: false, msg: 'No se pudo conectar. Inténtalo de nuevo.' };
        if (!j.found) return { ok: false, msg: 'No encontramos ese código.' };
        let snap = {}; try { snap = JSON.parse(j.snapshot || '{}'); } catch (_) {}
        const n = merge(snap);
        try { localStorage.setItem(K_CODE, c); if (j.academia) localStorage.setItem('az_academia', j.academia); localStorage.removeItem(K_HASH); } catch (_) {}
        return { ok: true, n: n, msg: 'Avance recuperado.' };
      }).catch(() => ({ ok: false, msg: 'No se pudo conectar. Revisa tu internet.' }));
  }

  window.AjedreziaSync = { code, push, restore, lastSync: () => { try { return localStorage.getItem(K_LAST); } catch (_) { return null; } } };

  code();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(false); });
  window.addEventListener('pagehide', () => push(false));
  window.addEventListener('online', () => push(false));
  setTimeout(() => push(false), 4000);
})();
