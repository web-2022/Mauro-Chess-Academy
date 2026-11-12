/* Academia Mauro · Cambia las piezas del tablero de los entrenamientos al juego
   de las lecciones (pieces-tema/) y les pone la clase de tamaño correcta. */
(function () {
  'use strict';
  const board = document.getElementById('board');
  if (!board) return;
  function convert() {
    board.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      const m = src.match(/(?:^|\/)pieces\/([wb][KQRBNP])\.png/);
      if (!m) return;
      img.setAttribute('src', 'pieces-tema/' + m[1] + '.png');
      img.classList.add('piece', 'piece-' + m[1]);
    });
  }
  convert();
  new MutationObserver(convert).observe(board, { childList: true, subtree: true });
})();
