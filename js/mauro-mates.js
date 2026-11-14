/* Academia Mauro · Entrenamiento de mates (mates.html?tipo=...).
   El alumno juega con blancas; las negras responden solas con la defensa más resistente.
   - Nodos con mate en 3 o más: la jugada correcta viene en el árbol verificado (es única).
   - Nodos con mate en 1 o 2: se comprueba en vivo con el motor de reglas, así se aceptan
     todas las soluciones válidas. */
(function () {
  'use strict';
  const C = window.MauroChess, SETS = window.MauroMatesData || {};
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const TIPO = SETS[params.get('tipo')] ? params.get('tipo') : 'm2';
  const SET = SETS[TIPO];
  const ITEMS = SET.items.slice().sort((a, b) => a.n - b.n);
  const boardEl = $('board'), feedbackEl = $('feedback'), questionEl = $('question'), themeEl = $('exerciseTheme');
  const nextBtn = $('exerciseNext'), hintBtn = $('exerciseHint'), retryBtn = $('exerciseRetry');
  const uci = m => m.from + m.to + (m.promotion ? 'q' : '');
  const NAME = { K: 'rey', Q: 'dama', R: 'torre', B: 'alfil', N: 'caballo', P: 'peón' };

  // ---------- Encabezado de la página ----------
  document.title = `${SET.name} · Mates · Academia Mauro`;
  $('setKicker').textContent = SET.kicker;
  $('setTitle').textContent = SET.name;
  $('setDesc').textContent = SET.desc;
  $('setTip').textContent = SET.tip;
  document.querySelectorAll('[data-mates-nav]').forEach(a => { a.classList.toggle('active', a.dataset.matesNav === TIPO); if (a.dataset.matesNav === TIPO) a.setAttribute('aria-current', 'page'); });

  function speak(text) {
    try { if (window.MauroVoice?.speak) return window.MauroVoice.speak(text); const u = new SpeechSynthesisUtterance(text); u.lang = 'es-PE'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) {}
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

  // ---------- Estado ----------
  let index = 0, ok = 0, done = 0, item = null, state = null, node = null, remaining = 0;
  let selected = null, marks = {}, mistakes = 0, finished = false, busy = false, played = [], history = [], reviewAt = -1;
  const total = ITEMS.length;

  function updateProgress() {
    $('ok').textContent = ok; $('count').textContent = `${done}/${total}`;
    $('bar').style.width = (done / total * 100) + '%';
  }
  function say(t, kind) { feedbackEl.textContent = t; feedbackEl.className = 'feedback' + (kind ? ' ' + kind : ''); }

  // ---------- Tablero ----------
  function render() {
    boardEl.replaceChildren();
    const targets = selected ? C.legalFrom(state, selected).map(m => m.to) : [];
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const s = C.FILES[f] + r, p = state.board[s], d = document.createElement('div');
      d.className = 'sq ' + ((f + r) % 2 ? 'dark' : 'light'); d.dataset.square = s;
      if (marks[s]) d.classList.add(...marks[s].split(' '));
      if (s === selected) d.classList.add('drill-selected');
      if (targets.includes(s)) d.classList.add(p ? 'drill-capture' : 'drill-target');
      if (p) { const img = document.createElement('img'); img.src = `pieces-tema/${p}.png`; img.alt = NAME[p[1]] + (p[0] === 'w' ? ' blanco' : ' negro'); img.className = 'mp-libre mp-' + p; img.draggable = false; d.append(img); }
      d.addEventListener('click', () => onSquare(s));
      boardEl.append(d);
    }
  }
  function onSquare(s) {
    if (finished || busy || !node) return;
    const p = state.board[s];
    if (selected && s !== selected && !(p && C.color(p) === 'w')) {
      const move = C.legalFrom(state, selected).find(m => m.to === s); selected = null;
      if (move) return attempt(move);
      say('Esa pieza no puede ir ahí.', 'bad'); render(); return;
    }
    if (p && C.color(p) === 'w') { selected = s === selected ? null : s; render(); return; }
    selected = null; render();
  }

  // ---------- Lógica del mate ----------
  // ¿Desde "s" (juegan blancas) hay mate en 1? Devuelve la jugada o null.
  function mateInOne(s) { return C.legalMoves(s).find(m => C.isMate(C.apply(s, m))) || null; }
  // Tras la jugada de las blancas (juegan negras): ¿todas las respuestas permiten mate en 1?
  function forcesMateInTwo(afterWhite) {
    const reps = C.legalMoves(afterWhite);
    if (!reps.length) return { ok: C.inCheck(afterWhite) };
    for (const r of reps) { const s2 = C.apply(afterWhite, r); if (!mateInOne(s2)) return { ok: false, refutation: r }; }
    return { ok: true };
  }
  function solveFrom(st, nd, rem) {
    if (rem >= 3 && nd && nd.m) return C.legalMoves(st).find(m => uci(m) === nd.m);
    if (rem === 1) return mateInOne(st);
    return C.legalMoves(st).find(m => forcesMateInTwo(C.apply(st, m)).ok) || null;
  }
  // Mejor defensa de las negras: la que más alarga el mate (según el árbol verificado)
  function chooseReply(st, nd, rem) {
    const reps = C.legalMoves(st);
    if (rem >= 3 && nd && nd.r) {
      let best = -1, chosen = null, child = null;
      for (const r of reps) { const c = nd.r[uci(r)]; const n = c ? c.n : 0; if (n > best) { best = n; chosen = r; child = c; } }
      return { chosen, child };
    }
    // mate en 2: preferimos una respuesta que no permita un mate «obvio» con captura
    const quiet = reps.filter(r => !r.captured);
    const pool = quiet.length ? quiet : reps;
    return { chosen: pool[Math.floor(Math.random() * pool.length)], child: { n: 1 } };
  }
  function solutionMove() {
    if (remaining >= 3 && node.m) return C.legalMoves(state).find(m => uci(m) === node.m);
    if (remaining === 1) return mateInOne(state);
    return C.legalMoves(state).find(m => forcesMateInTwo(C.apply(state, m)).ok) || null;
  }

  function attempt(move) {
    const before = state, after = C.apply(state, move), san = C.san(before, move);
    let good = false, why = '';
    if (C.isMate(after)) good = true;
    else if (remaining === 1) why = C.inCheck(after) ? `${san} da jaque, pero no es mate: el rey todavía puede escapar o defenderse.` : `${san} no da jaque. Busca un jaque del que el rey no pueda salir.`;
    else if (remaining === 2) { const r = forcesMateInTwo(after); good = r.ok; if (!good) why = r.refutation ? `Después de ${san}, las negras se defienden con ${C.san(after, r.refutation)} y no hay mate en la siguiente.` : `${san} ahoga al rey: eso es tablas, no mate.`; }
    else { good = node.m === uci(move); if (!good) why = `${san} no fuerza el mate en ${remaining}. Revisa todas las respuestas de las negras.`; }
    if (!good) {
      mistakes++; marks = { [move.to]: 'wrong' };
      if (mistakes >= 2) return giveUp(why);
      say(why + ' Inténtalo otra vez.', 'bad'); speak('Inténtalo otra vez'); render(); return;
    }
    state = after; played.push(san); history.push({ state, san, from: move.from, to: move.to, side: 'w' }); marks = { [move.from]: 'drill-from', [move.to]: 'correct' }; render();
    if (C.isMate(state)) return solved(san);
    // Respuesta de las negras: la defensa más resistente
    busy = true;
    say(`¡Bien! ${san}. Las negras responden…`, 'good');
    setTimeout(() => blackReply(), 650);
  }
  function blackReply() {
    const { chosen, child } = chooseReply(state, node, remaining);
    const san = C.san(state, chosen);
    state = C.apply(state, chosen); played.push(san); history.push({ state, san, from: chosen.from, to: chosen.to, side: 'b' });
    node = child; remaining = child.n;
    marks = { [chosen.from]: 'drill-from', [chosen.to]: 'drill-defender' };
    busy = false; render();
    questionEl.textContent = `Las negras jugaron ${san}. Ahora: mate en ${remaining}.`;
    say(`Las negras jugaron ${san}. Te queda mate en ${remaining}.`);
    speak(`Las negras jugaron. Mate en ${remaining}`);
  }
  function solved(lastSan) {
    done++; if (mistakes === 0) ok++; updateProgress();
    say(`¡Jaque mate! ${lastSan}.${item.idea ? ' ' + item.idea : ''}${mistakes ? ' (Con ayuda: no suma acierto.)' : ''}`, 'good');
    speak('¡Jaque mate!'); endRound();
  }
  function giveUp(why) {
    done++; updateProgress();
    const sol = solutionMove();
    if (sol) { marks = { [sol.from]: 'drill-hint', [sol.to]: 'correct' }; }
    // Línea completa de la solución (con la mejor defensa) para el repaso
    let st = state, nd = node, rem = remaining, guard = 0;
    while (rem > 0 && guard++ < 10) {
      const m = solveFrom(st, nd, rem); if (!m) break;
      const san = C.san(st, m); st = C.apply(st, m); history.push({ state: st, san, from: m.from, to: m.to, side: 'w', sol: true });
      if (C.isMate(st)) break;
      const { chosen, child } = chooseReply(st, nd, rem); if (!chosen) break;
      const bsan = C.san(st, chosen); st = C.apply(st, chosen); history.push({ state: st, san: bsan, from: chosen.from, to: chosen.to, side: 'b', sol: true });
      nd = child; rem = child.n;
    }
    say(`${why} La jugada correcta era ${sol ? C.san(state, sol) : '—'}. Pulsa «Reintentar» para jugarla tú o sigue con el siguiente.`, 'bad');
    render(); endRound(true);
  }
  function endRound(failed) {
    hintBtn.disabled = true; retryBtn.hidden = !failed;
    showReview(failed);
    if (done >= total) { finished = true; nextBtn.disabled = true; window.MauroPractice?.record('mates', { correct: ok, total }); $('setDone').hidden = false; $('setDone').innerHTML = `<strong>🏆 ¡Serie completada!</strong><p>${ok} de ${total} mates resueltos sin ayuda.</p><a class="main-btn primary" href="practica.html#mates">Elegir otros mates</a>`; return; }
    nextBtn.disabled = false; nextBtn.focus();
  }

  // ---------- Repaso: adelantar y regresar por las jugadas del ejercicio ----------
  const reviewEl = $('review');
  function showReview(failed) {
    if (!reviewEl || history.length < 2) return;
    node = null; // el tablero queda solo para mirar
    const list = history.slice(1).map((h, k) => {
      const ply = k + 1, num = Math.ceil(ply / 2), white = h.side === 'w';
      return `<button type="button" class="rv-move${h.sol ? ' sol' : ''}${white ? ' w' : ' b'}" data-i="${ply}">${white ? num + '. ' : ''}${h.san}</button>`;
    }).join('');
    reviewEl.innerHTML = `<div class="rv-head"><strong>🔁 Repasa ${failed ? 'la solución' : 'tu mate'}</strong><span id="rvNow"></span></div>
      <div class="rv-controls" role="group" aria-label="Repasar jugadas">
        <button type="button" class="rv-btn" data-rv="start" aria-label="Posición inicial" title="Posición inicial">⏮</button>
        <button type="button" class="rv-btn" data-rv="prev" aria-label="Jugada anterior" title="Jugada anterior (←)">◀</button>
        <button type="button" class="rv-btn" data-rv="next" aria-label="Jugada siguiente" title="Jugada siguiente (→)">▶</button>
        <button type="button" class="rv-btn" data-rv="end" aria-label="Posición final" title="Posición final">⏭</button>
      </div>
      <div class="rv-list">${list}</div>${failed ? '<p class="rv-note">En verde, la solución con la mejor defensa de las negras.</p>' : ''}`;
    reviewEl.hidden = false;
    const firstSol = history.findIndex(h => h.sol);
    goReview(failed && firstSol > 0 ? firstSol - 1 : history.length - 1);
  }
  function goReview(i) {
    i = Math.max(0, Math.min(history.length - 1, i)); reviewAt = i;
    const h = history[i]; state = h.state;
    marks = i === 0 ? {} : { [h.from]: h.sol && h.side === 'w' ? 'drill-hint' : 'drill-from', [h.to]: h.side === 'w' ? 'correct' : 'drill-defender' };
    selected = null; render();
    const now = $('rvNow');
    if (now) now.textContent = i === 0 ? 'Posición inicial' : `Jugada ${i} de ${history.length - 1}: ${Math.ceil(i / 2)}${h.side === 'w' ? '.' : '...'} ${h.san}${C.isMate(h.state) ? ' · ¡mate!' : ''}`;
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

  function load(i, retry) {
    index = i; item = ITEMS[i]; state = C.parseFEN(item.fen); node = item.tree || {}; remaining = item.n;
    selected = null; marks = {}; busy = false; played = []; if (!retry) mistakes = 0;
    history = [{ state, san: null }]; reviewAt = -1; if (reviewEl) { reviewEl.hidden = true; reviewEl.innerHTML = ''; }
    hintBtn.disabled = false; nextBtn.disabled = true; retryBtn.hidden = true;
    questionEl.textContent = `Juegan blancas: mate en ${item.n}.`;
    themeEl.textContent = `Ejercicio ${i + 1} de ${total}` + (item.theme ? ` · ${item.theme}` : ` · mate en ${item.n}`);
    say(item.n === 1 ? 'Encuentra el jaque mate.' : `Encuentra la primera jugada. Las negras se defenderán lo mejor posible.`);
    render(); speak(questionEl.textContent);
  }
  nextBtn.addEventListener('click', () => { if (index + 1 < total) load(index + 1); });
  retryBtn.addEventListener('click', () => { done--; updateProgress(); finished = false; load(index, true); });
  hintBtn.addEventListener('click', () => {
    const m = solutionMove(); if (!m) return;
    marks = { [m.from]: 'drill-hint' }; selected = null; mistakes = Math.max(mistakes, 1);
    showHint(`Pista: mueve ${NAME[state.board[m.from][1]] === 'dama' || NAME[state.board[m.from][1]] === 'torre' ? 'la' : 'el'} ${NAME[state.board[m.from][1]]} de ${m.from}.`); render(); hintBtn.disabled = true;
  });
  $('exerciseListen')?.addEventListener('click', () => speak(questionEl.textContent));

  updateProgress(); load(0);
})();
