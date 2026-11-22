#!/usr/bin/env python3
"""Genera sw.js con la lista de archivos y una versión de caché basada en su contenido.

Ejecútalo después de cambiar index.html, style.css o js/*.js:  python3 tools/gen-sw.py
(El flujo de GitHub lo ejecuta solo antes de compilar.)
"""
import hashlib
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
js = sorted((root / 'js').glob('*.js'))
core = ['./', './index.html', './style.css', './manifest.json']
core += ['./js/' + p.name for p in js]
core += ['./' + p.relative_to(root).as_posix() for p in sorted((root / 'assets/fonts').glob('*'))]
core += ['./' + p.relative_to(root).as_posix() for p in sorted((root / 'assets/img').rglob('*')) if p.is_file()]

h = hashlib.sha1()
for f in ['index.html', 'style.css', 'manifest.json'] + ['js/' + p.name for p in js]:
    h.update((root / f).read_bytes())
ver = h.hexdigest()[:8]

sw = f"""/* Trabaja — service worker. Versión de caché generada del contenido: {ver} (tools/gen-sw.py) */
const CACHE = 'trabaja-{ver}';
const CORE = {core!r};
const OPTIONAL = ['./assets/audio/ambient.mp3'];

self.addEventListener('install', e => {{
  e.waitUntil((async () => {{
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    try {{ await Promise.all(OPTIONAL.map(u => c.add(u))); }} catch (_) {{}}
    await self.skipWaiting();
  }})());
}});

self.addEventListener('activate', e => {{
  e.waitUntil((async () => {{
    for (const k of await caches.keys()) if (k.startsWith('trabaja-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  }})());
}});

self.addEventListener('fetch', e => {{
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {{
    const c = await caches.open(CACHE);
    const hit = await c.match(r, {{ ignoreSearch: true }});
    if (hit) return hit;
    try {{
      const n = await fetch(r);
      if (n.ok) c.put(r, n.clone());
      return n;
    }} catch (_) {{
      return c.match('./index.html');
    }}
  }})());
}});
"""
(root / 'sw.js').write_text(sw)
print('sw.js generado · versión', ver, '·', len(core), 'archivos')
