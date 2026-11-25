#!/usr/bin/env python3
"""Lee assets/img/bosses/ y genera js/bosses.js con la lista de jefes con imagen.

Cada imagen es un jefe. El nombre del archivo es el nombre del jefe.
Opcional: un archivo de texto con el mismo nombre (Hidra.png -> Hidra.txt) con líneas
    vida: 800
    descripcion: Por cada tarea pendiente le crece otra cabeza.
    xp: 160
    monedas: 200
Lo que no pongas se rellena solo (cada jefe recibe una vida y una descripción distintas).

Ejecútalo tras añadir o quitar imágenes:  python3 tools/gen-bosses.py
(El flujo de GitHub lo ejecuta solo antes de compilar.)
"""
import hashlib
import json
import pathlib
import re
from urllib.parse import quote

root = pathlib.Path(__file__).resolve().parent.parent
folder = root / 'assets/img/bosses'
EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}

DESCS = [
    'Susurra «mañana» y se alimenta de tu tiempo libre.',
    'Pesa una tonelada, pero cae con pequeños golpes constantes.',
    'Por cada tarea pendiente le crece una cabeza nueva.',
    'Te llama justo cuando empiezas algo importante.',
    'Se debilita cuando descansas bien y avanzas a tu ritmo.',
    'Odia los hábitos pequeños: cada día que cumples le duele.',
    'Surge de las excusas acumuladas; la constancia lo desarma.',
    'Vigila desde las sombras y ataca cuando bajas la guardia.',
    'Cada misión que completas le arranca una escama.',
    'Guarda un botín enorme para quien aguante toda la semana.',
    'Se hace fuerte con el desorden y se encoge con la disciplina.',
    'Un antiguo guardián que solo respeta a los constantes.',
]


def nice_name(stem: str) -> str:
    s = re.sub(r'^[\d\s._-]+', '', stem)          # quita numeración inicial: "01-", "2_"
    s = re.sub(r'[_]+', ' ', s).strip(' -.')
    s = re.sub(r'\s{2,}', ' ', s)
    if not s:
        s = stem
    return s[0].upper() + s[1:]


def sidecar(p: pathlib.Path) -> dict:
    t = p.with_suffix('.txt')
    out = {}
    if not t.is_file():
        return out
    for line in t.read_text(encoding='utf-8-sig', errors='replace').splitlines():
        m = re.match(r'\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s*[:=]\s*(.+?)\s*$', line)
        if not m:
            continue
        k, v = m.group(1).lower(), m.group(2)
        k = {'vida': 'hp', 'hp': 'hp', 'descripcion': 'desc', 'descripción': 'desc', 'desc': 'desc',
             'xp': 'xp', 'monedas': 'coins', 'coins': 'coins'}.get(k)
        if not k:
            continue
        if k == 'desc':
            out[k] = v[:160]
        else:
            n = re.sub(r'[^\d]', '', v)
            if n:
                out[k] = int(n)
    return out


files = []
if folder.is_dir():
    files = [p for p in sorted(folder.iterdir(), key=lambda x: x.name.lower())
             if p.is_file() and p.suffix.lower() in EXT]

items, used_hp = [], set()
for i, p in enumerate(files):
    side = sidecar(p)
    name = nice_name(p.stem)
    hp = side.get('hp')
    if not hp:
        h = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
        hp = 500 + 100 * (h % 11)               # 500..1500, distinta para cada jefe
        while hp in used_hp:
            hp += 50
    hp = max(50, min(hp, 99999))
    used_hp.add(hp)
    items.append({
        'name': name,
        'image': 'assets/img/bosses/' + quote(p.name),
        'desc': side.get('desc') or DESCS[i % len(DESCS)],
        'hp': hp,
        'xp': side.get('xp') or int(round(hp / 5 / 10.0)) * 10,
        'coins': side.get('coins') or int(round(hp / 4 / 10.0)) * 10,
    })

out = ("'use strict';\n/* Generado por tools/gen-bosses.py — no editar a mano. */\n"
       "const BOSS_IMAGES = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n")
(root / 'js/bosses.js').write_text(out, encoding='utf-8')
print('js/bosses.js ·', len(items), 'jefe(s) con imagen')
