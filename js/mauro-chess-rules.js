/* Academia Mauro · Motor de reglas de ajedrez (ligero, sin dependencias).
   Tablero: objeto { 'e4': 'wP', ... }. Colores 'w' / 'b'. Tipos K Q R B N P.
   Soporta enroque, captura al paso y coronación (por defecto a dama). */
(function (global) {
  'use strict';
  const FILES = 'abcdefgh';
  const FEN_TO = { K:'wK',Q:'wQ',R:'wR',B:'wB',N:'wN',P:'wP',k:'bK',q:'bQ',r:'bR',b:'bB',n:'bN',p:'bP' };
  const TO_FEN = Object.fromEntries(Object.entries(FEN_TO).map(([k, v]) => [v, k]));
  const VALUE = { P:1, N:3, B:3, R:5, Q:9, K:0 };
  const NAME = { K:'rey', Q:'dama', R:'torre', B:'alfil', N:'caballo', P:'peón' };

  const sq = (f, r) => (f >= 0 && f < 8 && r >= 1 && r <= 8) ? FILES[f] + r : null;
  const fr = s => ({ f: FILES.indexOf(s[0]), r: +s[1] });
  const color = p => p ? p[0] : null;
  const type = p => p ? p[1] : null;
  const opp = c => c === 'w' ? 'b' : 'w';

  function parseFEN(fen) {
    const parts = String(fen).trim().split(/\s+/);
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('FEN inválido');
    const board = {};
    rows.forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { f += +ch; continue; }
        board[FILES[f] + (8 - i)] = FEN_TO[ch]; f++;
      }
    });
    return { board, turn: parts[1] === 'b' ? 'b' : 'w', castling: parts[2] || '-', ep: parts[3] || '-' };
  }

  function toFEN(state) {
    const rows = [];
    for (let r = 8; r >= 1; r--) {
      let row = '', e = 0;
      for (let f = 0; f < 8; f++) {
        const p = state.board[FILES[f] + r];
        if (!p) { e++; continue; }
        if (e) { row += e; e = 0; }
        row += TO_FEN[p];
      }
      rows.push(row + (e || ''));
    }
    return `${rows.join('/')} ${state.turn} ${state.castling || '-'} ${state.ep || '-'} 0 1`;
  }

  function kingSquare(board, c) { return Object.keys(board).find(s => board[s] === c + 'K') || null; }

  // ¿La casilla s está atacada por el color "by"?
  function attacked(board, s, by) {
    const { f, r } = fr(s);
    const pd = by === 'w' ? 1 : -1;
    for (const df of [-1, 1]) { const t = sq(f + df, r - pd); if (t && board[t] === by + 'P') return true; }
    for (const [a, b] of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]) { const t = sq(f + a, r + b); if (t && board[t] === by + 'N') return true; }
    for (const [a, b] of [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]) { const t = sq(f + a, r + b); if (t && board[t] === by + 'K') return true; }
    const rays = [[[1,0],[-1,0],[0,1],[0,-1]], 'RQ'], diag = [[[1,1],[1,-1],[-1,1],[-1,-1]], 'BQ'];
    for (const [dirs, kinds] of [rays, diag]) {
      for (const [a, b] of dirs) {
        let nf = f + a, nr = r + b, t;
        while ((t = sq(nf, nr))) {
          const p = board[t];
          if (p) { if (color(p) === by && kinds.includes(type(p))) return true; break; }
          nf += a; nr += b;
        }
      }
    }
    return false;
  }

  // Lista de atacantes de "by" sobre la casilla s (para explicar errores).
  function attackers(board, s, by) {
    const out = [];
    for (const [from, p] of Object.entries(board)) {
      if (color(p) !== by || from === s) continue;
      const tmp = { ...board }; // pon una pieza enemiga ficticia para que cuente como captura
      tmp[s] = opp(by) + 'P';
      if (pseudoFrom(tmp, from, { ep: '-', castling: '-' }, true).some(m => m.to === s)) out.push(from);
    }
    return out;
  }

  // Jugadas pseudo-legales de la pieza en "from" (sin comprobar jaque propio).
  function pseudoFrom(board, from, meta, capturesOnlyForPawns) {
    const p = board[from]; if (!p) return [];
    const c = color(p), t = type(p), { f, r } = fr(from), moves = [];
    const add = (to, extra) => moves.push({ from, to, piece: p, captured: board[to] || null, ...extra });
    if (t === 'P') {
      const d = c === 'w' ? 1 : -1, start = c === 'w' ? 2 : 7, last = c === 'w' ? 8 : 1;
      const one = sq(f, r + d);
      if (!capturesOnlyForPawns && one && !board[one]) {
        add(one, { promotion: r + d === last });
        const two = sq(f, r + 2 * d);
        if (r === start && two && !board[two]) add(two, { double: true });
      }
      for (const df of [-1, 1]) {
        const t2 = sq(f + df, r + d); if (!t2) continue;
        if (board[t2] && color(board[t2]) !== c) add(t2, { promotion: r + d === last });
        else if (meta && meta.ep === t2) add(t2, { enPassant: true, captured: opp(c) + 'P' });
      }
      return moves;
    }
    const steps = {
      N: [[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]], false],
      B: [[[1,1],[1,-1],[-1,1],[-1,-1]], true],
      R: [[[1,0],[-1,0],[0,1],[0,-1]], true],
      Q: [[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]], true],
      K: [[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]], false]
    }[t];
    for (const [a, b] of steps[0]) {
      let nf = f + a, nr = r + b, t2;
      while ((t2 = sq(nf, nr))) {
        if (board[t2]) { if (color(board[t2]) !== c) add(t2); break; }
        add(t2);
        if (!steps[1]) break;
        nf += a; nr += b;
      }
    }
    // Enroque
    if (t === 'K' && meta && meta.castling && meta.castling !== '-') {
      const rank = c === 'w' ? 1 : 8, home = 'e' + rank;
      if (from === home && !attacked(board, home, opp(c))) {
        const k = c === 'w' ? 'K' : 'k', q = c === 'w' ? 'Q' : 'q';
        if (meta.castling.includes(k) && board['h' + rank] === c + 'R' && !board['f' + rank] && !board['g' + rank] &&
            !attacked(board, 'f' + rank, opp(c)) && !attacked(board, 'g' + rank, opp(c))) add('g' + rank, { castle: 'K' });
        if (meta.castling.includes(q) && board['a' + rank] === c + 'R' && !board['d' + rank] && !board['c' + rank] && !board['b' + rank] &&
            !attacked(board, 'd' + rank, opp(c)) && !attacked(board, 'c' + rank, opp(c))) add('c' + rank, { castle: 'Q' });
      }
    }
    return moves;
  }

  function apply(state, m, promo) {
    const board = { ...state.board };
    delete board[m.from];
    if (m.enPassant) delete board[m.to[0] + m.from[1]];
    board[m.to] = m.promotion ? color(m.piece) + (promo || 'Q') : m.piece;
    if (m.castle) {
      const rank = m.to[1];
      if (m.castle === 'K') { board['f' + rank] = board['h' + rank]; delete board['h' + rank]; }
      else { board['d' + rank] = board['a' + rank]; delete board['a' + rank]; }
    }
    let castling = state.castling || '-';
    if (castling !== '-') {
      const strip = chars => { castling = castling.split('').filter(x => !chars.includes(x)).join('') || '-'; };
      if (m.piece === 'wK') strip('KQ'); if (m.piece === 'bK') strip('kq');
      if (m.from === 'h1' || m.to === 'h1') strip('K'); if (m.from === 'a1' || m.to === 'a1') strip('Q');
      if (m.from === 'h8' || m.to === 'h8') strip('k'); if (m.from === 'a8' || m.to === 'a8') strip('q');
    }
    const ep = m.double ? m.from[0] + ((+m.from[1] + +m.to[1]) / 2) : '-';
    return { board, turn: opp(state.turn), castling, ep };
  }

  function legalFrom(state, from) {
    const p = state.board[from];
    if (!p || color(p) !== state.turn) return [];
    return pseudoFrom(state.board, from, state).filter(m => {
      const next = apply(state, m);
      const k = kingSquare(next.board, state.turn);
      return !k || !attacked(next.board, k, state.turn === 'w' ? 'b' : 'w');
    });
  }

  function legalMoves(state) {
    const out = [];
    for (const s of Object.keys(state.board)) if (color(state.board[s]) === state.turn) out.push(...legalFrom(state, s));
    return out;
  }

  function inCheck(state, c) {
    c = c || state.turn;
    const k = kingSquare(state.board, c);
    return !!k && attacked(state.board, k, opp(c));
  }
  const isMate = state => inCheck(state) && legalMoves(state).length === 0;
  const isStalemate = state => !inCheck(state) && legalMoves(state).length === 0;

  function san(state, m) {
    if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
    const t = type(m.piece);
    let s = '';
    if (t === 'P') { if (m.captured) s += m.from[0]; }
    else {
      s += { K:'R', Q:'D', R:'T', B:'A', N:'C' }[t];
      const others = legalMoves(state).filter(x => x.piece === m.piece && x.to === m.to && x.from !== m.from);
      if (others.length) s += others.some(x => x.from[0] === m.from[0]) ? (others.some(x => x.from[1] === m.from[1]) ? m.from : m.from[1]) : m.from[0];
    }
    if (m.captured) s += 'x';
    s += m.to;
    if (m.promotion) s += '=D';
    const next = apply(state, m);
    if (isMate(next)) s += '#'; else if (inCheck(next)) s += '+';
    return s;
  }

  global.MauroChess = { FILES, VALUE, NAME, sq, fr, color, type, opp, parseFEN, toFEN, kingSquare, attacked, attackers,
    pseudoFrom, apply, legalFrom, legalMoves, inCheck, isMate, isStalemate, san };
})(typeof window !== 'undefined' ? window : globalThis);
