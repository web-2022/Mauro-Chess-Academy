/* Academia Mauro · Usa en los ejercicios de Práctica las mismas piezas del
   Tablero libre (carpeta pieces-tema/). Solo cambia las imágenes de las piezas:
   el tablero, los colores y la lógica de cada ejercicio no se tocan. */
(function () {
  'use strict';
  const board = document.getElementById('board');
  if (!board) return;
  // Las piezas negras traen márgenes distintos: se ajusta su tamaño como en el Tablero libre.
  const style = document.createElement('style');
  style.textContent = 'body.mauro-exercise .sq img.mp-libre{width:82%;height:82%;object-fit:contain}' +
    'body.mauro-exercise .sq img.mp-bR{width:81%;height:81%}body.mauro-exercise .sq img.mp-bN{width:67%;height:67%}' +
    'body.mauro-exercise .sq img.mp-bB{width:73%;height:73%}body.mauro-exercise .sq img.mp-bQ{width:75%;height:75%}' +
    'body.mauro-exercise .sq img.mp-bK{width:68%;height:68%}';
  document.head.append(style);
  function convert() {
    board.querySelectorAll('img').forEach(img => {
      const m = (img.getAttribute('src') || '').match(/(?:^|\/)pieces\/([wb][KQRBNP])\.png/);
      if (!m) return;
      img.setAttribute('src', 'pieces-tema/' + m[1] + '.png');
      img.classList.add('mp-libre', 'mp-' + m[1]);
    });
  }
  convert();
  new MutationObserver(convert).observe(board, { childList: true, subtree: true });
})();
