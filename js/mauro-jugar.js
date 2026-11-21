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
  function engine(fen, moves, level, maxTime) {
    return new Promise(resolve => {
      const id = ++reqId; pending.set(id, resolve);
      try {
        if (!worker) { worker = new Worker('js/mauro-motor.js?v=4'); worker.onmessage = ev => { const r = pending.get(ev.data.id); pending.delete(ev.data.id); r && r(ev.data); }; }
        worker.postMessage({ id, fen, moves, level, maxTime });
      } catch (_) { // sin Workers: se calcula en la página
        setTimeout(() => { pending.delete(id); resolve(window.MauroMotor.bestMove(fen, level, moves, maxTime)); }, 30);
      }
    });
  }

  // ---------- Estado de la partida ----------
  let game = null;          // { mode, level, human: 'w'|'b'|'both', moves:[uci], sans:[], result, hints }
  let positions = [];       // estados de reglas tras cada jugada (0 = inicio)
  let analyzing = false;
  let viewAt = 0, selected = null, thinking = false, flipped = false, hintMarks = null, promoPending = null, bestMarks = null;

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
    if (game.clock) { game.clock[current().turn] = clockLeft(current().turn); game.clock.since = 0; }
    game.result = end.result; game.why = end.why; save(); renderClock();
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
    try { showEval(viewAt); } catch (_) {}
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
      if (bestMarks && bestMarks.at === viewAt && bestMarks.sq.includes(s)) d.classList.add('an-best-sq');
      if (p) { const img = document.createElement('img'); img.src = `pieces-tema/${p}.png`; img.alt = NAME[p[1]] + (p[0] === 'w' ? ' blanco' : ' negro'); img.className = 'mp-libre mp-' + p; img.draggable = false; d.append(img); }
      if (ri === 7) { const c = document.createElement('span'); c.className = 'square-file'; c.textContent = C.FILES[f]; d.append(c); }
      if (fi === 0) { const c = document.createElement('span'); c.className = 'square-rank'; c.textContent = r; d.append(c); }
      d.setAttribute('aria-label', `Casilla ${s}${p ? ', ' + NAME[p[1]] + (p[0] === 'w' ? ' blanco' : ' negro') : ''}`);
      d.addEventListener('click', () => onSquare(s));
      boardEl.append(d);
    }
    renderMoves(); renderCaptured(); renderClock();
    if (!analyzing) renderAnalysisLazy();
    updateCursor();
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
    box.hidden = false; box.querySelector('[data-promo]').focus({ preventScroll: true });
  }
  $('promoDialog').addEventListener('click', e => {
    const b = e.target.closest('[data-promo]'); if (!b && !e.target.closest('.promo-card')) { $('promoDialog').hidden = true; promoPending = null; render(); return; }
    if (!b) return; $('promoDialog').hidden = true; const u = promoPending + b.dataset.promo; promoPending = null; playMove(u);
  });

  function playMove(u) {
    const st = current(); const m = C.legalMoves(st).find(x => x.from + x.to === u.slice(0, 4)); if (!m) return;
    const san = C.san(st, m); // SAN antes de mover (incluye + o #)
    clockAfterMove(st.turn);
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
    liveEval();
  }
  async function machineMove() {
    thinking = true; updateControls();
    status(`🤖 La máquina está pensando… (nivel ${LEVEL_NAMES[game.level]})`);
    const myGame = game, n = game.moves.length;
    const t0 = Date.now();
    const myLeft = game.clock ? clockLeft(current().turn) : 0;
    const r = await engine(START, game.moves.slice(), game.level, game.clock ? Math.min(myLeft / 25 + (game.clock.inc || 0) * 0.8, myLeft / 3) : 0);
    const wait = (game.clock ? 150 : 450) - (Date.now() - t0); if (wait > 0) await new Promise(res => setTimeout(res, wait)); // que se note la respuesta
    if (game.result) { thinking = false; updateControls(); return; } // perdió por tiempo mientras pensaba
    if (myGame !== game || game.moves.length !== n) return; // se reinició o deshizo mientras pensaba
    thinking = false;
    if (r && r.uci) playMove(r.uci); else updateControls();
  }
  // Evaluación después de cada jugada (desde el punto de vista de las blancas)
  let evalSeq = 0;
  function evalText(c) {
    const s = fmtEval(cp(c)), a = Math.abs(cp(c));
    const who = c > 0 ? 'las blancas' : 'las negras';
    const word = a >= 1000 ? 'mate a la vista' : a < 30 ? 'posición igualada' : a < 100 ? `ligera ventaja de ${who}` : a < 250 ? `ventaja clara de ${who}` : `ventaja decisiva de ${who}`;
    return { s, word, cls: a < 30 ? 'ev-eq' : c > 0 ? 'ev-w' : 'ev-b' };
  }
  function showEval(i) {
    const el = $('evalBadge'); if (!el) return;
    const v = game.evals && game.evals[i];
    if (i === 0 || v == null) { el.hidden = true; return; }
    const t = evalText(v), num = Math.ceil(i / 2) + (i % 2 ? '. ' : '... ');
    el.hidden = false; el.className = 'eval-badge ' + t.cls;
    el.innerHTML = '<span class="eb-label"></span><span class="eb-num"></span><span class="eb-word"></span>';
    el.querySelector('.eb-label').textContent = `Evaluación tras ${num}${game.sans[i - 1]}`;
    el.querySelector('.eb-num').textContent = t.s; el.querySelector('.eb-word').textContent = t.word;
    el.classList.remove('ev-flash'); void el.offsetWidth; el.classList.add('ev-flash');
  }
  async function liveEval() {
    const i = game.moves.length, k = key(), my = ++evalSeq;
    if (!i) return showEval(0);
    game.evals = game.evals || [];
    const t = terminalEval(positions[i]);
    let v = t;
    if (v === null) { const r = await engine(START, game.moves.slice(0, i), 'an', 500); if (!r || key().indexOf(k) !== 0) return; v = r.score != null ? (Math.abs(r.score) > 50000 ? Math.sign(r.score) * 1000 : r.score) : 0; }
    game.evals[i] = v; save();
    if (my === evalSeq || viewAt === i) showEval(viewAt);
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
      b.className = 'rv-move ' + (i % 2 ? 'b' : 'w') + (viewAt === i + 1 ? ' active' : '') + (q ? ' q-' + q : '');
      if (q) { const ic = document.createElement('span'); ic.className = 'mv-ic'; ic.textContent = QUAL[q].icon; ic.setAttribute('aria-hidden', 'true'); b.append(ic); }
      const sn = document.createElement('span'); sn.className = 'mv-san'; sn.textContent = san; b.append(sn);
      const ev = game.evals && game.evals[i + 1];
      if (ev != null) { const e = document.createElement('span'); e.className = 'mv-ev ' + evalText(ev).cls; e.textContent = fmtEval(cp(ev)).replace('Blancas dan mate', '#+').replace('Negras dan mate', '#−'); b.append(e); }
      b.title = (q ? QUAL[q].name + ' · ' : '') + (ev != null ? 'Evaluación ' + fmtEval(cp(ev)) : '');
      b.addEventListener('click', () => goTo(i + 1)); list.append(b);
    });
    if (game.result) { const r = document.createElement('span'); r.className = 'ml-result'; r.textContent = game.result === '1/2-1/2' ? '½-½' : game.result; list.append(r); }
    // Desplaza solo la lista de jugadas (no la página: en el celular el tablero no debe moverse)
    const act = list.querySelector('.active') || list.lastElementChild;
    if (act) { const top = act.offsetTop - list.offsetTop; if (top < list.scrollTop || top + act.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top - list.clientHeight / 2; }
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
  let lastSay = '', lastSaidAt = -1;
  function goTo(i) {
    viewAt = Math.max(0, Math.min(positions.length - 1, i)); selected = null; if (bestMarks && bestMarks.at !== viewAt) bestMarks = null; render();
    // Modo análisis: al pasar a cada jugada se explica en voz alta automáticamente
    if (an() && viewAt > 0 && lastSay && lastSaidAt !== viewAt) { lastSaidAt = viewAt; speak(lastSay); }
    else if (an() && viewAt === 0) { lastSaidAt = 0; try { (window.MauroVoice?.stop || (() => speechSynthesis.cancel()))(); } catch (_) {} }
  }
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
    document.body.classList.toggle('an-review', done && !!game.result);
    $('anBtn').disabled = thinking || analyzing || !game.moves.length || (!game.result && game.human !== 'both' && !humanTurn());
    if (!analyzing) $('anBtn').textContent = done ? '✅ Partida analizada' : game.result ? '🔎 Analizar cada jugada' : '🔎 Analizar hasta aquí';
    if (done) $('anBtn').disabled = true;
    $('resignBtn').textContent = game.human === 'both' ? '🤝 Terminar' : '🏳 Rendirse';
    $('playHeader').textContent = game.human === 'both' ? 'Partida entre amigos' + (game.clock ? ' · ⏱ ' + game.clock.label : '') : `Nivel ${game.level} · ${LEVEL_NAMES[game.level]} · juegas con ${game.human === 'w' ? 'blancas' : 'negras'}${game.clock ? ' · ⏱ ' + game.clock.label : ''}`;
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
    thinking = true; updateControls(); status('💡 Buscando una buena jugada…');
    const r = await engine(START, game.moves.slice(), 4);
    thinking = false;
    if (!r || !r.uci) { status(turnText()); updateControls(); return; }
    const st = current(), m = C.legalMoves(st).find(x => x.from + x.to === r.uci.slice(0, 4));
    hintMarks = [r.uci.slice(0, 2), r.uci.slice(2, 4)]; game.hints = (game.hints || 0) + 1; save();
    const piece = st.board[r.uci.slice(0, 2)], fem = /[QR]/.test(piece[1]);
    const sanH = m ? C.san(st, m) : '', showSan = sanH && sanH.replace(/[+#]/, '') !== r.uci.slice(2, 4);
    let text = `Pista: mueve ${fem ? 'la' : 'el'} ${NAME[piece[1]]} de ${r.uci.slice(0, 2)} a ${r.uci.slice(2, 4)}${showSan ? ' (' + sanH + ')' : ''}.`;
    try { if (window.MauroExplica) text += ' ' + window.MauroExplica.hint(st, r.uci, Math.ceil((game.moves.length + 1) / 2)); } catch (_) {}
    let plansTxt = null;
    try { if (window.MauroExplica?.plans) plansTxt = window.MauroExplica.plans(st); } catch (_) {}
    showHint(text, plansTxt); render(); updateControls();
  });
  function showHint(text, pl) {
    const el = $('playStatus'); el.className = 'feedback hint'; el.replaceChildren();
    const msg = document.createElement('span'); msg.className = 'hint-text'; msg.textContent = '💡 ' + text;
    if (pl) {
      const box = document.createElement('span'); box.className = 'hint-plans';
      box.innerHTML = '<span class="hp-w"><b>⚪ Plan de las blancas:</b> </span><span class="hp-b"><b>⚫ Plan de las negras:</b> </span>';
      box.querySelector('.hp-w').append(pl.w + '.'); box.querySelector('.hp-b').append(pl.b + '.');
      msg.append(box); text += ` Plan de las blancas: ${pl.w}. Plan de las negras: ${pl.b}.`;
    }
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hint-audio'; btn.textContent = '🔊'; btn.title = 'Escuchar la pista'; btn.setAttribute('aria-label', 'Escuchar la pista otra vez');
    const say = () => speakAlways(text.replace(/\b([a-h])([1-8])\b/g, '$1 $2').replace(/ \([^)]*\)/, ''));
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
    game.evals = ev.slice();
    save(); analyzing = false; bar.hidden = true;
    render(); renderAnalysis(); updateControls();
    document.body.classList.toggle('an-review', true);
    status('🔎 Análisis listo. Toca cualquier jugada o usa ◀ ▶ para ver el comentario de cada jugada.', 'good');
    goTo(firstMistake() || 1);
  }
  function firstMistake() { const a = an(); if (!a) return 0; const i = a.q.findIndex((q, j) => (q === 'mist' || q === 'blun') && isMine(j)); return i < 0 ? 0 : i + 1; }
  const isMine = i => game.human === 'both' || positions[i].turn === game.human;
  function sanOf(i, u) { const st = positions[i]; const m = u && C.legalMoves(st).find(x => x.from + x.to === u.slice(0, 4)); return m ? C.san(st, m) : null; }
  // Lee una jugada en voz alta: «Cxf7» → «caballo toma f 7»
  function spokenSan(san) {
    const P = { R: 'rey', D: 'dama', T: 'torre', A: 'alfil', C: 'caballo' };
    if (/^O-O-O/.test(san)) return 'enroque largo'; if (/^O-O/.test(san)) return 'enroque corto';
    let out = P[san[0]] ? P[san[0]] + ' ' : 'peón ';
    const body = san.replace(/^[RDTAC]/, '');
    out += body.replace(/x/, ' toma ').replace(/=([DTAC])/, (m, x) => ' corona a ' + P[x]).replace(/\+/, ', jaque').replace(/#/, ', jaque mate').replace(/([a-h])([1-8])/g, ' $1 $2 ');
    return out.replace(/\s+/g, ' ').trim();
  }
  // Texto para la voz: lee jugadas (Cc3 → caballo c 3) y números con coma
  function speakify(t) {
    return t.replace(/(\d),(\d)/g, '$1 coma $2')
      .replace(/\b(O-O-O|O-O|[RDTAC]?[a-h]?[1-8]?x?[a-h][1-8](?:=[DTAC])?[+#]?)(?=[\s.,:;)]|$)/g, m => /^[a-h][1-8]$/.test(m) ? m[0] + ' ' + m[1] : spokenSan(m));
  }
  function analysisNote(i) {
    const a = an(); if (!a || i === 0) return null;
    const q = a.q[i - 1], Q = QUAL[q], num = Math.ceil(i / 2) + (i % 2 ? '. ' : '... ');
    const el = document.createElement('span'); el.className = 'an-note q-' + q;
    const b = document.createElement('b'); b.textContent = `${Q.icon} ${num}${game.sans[i - 1]}${Q.sym} · ${Q.name}`;
    el.append(b);
    let txt = '';
    if (q === 'best') txt = ' Es la mejor jugada según el análisis.';
    else if (q === 'good') { const bs = sanOf(i - 1, a.best[i - 1]); txt = bs ? ` También era muy buena ${bs}.` : ''; }
    else txt = ` Perdiste unos ${(a.loss[i - 1] / 100).toFixed(1).replace('.', ',')} peones de ventaja.`;
    // Por qué: idea de la jugada, qué responde el rival y qué plan era mejor
    try {
      const ex = window.MauroExplica ? window.MauroExplica.review(positions[i - 1], game.moves[i - 1], a.best[i - 1], a.best[i], q, Math.ceil(i / 2)) : '';
      if (ex) txt += ' ' + ex;
    } catch (_) {}
    el.append(document.createTextNode(txt + ' '));
    const et = evalText(a.ev[i]); const mk = document.createElement('mark'); mk.className = 'an-eval ' + et.cls; mk.textContent = `Evaluación: ${et.s} · ${et.word}`; el.append(mk);
    const say = `${Q.name}. ${num.replace('...', ', negras,').replace('. ', '. ')}${spokenSan(game.sans[i - 1])}.${speakify(txt)} Evaluación: ${et.word}.`;
    lastSay = say;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'an-audio'; btn.textContent = '🔊';
    btn.title = 'Escuchar la explicación'; btn.setAttribute('aria-label', 'Escuchar la explicación de esta jugada');
    btn.addEventListener('click', () => speakAlways(say));
    b.append(' ', btn);
    const bu = a.best[i - 1], bsan = bu && q !== 'best' ? sanOf(i - 1, bu) : null;
    if (bsan) {
      const vb = document.createElement('button'); vb.type = 'button'; vb.className = 'an-see-best'; vb.textContent = `👁 Ver la mejor: ${bsan}`;
      vb.title = 'Muestra en el tablero la posición anterior con la mejor jugada marcada';
      vb.addEventListener('click', () => { bestMarks = { at: i - 1, sq: [bu.slice(0, 2), bu.slice(2, 4)] }; lastSaidAt = i - 1; goTo(i - 1); status(`👁 Mejor era ${bsan}: mira las casillas marcadas en verde. Pulsa ▶ para volver a tu jugada.`, 'good'); speak(`Mejor era ${spokenSan(bsan)}.`); });
      el.append(document.createElement('br'), vb);
    }
    return el;
  }
  function renderAnalysis() {
    const box = $('anSummary'), a = an();
    box.hidden = !a; if (!a) return;
    const count = (side, q) => a.q.filter((x, i) => x === q && positions[i].turn === side).length;
    const row = (side, label) => `<div class="an-row"><b>${label}</b><span class="an-acc">${a.acc[side] ?? '—'}%</span><span class="q-best">★ ${count(side, 'best')}</span><span class="q-inacc">?! ${count(side, 'inacc')}</span><span class="q-mist">? ${count(side, 'mist')}</span><span class="q-blun">?? ${count(side, 'blun')}</span></div>`;
    const wl = game.human === 'w' ? '⚪ Tú' : game.human === 'b' ? '⚪ Máquina' : '⚪ Blancas', bl = game.human === 'b' ? '⚫ Tú' : game.human === 'w' ? '⚫ Máquina' : '⚫ Negras';
    // gráfica de evaluación (con línea de la jugada actual)
    const W = 600, H = 120, n = a.ev.length - 1 || 1;
    const y = c => (H / 2 - (winPct(cp(c)) - 50) / 50 * (H / 2)).toFixed(1);
    const pts = a.ev.map((c, i) => `${(i / n * W).toFixed(1)},${y(c)}`).join(' ');
    const dots = a.q.map((q, i) => (q === 'inacc' || q === 'mist' || q === 'blun') ? `<circle cx="${((i + 1) / n * W).toFixed(1)}" cy="${y(a.ev[i + 1])}" r="${q === 'inacc' ? 4 : 6}" class="dot-${q}"><title>${Math.ceil((i + 1) / 2)}${i % 2 ? '...' : '.'} ${game.sans[i]} · ${QUAL[q].name}</title></circle>` : '').join('');
    // Indicadores para mejorar: pérdida media, precisión por fase, momentos clave y consejo
    const sideOf = i => positions[i].turn;
    const acpl = side => { const l = a.loss.filter((_, i) => sideOf(i) === side); return l.length ? Math.round(l.reduce((x, y) => x + Math.min(y, 1000), 0) / l.length) : 0; };
    const N = a.q.length, phaseOf = i => i < 20 ? 0 : (Object.values(positions[i].board).filter(p => p[1] !== 'K' && p[1] !== 'P').length <= 6 ? 2 : 1);
    const me = game.human === 'both' ? null : game.human;
    const phaseStats = [0, 1, 2].map(ph => { const idx = a.q.map((q, i) => i).filter(i => phaseOf(i) === ph && (!me || sideOf(i) === me)); const err = idx.filter(i => a.q[i] === 'mist' || a.q[i] === 'blun').length; const good = idx.filter(i => a.q[i] === 'best' || a.q[i] === 'good').length; return { n: idx.length, err, pct: idx.length ? Math.round(100 * good / idx.length) : null }; });
    const PH = ['Apertura', 'Medio juego', 'Final'];
    const key3 = a.loss.map((l, i) => [l, i]).filter(([l, i]) => l >= 100 && (!me || sideOf(i) === me)).sort((x, y) => y[0] - x[0]).slice(0, 3).sort((x, y) => x[1] - y[1]);
    const worst = phaseStats.map((p, ph) => [p.err, ph]).sort((x, y) => y[0] - x[0])[0];
    const blunders = a.q.filter((q, i) => q === 'blun' && (!me || sideOf(i) === me)).length;
    const TIP = [
      ['Tus errores llegaron en la apertura: repasa desarrollo, centro y enroque.', 'tema-73-para-que-sirve-la-apertura.html', 'Módulo 4: construir una partida'],
      ['Tus errores llegaron en el medio juego: antes de mover, revisa jaques, capturas y amenazas.', 'tema-72-metodo-inicial-mira-piensa-comprueba-mueve.html', 'Método Mira → Piensa → Comprueba → Mueve'],
      ['Tus errores llegaron en el final: practica la actividad del rey y los peones pasados.', 'tema-166-por-que-estudiar-finales.html', 'Módulo 8: finales']
    ];
    let tip = '';
    if (blunders) tip = `<p class="an-tip">🎯 <b>Consejo:</b> cometiste ${blunders} error${blunders > 1 ? 'es' : ''} grave${blunders > 1 ? 's' : ''}. Antes de cada jugada pregúntate: <i>¿qué piezas mías quedan atacadas después de mover?</i> ${worst && worst[0] ? TIP[worst[1]][0] : ''}</p>`;
    else if (worst && worst[0]) tip = `<p class="an-tip">🎯 <b>Consejo:</b> ${TIP[worst[1]][0]}</p>`;
    else tip = '<p class="an-tip">🎯 <b>Consejo:</b> ¡sin errores! Sube un nivel a la máquina para seguir creciendo.</p>';
    const phRow = phaseStats.map((p, i) => `<span class="an-ph"><b>${PH[i]}</b> ${p.pct == null ? '—' : p.pct + '% buenas'}${p.err ? ` · <em>${p.err} error${p.err > 1 ? 'es' : ''}</em>` : ''}</span>`).join('');
    box.innerHTML = `<p class="an-title">🔎 Análisis de la partida <small>(precisión, mejores jugadas y errores)</small></p>${row('w', wl)}${row('b', bl)}
      <div class="an-row an-acpl"><b>Pérdida media</b><span>⚪ ${acpl('w')} · ⚫ ${acpl('b')} <small>centésimas de peón por jugada (menos es mejor)</small></span></div>
      <svg class="an-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfica de la evaluación a lo largo de la partida"><rect width="${W}" height="${H / 2}" class="g-w"/><rect y="${H / 2}" width="${W}" height="${H / 2}" class="g-b"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="g-mid"/><polyline points="0,${H / 2} ${pts} ${W},${H / 2}" class="g-fill"/><polyline points="${pts}" class="g-line"/>${dots}<line id="anCursor" x1="0" x2="0" y1="0" y2="${H}" class="g-cursor"/><circle id="anCursorDot" r="5" class="g-cdot"/></svg>
      <p class="an-help">Arriba de la línea media: ventaja blanca. La línea celeste marca la jugada que estás viendo; toca la gráfica para saltar.</p>
      <div class="an-phases">${me ? '<small>Tus jugadas por fase:</small>' : ''}${phRow}</div>
      ${key3.length ? `<div class="an-keys"><b>⚡ Momentos clave:</b> ${key3.map(([l, i]) => `<button type="button" class="an-key q-${a.q[i]}" data-go="${i + 1}">${Math.ceil((i + 1) / 2)}${i % 2 ? '...' : '.'} ${game.sans[i]} <small>−${(Math.min(l, 1000) / 100).toFixed(1).replace('.', ',')}</small></button>`).join('')}</div>` : ''}
      ${tip}
      ${firstMistake() ? '<button type="button" class="an-jump">Ver mi primer error</button>' : ''}`;
    box.dataset.n = n;
    box.querySelector('svg').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); goTo(Math.round((e.clientX - r.left) / r.width * n)); });
    box.querySelector('.an-jump')?.addEventListener('click', () => goTo(firstMistake()));
    box.querySelectorAll('[data-go]').forEach(k => k.addEventListener('click', () => goTo(+k.dataset.go)));
    updateCursor();
  }
  function updateCursor() {
    const a = an(), l = document.getElementById('anCursor'), d = document.getElementById('anCursorDot'); if (!a || !l) return;
    const W = 600, H = 120, n = a.ev.length - 1 || 1, x = (viewAt / n * W).toFixed(1);
    l.setAttribute('x1', x); l.setAttribute('x2', x);
    d.setAttribute('cx', x); d.setAttribute('cy', (H / 2 - (winPct(cp(a.ev[viewAt])) - 50) / 50 * (H / 2)).toFixed(1));
  }
  $('anBtn').addEventListener('click', analyze);

  // PGN
  function pgn() {
    const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const me = 'Alumno', bot = `Máquina (nivel ${game.level} · ${LEVEL_NAMES[game.level]})`;
    const white = game.human === 'both' ? 'Blancas' : game.human === 'w' ? me : bot, black = game.human === 'both' ? 'Negras' : game.human === 'b' ? me : bot;
    // SAN en inglés (estándar PGN)
    const en = s => s.replace(/^R/, 'K').replace(/^D/, 'Q').replace(/^T/, 'R').replace(/^A/, 'B').replace(/^C/, 'N').replace(/=D/, '=Q').replace(/=T/, '=R').replace(/=A/, '=B').replace(/=C/, '=N');
    const a = an(); let body = ''; game.sans.forEach((s, i) => { if (i % 2 === 0) body += `${i / 2 + 1}. `; body += en(s) + (a ? QUAL[a.q[i]].sym : '') + ' '; });
    const res = game.result || '*';
    return `[Event "Partida de práctica"]\n[Site "https://web-2022.github.io/Mauro-Chess-Academy/jugar.html"]\n[Date "${date}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${res}"]\n${game.clock ? `[TimeControl "${game.clock.base / 1000}+${game.clock.inc / 1000}"]\n` : ''}${game.why ? `[Termination "${game.why}"]\n` : ''}\n${body}${res}\n`;
  }
  $('pgnBtn').addEventListener('click', async () => {
    const text = pgn();
    try { await navigator.clipboard.writeText(text); status('📋 PGN copiado. Puedes pegarlo en el Tablero libre para estudiar la partida.', 'good'); }
    catch (_) { const ta = $('pgnText'); ta.hidden = false; ta.value = text; ta.select(); status('Copia el PGN del recuadro.', ''); }
  });

  // ---------- Reloj ----------
  // clock = { base, inc (ms), w, b (ms restantes), since (momento en que empezó a correr el turno actual; 0 = detenido) }
  function makeClock(t, cmin, cinc) {
    if (!t || t === '0') return null;
    let min, inc;
    if (t === 'custom') { min = Math.min(180, Math.max(1, +cmin || 10)); inc = Math.min(60, Math.max(0, +cinc || 0)); }
    else { [min, inc] = t.split('+').map(Number); }
    const base = min * 60000;
    return { base, inc: inc * 1000, w: base, b: base, since: 0, label: `${min}+${inc}` };
  }
  function clockLeft(side) {
    const c = game.clock; if (!c) return Infinity;
    let left = c[side];
    if (c.since && !game.result && current().turn === side) left -= Date.now() - c.since;
    return Math.max(0, left);
  }
  function clockAfterMove(side) { // side acaba de mover
    const c = game.clock; if (!c) return;
    if (c.since) c[side] = clockLeft(side) + c.inc;
    c.since = Date.now(); // empieza a correr el reloj del rival (el primer movimiento de blancas no gasta tiempo)
  }
  const fmt = ms => { if (ms === Infinity) return '—'; const t = Math.ceil(ms / 100) / 10; if (t < 10) return t.toFixed(1).replace('.', ','); const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function renderClock() {
    const top = $('clockTop'), bot = $('clockBottom');
    if (!game || !game.clock) { top.hidden = bot.hidden = true; return; }
    top.hidden = bot.hidden = false;
    const botSide = flipped ? 'b' : 'w', topSide = botSide === 'w' ? 'b' : 'w';
    const name = side => game.human === 'both' ? (side === 'w' ? '⚪ Blancas' : '⚫ Negras') : (side === game.human ? (side === 'w' ? '⚪ Tú' : '⚫ Tú') : (side === 'w' ? '⚪ Máquina' : '⚫ Máquina'));
    for (const [el, side] of [[top, topSide], [bot, botSide]]) {
      const left = clockLeft(side);
      el.querySelector('.clk-name').textContent = name(side);
      el.querySelector('.clk-time').textContent = fmt(left);
      el.classList.toggle('active', !game.result && !!game.clock.since && current().turn === side);
      el.classList.toggle('low', left < 20000);
    }
  }
  let lowWarned = false;
  setInterval(() => {
    if (!game || !game.clock) return;
    renderClock();
    if (game.result || !game.clock.since) return;
    const side = current().turn, left = clockLeft(side);
    if (left < 10000 && !lowWarned && side === game.human) { lowWarned = true; speak('Poco tiempo'); }
    if (left <= 0) {
      game.clock[side] = 0; game.clock.since = 0;
      const other = side === 'w' ? 'b' : 'w', st = current();
      const mat = Object.values(st.board).filter(p => p[0] === other && p[1] !== 'K').map(p => p[1]);
      const canMate = mat.some(t => /[QRP]/.test(t)) || mat.length >= 2;
      thinking = false;
      finish(canMate ? { result: other === 'w' ? '1-0' : '0-1', why: `Tiempo agotado de ${side === 'w' ? 'blancas' : 'negras'}` } : { result: '1/2-1/2', why: 'Tiempo agotado sin material para ganar' });
    }
  }, 200);
  window.addEventListener('beforeunload', () => { if (game && game.clock && game.clock.since && !game.result) { const sd = current().turn; game.clock[sd] = clockLeft(sd); game.clock.since = Date.now(); save(); } });

  // ---------- Nueva partida ----------
  function newGame(opts) {
    const human = opts.mode === 'amigo' ? 'both' : opts.color === 'random' ? (Math.random() < .5 ? 'w' : 'b') : opts.color;
    game = { mode: opts.mode, level: +opts.level || 3, human, moves: [], sans: [], result: null, why: null, hints: 0, startedAt: Date.now(), clock: makeClock(opts.time, opts.cmin, opts.cinc) };
    rebuild(); flipped = human === 'b'; selected = null; hintMarks = null; lowWarned = false; save();
    render(); updateControls();
    status(human === 'both' ? 'Juegan blancas. ¡Buena partida!' : human === 'w' ? 'Juegas con blancas: tu turno. ¡Suerte!' : 'Juegas con negras. La máquina empieza…');
    if (!humanTurn()) machineMove();
  }
  const form = $('setupForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (game && game.moves.length && !game.result && !confirm('¿Empezar una partida nueva? La actual se perderá.')) return;
    const fd = new FormData(form); newGame({ mode: fd.get('mode'), color: fd.get('color'), level: fd.get('level'), time: fd.get('time'), cmin: fd.get('cmin'), cinc: fd.get('cinc') });
    try { localStorage.setItem('mauro_jugar_prefs', JSON.stringify({ mode: fd.get('mode'), color: fd.get('color'), level: fd.get('level'), time: fd.get('time'), cmin: fd.get('cmin'), cinc: fd.get('cinc') })); } catch (_) {}
    $('setupWrap').open = false;
    document.querySelector('.exercise-board-shell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  form.addEventListener('change', () => { const amigo = new FormData(form).get('mode') === 'amigo'; form.querySelectorAll('.only-bot').forEach(el => el.hidden = amigo); $('customTime').hidden = $('timeSel').value !== 'custom'; });
  // Preferencias guardadas
  try { const pr = JSON.parse(localStorage.getItem('mauro_jugar_prefs') || 'null'); if (pr) { for (const [k, v] of Object.entries(pr)) { const el = form.querySelector(`[name="${k}"][value="${v}"]`) || form.querySelector(`select[name="${k}"]`); if (el && el.type === 'radio') el.checked = true; else if (el) el.value = v; } form.dispatchEvent(new Event('change')); } } catch (_) {}
  const params = new URLSearchParams(location.search);
  if (params.get('modo') === 'amigo') { form.querySelector('[name="mode"][value="amigo"]').checked = true; form.dispatchEvent(new Event('change')); }

  // ---------- Inicio: retoma la partida guardada ----------
  let saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) {}
  if (saved && Array.isArray(saved.moves) && !params.get('modo')) {
    game = saved; rebuild(); flipped = game.human === 'b'; if (game.clock && game.clock.since && !game.result) game.clock.since = Date.now(); render(); updateControls();
    if (game.result) status(`Partida terminada: ${game.why}. Pulsa «Nueva partida» para jugar otra.`);
    else { status('Partida recuperada. ' + turnText()); if (!humanTurn()) machineMove(); }
  } else {
    const fd = new FormData(form); newGame({ mode: params.get('modo') === 'amigo' ? 'amigo' : fd.get('mode'), color: fd.get('color'), level: fd.get('level'), time: fd.get('time'), cmin: fd.get('cmin'), cinc: fd.get('cinc') });
  }
})();
