/* Academia Mauro · Banco de posiciones para los entrenamientos.
   Todas las posiciones se verifican con js/mauro-chess-rules.js (juegan blancas). */
(function (global) {
  'use strict';

  // Mate en 1: se acepta cualquier jugada que dé mate.
  const MATE_IN_ONE = [
    { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'Los peones del rey negro le quitan las casillas de escape. Una torre en la última fila es mate.' },
    { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'El rey está encerrado por sus propios peones: la torre llega a la octava fila.' },
    { fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', theme: 'Dama y rey', idea: 'Tu rey controla a7 y b7. La dama da jaque desde lejos por la octava fila.' },
    { fen: '7k/8/6K1/8/8/8/Q7/8 w - - 0 1', theme: 'Dama y rey', idea: 'El rey blanco quita g7 y h7. La dama cierra la octava fila.' },
    { fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', theme: 'Mate de la coz', idea: 'El rey negro está rodeado por sus propias piezas: el caballo salta y da mate.' },
    { fen: 'r5rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', theme: 'Mate de la coz', idea: 'Ninguna pieza negra puede capturar al caballo y el rey no tiene casillas libres.' },
    { fen: 'k7/pp6/8/8/8/8/8/1K4R1 w - - 0 1', theme: 'Mate del pasillo', idea: 'Los peones de a7 y b7 encierran a su rey. La torre en la octava fila es mate.' },
    { fen: '6k1/5p1p/6pQ/8/8/2B5/8/6K1 w - - 0 1', theme: 'Dama apoyada por el alfil', idea: 'La dama se pega al rey y el alfil de la gran diagonal la defiende.' },
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', theme: 'Mate del pastor', idea: 'f7 solo está defendida por el rey. Dama y alfil atacan juntos esa casilla.' },
    { fen: 'rnbqkbnr/ppppp2p/5p2/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', theme: 'Mate del loco', idea: 'Las negras abrieron la diagonal e8–h5. La dama entra con mate.' },
    { fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1', theme: 'Torre y rey', idea: 'Los reyes están enfrentados: tu rey quita d7, e7 y f7. La torre da mate en la octava fila.' },
    { fen: '3k4/3P4/3K4/8/8/8/8/7R w - - 0 1', theme: 'Torre y rey', idea: 'El peón de d7 está defendido por tu rey. La torre cierra la octava fila.' },
    { fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', theme: 'Torre y rey', idea: 'Oposición: tu rey quita la séptima fila y la torre da mate en la octava.' },
    { fen: '6k1/6p1/6Kp/8/8/8/8/R7 w - - 0 1', theme: 'Torre y rey', idea: 'Tu rey controla f7 y h7. La torre baja a la octava fila.' },
    { fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', theme: 'Mate árabe', idea: 'Torre y caballo trabajan juntos: el caballo defiende la torre y vigila g8.' },
    { fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'Captura la torre de d8: después el rey negro no tiene escapatoria.' },
    { fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'Cambia de torres llegando a la octava fila con jaque.' },
    { fen: '3rkr2/8/8/8/8/8/Q7/6K1 w - - 0 1', theme: 'Mate de las charreteras', idea: 'Las torres negras encierran a su propio rey como si fueran hombreras.' },
    { fen: '6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'La dama también puede dar el mate del pasillo.' },
    { fen: '6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1', theme: 'Mate del pasillo', idea: 'La dama llega a la octava fila por la columna b.' },
    { fen: '5rk1/5pp1/7Q/6N1/8/8/8/6K1 w - - 0 1', theme: 'Dama apoyada por el caballo', idea: 'El caballo de g5 defiende la casilla h7.' },
    { fen: 'k7/7R/8/8/8/8/8/6R1 w - - 0 1', theme: 'Mate de la escalera', idea: 'Una torre corta la séptima fila; la otra da mate en la octava.' },
    { fen: '4kb2/5ppp/8/6B1/8/7B/8/3R2K1 w - - 0 1', theme: 'Mate de la ópera', idea: 'Hay dos mates: Td8# (el alfil de g5 defiende la torre y el de h3 vigila d7) y Ad7# (el alfil de g5 controla d8 y e7).' },
    { fen: '7k/6pp/8/8/8/8/1B6/6QK w - - 0 1', theme: 'Dama y alfil en la gran diagonal', idea: 'El alfil de b2 apoya a la dama en g7.' },
    { fen: '5k2/5P2/5K2/8/8/8/8/1Q6 w - - 0 1', theme: 'Dama y peón', idea: 'Tu rey defiende el peón; busca un jaque al que el rey no pueda escapar.' },
    { fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', theme: 'Dama y rey', idea: 'Hay varias formas de dar mate: la dama protegida por el rey es imparable.' }
  ];

  // Táctica del día: mates y golpes dobles. "solutions" en notación de casillas (origen+destino).
  const DAILY = [
    { fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', kind: 'win', solutions: ['b5c7'], theme: 'Doble ataque de caballo',
      prompt: 'Las blancas ganan material. ¿Cuál es la jugada?', idea: 'Cc7+ ataca al mismo tiempo al rey y a la dama. El rey debe moverse y el caballo captura la dama.' },
    { fen: '4k3/8/8/3N4/6q1/8/8/4K3 w - - 0 1', kind: 'win', solutions: ['d5f6'], theme: 'Doble ataque de caballo',
      prompt: 'Busca un jaque que ataque también a la dama.', idea: 'Cf6+ da jaque y ataca a la dama de g4. Después de mover el rey, Cxg4.' },
    { fen: '4r1k1/8/8/7N/8/8/8/6K1 w - - 0 1', kind: 'win', solutions: ['h5f6'], theme: 'Doble ataque de caballo',
      prompt: 'Gana la torre negra con un jaque.', idea: 'Cf6+ ataca al rey de g8 y a la torre de e8 a la vez.' },
    { fen: 'r3k3/8/8/8/7Q/8/8/4K3 w - - 0 1', kind: 'win', solutions: ['h4e4'], theme: 'Doble ataque de dama',
      prompt: 'La dama puede atacar dos cosas a la vez. ¿Cómo ganas la torre?', idea: 'Un jaque de dama que también ataque la torre de a8 (De4+) gana la torre. Cuidado: Da4+ no sirve porque la torre de a8 captura la dama.' },
    { fen: '4q3/8/8/4k3/8/8/8/K6R w - - 0 1', kind: 'win', solutions: ['h1e1'], theme: 'Ataque en rayos X (enfilada)',
      prompt: 'El rey y la dama negros están en la misma columna. ¿Cómo lo aprovechas?', idea: 'Te1+ da jaque por la columna e. Cuando el rey se aparta, la torre captura la dama de e8.' },
    { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', kind: 'mate', theme: 'Mate del pasillo', prompt: 'Mate en 1.', idea: 'La torre en la octava fila es mate porque los peones encierran al rey.' },
    { fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', kind: 'mate', theme: 'Mate de la coz', prompt: 'Mate en 1 con el caballo.', idea: 'Cf7#: el rey está rodeado por sus propias piezas.' },
    { fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', kind: 'mate', theme: 'Mate árabe', prompt: 'Mate en 1.', idea: 'Th7#: el caballo defiende la torre y controla g8.' },
    { fen: '3rkr2/8/8/8/8/8/Q7/6K1 w - - 0 1', kind: 'mate', theme: 'Mate de las charreteras', prompt: 'Mate en 1.', idea: 'De6#: las torres negras bloquean a su propio rey.' },
    { fen: '4kb2/5ppp/8/6B1/8/7B/8/3R2K1 w - - 0 1', kind: 'mate', theme: 'Mate de la ópera', prompt: 'Mate en 1.', idea: 'Hay dos mates: Td8# (el alfil de g5 defiende la torre y el de h3 vigila d7) y Ad7# (el alfil de g5 controla d8 y e7).' },
    { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', kind: 'mate', theme: 'Mate del pastor', prompt: 'Mate en 1.', idea: 'Dxf7#: la casilla f7 solo la defendía el rey.' },
    { fen: '7k/6pp/8/8/8/8/1B6/6QK w - - 0 1', kind: 'mate', theme: 'Gran diagonal', prompt: 'Mate en 1.', idea: 'Dxg7#: el alfil de b2 defiende a la dama.' }
  ];
  global.MauroDrillData = { MATE_IN_ONE, DAILY };
})(typeof window !== 'undefined' ? window : globalThis);
