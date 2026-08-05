/* ============================================================
   UTAZÁSI — service-worker.js (Next.js build)
   - /_next/static/**: hash-elt, tehát biztonságosan cache-first
   - minden más same-origin GET: network-first, cache fallback offline-hoz
   - külső élő API-hívások (időjárás, tenger, árfolyam): érintetlenül hagyva —
     azokat a kliens (useLiveData / lib/weather.ts) localStorage-ben cache-eli
   ============================================================ */

const CACHE_NAME = "utazasi-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // külső API-k: SW nem nyúl hozzájuk

  const isImmutableAsset = url.pathname.startsWith("/_next/static/");

  if (isImmutableAsset) {
    // cache-first — a fájlnevek hash-eltek, sosem változnak tartalom szinten
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // network-first, cache fallback — oldalak, manifest, ikonok, képek
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
