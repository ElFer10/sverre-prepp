// Service worker del planner (plantilla: vite.config.ts pone la versión y la lista de ficheros al compilar).
// Guarda la app (no los datos) para que abra sin conexión. Solo mismo origen: Supabase nunca pasa por aquí.
const CACHE = "planner-__VERSION__";
const FILER = __FILER__;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILER)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("planner-") && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

// La app pide activar la versión nueva cuando el usuario pulsa "Uppdatera"
self.addEventListener("message", (e) => {
  if (e.data === "aktivera") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;
  // Rutas con hash: toda navegación es la misma página
  const nyckel = r.mode === "navigate" ? "/" : r;
  e.respondWith(
    caches.open(CACHE).then(async (c) => (await c.match(nyckel, { ignoreSearch: r.mode === "navigate" })) ?? fetch(r)),
  );
});
