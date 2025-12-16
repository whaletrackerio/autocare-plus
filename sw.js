/* sw.js — AutoCare+ */
const CACHE_VERSION = "autocare-cache-v2025-12-16";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
];

// Installe
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
});

// Active
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_VERSION ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Fetch : network-first pour HTML (évite l’ancien code)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // seulement notre domaine
  if(url.origin !== location.origin) return;

  // HTML = network-first
  if(req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      }catch(e){
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // autres assets = cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if(cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
