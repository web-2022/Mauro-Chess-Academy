/* Academia Mauro · Motor de ajedrez propio (sin dependencias, funciona sin conexión).
   - Tablero 0x88 con enroque, captura al paso y coronación.
   - Búsqueda negamax alfa-beta con profundización iterativa, tabla de transposición,
     búsqueda de capturas (quiescencia), movimientos asesinos, historia y poda de jugada nula.
   - Evaluación: material + tablas de posición (medio juego / final, interpoladas).
   Se usa como Web Worker (mensajes) o directamente con MauroMotor.* */
(function (root) {
  'use strict';
  const EMPTY = 0, P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BLACK = 8;
  const FEN_PIECE = { p: P, n: N, b: B, r: R, q: Q, k: K };
  const PIECE_CHAR = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
  const KD = [-17, -16, -15, -1, 1, 15, 16, 17], ND = [-33, -31, -18, -14, 14, 18, 31, 33], BD = [-17, -15, 15, 17], RD = [-16, -1, 1, 16];
  const FLAG_CAP = 1, FLAG_EP = 2, FLAG_CASTLE = 4, FLAG_DOUBLE = 8;
  const sq = (f, r) => f + r * 16;
  const sqName = i => 'abcdefgh'[i & 7] + ((i >> 4) + 1);
  const nameSq = s => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 16;
  // Movimiento empaquetado: desde(7) | hasta(7) | coronación(3) | banderas(4)
  const mv = (f, t, promo, flags) => f | (t << 7) | (promo << 14) | (flags << 17);
  const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlags = m => (m >> 17) & 15;

  // ---------- Zobrist (dos claves de 32 bits) ----------
  let seed = 1234567;
  const rnd32 = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const Z1 = new Int32Array(16 * 128), Z2 = new Int32Array(16 * 128);
  for (let i = 0; i < Z1.length; i++) { Z1[i] = rnd32(); Z2[i] = rnd32(); }
  const ZS1 = rnd32(), ZS2 = rnd32();
  const ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(128), ZE2 = new Int32Array(128);
  for (let i = 0; i < 16; i++) { ZC1[i] = rnd32(); ZC2[i] = rnd32(); }
  for (let i = 0; i < 128; i++) { ZE1[i] = rnd32(); ZE2[i] = rnd32(); }

  // ---------- Evaluación: tablas (vista de las blancas, fila 8 arriba) ----------
  const VAL_MG = [0, 100, 320, 330, 500, 900, 0], VAL_EG = [0, 120, 300, 320, 520, 950, 0];
  const PST = {
    1: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    2: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    3: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    4: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    5: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    6: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
    7: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
    8: [0,0,0,0,0,0,0,0, 80,80,80,80,80,80,80,80, 50,50,50,50,50,50,50,50, 30,30,30,30,30,30,30,30, 15,15,15,15,15,15,15,15, 5,5,5,5,5,5,5,5, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]
  };
  // índice en tabla (0..63, fila 8 arriba) para una casilla 0x88 vista por "color"
  const pidx = (s, black) => { const f = s & 7, r = s >> 4; return black ? r * 8 + f : (7 - r) * 8 + f; };
  const PHASE = [0, 0, 1, 1, 2, 4, 0];

  function Engine() {
    this.b = new Int8Array(128); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
    this.k = [0, 0]; this.h1 = 0; this.h2 = 0; this.stack = []; this.hist = [];
    this.tt = new Map(); this.killers = []; this.history = new Int32Array(128 * 128); this.nodes = 0; this.stop = false;
  }
  const E = Engine.prototype;

  E.load = function (fen) {
    const [pl, side, cast, ep, half, full] = fen.trim().split(/\s+/);
    this.b.fill(0);
    const rows = pl.split('/');
    for (let r = 0; r < 8; r++) { let f = 0; for (const ch of rows[r]) { if (/\d/.test(ch)) { f += +ch; continue; } const lo = ch.toLowerCase(); const p = FEN_PIECE[lo] | (ch === lo ? BLACK : 0); const s = sq(f, 7 - r); this.b[s] = p; if ((p & 7) === K) this.k[p & BLACK ? 1 : 0] = s; f++; } }
    this.side = side === 'b' ? 1 : 0;
    this.castle = (cast || '-').split('').reduce((a, c) => a | ({ K: 1, Q: 2, k: 4, q: 8 }[c] || 0), 0);
    this.ep = ep && ep !== '-' ? nameSq(ep) : -1;
    this.half = +half || 0; this.full = +full || 1;
    this.stack = []; this.hist = []; this.rehash();
  };
  E.rehash = function () {
    let h1 = 0, h2 = 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p) { h1 ^= Z1[p * 128 + s]; h2 ^= Z2[p * 128 + s]; } }
    if (this.side) { h1 ^= ZS1; h2 ^= ZS2; }
    h1 ^= ZC1[this.castle]; h2 ^= ZC2[this.castle];
    if (this.ep >= 0) { h1 ^= ZE1[this.ep]; h2 ^= ZE2[this.ep]; }
    this.h1 = h1; this.h2 = h2;
  };
  E.fen = function () {
    const rows = [];
    for (let r = 7; r >= 0; r--) { let row = '', e = 0; for (let f = 0; f < 8; f++) { const p = this.b[sq(f, r)]; if (!p) { e++; continue; } if (e) { row += e; e = 0; } const c = PIECE_CHAR[p & 7]; row += p & BLACK ? c : c.toUpperCase(); } rows.push(row + (e || '')); }
    let c = ''; if (this.castle & 1) c += 'K'; if (this.castle & 2) c += 'Q'; if (this.castle & 4) c += 'k'; if (this.castle & 8) c += 'q';
    return `${rows.join('/')} ${this.side ? 'b' : 'w'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
  };

  E.attacked = function (s, byBlack) {
    const b = this.b, c = byBlack ? BLACK : 0, pd = byBlack ? 16 : -16;
    let t = s + pd - 1; if (!(t & 0x88) && b[t] === (P | c)) return true;
    t = s + pd + 1; if (!(t & 0x88) && b[t] === (P | c)) return true;
    for (const d of ND) { t = s + d; if (!(t & 0x88) && b[t] === (N | c)) return true; }
    for (const d of KD) { t = s + d; if (!(t & 0x88) && b[t] === (K | c)) return true; }
    for (const d of BD) { t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (B | c) || p === (Q | c)) return true; break; } t += d; } }
    for (const d of RD) { t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (R | c) || p === (Q | c)) return true; break; } t += d; } }
    return false;
  };
  E.inCheck = function () { return this.attacked(this.k[this.side], !this.side); };

  // Genera jugadas pseudo-legales (capturesOnly: solo capturas y coronaciones)
  E.gen = function (out, capturesOnly) {
    const b = this.b, us = this.side ? BLACK : 0, them = us ^ BLACK;
    for (let f = 0; f < 128; f++) {
      if (f & 0x88) { f += 7; continue; }
      const p = b[f]; if (!p || (p & BLACK) !== us) continue;
      const t = p & 7;
      if (t === P) {
        const d = us ? -16 : 16, startR = us ? 6 : 1, lastR = us ? 0 : 7, one = f + d;
        if (!(one & 0x88) && !b[one]) {
          if ((one >> 4) === lastR) { for (const pr of [Q, R, B, N]) out.push(mv(f, one, pr, 0)); }
          else if (!capturesOnly) { out.push(mv(f, one, 0, 0)); const two = one + d; if ((f >> 4) === startR && !b[two]) out.push(mv(f, two, 0, FLAG_DOUBLE)); }
        }
        for (const cd of [d - 1, d + 1]) {
          const x = f + cd; if (x & 0x88) continue;
          if (b[x] && (b[x] & BLACK) === them) { if ((x >> 4) === lastR) { for (const pr of [Q, R, B, N]) out.push(mv(f, x, pr, FLAG_CAP)); } else out.push(mv(f, x, 0, FLAG_CAP)); }
          else if (x === this.ep) out.push(mv(f, x, 0, FLAG_CAP | FLAG_EP));
        }
        continue;
      }
      const dirs = t === N ? ND : t === B ? BD : t === R ? RD : KD, slide = t === B || t === R || t === Q;
      for (const d of dirs) {
        let x = f + d;
        while (!(x & 0x88)) {
          const q = b[x];
          if (q) { if ((q & BLACK) === them) out.push(mv(f, x, 0, FLAG_CAP)); break; }
          if (!capturesOnly) out.push(mv(f, x, 0, 0));
          if (!slide) break; x += d;
        }
      }
      if (t === K && !capturesOnly) {
        if (us === 0 && f === 4) {
          if ((this.castle & 1) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, true) && !this.attacked(5, true) && !this.attacked(6, true)) out.push(mv(4, 6, 0, FLAG_CASTLE));
          if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, true) && !this.attacked(3, true) && !this.attacked(2, true)) out.push(mv(4, 2, 0, FLAG_CASTLE));
        } else if (us === BLACK && f === 116) {
          if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (R | BLACK) && !this.attacked(116, false) && !this.attacked(117, false) && !this.attacked(118, false)) out.push(mv(116, 118, 0, FLAG_CASTLE));
          if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (R | BLACK) && !this.attacked(116, false) && !this.attacked(115, false) && !this.attacked(114, false)) out.push(mv(116, 114, 0, FLAG_CASTLE));
        }
      }
    }
    return out;
  };
  const CASTLE_MASK = new Int8Array(128).fill(15);
  CASTLE_MASK[4] = 15 & ~3; CASTLE_MASK[0] = 15 & ~2; CASTLE_MASK[7] = 15 & ~1;
  CASTLE_MASK[116] = 15 & ~12; CASTLE_MASK[112] = 15 & ~8; CASTLE_MASK[119] = 15 & ~4;

  E.put = function (s, p) { this.b[s] = p; this.h1 ^= Z1[p * 128 + s]; this.h2 ^= Z2[p * 128 + s]; };
  E.take = function (s) { const p = this.b[s]; this.b[s] = 0; this.h1 ^= Z1[p * 128 + s]; this.h2 ^= Z2[p * 128 + s]; return p; };

  // Hace la jugada; devuelve false (y la deshace) si deja al propio rey en jaque.
  E.make = function (m) {
    const f = mFrom(m), t = mTo(m), promo = mPromo(m), fl = mFlags(m), us = this.side;
    this.stack.push([m, 0, this.castle, this.ep, this.half, this.h1, this.h2]);
    this.hist.push(this.h1);
    const rec = this.stack[this.stack.length - 1];
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }
    this.h1 ^= ZC1[this.castle]; this.h2 ^= ZC2[this.castle];
    let p = this.take(f);
    if (fl & FLAG_EP) { rec[1] = this.take(t + (us ? 16 : -16)); }
    else if (this.b[t]) rec[1] = this.take(t);
    if (promo) p = promo | (us ? BLACK : 0);
    this.put(t, p);
    if ((p & 7) === K) this.k[us] = t;
    if (fl & FLAG_CASTLE) {
      if (t === 6) this.put(5, this.take(7)); else if (t === 2) this.put(3, this.take(0));
      else if (t === 118) this.put(117, this.take(119)); else if (t === 114) this.put(115, this.take(112));
    }
    this.castle &= CASTLE_MASK[f] & CASTLE_MASK[t];
    this.ep = fl & FLAG_DOUBLE ? f + (us ? -16 : 16) : -1;
    this.half = (p & 7) === P || rec[1] ? 0 : this.half + 1;
    if (us) this.full++;
    this.side ^= 1;
    this.h1 ^= ZS1; this.h2 ^= ZS2; this.h1 ^= ZC1[this.castle]; this.h2 ^= ZC2[this.castle];
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }
    if (this.attacked(this.k[us], !us)) { this.unmake(); return false; }
    return true;
  };
  E.unmake = function () {
    const [m, cap, castle, ep, half, h1, h2] = this.stack.pop(); this.hist.pop();
    this.side ^= 1; const us = this.side;
    const f = mFrom(m), t = mTo(m), promo = mPromo(m), fl = mFlags(m);
    let p = this.b[t]; this.b[t] = 0;
    if (promo) p = P | (us ? BLACK : 0);
    this.b[f] = p;
    if ((p & 7) === K) this.k[us] = f;
    if (fl & FLAG_EP) this.b[t + (us ? 16 : -16)] = cap; else if (cap) this.b[t] = cap;
    if (fl & FLAG_CASTLE) {
      if (t === 6) { this.b[7] = this.b[5]; this.b[5] = 0; } else if (t === 2) { this.b[0] = this.b[3]; this.b[3] = 0; }
      else if (t === 118) { this.b[119] = this.b[117]; this.b[117] = 0; } else if (t === 114) { this.b[112] = this.b[115]; this.b[115] = 0; }
    }
    if (us) this.full--;
    this.castle = castle; this.ep = ep; this.half = half; this.h1 = h1; this.h2 = h2;
  };
  E.makeNull = function () {
    this.stack.push([0, 0, this.castle, this.ep, this.half, this.h1, this.h2]); this.hist.push(this.h1);
    if (this.ep >= 0) { this.h1 ^= ZE1[this.ep]; this.h2 ^= ZE2[this.ep]; }
    this.ep = -1; this.side ^= 1; this.h1 ^= ZS1; this.h2 ^= ZS2;
  };
  E.unmakeNull = function () { const [, , castle, ep, half, h1, h2] = this.stack.pop(); this.hist.pop(); this.side ^= 1; this.castle = castle; this.ep = ep; this.half = half; this.h1 = h1; this.h2 = h2; };

  E.legalMoves = function () { const out = []; for (const m of this.gen([], false)) { if (this.make(m)) { out.push(m); this.unmake(); } } return out; };
  E.perft = function (d) { if (!d) return 1; let n = 0; for (const m of this.gen([], false)) { if (this.make(m)) { n += this.perft(d - 1); this.unmake(); } } return n; };

  // ---------- Evaluación ----------
  E.evaluate = function () {
    const b = this.b; let mg = 0, eg = 0, phase = 0, bishops = [0, 0];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s]; if (!p) continue;
      const t = p & 7, black = p & BLACK ? 1 : 0, sign = black ? -1 : 1, i = pidx(s, black);
      phase += PHASE[t];
      if (t === B) bishops[black]++;
      let pm, pe;
      if (t === K) { pm = PST[6][i]; pe = PST[7][i]; }
      else if (t === P) { pm = PST[1][i]; pe = PST[8][i]; }
      else { pm = pe = PST[t][i]; }
      mg += sign * (VAL_MG[t] + pm); eg += sign * (VAL_EG[t] + pe);
    }
    if (bishops[0] >= 2) { mg += 30; eg += 50; } if (bishops[1] >= 2) { mg -= 30; eg -= 50; }
    const ph = Math.min(24, phase);
    let score = (mg * ph + eg * (24 - ph)) / 24;
    // En finales ganados, acerca el rey al rey rival y empújalo al borde (ayuda a dar mate)
    if (ph <= 6 && Math.abs(score) > 300) {
      const [wk, bk] = this.k, lead = score > 0 ? 0 : 1, loser = lead ? wk : bk;
      const cd = Math.max(3 - (loser & 7), (loser & 7) - 4) + Math.max(3 - (loser >> 4), (loser >> 4) - 4);
      const kd = Math.abs((wk & 7) - (bk & 7)) + Math.abs((wk >> 4) - (bk >> 4));
      score += (lead ? -1 : 1) * (cd * 10 + (14 - kd) * 4);
    }
    return (this.side ? -score : score) + 10; // pequeño bono por tener el turno
  };

  // ---------- Búsqueda ----------
  const INF = 1000000, MATE = 100000;
  const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;
  E.isRepetition = function () {
    const h = this.h1, n = this.hist.length;
    for (let i = n - 2, k = 0; i >= 0 && k < this.half; i -= 2, k += 2) if (this.hist[i] === h) return true;
    return false;
  };
  E.score = function (m, ttMove, ply) {
    if (m === ttMove) return 10000000;
    const fl = mFlags(m);
    if (fl & FLAG_CAP) { const victim = fl & FLAG_EP ? P : this.b[mTo(m)] & 7; const att = this.b[mFrom(m)] & 7; return 1000000 + victim * 100 - att; }
    if (mPromo(m)) return 900000 + mPromo(m);
    const k = this.killers[ply]; if (k && (k[0] === m || k[1] === m)) return 800000;
    return this.history[mFrom(m) * 128 + mTo(m)];
  };
  E.quiesce = function (alpha, beta, ply) {
    this.nodes++;
    if ((this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
    const stand = this.evaluate();
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    const moves = this.gen([], true);
    const sc = moves.map(m => this.score(m, 0, ply)); const idx = moves.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
    for (const i of idx) {
      const m = moves[i];
      if (!this.make(m)) continue;
      const v = -this.quiesce(-beta, -alpha, ply + 1);
      this.unmake();
      if (this.stop) return 0;
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };
  E.search = function (depth, alpha, beta, ply, allowNull) {
    if (ply > 0 && (this.half >= 100 || this.isRepetition())) return 0;
    const inCheck = this.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);
    this.nodes++;
    if ((this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
    if (this.stop) return 0;
    const key = this.h1, e = this.tt.get(key);
    let ttMove = 0;
    if (e && e.h2 === this.h2) {
      ttMove = e.m;
      if (ply > 0 && e.d >= depth) {
        let v = e.v; if (v > MATE - 1000) v -= ply; else if (v < -MATE + 1000) v += ply;
        if (e.f === TT_EXACT) return v;
        if (e.f === TT_LOWER && v >= beta) return v;
        if (e.f === TT_UPPER && v <= alpha) return v;
      }
    }
    // Poda de jugada nula (no en jaque ni en finales sin piezas)
    if (allowNull && !inCheck && depth >= 3 && ply > 0) {
      let pieces = 0; const us = this.side ? BLACK : 0;
      for (let s = 0; s < 128 && pieces < 2; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p && (p & BLACK) === us && (p & 7) > P && (p & 7) < K) pieces++; }
      if (pieces >= 2) {
        this.makeNull();
        const v = -this.search(depth - 3, -beta, -beta + 1, ply + 1, false);
        this.unmakeNull();
        if (this.stop) return 0;
        if (v >= beta) return beta;
      }
    }
    const moves = this.gen([], false);
    const sc = moves.map(m => this.score(m, ttMove, ply)); const idx = moves.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
    let best = -INF, bestMove = 0, legal = 0; const a0 = alpha;
    for (const i of idx) {
      const m = moves[i];
      if (!this.make(m)) continue;
      legal++;
      let v;
      const quiet = !(mFlags(m) & FLAG_CAP) && !mPromo(m);
      if (legal === 1) v = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        // Reducción de jugadas tardías tranquilas
        let red = (legal > 4 && depth >= 3 && quiet && !inCheck) ? 1 : 0;
        v = -this.search(depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && (red || v < beta)) v = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      }
      this.unmake();
      if (this.stop) return 0;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) {
        alpha = v;
        if (alpha >= beta) {
          if (quiet) { const k = this.killers[ply] || (this.killers[ply] = [0, 0]); if (k[0] !== m) { k[1] = k[0]; k[0] = m; } this.history[mFrom(m) * 128 + mTo(m)] += depth * depth; }
          break;
        }
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    if (this.tt.size > 400000) this.tt.clear();
    let store = best; if (store > MATE - 1000) store += ply; else if (store < -MATE + 1000) store -= ply;
    this.tt.set(key, { h2: this.h2, d: depth, v: store, f: best <= a0 ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT, m: bestMove });
    return best;
  };

  // Elige una jugada. opts: { timeMs, maxDepth, noise (cp), randomness (0..1) }
  E.think = function (opts) {
    opts = Object.assign({ timeMs: 1000, maxDepth: 64, noise: 0 }, opts || {});
    this.nodes = 0; this.stop = false; this.deadline = Date.now() + opts.timeMs; this.killers = []; this.history.fill(0);
    const root = this.legalMoves();
    if (!root.length) return null;
    if (root.length === 1) return { move: root[0], score: 0, depth: 0 };
    let best = root[0], bestScore = -INF, depthDone = 0, scores = new Map();
    for (let d = 1; d <= opts.maxDepth; d++) {
      let alpha = -INF, curBest = 0, curScore = -INF; const cur = new Map();
      const ttm = best;
      const ordered = root.slice().sort((a, b) => (b === ttm) - (a === ttm) || (scores.get(b) ?? -INF) - (scores.get(a) ?? -INF));
      for (const m of ordered) {
        this.make(m);
        // con ruido se necesita el valor exacto de cada jugada; si no, ventana mínima
        let v;
        if (opts.noise > 0 || curBest === 0) v = -this.search(d - 1, -INF, opts.noise > 0 ? INF : -alpha, 1, true);
        else { v = -this.search(d - 1, -alpha - 1, -alpha, 1, true); if (v > alpha && !this.stop) v = -this.search(d - 1, -INF, -alpha, 1, true); }
        this.unmake();
        if (this.stop) break;
        cur.set(m, v);
        if (v > curScore) { curScore = v; curBest = m; }
        if (v > alpha) alpha = v;
      }
      if (this.stop && !curBest) break;
      if (this.stop) { if (curScore > bestScore) { best = curBest; bestScore = curScore; } break; }
      best = curBest; bestScore = curScore; depthDone = d; scores = cur;
      if (Math.abs(bestScore) > MATE - 1000) break;
      if (Date.now() > this.deadline - opts.timeMs * 0.45) break; // no empezar otra iteración que no terminará
    }
    // Niveles bajos: elige al azar entre jugadas cercanas a la mejor
    if (opts.noise > 0 && scores.size) {
      const cand = [...scores.entries()].filter(([, v]) => v >= bestScore - opts.noise && v > -MATE + 1000);
      if (cand.length) { const [m, v] = cand[Math.floor(Math.random() * cand.length)]; best = m; bestScore = v; }
    }
    return { move: best, score: bestScore, depth: depthDone, nodes: this.nodes };
  };
  E.uci = m => sqName(mFrom(m)) + sqName(mTo(m)) + (mPromo(m) ? 'nbrq'[mPromo(m) - 2] : '');

  // Niveles de juego
  const LEVELS = {
    1: { name: 'Principiante', timeMs: 150, maxDepth: 1, noise: 400 },
    2: { name: 'Fácil', timeMs: 300, maxDepth: 2, noise: 150 },
    3: { name: 'Intermedio', timeMs: 500, maxDepth: 3, noise: 40 },
    4: { name: 'Avanzado', timeMs: 1000, maxDepth: 64, noise: 0 },
    5: { name: 'Experto', timeMs: 2500, maxDepth: 64, noise: 0 },
    6: { name: 'Maestro', timeMs: 5000, maxDepth: 64, noise: 0 },
    an: { name: 'Análisis', timeMs: 400, maxDepth: 64, noise: 0 }
  };
  // fen: posición inicial de la partida; moves: jugadas (uci) desde ahí. Así el motor conoce
  // las posiciones anteriores y detecta repeticiones.
  function bestMove(fen, level, moves) {
    const e = new Engine(); e.load(fen);
    for (const u of (moves || [])) { const m = e.legalMoves().find(x => E.uci(x) === u); if (!m) break; e.make(m); }
    const L = LEVELS[level] || LEVELS[3];
    const r = e.think(L);
    return r ? { uci: E.uci(r.move), score: e.side ? -r.score : r.score, depth: r.depth, nodes: r.nodes } : null;
  }
  const api = { Engine, LEVELS, bestMove, sqName, nameSq };
  root.MauroMotor = api;
  if (typeof module !== 'undefined') module.exports = api;

  // Como Web Worker: recibe { id, fen, level } y responde { id, uci, score, depth }
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    root.onmessage = ev => { const { id, fen, level, moves } = ev.data; const r = bestMove(fen, level, moves); root.postMessage(Object.assign({ id }, r)); };
  }
})(typeof self !== 'undefined' ? self : globalThis);
