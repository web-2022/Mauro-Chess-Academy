/* Ajedrezia · Nombres de aperturas a partir de las jugadas (notación en español: R D T A C).
   side 'w' = sistema de las blancas, 'b' = defensa de las negras. Se elige la coincidencia más larga. */
(function (global) {
  'use strict';
  const L = [
    // Blancas: primera jugada
    ['e4', 'w', 'Apertura de peón de rey (1.e4)'],
    ['d4', 'w', 'Apertura de peón de dama (1.d4)'],
    ['c4', 'w', 'Apertura Inglesa'],
    ['Cf3', 'w', 'Apertura Réti'],
    ['f4', 'w', 'Apertura Bird'],
    ['b3', 'w', 'Apertura Larsen'],
    ['g3', 'w', 'Apertura con fianchetto de rey'],
    ['Cc3', 'w', 'Apertura Dunst'],
    ['b4', 'w', 'Apertura Polaca (Orangután)'],
    // Blancas: sistemas con 1.e4
    ['e4 e5 Cf3 Cc6 Ab5', 'w', 'Apertura Española (Ruy López)'],
    ['e4 e5 Cf3 Cc6 Ac4', 'w', 'Apertura Italiana'],
    ['e4 e5 Cf3 Cc6 d4', 'w', 'Apertura Escocesa'],
    ['e4 e5 Cf3 Cc6 Cc3', 'w', 'Apertura de los Cuatro Caballos'],
    ['e4 e5 Cf3 Cc6 c3', 'w', 'Apertura Ponziani'],
    ['e4 e5 Cf3', 'w', 'Apertura del caballo de rey'],
    ['e4 e5 f4', 'w', 'Gambito de Rey'],
    ['e4 e5 Ac4', 'w', 'Apertura de Alfil'],
    ['e4 e5 Cc3', 'w', 'Apertura Vienesa'],
    ['e4 e5 d4', 'w', 'Gambito del Centro'],
    ['e4 e5 Dh5', 'w', 'Ataque con salida temprana de la dama (Parham)'],
    ['e4 e5 Df3', 'w', 'Salida temprana de la dama'],
    ['e4 c5 Cf3 d6 d4', 'w', 'Siciliana Abierta'],
    ['e4 c5 Cf3 Cc6 d4', 'w', 'Siciliana Abierta'],
    ['e4 c5 Cf3 e6 d4', 'w', 'Siciliana Abierta'],
    ['e4 c5 c3', 'w', 'Siciliana Alapin'],
    ['e4 c5 Cc3', 'w', 'Siciliana Cerrada'],
    ['e4 c5 d4', 'w', 'Gambito Smith-Morra'],
    ['e4 e6 d4 d5 e5', 'w', 'Francesa: Variante del Avance'],
    ['e4 e6 d4 d5 exd5', 'w', 'Francesa: Variante del Cambio'],
    ['e4 e6 d4 d5 Cc3', 'w', 'Francesa: Variante Clásica (3.Cc3)'],
    ['e4 e6 d4 d5 Cd2', 'w', 'Francesa: Variante Tarrasch'],
    ['e4 c6 d4 d5 e5', 'w', 'Caro-Kann: Variante del Avance'],
    ['e4 c6 d4 d5 exd5', 'w', 'Caro-Kann: Variante del Cambio'],
    ['e4 c6 d4 d5 Cc3', 'w', 'Caro-Kann: Variante Clásica'],
    ['e4 d5 exd5', 'w', 'Escandinava: 2.exd5'],
    // Blancas: sistemas con 1.d4
    ['d4 d5 c4', 'w', 'Gambito de Dama'],
    ['d4 d5 Af4', 'w', 'Sistema Londres'],
    ['d4 Cf6 Af4', 'w', 'Sistema Londres'],
    ['d4 d5 Cf3 Cf6 Af4', 'w', 'Sistema Londres'],
    ['d4 d5 e3', 'w', 'Sistema Colle'],
    ['d4 d5 Ag5', 'w', 'Ataque Trompowsky / Levitsky'],
    ['d4 Cf6 Ag5', 'w', 'Ataque Trompowsky'],
    ['d4 Cf6 c4', 'w', 'Apertura de peón de dama con c4'],
    ['d4 d5 e4', 'w', 'Gambito Blackmar-Diemer'],
    // Negras: defensas a 1.e4
    ['e4 e5', 'b', 'Juego abierto (1...e5)'],
    ['e4 c5', 'b', 'Defensa Siciliana'],
    ['e4 e6', 'b', 'Defensa Francesa'],
    ['e4 c6', 'b', 'Defensa Caro-Kann'],
    ['e4 d5', 'b', 'Defensa Escandinava'],
    ['e4 Cf6', 'b', 'Defensa Alekhine'],
    ['e4 d6', 'b', 'Defensa Pirc'],
    ['e4 g6', 'b', 'Defensa Moderna'],
    ['e4 Cc6', 'b', 'Defensa Nimzowitsch'],
    ['e4 b6', 'b', 'Defensa Owen'],
    ['e4 a6', 'b', 'Defensa St. George'],
    ['e4 e5 Cf3 d6', 'b', 'Defensa Philidor'],
    ['e4 e5 Cf3 Cf6', 'b', 'Defensa Petrov (Rusa)'],
    ['e4 e5 Cf3 f6', 'b', 'Defensa Damiano'],
    ['e4 e5 Cf3 Cc6', 'b', 'Defensa con 2...Cc6'],
    ['e4 e5 Cf3 Cc6 Ab5 a6', 'b', 'Española: Defensa Morphy'],
    ['e4 e5 Cf3 Cc6 Ab5 Cf6', 'b', 'Española: Defensa Berlinesa'],
    ['e4 e5 Cf3 Cc6 Ab5 Ac5', 'b', 'Española: Defensa Clásica'],
    ['e4 e5 Cf3 Cc6 Ab5 f5', 'b', 'Española: Gambito Schliemann'],
    ['e4 e5 Cf3 Cc6 Ac4 Ac5', 'b', 'Giuoco Piano'],
    ['e4 e5 Cf3 Cc6 Ac4 Cf6', 'b', 'Defensa de los Dos Caballos'],
    ['e4 e5 Cf3 Cc6 Ac4 Ae7', 'b', 'Defensa Húngara'],
    ['e4 e5 f4 exf4', 'b', 'Gambito de Rey Aceptado'],
    ['e4 e5 f4 Ac5', 'b', 'Gambito de Rey Rehusado'],
    ['e4 e5 Dh5 Cc6', 'b', 'Defensa correcta contra la salida de la dama'],
    ['e4 c5 Cf3 d6 d4 cxd4 Cxd4 Cf6 Cc3 a6', 'b', 'Siciliana Najdorf'],
    ['e4 c5 Cf3 d6 d4 cxd4 Cxd4 Cf6 Cc3 g6', 'b', 'Siciliana Dragón'],
    ['e4 c5 Cf3 d6 d4 cxd4 Cxd4 Cf6 Cc3 Cc6', 'b', 'Siciliana Clásica'],
    ['e4 c5 Cf3 d6 d4 cxd4 Cxd4 Cf6 Cc3 e6', 'b', 'Siciliana Scheveningen'],
    ['e4 c5 Cf3 Cc6 d4 cxd4 Cxd4 Cf6 Cc3 e5', 'b', 'Siciliana Sveshnikov'],
    ['e4 c5 Cf3 e6', 'b', 'Siciliana con 2...e6'],
    ['e4 c5 Cf3 d6', 'b', 'Siciliana con 2...d6'],
    ['e4 c5 Cf3 Cc6', 'b', 'Siciliana con 2...Cc6'],
    ['e4 e6 d4 d5 Cc3 Ab4', 'b', 'Francesa: Variante Winawer'],
    ['e4 c6 d4 d5 Cc3 dxe4 Cxe4 Af5', 'b', 'Caro-Kann: Variante Clásica (4...Af5)'],
    ['e4 d5 exd5 Dxd5', 'b', 'Escandinava: 2...Dxd5'],
    ['e4 d5 exd5 Cf6', 'b', 'Escandinava moderna: 2...Cf6'],
    // Negras: defensas a 1.d4 y otras
    ['d4 d5', 'b', 'Juego cerrado (1...d5)'],
    ['d4 Cf6', 'b', 'Defensa India'],
    ['d4 f5', 'b', 'Defensa Holandesa'],
    ['d4 e6', 'b', 'Defensa con 1...e6'],
    ['d4 g6', 'b', 'Defensa Moderna'],
    ['d4 d6', 'b', 'Defensa con 1...d6'],
    ['d4 c5', 'b', 'Defensa Benoni antigua'],
    ['d4 d5 c4 e6', 'b', 'Gambito de Dama Rehusado'],
    ['d4 d5 c4 dxc4', 'b', 'Gambito de Dama Aceptado'],
    ['d4 d5 c4 c6', 'b', 'Defensa Eslava'],
    ['d4 d5 c4 e6 Cc3 c6', 'b', 'Defensa Semieslava'],
    ['d4 d5 c4 Cc6', 'b', 'Defensa Chigorin'],
    ['d4 d5 c4 e5', 'b', 'Contragambito Albin'],
    ['d4 Cf6 c4 g6', 'b', 'India de Rey / Grünfeld'],
    ['d4 Cf6 c4 g6 Cc3 d5', 'b', 'Defensa Grünfeld'],
    ['d4 Cf6 c4 g6 Cc3 Ag7 e4 d6', 'b', 'Defensa India de Rey'],
    ['d4 Cf6 c4 e6', 'b', 'Defensa con 2...e6'],
    ['d4 Cf6 c4 e6 Cc3 Ab4', 'b', 'Defensa Nimzoindia'],
    ['d4 Cf6 c4 e6 Cf3 b6', 'b', 'Defensa India de Dama'],
    ['d4 Cf6 c4 e6 Cf3 Ab4+', 'b', 'Defensa Bogoindia'],
    ['d4 Cf6 c4 e6 g3', 'b', 'Apertura Catalana'],
    ['d4 Cf6 c4 c5', 'b', 'Defensa Benoni'],
    ['d4 Cf6 c4 c5 d5 b5', 'b', 'Gambito Benko (Volga)'],
    ['d4 Cf6 c4 e5', 'b', 'Gambito Budapest'],
    ['c4 e5', 'b', 'Inglesa: Siciliana invertida (1...e5)'],
    ['c4 c5', 'b', 'Inglesa Simétrica'],
    ['c4 Cf6', 'b', 'Inglesa: 1...Cf6'],
    ['Cf3 d5', 'b', 'Réti: 1...d5'],
    ['Cf3 Cf6', 'b', 'Réti: 1...Cf6']
  ];
  const clean = s => s.replace(/[+#!?]/g, '');
  function detect(sans) {
    const seq = (sans || []).map(clean);
    let w = null, b = null;
    for (const [m, side, name] of L) {
      const ms = m.split(' ').map(clean);
      if (ms.length > seq.length) continue;
      if (!ms.every((x, i) => x === seq[i])) continue;
      if (side === 'w' && (!w || ms.length > w.len)) w = { name, len: ms.length };
      if (side === 'b' && (!b || ms.length > b.len)) b = { name, len: ms.length };
    }
    if (!b && seq.length >= 2) b = { name: `Respuesta 1...${seq[1]}`, len: 2 };
    if (!w && seq.length >= 1) w = { name: `Apertura 1.${seq[0]}`, len: 1 };
    return { w: w && w.name, b: b && b.name };
  }
  global.MauroAperturas = { detect };
})(typeof window !== 'undefined' ? window : globalThis);
