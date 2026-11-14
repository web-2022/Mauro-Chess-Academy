/* Academia Mauro · Entrenamientos con tablero interactivo.
   Tipos (atributo data-exercise del <body>):
   - mate1   : Mate en 1
   - hanging : Captura la pieza indefensa
   - legal   : Movimientos legales de cada pieza
   - daily   : Táctica del día
   Requiere js/mauro-chess-rules.js y js/mauro-drill-data.js. */
(function () {
  'use strict';
  const C = window.MauroChess, D = window.MauroDrillData;
  const TYPE = document.body.dataset.exercise;
  const ROUNDS = TYPE === 'daily' ? 1 : 10;
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), questionEl = $('question'), feedbackEl = $('feedback'), themeEl = $('exerciseTheme');
  const nextBtn = $('exerciseNext'), hintBtn = $('exerciseHint'), checkBtn = $('exerciseCheck');

  const IMG = p => `pieces/${p}.png`;
  const ART = { K: 'el', Q: 'la', R: 'la', B: 'el', N: 'el', P: 'el' };
  const fem = p => C.type(p) === 'Q' || C.type(p) === 'R';
  const pieceName = p => `${fem(p) ? 'la' : 'el'} ${C.NAME[C.type(p)]} ${C.color(p) === 'w' ? (fem(p) ? 'blanca' : 'blanco') : (fem(p) ? 'negra' : 'negro')}`;
  const pieceShort = p => `${fem(p) ? 'la' : 'el'} ${C.NAME[C.type(p)]}`;
  const pieceUn = p => `${fem(p) ? 'una' : 'un'} ${C.NAME[C.type(p)]}`;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rand = n => Math.floor(Math.random() * n);

  // ---------- Voz ----------
  function speak(text) {
    try {
      if (window.MauroVoice?.speak) return window.MauroVoice.speak(text);
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-PE'; speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (_) {}
  }


  // ---------- Pista con audio: se lee sola y deja un ícono 🔊 para repetirla ----------
  const spokenHint = t => t.replace(/\b([a-h])([1-8])\b/g, '$1 $2');
  function showHint(text) {
    feedbackEl.className = 'feedback hint';
    feedbackEl.replaceChildren();
    const msg = document.createElement('span'); msg.className = 'hint-text'; msg.textContent = '💡 ' + text;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hint-audio';
    btn.setAttribute('aria-label', 'Escuchar la pista otra vez'); btn.title = 'Escuchar la pista'; btn.textContent = '🔊';
    const play = () => {
      speak(spokenHint(text)); btn.classList.add('speaking');
      const t0 = Date.now(), iv = setInterval(() => { if ((window.speechSynthesis && !speechSynthesis.speaking && Date.now() - t0 > 400) || Date.now() - t0 > 15000) { btn.classList.remove('speaking'); clearInterval(iv); } }, 250);
    };
    btn.addEventListener('click', play);
    feedbackEl.append(msg, btn);
    play();
  }

  // ---------- Estado de la sesión ----------
  let ok = 0, total = 0, round = null, finished = false, extra = false;
  let state = null, selected = null, marks = {}, picks = new Set(), mistakes = 0, solved = false, history = [], reviewAt = -1;

  function updateProgress() {
    $('ok').textContent = ok;
    $('count').textContent = `${total}/${ROUNDS}`;
    $('bar').style.width = (total / ROUNDS * 100) + '%';
  }
  function say(text, kind) { feedbackEl.textContent = text; feedbackEl.className = 'feedback' + (kind ? ' ' + kind : ''); }

  // ---------- Tablero ----------
  function render() {
    boardEl.replaceChildren();
    const targets = selected ? C.legalFrom(state, selected).map(m => m.to) : [];
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const s = C.FILES[f] + r, p = state.board[s];
        const d = document.createElement('div');
        d.className = 'sq ' + ((f + r) % 2 ? 'dark' : 'light');
        d.dataset.square = s;
        if (marks[s]) d.classList.add(...marks[s].split(' '));
        if (s === selected) d.classList.add('drill-selected');
        if (targets.includes(s)) d.classList.add(p ? 'drill-capture' : 'drill-target');
        if (picks.has(s)) d.classList.add('drill-pick');
        if (p) { const img = document.createElement('img'); img.src = IMG(p); img.alt = C.NAME[C.type(p)] + (C.color(p) === 'w' ? ' blanco' : ' negro'); img.draggable = false; d.append(img); }
        d.addEventListener('click', () => onSquare(s));
        boardEl.append(d);
      }
    }
  }

  function onSquare(s) {
    if (finished || solved) return;
    if (TYPE === 'legal') return togglePick(s);
    const p = state.board[s];
    if (selected && s !== selected && !(p && C.color(p) === state.turn)) {
      const move = C.legalFrom(state, selected).find(m => m.to === s);
      selected = null;
      if (move) return attempt(move);
      say('Esa pieza no puede ir ahí. Elige otra vez.', 'bad'); render(); return;
    }
    if (p && C.color(p) === state.turn) { selected = s === selected ? null : s; render(); return; }
    selected = null; render();
  }

  // ---------- Rondas ----------
  // solvedIt: el alumno encontró la respuesta; firstTry: sin errores ni pista (suma acierto).
  function finishRound(firstTry, message, solvedIt = firstTry) {
    solved = true;
    if (TYPE === 'mate1' || TYPE === 'daily') setTimeout(() => showReview(!solvedIt), 0);
    if (!firstTry && solvedIt) message += ' (Lo lograste con ayuda: esta ronda no suma acierto.)';
    if (extra) { say(message, solvedIt ? 'good' : 'bad'); speak(solvedIt ? '¡Muy bien!' : 'Observa la solución.'); hintBtn.disabled = true; return; }
    total++; if (firstTry) ok++;
    updateProgress();
    say(message, solvedIt ? 'good' : 'bad');
    speak(solvedIt ? '¡Muy bien!' : 'Observa la solución.');
    if (checkBtn) checkBtn.disabled = true;
    if (hintBtn) hintBtn.disabled = true;
    if (total >= ROUNDS) endSession();
    else { nextBtn.disabled = false; nextBtn.focus(); }
  }

  function endSession() {
    finished = true;
    nextBtn.disabled = true;
    window.MauroPractice?.record(TYPE, { correct: ok, total: ROUNDS });
    if (TYPE === 'daily') return dailyDone();
    setTimeout(() => speak(`Sesión completada. Acertaste ${ok} de ${ROUNDS}.`), 900);
  }

  function failAttempt(message) {
    mistakes++;
    if (mistakes >= 2) { showSolution(); finishRound(false, message + ' ' + solutionText()); }
    else { say(message + ' Te queda un intento.', 'bad'); speak('Intenta otra vez'); render(); }
  }

  // ===== Mate en 1 / Táctica del día =====
  function mateMoves() { return C.legalMoves(state).filter(m => C.isMate(C.apply(state, m))); }
  function solutionMoves() {
    if (round.kind === 'mate' || TYPE === 'mate1') return mateMoves();
    if (TYPE === 'hanging') return C.legalMoves(state).filter(m => m.to === round.target && !C.attacked(C.apply(state, m).board, m.to, 'b'));
    return C.legalMoves(state).filter(m => round.solutions.includes(m.from + m.to));
  }
  function solutionText() { const m = solutionMoves()[0]; return m ? `La solución era ${C.san(state, m)}.` : ''; }
  function showSolution() {
    const m = solutionMoves()[0]; if (!m) return;
    marks = { [m.from]: 'drill-hint', [m.to]: 'correct' }; selected = null;
    const san = C.san(state, m); state = C.apply(state, m); history.push({ state, san, from: m.from, to: m.to, sol: true }); render();
  }

  function attempt(move) {
    const before = state, after = C.apply(state, move), notation = C.san(before, move);
    if (TYPE === 'hanging') return attemptHanging(move, before, after, notation);
    const isMate = C.isMate(after);
    const good = (round.kind === 'mate' || TYPE === 'mate1') ? isMate : round.solutions.includes(move.from + move.to);
    if (good) {
      state = after; history.push({ state, san: notation, from: move.from, to: move.to }); marks = { [move.from]: 'drill-from', [move.to]: 'correct' }; render();
      const extraIdea = round.idea ? ' ' + round.idea : '';
      return finishRound(mistakes === 0, (isMate ? `¡Jaque mate! ${notation}.` : `¡Correcto! ${notation}.`) + extraIdea, true);
    }
    marks = { [move.to]: 'wrong' };
    let why = `${notation} no es la solución.`;
    if (TYPE === 'mate1' || round.kind === 'mate') {
      if (!C.inCheck(after)) why = `${notation} no da jaque. Un mate siempre empieza con un jaque.`;
      else {
        const escape = C.legalMoves(after)[0];
        why = `${notation} da jaque, pero no es mate: las negras pueden responder ${escape ? C.san(after, escape) : 'con otra jugada'}.`;
      }
    }
    failAttempt(why);
  }

  function newMateRound(item) {
    round = { ...item, kind: item.kind || 'mate' };
    state = C.parseFEN(item.fen);
    history = [{ state, san: null }]; reviewAt = -1; hideReview();
    questionEl.textContent = TYPE === 'daily' ? (item.prompt || 'Encuentra la mejor jugada.') + ' Juegan blancas.' : 'Juegan blancas: da jaque mate en una jugada.';
    themeEl.textContent = 'Tema: ' + item.theme;
  }

  // ===== Captura la pieza indefensa =====
  function attemptHanging(move, before, after, notation) {
    if (!move.captured) { marks = { [move.to]: 'wrong' }; return failAttempt(`${notation} no captura nada. Busca una pieza negra que puedas tomar gratis.`); }
    const recapture = C.attacked(after.board, move.to, 'b');
    if (move.to === round.target && !recapture) {
      state = after; marks = { [move.from]: 'drill-from', [move.to]: 'correct' }; render();
      return finishRound(mistakes === 0, `¡Correcto! ${notation}: ganaste ${pieceUn(move.captured)} sin perder nada.`, true);
    }
    const defenders = C.attackers(after.board, move.to, 'b');
    const def = defenders[0] ? `${pieceName(after.board[defenders[0]])} de ${defenders[0]}` : 'otra pieza';
    marks = { [move.to]: 'wrong', ...(defenders[0] ? { [defenders[0]]: 'drill-defender' } : {}) };
    failAttempt(`Cuidado: ${pieceShort(move.captured)} de ${move.to} está defendid${fem(move.captured) ? 'a' : 'o'} por ${def}.`);
  }

  function generateHanging() {
    const types = ['N', 'B', 'R', 'Q', 'P', 'N', 'B', 'R', 'P'];
    for (let tries = 0; tries < 4000; tries++) {
      const board = {}, free = () => { let s; do { s = C.FILES[rand(8)] + (1 + rand(8)); } while (board[s]); return s; };
      board[free()] = 'wK';
      let bk; do { bk = free(); } while (Math.abs(C.fr(bk).f - C.fr(Object.keys(board)[0]).f) <= 1 && Math.abs(C.fr(bk).r - C.fr(Object.keys(board)[0]).r) <= 1);
      board[bk] = 'bK';
      const nW = 2 + rand(2), nB = 2 + rand(3);
      for (let i = 0; i < nW; i++) { const t = types[rand(types.length)]; let s = free(); if (t === 'P') { while (/[18]/.test(s[1])) s = free(); } board[s] = 'w' + t; }
      for (let i = 0; i < nB; i++) { const t = types[rand(types.length)]; let s = free(); if (t === 'P') { while (/[18]/.test(s[1])) s = free(); } board[s] = 'b' + t; }
      const st = { board, turn: 'w', castling: '-', ep: '-' };
      if (C.inCheck(st, 'b') || C.inCheck(st, 'w')) continue;
      const caps = C.legalMoves(st).filter(m => m.captured && m.captured !== 'bK');
      const free_ = new Set(caps.filter(m => !C.attacked(C.apply(st, m).board, m.to, 'b')).map(m => m.to));
      const defended = new Set(caps.filter(m => !free_.has(m.to)).map(m => m.to));
      if (free_.size !== 1 || defended.size < 1) continue; // una sola pieza indefensa + al menos una trampa
      return { board, target: [...free_][0] };
    }
    return null;
  }
  function newHangingRound() {
    const g = generateHanging();
    state = { board: g.board, turn: 'w', castling: '-', ep: '-' };
    round = { target: g.target };
    questionEl.textContent = 'Juegan blancas: una pieza negra está indefensa. ¡Captúrala sin que te la devuelvan!';
    themeEl.textContent = 'Cuidado: hay piezas negras defendidas que son una trampa.';
  }

  // ===== Movimientos legales =====
  const LEGAL_ORDER = ['R', 'B', 'N', 'Q', 'K', 'P', 'N', 'Q', 'R', 'B'];
  function newLegalRound() {
    const t = LEGAL_ORDER[total % LEGAL_ORDER.length];
    const withObstacles = total >= 4;
    const board = {};
    let s; do { s = C.FILES[rand(8)] + (1 + rand(8)); } while (t === 'P' && (s[1] === '1' || s[1] === '8'));
    board[s] = 'w' + t;
    if (withObstacles) {
      const n = 2 + rand(3);
      for (let i = 0; i < n; i++) {
        let o; do { o = C.FILES[rand(8)] + (2 + rand(6)); } while (board[o]);
        // Con el rey solo ponemos piezas propias (así no hay casillas atacadas que confundan).
        board[o] = (t === 'K' || Math.random() < .5 ? 'w' : 'b') + (Math.random() < .5 ? 'P' : 'N');
      }
      if (t === 'P') { // ofrece una captura diagonal posible
        const f = C.fr(s), d = C.sq(f.f + (Math.random() < .5 ? -1 : 1), f.r + 1);
        if (d && !board[d]) board[d] = 'bN';
      }
    }
    state = { board, turn: 'w', castling: '-', ep: '-' };
    round = { from: s, answer: new Set(C.pseudoFrom(board, s, null).map(m => m.to)) };
    picks = new Set();
    questionEl.textContent = `Marca todas las casillas a las que puede ir ${pieceName('w' + t)} de ${s}. Luego pulsa «Comprobar».`;
    themeEl.textContent = withObstacles ? 'Ojo con los obstáculos: no se puede saltar (salvo el caballo) y se captura a las piezas negras.' : `Recuerda cómo se mueve ${ART[t]} ${C.NAME[t]}.`;
    if (!round.answer.size) return newLegalRound();
  }
  function togglePick(s) {
    if (s === round.from) return;
    if (state.board[s] && C.color(state.board[s]) === 'w') { say('Ahí hay una pieza blanca: no se puede ir a una casilla ocupada por una pieza propia.', 'bad'); return; }
    picks.has(s) ? picks.delete(s) : picks.add(s);
    say(`${picks.size} casilla${picks.size === 1 ? '' : 's'} marcada${picks.size === 1 ? '' : 's'}.`);
    render();
  }
  function checkLegal() {
    if (solved || finished) return;
    if (!picks.size) { say('Marca al menos una casilla.', 'bad'); return; }
    const wrong = [...picks].filter(s => !round.answer.has(s)), missed = [...round.answer].filter(s => !picks.has(s));
    marks = {};
    [...picks].forEach(s => marks[s] = round.answer.has(s) ? 'correct' : 'wrong');
    missed.forEach(s => marks[s] = 'drill-missed');
    picks = new Set();
    render();
    if (!wrong.length && !missed.length) return finishRound(true, round.answer.size === 1 ? '¡Perfecto! Era la única casilla posible.' : `¡Perfecto! Encontraste las ${round.answer.size} casillas.`);
    const parts = [];
    if (wrong.length) parts.push(`${wrong.length} incorrecta${wrong.length > 1 ? 's' : ''} (en rojo)`);
    if (missed.length) parts.push(`te falt${missed.length > 1 ? 'aron' : 'ó'} ${missed.length} (en amarillo)`);
    finishRound(false, `Casi: ${parts.join(' y ')}. ${round.answer.size === 1 ? 'Solo había 1 casilla' : `Eran ${round.answer.size} casillas`}.`);
  }

  // ===== Táctica del día =====
  const DAILY_KEY = 'mauro_daily_tactic_v1';
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dayIndex = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  function dailyInfo() { try { return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}'); } catch (_) { return {}; } }
  function dailyDone() {
    const info = dailyInfo(), today = todayKey();
    if (info.date !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      info.streak = info.date === yKey ? (info.streak || 0) + 1 : 1;
      info.date = today; info.solved = ok > 0;
      try { localStorage.setItem(DAILY_KEY, JSON.stringify(info)); } catch (_) {}
    }
    showDailyBox(info);
  }
  function showDailyBox(info) {
    const box = $('dailyBox'); if (!box) return;
    box.hidden = false;
    box.innerHTML = `<strong>🔥 Racha: ${info.streak || 1} día${(info.streak || 1) === 1 ? '' : 's'}</strong><p>Vuelve mañana para una táctica nueva. Mientras tanto puedes seguir entrenando:</p><button class="main-btn primary" type="button" id="dailyMore">🎲 Otra táctica</button> <a class="main-btn" href="mate-en-1.html">Mate en 1 →</a>`;
    $('dailyMore').onclick = () => { extra = true; solved = false; mistakes = 0; marks = {}; selected = null; const pool = D.DAILY.filter(x => x !== round); newMateRound(pool[rand(pool.length)]); say('Táctica extra (no cuenta para la racha).'); hintBtn.disabled = false; render(); };
  }

  // ---------- Repaso: adelantar y regresar ----------
  let reviewEl = $('review');
  if (!reviewEl && (TYPE === 'mate1' || TYPE === 'daily')) { reviewEl = document.createElement('div'); reviewEl.className = 'review'; reviewEl.id = 'review'; reviewEl.hidden = true; feedbackEl.after(reviewEl); }
  function hideReview() { if (reviewEl) { reviewEl.hidden = true; reviewEl.innerHTML = ''; } }
  function showReview(failed) {
    if (!reviewEl || history.length < 2) return;
    const list = history.slice(1).map((h, k) => `<button type="button" class="rv-move w${h.sol ? ' sol' : ''}" data-i="${k + 1}">${h.san}</button>`).join('');
    reviewEl.innerHTML = `<div class="rv-head"><strong>🔁 Repasa ${failed ? 'la solución' : 'tu jugada'}</strong><span id="rvNow"></span></div>
      <div class="rv-controls" role="group" aria-label="Repasar jugadas">
        <button type="button" class="rv-btn" data-rv="start" aria-label="Posición inicial" title="Posición inicial">⏮</button>
        <button type="button" class="rv-btn" data-rv="prev" aria-label="Jugada anterior" title="Jugada anterior (←)">◀</button>
        <button type="button" class="rv-btn" data-rv="next" aria-label="Jugada siguiente" title="Jugada siguiente (→)">▶</button>
        <button type="button" class="rv-btn" data-rv="end" aria-label="Posición final" title="Posición final">⏭</button>
      </div><div class="rv-list">${list}</div>`;
    reviewEl.hidden = false; goReview(failed ? 0 : history.length - 1);
  }
  function goReview(i) {
    i = Math.max(0, Math.min(history.length - 1, i)); reviewAt = i; const h = history[i]; state = h.state;
    marks = i === 0 ? {} : { [h.from]: h.sol ? 'drill-hint' : 'drill-from', [h.to]: 'correct' }; selected = null; render();
    const now = $('rvNow'); if (now) now.textContent = i === 0 ? 'Posición inicial' : `${h.san}${C.isMate(h.state) ? ' · ¡mate!' : ''}`;
    reviewEl.querySelectorAll('.rv-move').forEach(b => b.classList.toggle('active', Number(b.dataset.i) === i));
    reviewEl.querySelector('[data-rv="start"]').disabled = reviewEl.querySelector('[data-rv="prev"]').disabled = i === 0;
    reviewEl.querySelector('[data-rv="next"]').disabled = reviewEl.querySelector('[data-rv="end"]').disabled = i === history.length - 1;
  }
  reviewEl?.addEventListener('click', e => {
    const mv = e.target.closest('.rv-move'); if (mv) return goReview(Number(mv.dataset.i));
    const b = e.target.closest('[data-rv]'); if (!b) return;
    ({ start: () => goReview(0), prev: () => goReview(reviewAt - 1), next: () => goReview(reviewAt + 1), end: () => goReview(history.length - 1) })[b.dataset.rv]();
  });
  document.addEventListener('keydown', e => {
    if (!reviewEl || reviewEl.hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goReview(reviewAt - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goReview(reviewAt + 1); }
  });

  // ---------- Siguiente / pista ----------
  let matePool = [];
  function nextRound() {
    if (finished || total >= ROUNDS) return;
    solved = false; mistakes = 0; marks = {}; selected = null; picks = new Set();
    nextBtn.disabled = true; if (hintBtn) hintBtn.disabled = false; if (checkBtn) checkBtn.disabled = false;
    say('');
    if (TYPE === 'mate1') { if (!matePool.length) matePool = shuffle(D.MATE_IN_ONE.slice()); newMateRound(matePool.pop()); }
    else if (TYPE === 'hanging') newHangingRound();
    else if (TYPE === 'legal') newLegalRound();
    else if (TYPE === 'daily') newMateRound(D.DAILY[dayIndex() % D.DAILY.length]);
    render();
    speak(questionEl.textContent);
  }
  function hint() {
    if (solved) return;
    if (TYPE === 'legal') { const s = [...round.answer][rand(round.answer.size)]; marks = { [s]: 'drill-hint' }; showHint(`Pista: ${s} es una de las casillas.`); render(); return; }
    const m = solutionMoves()[0]; if (!m) return;
    marks = { [m.from]: 'drill-hint' }; selected = null;
    showHint(`Pista: mueve ${pieceName(state.board[m.from])} de ${m.from}.`); render();
    mistakes = Math.max(mistakes, 1); // usar pista cuenta como ayuda
    hintBtn.disabled = true;
  }

  nextBtn.addEventListener('click', nextRound);
  hintBtn?.addEventListener('click', hint);
  checkBtn?.addEventListener('click', checkLegal);
  $('exerciseListen')?.addEventListener('click', () => speak(questionEl.textContent));

  // Táctica del día ya resuelta hoy: muestra la posición resuelta y la racha.
  if (TYPE === 'daily' && dailyInfo().date === todayKey()) {
    newMateRound(D.DAILY[dayIndex() % D.DAILY.length]);
    showSolution(); solved = true; ok = dailyInfo().solved ? 1 : 0; total = 1; updateProgress();
    say(`Ya hiciste la táctica de hoy. ${round.idea || ''}`, 'good'); hintBtn.disabled = true; nextBtn.disabled = true;
    showDailyBox(dailyInfo());
    return;
  }
  updateProgress();
  nextRound();
})();
