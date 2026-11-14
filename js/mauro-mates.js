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
  let selected = null, marks = {}, mistakes = 0, finished = false, busy = false, played = [];
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
    state = after; played.push(san); marks = { [move.from]: 'drill-from', [move.to]: 'correct' }; render();
    if (C.isMate(state)) return solved(san);
    // Respuesta de las negras: la defensa más resistente
    busy = true;
    say(`¡Bien! ${san}. Las negras responden…`, 'good');
    setTimeout(() => blackReply(), 650);
  }
  function blackReply() {
    const reps = C.legalMoves(state);
    let chosen = null, child = null;
    if (remaining >= 3 && node.r) {
      let best = -1;
      for (const r of reps) { const c = node.r[uci(r)]; const n = c ? c.n : 0; if (n > best || (n === best && Math.random() < .4)) { best = n; chosen = r; child = c; } }
    } else {
      // mate en 2: cualquier respuesta deja mate en 1; preferimos la que no sea captura obvia al azar
      chosen = reps[Math.floor(Math.random() * reps.length)]; child = { n: 1 };
    }
    const san = C.san(state, chosen);
    state = C.apply(state, chosen); played.push(san);
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
    say(`${why} La jugada correcta era ${sol ? C.san(state, sol) : '—'}. Pulsa «Reintentar» para jugarla tú o sigue con el siguiente.`, 'bad');
    render(); endRound(true);
  }
  function endRound(failed) {
    hintBtn.disabled = true; retryBtn.hidden = !failed;
    if (done >= total) { finished = true; nextBtn.disabled = true; window.MauroPractice?.record('mates', { correct: ok, total }); $('setDone').hidden = false; $('setDone').innerHTML = `<strong>🏆 ¡Serie completada!</strong><p>${ok} de ${total} mates resueltos sin ayuda.</p><a class="main-btn primary" href="practica.html#mates">Elegir otros mates</a>`; return; }
    nextBtn.disabled = false; nextBtn.focus();
  }

  function load(i, retry) {
    index = i; item = ITEMS[i]; state = C.parseFEN(item.fen); node = item.tree || {}; remaining = item.n;
    selected = null; marks = {}; busy = false; played = []; if (!retry) mistakes = 0;
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
