/* Trabaja — service worker. Versión de caché generada del contenido: 02e7c4f7 (tools/gen-sw.py) */
const CACHE = 'trabaja-02e7c4f7';
const CORE = ['./', './index.html', './style.css', './manifest.json', './js/data.js', './js/engine.js', './js/fx.js', './js/icons.js', './js/main.js', './js/native.js', './js/state.js', './js/ui.js', './js/views.js', './assets/fonts/archivo-black.woff', './assets/fonts/inter-400.woff', './assets/fonts/inter-500.woff', './assets/fonts/inter-600.woff', './assets/fonts/inter-700.woff', './assets/img/guardians/00-sistema.webp', './assets/img/guardians/01-killo.webp', './assets/img/guardians/02-minos.webp', './assets/img/guardians/04-mephisto.webp', './assets/img/guardians/06-virgilio.webp', './assets/img/guardians/07-mapache.webp', './assets/img/guardians/08-gatino.webp', './assets/img/guardians/09-maribel.webp', './assets/img/guardians/10-fausto.webp', './assets/img/guardians/11-joserblood-pan.webp', './assets/img/guardians/12-chanco-espectral.webp', './assets/img/guardians/13-joserblood-inframundo.webp', './assets/img/icon-192.png', './assets/img/icon-512.png', './assets/img/icon-maskable-512.png'];
const OPTIONAL = ['./assets/audio/ambient.mp3'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    try { await Promise.all(OPTIONAL.map(u => c.add(u))); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('trabaja-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const n = await fetch(r);
      if (n.ok) c.put(r, n.clone());
      return n;
    } catch (_) {
      return c.match('./index.html');
    }
  })());
});
