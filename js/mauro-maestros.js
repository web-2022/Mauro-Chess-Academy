/* Ajedrezia · Partidas de campeones del mundo y grandes maestros, agrupadas por apertura.
   Todas las partidas se verificaron jugada por jugada con el motor de reglas (js/mauro-chess-rules.js). */
(function (global) {
  'use strict';
  const G = [
    { id: 'opera', white: 'Paul Morphy', black: 'Duque de Brunswick y Conde Isouard', event: 'París (Ópera)', year: 1858, result: '1-0',
      family: 'Aperturas abiertas (1.e4 e5)', opening: 'Defensa Philidor', variant: '3.d4 Ag4',
      idea: 'Desarrollo rápido, sacrificios para abrir líneas y mate con la torre: la partida más famosa para aprender a desarrollar.',
      pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#' },
    { id: 'inmortal', white: 'Adolf Anderssen', black: 'Lionel Kieseritzky', event: 'Londres', year: 1851, result: '1-0',
      family: 'Aperturas abiertas (1.e4 e5)', opening: 'Gambito de Rey', variant: 'Gambito del Alfil (3.Ac4)',
      idea: '«La Inmortal»: las blancas entregan las dos torres, un alfil y la dama, y dan mate con tres piezas menores.',
      pgn: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#' },
    { id: 'siempreviva', white: 'Adolf Anderssen', black: 'Jean Dufresne', event: 'Berlín', year: 1852, result: '1-0',
      family: 'Aperturas abiertas (1.e4 e5)', opening: 'Apertura Italiana', variant: 'Gambito Evans (4.b4)',
      idea: '«La Siempreviva»: gambito para ganar tiempos, ataque contra el rey en el centro y combinación final con mate de alfil.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#' },
    { id: 'steinitz-bardeleben', white: 'Wilhelm Steinitz (1.er campeón del mundo)', black: 'Curt von Bardeleben', event: 'Hastings', year: 1895, result: '1-0',
      family: 'Aperturas abiertas (1.e4 e5)', opening: 'Apertura Italiana', variant: 'Giuoco Piano (4.c3)',
      idea: 'El primer campeón del mundo castiga al rey que no enroca: la torre en séptima da jaques sin parar.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Bg5 Be7 11. Bxd5 Bxd5 12. Nxd5 Qxd5 13. Bxe7 Nxe7 14. Re1 f6 15. Qe2 Qd7 16. Rac1 c6 17. d5 cxd5 18. Nd4 Kf7 19. Ne6 Rhc8 20. Qg4 g6 21. Ng5+ Ke8 22. Rxe7+ Kf8 23. Rf7+ Kg8 24. Rg7+ Kh8 25. Rxh7+' },
    { id: 'reti-tartakower', white: 'Richard Réti', black: 'Savielly Tartakower', event: 'Viena', year: 1910, result: '1-0',
      family: 'Aperturas semiabiertas (1.e4 sin 1...e5)', opening: 'Defensa Caro-Kann', variant: 'Variante Clásica (3.Cc3 dxe4)',
      idea: 'Un sacrificio de dama y un mate con dos alfiles en solo 11 jugadas: castigo al rey que se queda en el centro.',
      pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Qd3 e5 6. dxe5 Qa5+ 7. Bd2 Qxe5 8. O-O-O Nxe4 9. Qd8+ Kxd8 10. Bg5+ Kc7 11. Bd8#' },
    { id: 'kasparov-topalov', white: 'Garry Kasparov (13.er campeón del mundo)', black: 'Veselin Topalov', event: 'Wijk aan Zee', year: 1999, result: '1-0',
      family: 'Aperturas semiabiertas (1.e4 sin 1...e5)', opening: 'Defensa Pirc', variant: 'Ataque Austriaco con Ae3 y Dd2',
      idea: '«La Inmortal de Kasparov»: sacrificio de torre en d4 y persecución del rey negro por todo el tablero.',
      pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7' },
    { id: 'fischer-spassky-6', white: 'Bobby Fischer (11.º campeón del mundo)', black: 'Boris Spassky (10.º campeón del mundo)', event: 'Match por el título, Reikiavik (partida 6)', year: 1972, result: '1-0',
      family: 'Aperturas cerradas (1.d4 d5 y 1.c4)', opening: 'Gambito de Dama Rehusado', variant: 'Variante Tartakower (7...b6)',
      idea: 'Fischer abrió 1.c4 por primera vez en un match y ganó con juego posicional puro: control del centro, peones de e y f que avanzan y ataque al rey al final. Spassky se unió al aplauso del público.',
      pgn: '1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4' },
    { id: 'rotlewi-rubinstein', white: 'Georg Rotlewi', black: 'Akiba Rubinstein', event: 'Łódź', year: 1907, result: '0-1',
      family: 'Aperturas cerradas (1.d4 d5 y 1.c4)', opening: 'Gambito de Dama', variant: 'Defensa Tarrasch simétrica',
      idea: '«La Inmortal de Rubinstein»: los alfiles negros apuntan al rey blanco y llega una lluvia de sacrificios.',
      pgn: '1. d4 d5 2. Nf3 e6 3. e3 c5 4. c4 Nc6 5. Nc3 Nf6 6. dxc5 Bxc5 7. a3 a6 8. b4 Bd6 9. Bb2 O-O 10. Qd2 Qe7 11. Bd3 dxc4 12. Bxc4 b5 13. Bd3 Rd8 14. Qe2 Bb7 15. O-O Ne5 16. Nxe5 Bxe5 17. f4 Bc7 18. e4 Rac8 19. e5 Bb6+ 20. Kh1 Ng4 21. Be4 Qh4 22. g3 Rxc3 23. gxh4 Rd2 24. Qxd2 Bxe4+ 25. Qg2 Rh3' },
    { id: 'byrne-fischer', white: 'Donald Byrne', black: 'Bobby Fischer (11.º campeón del mundo)', event: 'Nueva York («La partida del siglo»)', year: 1956, result: '0-1',
      family: 'Defensas indias (1.d4 Cf6)', opening: 'Defensa Grünfeld', variant: 'Variante con 5.Af4',
      idea: 'Fischer, con 13 años, entrega su dama con 17...Ae6!! y sus piezas menores dan mate.',
      pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#' },
    { id: 'lasker-thomas', white: 'Edward Lasker', black: 'George Thomas', event: 'Londres', year: 1912, result: '1-0',
      family: 'Otras defensas a 1.d4', opening: 'Defensa Holandesa', variant: '2.Cf3 con Ag5',
      idea: 'Sacrificio de dama en h7 y una cacería del rey negro desde g8 hasta g1, con mate de enroque… ¡del rey blanco!',
      pgn: '1. d4 e6 2. Nf3 f5 3. Nc3 Nf6 4. Bg5 Be7 5. Bxf6 Bxf6 6. e4 fxe4 7. Nxe4 b6 8. Ne5 O-O 9. Bd3 Bb7 10. Qh5 Qe7 11. Qxh7+ Kxh7 12. Nxf6+ Kh6 13. Neg4+ Kg5 14. h4+ Kf4 15. g3+ Kf3 16. Be2+ Kg2 17. Rh2+ Kg1 18. Kd2#' }
  ];
  global.MauroMaestros = G;
})(typeof window !== 'undefined' ? window : globalThis);
