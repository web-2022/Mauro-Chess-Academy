/* Academia Mauro · Explicador de jugadas.
   Traduce una jugada (de la pista o del análisis) a ideas en español:
   qué gana, qué amenaza, qué defiende, qué plan sigue y qué responde el rival.
   Usa js/mauro-chess-rules.js (MauroChess). Sin dependencias. */
(function (global) {
  'use strict';
  const C = global.MauroChess;
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
  const NAME = { K: 'rey', Q: 'dama', R: 'torre', B: 'alfil', N: 'caballo', P: 'peón' };
  const ART = { K: 'el', Q: 'la', R: 'la', B: 'el', N: 'el', P: 'el' };
  const UN = { K: 'un', Q: 'una', R: 'una', B: 'un', N: 'un', P: 'un' };
  const CENTER = ['d4', 'e4', 'd5', 'e5'];
  const BIG_CENTER = ['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6'];
  const opp = c => (c === 'w' ? 'b' : 'w');
  const the = p => `${ART[p[1]]} ${NAME[p[1]]}`;
  const a = p => `${UN[p[1]]} ${NAME[p[1]]}`;

  const findMove = (st, uci) => uci && C.legalMoves(st).find(m => m.from + m.to === uci.slice(0, 4));
  const material = (board, c) => Object.values(board).reduce((s, p) => s + (p[0] === c && p[1] !== 'K' ? VAL[p[1]] : 0), 0);
  const pieceCount = board => Object.values(board).filter(p => p[1] !== 'K' && p[1] !== 'P').length;
  const defended = (board, s, by) => C.attackers(board, s, by).length > 0;
  // Pieza "colgando": atacada por el rival y sin defensa, o atacada por una pieza de menor valor.
  function hanging(board, s) {
    const p = board[s]; if (!p) return false;
    const att = C.attackers(board, s, opp(p[0]));
    if (!att.length) return false;
    if (!defended(board, s, p[0])) return true;
    return att.some(f => VAL[board[f][1]] < VAL[p[1]]);
  }

  /** Ideas de la jugada "uci" en la posición "st" (estado de MauroChess). */
  function ideas(st, uci, moveNo) {
    const m = findMove(st, uci); if (!m) return null;
    const me = st.turn, them = opp(me), piece = st.board[m.from], t = piece[1];
    const after = C.apply(st, m, (uci[4] || 'q').toUpperCase());
    const B = after.board, out = [], plan = [];
    const opening = (moveNo || 1) <= 12, endgame = pieceCount(B) <= 4;
    let gain = 0;
    const homeRank = me === 'w' ? '1' : '8';

    if (C.isMate(after)) return { list: ['da jaque mate: el rey rival no tiene escapatoria'], plan: 'terminar la partida', gain: 100, mate: true };

    // 1) Capturas
    if (m.captured) {
      const cap = m.captured;
      const safe = !C.attacked(B, m.to, them);
      if (safe) { out.push(`captura ${the(cap)} de ${m.to} y no ${ART[cap[1]] === 'la' ? 'la' : 'lo'} pueden recuperar`); gain = VAL[cap[1]]; }
      else if (VAL[cap[1]] > VAL[t]) { out.push(`cambia su ${NAME[t]} por ${the(cap)} rival, que vale más (${VAL[cap[1]]} contra ${VAL[t]})`); gain = VAL[cap[1]] - VAL[t]; }
      else if (VAL[cap[1]] === VAL[t]) out.push(`cambia piezas: ${NAME[t]} por ${NAME[cap[1]]}`);
      else out.push(`captura ${the(cap)} de ${m.to}, aunque el rival puede recapturar`);
    }
    // 2) Coronación
    if (m.promotion) { out.push(`corona el peón: se convierte en dama`); gain += 8; plan.push('ganar con la nueva dama'); }
    // 3) Jaque
    if (C.inCheck(after)) out.push('da jaque: el rival está obligado a responder');
    // 4) Enroque
    if (m.castle) { out.push(`enroca ${m.castle === 'K' ? 'corto' : 'largo'}: pone al rey a salvo y conecta las torres`); plan.push('terminar el desarrollo y llevar las torres al centro'); }
    // 5) Amenazas nuevas de la pieza que mueve
    const targets = [];
    for (const [s, p] of Object.entries(B)) {
      if (p[0] !== them || p[1] === 'K') continue;
      if (!C.attackers(B, s, me).includes(m.to)) continue;
      if (!defended(B, s, them) || VAL[p[1]] > VAL[B[m.to][1]]) targets.push([s, p]);
    }
    if (targets.length >= 2) out.push(`ataca a la vez ${targets.map(([s, p]) => `${the(p)} de ${s}`).join(' y ')} (ataque doble)`);
    else if (targets.length === 1) out.push(`amenaza ${the(targets[0][1])} de ${targets[0][0]}`);
    // 6) Salvar una pieza atacada
    if (!m.captured && t !== 'K' && hanging(st.board, m.from) && !hanging(B, m.to)) out.push(`pone a salvo ${the(piece)}, que estaba atacado en ${m.from}`);
    // 7) Defender otra pieza que estaba en peligro
    for (const [s, p] of Object.entries(st.board)) {
      if (p[0] !== me || s === m.from || p[1] === 'K') continue;
      if (hanging(st.board, s) && B[s] === p && !hanging(B, s)) { out.push(`defiende ${the(p)} de ${s}, que estaba en peligro`); break; }
    }
    // 8) Desarrollo, centro, actividad
    if (/[NB]/.test(t) && m.from[1] === homeRank && opening) { out.push(`desarrolla ${the(piece)}: sale de su casilla inicial hacia el juego`); plan.push('desarrollar las piezas menores'); }
    if (t === 'P' && CENTER.includes(m.to) && opening) { out.push(`ocupa el centro con un peón en ${m.to}`); plan.push('controlar el centro'); }
    else if (t !== 'P' && t !== 'K' && (CENTER.includes(m.to) || BIG_CENTER.includes(m.to)) && !out.length) out.push(`lleva ${the(piece)} hacia el centro, donde controla más casillas`);
    if (t === 'P' && !opening) {
      const dir = me === 'w' ? 1 : -1, file = m.to[0];
      const passed = !Object.entries(B).some(([s, p]) => p === them + 'P' && Math.abs(s.charCodeAt(0) - file.charCodeAt(0)) <= 1 && (s[1] - m.to[1]) * dir > 0);
      if (passed) { out.push(`avanza un peón pasado: ningún peón rival puede frenarlo`); plan.push('coronar el peón pasado'); }
    }
    if (t === 'P' && !endgame && /[fgh]/.test(m.from[0]) && !m.captured) {
      const k = C.kingSquare(st.board, me);
      if (k && (/[efgh]/.test(k[0])) && k[1] === homeRank) out.push('debilita los peones que protegen al rey: se abren caminos para atacarlo');
    }
    if (t === 'K' && endgame) { out.push('activa el rey: en el final el rey es una pieza fuerte'); plan.push('acercar el rey a los peones'); }
    if (t === 'R' && !out.length) {
      const file = m.to[0];
      const openFile = !Object.entries(B).some(([s, p]) => s[0] === file && p[1] === 'P');
      if (openFile) out.push(`coloca la torre en la columna abierta ${file}`);
    }
    // 9) Plan general según la fase
    if (!plan.length) {
      if (gain >= 2) plan.push('ganar material y simplificar');
      else if (opening) plan.push(C.inCheck(after) ? 'presionar al rey rival' : 'desarrollar piezas, controlar el centro y enrocar');
      else if (endgame) plan.push('activar el rey y avanzar los peones');
      else plan.push('mejorar la posición de las piezas y buscar debilidades del rival');
    }
    if (!out.length) out.push(`mejora la posición ${t === 'P' ? 'de los peones' : 'de ' + the(piece)}`);
    return { list: out, plan: plan[0], gain, after, move: m };
  }

  // Amenazas del rival en la posición "st" (piezas propias colgando).
  function threatsAgainst(st, side) {
    const me = side || st.turn, list = [];
    for (const [s, p] of Object.entries(st.board)) if (p[0] === me && p[1] !== 'K' && hanging(st.board, s)) list.push([s, p]);
    list.sort((x, y) => VAL[y[1][1]] - VAL[x[1][1]]);
    return list;
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const join = l => l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];

  /** Texto para la pista: idea, plan y amenaza del rival. */
  function hint(st, uci, moveNo) {
    const r = ideas(st, uci, moveNo); if (!r) return '';
    const th = r.after ? threatsAgainst(r.after, st.turn) : [];
    let txt = `Idea: ${join(r.list.slice(0, 2))}.`;
    if (!r.mate) txt += ` Plan: ${r.plan}.`;
    if (th.length && !r.mate) txt += ` Ojo: después, ${the(th[0][1])} de ${th[0][0]} queda atacad${ART[th[0][1][1]] === 'la' ? 'a' : 'o'}; vigílal${ART[th[0][1][1]] === 'la' ? 'a' : 'o'}.`;
    return txt;
  }

  /** Explicación de una jugada analizada.
      before: estado antes de la jugada; played/best: uci; reply: mejor respuesta del rival tras la jugada. */
  function review(before, played, best, reply, quality, moveNo) {
    const p = ideas(before, played, moveNo);
    const parts = [];
    if (p) parts.push(`Esta jugada ${join(p.list.slice(0, 2))}.`);
    if (quality === 'best' || quality === 'good') {
      if (p && !p.mate) parts.push(`Plan: ${p.plan}.`);
      return parts.join(' ');
    }
    // Qué castiga el rival
    if (reply && p && p.after) {
      const r = ideas(p.after, reply, moveNo);
      const rm = findMove(p.after, reply);
      if (r && rm) {
        const san = C.san(p.after, rm);
        if (r.mate) parts.push(`El problema: el rival responde ${san} y da jaque mate.`);
        else if (r.gain >= 1) parts.push(`El problema: el rival responde ${san}, que ${r.list[0]}.`);
        else {
          const hung = threatsAgainst(p.after, before.turn);
          if (hung.length) parts.push(`El problema: ${the(hung[0][1])} de ${hung[0][0]} queda sin defensa y el rival puede aprovecharlo.`);
          else parts.push(`El rival puede responder ${san}: ${r.list[0]}.`);
        }
      }
    }
    // Qué era mejor y por qué
    const b = ideas(before, best, moveNo);
    const bm = findMove(before, best);
    if (b && bm) parts.push(`Mejor era ${C.san(before, bm)}, que ${join(b.list.slice(0, 2))}.${b.mate ? '' : ' Plan: ' + b.plan + '.'}`);
    return parts.join(' ');
  }

  global.MauroExplica = { ideas, hint, review, threatsAgainst };
})(typeof window !== 'undefined' ? window : globalThis);
