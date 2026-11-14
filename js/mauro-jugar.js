/* Academia Mauro · Jugar contra la máquina (o contra un amigo en el mismo dispositivo).
   Reglas e historial con js/mauro-chess-rules.js; la máquina piensa en un Web Worker
   (js/mauro-motor.js) para que la página no se congele. La partida se guarda sola. */
(function () {
  'use strict';
  const C = window.MauroChess, $ = id => document.getElementById(id);
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const SAVE_KEY = 'mauro_jugar_partida_v1';
  const NAME = { K: 'rey', Q: 'dama', R: 'torre', B: 'alfil', N: 'caballo', P: 'peón' };
  const LEVEL_NAMES = { 1: 'Principiante', 2: 'Fácil', 3: 'Intermedio', 4: 'Avanzado', 5: 'Experto', 6: 'Maestro' };
  const LEVEL_ELO = { 1: '400–700', 2: '700–1000', 3: '1000–1300', 4: '1300–1600', 5: '1600–1800', 6: '1800–2000' };
  const boardEl = $('board');

  // ---------- Motor en segundo plano ----------
  let worker = null, reqId = 0;
  const pending = new Map();
  function engine(fen, moves, level) {
    return new Promise(resolve => {
      const id = ++reqId; pending.set(id, resolve);
      try {
        if (!worker) { worker = new Worker('js/mauro-motor.js?v=2'); worker.onmessage = ev => { const r = pending.get(ev.data.id); pending.delete(ev.data.id); r && r(ev.data); }; }
        worker.postMessage({ id, fen, moves, level });
      } catch (_) { // sin Workers: se calcula en la página
        setTimeout(() => { pending.delete(id); resolve(window.MauroMotor.bestMove(fen, level, moves)); }, 30);
      }
    });
  }

  // ---------- Estado de la partida ----------
  let game = null;          // { mode, level, human: 'w'|'b'|'both', moves:[uci], sans:[], result, hints }
  let positions = [];       // estados de reglas tras cada jugada (0 = inicio)
  let analyzing = false;
  let viewAt = 0, selected = null, thinking = false, flipped = false, hintMarks = null, promoPending = null;

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (_) {} }
  function rebuild() {
    positions = [C.parseFEN(START)]; game.sans = [];
    for (const u of game.moves) {
      const st = positions[positions.length - 1];
      const m = C.legalMoves(st).find(x => x.from + x.to === u.slice(0, 4));
      if (!m) { game.moves = game.moves.slice(0, positions.length - 1); break; }
      game.sans.push(C.san(st, m));
      positions.push(C.apply(st, m, u[4] ? u[4].toUpperCase() : 'Q'));
    }
    viewAt = positions.length - 1;
  }
  const current = () => positions[positions.length - 1];
  const humanTurn = () => !game.result && (game.human === 'both' || current().turn === game.human);

  // ---------- Fin de partida ----------
  function insufficient(st) {
    const ps = Object.entries(st.board).filter(([, p]) => p[1] !== 'K');
    if (!ps.length) return true;
    if (ps.length === 1 && /[BN]/.test(ps[0][1][1])) return true;
    if (ps.length === 2 && ps.every(([, p]) => p[1] === 'B')) { const col = s => ('abcdefgh'.indexOf(s[0]) + +s[1]) % 2; return col(ps[0][0]) === col(ps[1][0]); }
    return false;
  }
  function checkEnd() {
    const st = current();
    if (C.isMate(st)) return { result: st.turn === 'w' ? '0-1' : '1-0', why: 'Jaque mate' };
    if (C.isStalemate(st)) return { result: '1/2-1/2', why: 'Ahogado' };
    if (insufficient(st)) return { result: '1/2-1/2', why: 'Material insuficiente' };
    const key = s => C.toFEN(s).split(' ').slice(0, 4).join(' ');
    const k = key(st); if (positions.filter(p => key(p) === k).length >= 3) return { result: '1/2-1/2', why: 'Triple repetición' };
    let half = 0; for (let i = game.moves.length - 1; i >= 0; i--) { const before = positions[i], u = game.moves[i]; const p = before.board[u.slice(0, 2)]; if (p && p[1] === 'P' || before.board[u.slice(2, 4)]) break; half++; }
    if (half >= 100) return { result: '1/2-1/2', why: 'Regla de las 50 jugadas' };
    return null;
  }
  function finish(end) {
    game.result = end.result; game.why = end.why; save();
    const youWin = game.human !== 'both' && ((end.result === '1-0' && game.human === 'w') || (end.result === '0-1' && game.human === 'b'));
    const draw = end.result === '1/2-1/2';
    let msg;
    if (game.human === 'both') msg = draw ? `🤝 Tablas · ${end.why}` : `🏁 ${end.why} · ganan ${end.result === '1-0' ? 'blancas' : 'negras'}`;
    else msg = draw ? `🤝 Tablas por ${end.why.toLowerCase()}.` : youWin ? `🏆 ¡Ganaste! ${end.why}.` : `${end.why}. Esta vez ganó la máquina. ¡Revisa la partida y vuelve a intentarlo!`;
    status(msg, draw ? '' : youWin || game.human === 'both' ? 'good' : 'bad');
    speak(draw ? 'Tablas' : youWin ? '¡Ganaste! Jaque mate.' : end.why);
    if (game.human !== 'both') recordResult(youWin ? 1 : 0);
    updateControls();
  }
  function recordResult(won) {
    try {
      const key = 'mauro_practice_sessions_v1'; const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ type: 'jugar', correct: won, total: 1, completedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list.slice(-100)));
    } catch (_) {}
  }

  // ---------- Voz ----------
  function speak(t) { try { if ($('voiceToggle')?.getAttribute('aria-pressed') === 'false') return; if (window.MauroVoice?.speak) return window.MauroVoice.speak(t); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-PE'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) {} }

  // ---------- Tablero ----------
  function render() {
    const st = positions[viewAt];
    const live = viewAt === positions.length - 1;
    const targets = selected && live ? C.legalFrom(st, selected).map(m => m.to) : [];
    const lastU = viewAt > 0 ? game.moves[viewAt - 1] : null;
    const kingInCheck = C.inCheck(st) ? C.kingSquare(st.board, st.turn) : null;
    boardEl.replaceChildren();
    for (let ri = 0; ri < 8; ri++) for (let fi = 0; fi < 8; fi++) {
      const r = flipped ? ri + 1 : 8 - ri, f = flipped ? 7 - fi : fi;
      const s = C.FILES[f] + r, p = st.board[s];
      const d = document.createElement('div');
      d.className = 'sq ' + ((f + r) % 2 ? 'dark' : 'light'); d.dataset.square = s;
      if (lastU && (s === lastU.slice(0, 2) || s === lastU.slice(2, 4))) d.classList.add('play-last');
      if (s === kingInCheck) d.classList.add('play-check');
      if (s === selected) d.classList.add('drill-selected');
      if (targets.includes(s)) d.classList.add(p ? 'drill-capture' : 'drill-target');
      if (hintMarks && live && (s === hintMarks[0] || s === hintMarks[1])) d.classList.add('drill-hint');
      if (p) { const img = document.createElement('img'); img.src = `pieces-tema/${p}.png`; img.alt = NAME[p[1]] + (p[0] === 'w' ? ' blanco' : ' negro'); img.className = 'mp-libre mp-' + p; img.draggable = false; d.append(img); }
      if (ri === 7) { const c = document.createElement('span'); c.className = 'square-file'; c.textContent = C.FILES[f]; d.append(c); }
      if (fi === 0) { const c = document.createElement('span'); c.className = 'square-rank'; c.textContent = r; d.append(c); }
      d.setAttribute('aria-label', `Casilla ${s}${p ? ', ' + NAME[p[1]] + (p[0] === 'w' ? ' blanco' : ' negro') : ''}`);
      d.addEventListener('click', () => onSquare(s));
      boardEl.append(d);
    }
    renderMoves(); renderCaptured();
    if (!analyzing) renderAnalysisLazy();
  }
  let lastAnKey = null;
  function renderAnalysisLazy() { const k = an() ? key() : null; if (k !== lastAnKey) { lastAnKey = k; renderAnalysis(); } }
  function onSquare(s) {
    if (thinking || analyzing || game.result || !humanTurn()) return;
    if (viewAt !== positions.length - 1) { goTo(positions.length - 1); return; }
    const st = current(), p = st.board[s];
    if (selected && s !== selected && !(p && C.color(p) === st.turn)) {
      const ms = C.legalFrom(st, selected).filter(m => m.to === s); const from = selected; selected = null;
      if (!ms.length) { render(); return; }
      if (ms[0].promotion) return askPromotion(from, s);
      return playMove(from + s);
    }
    if (p && C.color(p) === st.turn) { selected = s === selected ? null : s; render(); return; }
    selected = null; render();
  }
  function askPromotion(from, to) {
    promoPending = from + to;
    const color = current().turn, box = $('promoDialog');
    box.querySelectorAll('[data-promo]').forEach(b => { b.querySelector('img').src = `pieces-tema/${color}${b.dataset.promo.toUpperCase()}.png`; });
    box.hidden = false; box.querySelector('[data-promo]').focus();
  }
  $('promoDialog').addEventListener('click', e => {
    const b = e.target.closest('[data-promo]'); if (!b && !e.target.closest('.promo-card')) { $('promoDialog').hidden = true; promoPending = null; render(); return; }
    if (!b) return; $('promoDialog').hidden = true; const u = promoPending + b.dataset.promo; promoPending = null; playMove(u);
  });

  function playMove(u) {
    const st = current(); const m = C.legalMoves(st).find(x => x.from + x.to === u.slice(0, 4)); if (!m) return;
    const san = C.san(st, m); // SAN antes de mover (incluye + o #)
    game.moves.push(u.length === 5 || !m.promotion ? u : u + 'q');
    game.sans.push(san + (m.promotion && u[4] && u[4] !== 'q' ? '' : ''));
    positions.push(C.apply(st, m, (u[4] || 'q').toUpperCase()));
    // SAN correcto cuando se corona a otra pieza
    if (m.promotion) game.sans[game.sans.length - 1] = san.replace(/=D/, '=' + ({ q: 'D', r: 'T', b: 'A', n: 'C' }[u[4] || 'q']));
    viewAt = positions.length - 1; selected = null; hintMarks = null; save();
    const end = checkEnd();
    render();
    if (end) return finish(end);
    if (C.inCheck(current())) speak('Jaque');
    status(turnText());
    updateControls();
    if (!humanTurn()) machineMove();
  }
  async function machineMove() {
    thinking = true; updateControls();
    status(`🤖 La máquina está pensando… (nivel ${LEVEL_NAMES[game.level]})`);
    const myGame = game, n = game.moves.length;
    const t0 = Date.now();
    const r = await engine(START, game.moves.slice(), game.level);
    const wait = 450 - (Date.now() - t0); if (wait > 0) await new Promise(res => setTimeout(res, wait)); // que se note la respuesta
    if (myGame !== game || game.moves.length !== n) return; // se reinició o deshizo mientras pensaba
    thinking = false;
    if (r && r.uci) playMove(r.uci); else updateControls();
  }
  function turnText() {
    const st = current(); const check = C.inCheck(st) ? ' · ¡Jaque!' : '';
    if (game.human === 'both') return `Juegan ${st.turn === 'w' ? 'blancas' : 'negras'}${check}`;
    return humanTurn() ? `Tu turno (${game.human === 'w' ? 'blancas' : 'negras'})${check}` : `Turno de la máquina${check}`;
  }
  function status(t, kind) { const el = $('playStatus'); el.textContent = t; el.className = 'feedback' + (kind ? ' ' + kind : ''); }

  // ---------- Lista de jugadas y repaso ----------
  function renderMoves() {
    const list = $('moveList'); list.replaceChildren();
    if (!game.sans.length) { const p = document.createElement('p'); p.className = 'ml-empty'; p.textContent = 'Todavía no hay jugadas.'; list.append(p); }
    game.sans.forEach((san, i) => {
      if (i % 2 === 0) { const n = document.createElement('span'); n.className = 'ml-num'; n.textContent = (i / 2 + 1) + '.'; list.append(n); }
      const b = document.createElement('button'); b.type = 'button'; const q = an() ? an().q[i] : null;
      b.className = 'rv-move ' + (i % 2 ? 'b' : 'w') + (viewAt === i + 1 ? ' active' : '') + (q ? ' q-' + q : ''); b.textContent = san + (q ? QUAL[q].sym : '');
      if (q) b.title = QUAL[q].name;
      b.addEventListener('click', () => goTo(i + 1)); list.append(b);
    });
    if (game.result) { const r = document.createElement('span'); r.className = 'ml-result'; r.textContent = game.result === '1/2-1/2' ? '½-½' : game.result; list.append(r); }
    list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    const live = viewAt === positions.length - 1;
    const note = analysisNote(viewAt);
    $('viewNote').hidden = live && !note;
    $('viewNote').innerHTML = '';
    if (note) { $('viewNote').append(note); return renderNavButtons(); }
    $('viewNote').textContent = live ? '' : `Estás viendo ${viewAt === 0 ? 'la posición inicial' : 'la jugada ' + Math.ceil(viewAt / 2) + (viewAt % 2 ? '.' : '...') + ' ' + game.sans[viewAt - 1]}. Pulsa ⏭ para volver a la partida.`;
    renderNavButtons();
  }
  function renderNavButtons() {
    document.querySelectorAll('[data-nav]').forEach(b => { const a = b.dataset.nav; b.disabled = (a === 'start' || a === 'prev') ? viewAt === 0 : viewAt === positions.length - 1; });
  }
  function goTo(i) { viewAt = Math.max(0, Math.min(positions.length - 1, i)); selected = null; render(); }
  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => ({ start: () => goTo(0), prev: () => goTo(viewAt - 1), next: () => goTo(viewAt + 1), end: () => goTo(positions.length - 1) })[b.dataset.nav]()));
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || !$('promoDialog').hidden) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(viewAt - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(viewAt + 1); }
  });
  function renderCaptured() {
    const st = positions[viewAt], VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 }, FULL = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
    const count = c => { const o = { P: 0, N: 0, B: 0, R: 0, Q: 0 }; Object.values(st.board).forEach(p => { if (p[0] === c && p[1] !== 'K') o[p[1]]++; }); return o; };
    const w = count('w'), b = count('b'); let mw = 0, mb = 0;
    const lost = (o, c) => Object.keys(FULL).flatMap(t => Array(Math.max(0, FULL[t] - o[t])).fill(c + t));
    Object.keys(w).forEach(t => { mw += w[t] * VAL[t]; mb += b[t] * VAL[t]; });
    const img = p => `<img src="pieces-tema/${p}.png" alt="${NAME[p[1]]}">`;
    $('capturedByWhite').innerHTML = lost(b, 'b').map(img).join('') + (mw > mb ? `<b>+${mw - mb}</b>` : '');
    $('capturedByBlack').innerHTML = lost(w, 'w').map(img).join('') + (mb > mw ? `<b>+${mb - mw}</b>` : '');
  }

  // ---------- Controles ----------
  function updateControls() {
    const live = !game.result;
    $('hintBtn').disabled = !live || thinking || analyzing || !humanTurn();
    $('undoBtn').disabled = thinking || analyzing || !game.moves.length || (game.human !== 'both' && game.moves.length < (game.human === 'w' ? 1 : 2) && !game.result);
    $('resignBtn').disabled = !live || thinking || analyzing || !game.moves.length;
    const done = !!an();
    $('anBtn').disabled = thinking || analyzing || !game.moves.length || (!game.result && game.human !== 'both' && !humanTurn());
    if (!analyzing) $('anBtn').textContent = done ? '✅ Partida analizada' : game.result ? '🔎 Analizar cada jugada' : '🔎 Analizar hasta aquí';
    if (done) $('anBtn').disabled = true;
    $('resignBtn').textContent = game.human === 'both' ? '🤝 Terminar' : '🏳 Rendirse';
    $('playHeader').textContent = game.human === 'both' ? 'Partida entre amigos' : `Nivel ${game.level} · ${LEVEL_NAMES[game.level]} (ELO ${LEVEL_ELO[game.level]}) · juegas con ${game.human === 'w' ? 'blancas' : 'negras'}`;
  }
  $('flipBtn').addEventListener('click', () => { flipped = !flipped; render(); });
  $('undoBtn').addEventListener('click', () => {
    if (thinking || !game.moves.length) return;
    game.result = null; game.why = null;
    let n = 1;
    if (game.human !== 'both') { n = current().turn === game.human ? 2 : 1; } // deshace tu jugada y la de la máquina
    game.moves = game.moves.slice(0, Math.max(0, game.moves.length - n)); rebuild(); save();
    hintMarks = null; selected = null; render(); status(turnText()); updateControls();
    if (!humanTurn()) machineMove();
  });
  $('resignBtn').addEventListener('click', () => {
    if (game.result || !game.moves.length) return;
    if (game.human === 'both') return finish({ result: '1/2-1/2', why: 'Acuerdo' });
    if (!confirm('¿Seguro que quieres rendirte?')) return;
    finish({ result: game.human === 'w' ? '0-1' : '1-0', why: 'Te rendiste' });
  });
  $('hintBtn').addEventListener('click', async () => {
    if (!humanTurn() || thinking) return;
    thinking = true; updateControls(); status('💡 Mauro está buscando una buena jugada…');
    const r = await engine(START, game.moves.slice(), 4);
    thinking = false;
    if (!r || !r.uci) { status(turnText()); updateControls(); return; }
    const st = current(), m = C.legalMoves(st).find(x => x.from + x.to === r.uci.slice(0, 4));
    hintMarks = [r.uci.slice(0, 2), r.uci.slice(2, 4)]; game.hints = (game.hints || 0) + 1; save();
    const piece = st.board[r.uci.slice(0, 2)], fem = /[QR]/.test(piece[1]);
    const sanH = m ? C.san(st, m) : '', showSan = sanH && sanH.replace(/[+#]/, '') !== r.uci.slice(2, 4);
    const text = `Pista: mueve ${fem ? 'la' : 'el'} ${NAME[piece[1]]} de ${r.uci.slice(0, 2)} a ${r.uci.slice(2, 4)}${showSan ? ' (' + sanH + ')' : ''}.`;
    showHint(text); render(); updateControls();
  });
  function showHint(text) {
    const el = $('playStatus'); el.className = 'feedback hint'; el.replaceChildren();
    const msg = document.createElement('span'); msg.className = 'hint-text'; msg.textContent = '💡 ' + text;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hint-audio'; btn.textContent = '🔊'; btn.title = 'Escuchar la pista'; btn.setAttribute('aria-label', 'Escuchar la pista otra vez');
    const say = () => speakAlways(text.replace(/\b([a-h])([1-8])\b/g, '$1 $2').replace(/\(.*\)/, ''));
    btn.addEventListener('click', say); el.append(msg, btn); say();
  }
  function speakAlways(t) { try { if (window.MauroVoice?.speak) return window.MauroVoice.speak(t); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-PE'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) {} }
  $('voiceToggle').addEventListener('click', e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '🔊 Voz' : '🔇 Voz'; try { localStorage.setItem('mauro_jugar_voz', on ? '1' : '0'); } catch (_) {} });
  try { if (localStorage.getItem('mauro_jugar_voz') === '0') { $('voiceToggle').setAttribute('aria-pressed', 'false'); $('voiceToggle').textContent = '🔇 Voz'; } } catch (_) {}

  // ---------- Análisis de cada jugada ----------
  const QUAL = {
    best: { sym: '', name: 'Mejor jugada', icon: '★' },
    good: { sym: '', name: 'Buena jugada', icon: '✓' },
    inacc: { sym: '?!', name: 'Imprecisión', icon: '?!' },
    mist: { sym: '?', name: 'Error', icon: '?' },
    blun: { sym: '??', name: 'Error grave', icon: '??' }
  };
  const key = () => game.moves.join(',');
  const an = () => (game.analysis && game.analysis.key === key() && game.analysis.done) ? game.analysis : null;
  const cp = v => v == null ? 0 : Math.max(-1000, Math.min(1000, v)); // mate = ±10 peones
  const winPct = c => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
  const fmtEval = c => Math.abs(c) >= 1000 ? (c > 0 ? 'Blancas dan mate' : 'Negras dan mate') : (c > 0 ? '+' : c < 0 ? '−' : '') + (Math.abs(c) / 100).toFixed(1).replace('.', ',');
  function terminalEval(st) {
    if (C.isMate && C.isMate(st)) return st.turn === 'w' ? -1000 : 1000;
    if (!C.legalMoves(st).length) return 0;
    return null;
  }
  async function analyze() {
    if (analyzing || thinking || !game.moves.length) return;
    analyzing = true; updateControls(); hintMarks = null;
    const k = key(), n = game.moves.length, ev = [], best = [];
    const bar = $('anProgress'); bar.hidden = false;
    for (let i = 0; i <= n; i++) {
      if (key() !== k) { analyzing = false; bar.hidden = true; updateControls(); return; }
      bar.querySelector('span').style.width = (100 * i / (n + 1)) + '%';
      $('anBtn').textContent = `🔎 Analizando… ${i}/${n}`;
      const t = terminalEval(positions[i]);
      if (t !== null) { ev.push(t); best.push(null); continue; }
      const r = await engine(START, game.moves.slice(0, i), 'an');
      ev.push(r && r.score != null ? (Math.abs(r.score) > 50000 ? Math.sign(r.score) * 1000 : r.score) : 0); best.push(r ? r.uci : null);
    }
    const q = [], loss = [], acc = { w: [], b: [] };
    for (let i = 1; i <= n; i++) {
      const mover = positions[i - 1].turn, sg = mover === 'w' ? 1 : -1;
      const before = cp(ev[i - 1]) * sg, after = cp(ev[i]) * sg, l = Math.max(0, before - after);
      const wl = Math.max(0, winPct(before) - winPct(after));
      acc[mover].push(Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wl) - 3.1669)));
      loss.push(l);
      const same = best[i - 1] && best[i - 1].slice(0, 4) === game.moves[i - 1].slice(0, 4);
      q.push(same || l < 15 ? 'best' : (wl < 6 || l < 50) ? 'good' : (wl < 12 || l < 100) ? 'inacc' : (wl < 22 || l < 250) ? 'mist' : 'blun');
    }
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    game.analysis = { key: k, done: true, ev, best, q, loss, acc: { w: avg(acc.w), b: avg(acc.b) } };
    save(); analyzing = false; bar.hidden = true;
    render(); renderAnalysis(); updateControls();
    status('🔎 Análisis listo. Toca cualquier jugada o usa ◀ ▶ para ver el comentario de Mauro.', 'good');
    goTo(firstMistake() || 1);
  }
  function firstMistake() { const a = an(); if (!a) return 0; const i = a.q.findIndex((q, j) => (q === 'mist' || q === 'blun') && isMine(j)); return i < 0 ? 0 : i + 1; }
  const isMine = i => game.human === 'both' || positions[i].turn === game.human;
  function sanOf(i, u) { const st = positions[i]; const m = u && C.legalMoves(st).find(x => x.from + x.to === u.slice(0, 4)); return m ? C.san(st, m) : null; }
  function analysisNote(i) {
    const a = an(); if (!a || i === 0) return null;
    const q = a.q[i - 1], Q = QUAL[q], num = Math.ceil(i / 2) + (i % 2 ? '. ' : '... ');
    const el = document.createElement('span'); el.className = 'an-note q-' + q;
    const b = document.createElement('b'); b.textContent = `${Q.icon} ${num}${game.sans[i - 1]}${Q.sym} · ${Q.name}`;
    el.append(b);
    let txt = '';
    if (q === 'best') txt = ' Es la jugada que también eligió Mauro.';
    else if (q === 'good') { const bs = sanOf(i - 1, a.best[i - 1]); txt = bs ? ` También era muy buena ${bs}.` : ''; }
    else {
      const bs = sanOf(i - 1, a.best[i - 1]);
      txt = ` Perdiste unos ${(a.loss[i - 1] / 100).toFixed(1).replace('.', ',')} peones de ventaja.` + (bs ? ` Mejor era ${bs}.` : '');
    }
    el.append(document.createTextNode(txt + ` Evaluación: ${fmtEval(cp(a.ev[i]))}.`));
    return el;
  }
  function renderAnalysis() {
    const box = $('anSummary'), a = an();
    box.hidden = !a; if (!a) return;
    const count = (side, q) => a.q.filter((x, i) => x === q && positions[i].turn === side).length;
    const row = (side, label) => `<div class="an-row"><b>${label}</b><span class="an-acc">${a.acc[side] ?? '—'}%</span><span class="q-best">★ ${count(side, 'best')}</span><span class="q-inacc">?! ${count(side, 'inacc')}</span><span class="q-mist">? ${count(side, 'mist')}</span><span class="q-blun">?? ${count(side, 'blun')}</span></div>`;
    const wl = game.human === 'w' ? '⚪ Tú' : game.human === 'b' ? '⚪ Máquina' : '⚪ Blancas', bl = game.human === 'b' ? '⚫ Tú' : game.human === 'w' ? '⚫ Máquina' : '⚫ Negras';
    // gráfica de evaluación
    const W = 300, H = 60, n = a.ev.length - 1 || 1;
    const y = c => (H / 2 - (winPct(cp(c)) - 50) / 50 * (H / 2)).toFixed(1);
    const pts = a.ev.map((c, i) => `${(i / n * W).toFixed(1)},${y(c)}`).join(' ');
    const dots = a.q.map((q, i) => (q === 'mist' || q === 'blun') ? `<circle cx="${((i + 1) / n * W).toFixed(1)}" cy="${y(a.ev[i + 1])}" r="3.5" class="dot-${q}"/>` : '').join('');
    box.innerHTML = `<p class="an-title">🔎 Análisis de Mauro <small>(precisión, mejores jugadas y errores)</small></p>${row('w', wl)}${row('b', bl)}
      <svg class="an-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfica de la evaluación a lo largo de la partida"><rect width="${W}" height="${H / 2}" class="g-w"/><rect y="${H / 2}" width="${W}" height="${H / 2}" class="g-b"/><polyline points="0,${H / 2} ${pts} ${W},${H / 2}" class="g-fill"/><polyline points="${pts}" class="g-line"/>${dots}</svg>
      <p class="an-help">Arriba de la línea media: ventaja blanca. Toca la gráfica para ir a esa jugada. ${firstMistake() ? '<button type="button" class="an-jump">Ver mi primer error</button>' : ''}</p>`;
    box.querySelector('svg').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); goTo(Math.round((e.clientX - r.left) / r.width * n)); });
    box.querySelector('.an-jump')?.addEventListener('click', () => goTo(firstMistake()));
  }
  $('anBtn').addEventListener('click', analyze);

  // PGN
  function pgn() {
    const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const me = 'Alumno', bot = `Mauro (nivel ${game.level} · ${LEVEL_NAMES[game.level]})`;
    const white = game.human === 'both' ? 'Blancas' : game.human === 'w' ? me : bot, black = game.human === 'both' ? 'Negras' : game.human === 'b' ? me : bot;
    // SAN en inglés (estándar PGN)
    const en = s => s.replace(/^R/, 'K').replace(/^D/, 'Q').replace(/^T/, 'R').replace(/^A/, 'B').replace(/^C/, 'N').replace(/=D/, '=Q').replace(/=T/, '=R').replace(/=A/, '=B').replace(/=C/, '=N');
    const a = an(); let body = ''; game.sans.forEach((s, i) => { if (i % 2 === 0) body += `${i / 2 + 1}. `; body += en(s) + (a ? QUAL[a.q[i]].sym : '') + ' '; });
    const res = game.result || '*';
    return `[Event "Partida en Academia Mauro"]\n[Site "https://web-2022.github.io/Mauro-Chess-Academy/jugar.html"]\n[Date "${date}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${res}"]\n${game.why ? `[Termination "${game.why}"]\n` : ''}\n${body}${res}\n`;
  }
  $('pgnBtn').addEventListener('click', async () => {
    const text = pgn();
    try { await navigator.clipboard.writeText(text); status('📋 PGN copiado. Puedes pegarlo en el Tablero libre para estudiar la partida.', 'good'); }
    catch (_) { const ta = $('pgnText'); ta.hidden = false; ta.value = text; ta.select(); status('Copia el PGN del recuadro.', ''); }
  });

  // ---------- Nueva partida ----------
  function newGame(opts) {
    const human = opts.mode === 'amigo' ? 'both' : opts.color === 'random' ? (Math.random() < .5 ? 'w' : 'b') : opts.color;
    game = { mode: opts.mode, level: +opts.level || 3, human, moves: [], sans: [], result: null, why: null, hints: 0, startedAt: Date.now() };
    rebuild(); flipped = human === 'b'; selected = null; hintMarks = null; save();
    render(); updateControls();
    status(human === 'both' ? 'Juegan blancas. ¡Buena partida!' : human === 'w' ? 'Juegas con blancas: tu turno. ¡Suerte!' : 'Juegas con negras. La máquina empieza…');
    if (!humanTurn()) machineMove();
  }
  const form = $('setupForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (game && game.moves.length && !game.result && !confirm('¿Empezar una partida nueva? La actual se perderá.')) return;
    const fd = new FormData(form); newGame({ mode: fd.get('mode'), color: fd.get('color'), level: fd.get('level') });
    try { localStorage.setItem('mauro_jugar_prefs', JSON.stringify({ mode: fd.get('mode'), color: fd.get('color'), level: fd.get('level') })); } catch (_) {}
    $('setupWrap').open = false;
    document.querySelector('.exercise-board-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  form.addEventListener('change', () => { const amigo = new FormData(form).get('mode') === 'amigo'; form.querySelectorAll('.only-bot').forEach(el => el.hidden = amigo); });
  // Preferencias guardadas
  try { const pr = JSON.parse(localStorage.getItem('mauro_jugar_prefs') || 'null'); if (pr) { for (const [k, v] of Object.entries(pr)) { const el = form.querySelector(`[name="${k}"][value="${v}"]`) || form.querySelector(`select[name="${k}"]`); if (el && el.type === 'radio') el.checked = true; else if (el) el.value = v; } form.dispatchEvent(new Event('change')); } } catch (_) {}
  const params = new URLSearchParams(location.search);
  if (params.get('modo') === 'amigo') { form.querySelector('[name="mode"][value="amigo"]').checked = true; form.dispatchEvent(new Event('change')); }

  // ---------- Inicio: retoma la partida guardada ----------
  let saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) {}
  if (saved && Array.isArray(saved.moves) && !params.get('modo')) {
    game = saved; rebuild(); flipped = game.human === 'b'; render(); updateControls();
    if (game.result) status(`Partida terminada: ${game.why}. Pulsa «Nueva partida» para jugar otra.`);
    else { status('Partida recuperada. ' + turnText()); if (!humanTurn()) machineMove(); }
  } else {
    const fd = new FormData(form); newGame({ mode: params.get('modo') === 'amigo' ? 'amigo' : fd.get('mode'), color: fd.get('color'), level: fd.get('level') });
  }
})();
