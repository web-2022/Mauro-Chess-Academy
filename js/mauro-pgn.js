/* Ajedrezia · Lector de PGN (jugadas en inglés estándar o en español) → jugadas uci verificadas con MauroChess. */
(function (global) {
  'use strict';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const EN2ES = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };
  const clean = s => s.replace(/[+#!?]/g, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
  function headers(text) { const h = {}; String(text).replace(/\[(\w+)\s+"([^"]*)"\]/g, (m, k, v) => { h[k] = v; }); return h; }
  function tokens(text) {
    let t = String(text).replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    let prev; do { prev = t; t = t.replace(/\([^()]*\)/g, ' '); } while (t !== prev); // quita variantes anidadas
    t = t.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|½-½|\*)\s*$/, ' ');
    return t.split(/\s+/).filter(Boolean);
  }
  /** Devuelve { moves:[uci], sans:[SAN español], headers, error } */
  function parse(text, fen) {
    const C = global.MauroChess; let st = C.parseFEN(fen || START);
    const out = { moves: [], sans: [], headers: headers(text), error: null };
    for (const tok of tokens(text)) {
      const raw = clean(tok);
      const en = raw.replace(/^[KQRBN]/, x => EN2ES[x]).replace(/=([QRBN])/, (m, x) => '=' + EN2ES[x]);
      const es = raw; // por si ya viene en español
      const m = C.legalMoves(st).find(x => { const s = clean(C.san(st, x)); return s === en || s === es; })
        || C.legalMoves(st).find(x => x.from + x.to === raw.slice(0, 4));
      if (!m) { out.error = `Jugada no válida: ${tok} (jugada ${Math.floor(out.moves.length / 2) + 1})`; break; }
      const promo = (raw.match(/=([QRBNDTAC])/) || [])[1];
      const pl = promo ? ({ Q: 'q', D: 'q', R: 'r', T: 'r', B: 'b', A: 'b', N: 'n', C: 'n' })[promo] : '';
      out.sans.push(C.san(st, m)); out.moves.push(m.from + m.to + (m.promotion ? (pl || 'q') : ''));
      st = C.apply(st, m, (pl || 'q').toUpperCase());
    }
    return out;
  }
  global.MauroPGN = { parse, headers };
})(typeof window !== 'undefined' ? window : globalThis);
