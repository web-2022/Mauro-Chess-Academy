const CACHE_NAME = "ajedrez-mauro-v182";

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
  "./manifest.json",

  // Motor común de Academia Mauro
  "./js/mauro-config.js",
  "./js/mauro-core.js",
  "./js/mauro-analytics.js",
  "./js/mauro-profile.js",
  "./js/mauro-pwa.js",

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