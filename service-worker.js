const CACHE_NAME = "ajedrez-mauro-v217";

/*
  ACADEMIA MAURO
  Service Worker común para los 293 temas.

  IMPORTANTE:
  Cada vez que hagamos un cambio estructural importante:
  v72 -> v73 -> v74...
*/

// ======================================================
// 1. NÚCLEO DE LA APLICACIÓN
// ======================================================

const CORE_ASSETS = [
  "./index.html",
  "./js/mauro-responsive.css?v=192",
  "./js/mauro-exercise.css?v=192",
  "./js/mauro-practice.js?v=193",
  "./practica.html",
  "./jugar.html",
  "./js/mauro-motor.js?v=2",
  "./js/mauro-jugar.js?v=2",
  "./mates.html",
  "./js/mauro-mates.js?v=1",
  "./js/mauro-mates-data.js?v=1",
  "./js/mauro-ejercicio-ancho.css?v=1",
  "./js/mauro-tema.css?v=1",
  "./mate-en-1.html",
  "./pieza-indefensa.html",
  "./movimientos-legales.html",
  "./tactica-del-dia.html",
  "./js/mauro-chess-rules.js?v=1",
  "./js/mauro-drill-data.js?v=1",
  "./js/mauro-drills.js?v=1",
  "./js/mauro-drills.css?v=1",
  "./js/mauro-header.css?v=193",
  "./js/mauro-header.js?v=192",
  "./assets/chess-studio.webp",
  "./js/mauro-welcome.css?v=192",
  "./js/mauro-welcome.js?v=192",
  "./miProgreso.html",
  "./js/mauro-ui.css?v=192",
  "./js/mauro-ui.js?v=192",
  "./js/mauro-catalog.js?v=188",
  "./js/mauro-learning.js?v=188",
  "./js/mauro-route-render.js?v=188",
  "./manifest.json",

  // Motor común de Academia Mauro
  "./js/mauro-config.js",
  "./js/mauro-core.js",
  "./js/mauro-analytics.js",
  "./js/mauro-profile.js",
  "./js/mauro-pwa.js",
  "./js/mauro-voice.js?v=192",
  "./js/mauro-voice.css?v=187",

  // Iconos PWA
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


// ======================================================
// 2. INSTALACIÓN
// ======================================================

self.addEventListener("install", event => {

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
  );

  // Activa inmediatamente la nueva versión.
  self.skipWaiting();
});


// ======================================================
// 3. ACTIVACIÓN
// ======================================================

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys

          // Elimina versiones antiguas.
          .filter(key => key !== CACHE_NAME)

          .map(key => caches.delete(key))

      )

    )

  );

  // La nueva versión toma control de las páginas abiertas.
  self.clients.claim();
});


// ======================================================
// 4. FETCH
// Cache First + actualización dinámica
// ======================================================

self.addEventListener("fetch", event => {

  const request = event.request;

  /*
    Solo manejamos GET.

    Esto es especialmente importante ahora que
    Academia Mauro enviará información de progreso
    y analítica mediante POST.
  */

  if (request.method !== "GET") {
    return;
  }


  event.respondWith(

    caches.match(request).then(cachedResponse => {

      // ------------------------------------------------
      // Si existe en caché, lo usamos inmediatamente.
      // ------------------------------------------------

      if (cachedResponse) {
        return cachedResponse;
      }


      // ------------------------------------------------
      // Si no existe, buscamos en Internet.
      // ------------------------------------------------

      return fetch(request)

        .then(response => {

          /*
            No guardar respuestas inválidas
            ni respuestas de otros servidores.
          */

          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }


          // Guardamos una copia.
          const responseClone = response.clone();


          caches
            .open(CACHE_NAME)
            .then(cache => {

              cache.put(
                request,
                responseClone
              );

            });


          return response;

        })


        // ------------------------------------------------
        // Sin conexión
        // ------------------------------------------------

        .catch(() => {

          /*
            Si el usuario intenta navegar y no existe
            conexión, volvemos al inicio de Academia Mauro.
          */

          if (request.mode === "navigate") {

            return caches.match("./index.html");

          }

        });

    })

  );

});