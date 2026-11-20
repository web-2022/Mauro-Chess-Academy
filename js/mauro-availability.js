(function () {
  'use strict';
  const available = new Set(["1.Monetizacion-MChess.html", "1.html", "18.html", "2.html", "3.html", "AperturaNL.html", "M3D-1-C.html", "M3D1.html", "M3D2.html", "M3D3-Ejecutivo.html", "M3D3.html", "Matematicas3ay.html", "PIAT1.html", "PIAT2.html", "PIAT3copy.html", "Sdo.html", "academia_mauro_con_progreso.html", "aperturaNimzoLarsen.html", "appScript_codigo.gs.html", "borrar2.html", "calentamiento-mental1 copy.html", "calentamiento-mental1.html", "capturasyreglasbasicas.html", "comojugarunapartida.html", "dondeEsta.html", "dondeEstaLaPieza.html", "elValorDeLasPiezas.html", "eltablero.html", "failure.html", "index copy.html", "index.html", "index2.html", "indexCloude.html", "inicio-anterior.html", "laspiezasdelajedrez.html", "mate.html", "mate3.html", "mateniveltactico.html", "matesbasicos.html", "menu.html", "miProgreso.html", "movimientodelalfil.html", "movimientodelareina.html", "movimientodelatorre.html", "movimientodelcaballo.html", "movimientodelpeon.html", "movimientodelrey.html", "pending.html", "peonalpaso.html", "practica.html", "practiquemoseltableroycoordenadas.html", "programa-anterior.html", "progreso-historico.html", "queeselajedrez.html", "ruta-chess.html", "ruta-chess2-cloude.html", "rutaCompleta.html", "success.html", "tableroDePractica.html", "tableroycoordenadas.html", "tema-1-que-es-el-ajedrez.html", "tema-2-el-tablero-de-ajedrez.html", "tema-3-filas.html", "tema-4-columnas.html", "tema-5-diagonales.html", "tema-6-coordenadas.html", "tema-7-flanco-de-rey-y-flanco-de-dama.html", "tema-8-el-centro-del-tablero.html", "tema-9-conoce-las-piezas.html", "tema-10-posicion-inicial.html", "tema-11-el-peon-movimiento.html", "tema-12-el-peon-captura.html", "tema-13-la-torre.html", "tema-14-el-alfil.html", "tema-15-la-dama.html", "tema-16-el-caballo.html", "tema-17-el-rey.html", "tema-18-piezas-propias-y-enemigas.html", "tema-19-casillas-ocupadas-y-libres.html", "tema-20-capturar-una-pieza.html", "tema-21-que-piezas-puedo-capturar.html", "testimonios.html"]);
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
