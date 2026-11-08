(function () {
  'use strict';
  const available = new Set(["1.Monetizacion-MChess.html", "1.html", "18.html", "2.html", "3.html", "AperturaNL.html", "M3D-1-C.html", "M3D1.html", "M3D2.html", "M3D3-Ejecutivo.html", "M3D3.html", "Matematicas3ay.html", "PIAT1.html", "PIAT2.html", "PIAT3copy.html", "Sdo.html", "academia_mauro_con_progreso.html", "aperturaNimzoLarsen.html", "appScript_codigo.gs.html", "borrar2.html", "calentamiento-mental1 copy.html", "calentamiento-mental1.html", "capturasyreglasbasicas.html", "comojugarunapartida.html", "dondeEsta.html", "dondeEstaLaPieza.html", "elValorDeLasPiezas.html", "eltablero.html", "failure.html", "index copy.html", "index.html", "index2.html", "indexCloude.html", "laspiezasdelajedrez.html", "mate.html", "mate3.html", "mateniveltactico.html", "matesbasicos.html", "menu.html", "miProgreso.html", "movimientodelalfil.html", "movimientodelareina.html", "movimientodelatorre.html", "movimientodelcaballo.html", "movimientodelpeon.html", "movimientodelrey.html", "pending.html", "peonalpaso.html", "practiquemoseltableroycoordenadas.html", "queeselajedrez.html", "ruta-chess.html", "ruta-chess2-cloude.html", "rutaCompleta.html", "success.html", "tableroDePractica.html", "tableroycoordenadas.html", "tema-1-que-es-el-ajedrez.html", "tema-2-el-tablero-de-ajedrez.html", "tema-3-filas.html", "tema-4-columnas.html", "testimonios.html"]);
  document.addEventListener('click', function (event) {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
    const filename = decodeURIComponent(url.pathname.split('/').pop());
    if (available.has(filename)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    location.href = 'ruta-chess.html#proximamente';
  }, true);
})();
