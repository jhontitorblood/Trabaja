#!/usr/bin/env python3
"""Lee assets/img/bosses/ y genera js/bosses.js con la lista de jefes con imagen.

Ejecútalo tras añadir o quitar imágenes:  python3 tools/gen-bosses.py
(El flujo de GitHub lo ejecuta solo antes de compilar.)
"""
import json
import pathlib
import re
from urllib.parse import quote

root = pathlib.Path(__file__).resolve().parent.parent
folder = root / 'assets/img/bosses'
EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}


def nice_name(stem: str) -> str:
    s = re.sub(r'^[\d\s._-]+', '', stem)          # quita numeración inicial: "01-", "2_"
    s = re.sub(r'[_]+', ' ', s).strip(' -.')
    s = re.sub(r'\s{2,}', ' ', s)
    if not s:
        s = stem
    return s[0].upper() + s[1:]


items = []
if folder.is_dir():
    for p in sorted(folder.iterdir(), key=lambda x: x.name.lower()):
        if p.is_file() and p.suffix.lower() in EXT:
            items.append({'name': nice_name(p.stem), 'image': 'assets/img/bosses/' + quote(p.name)})

out = ("'use strict';\n/* Generado por tools/gen-bosses.py — no editar a mano. */\n"
       "const BOSS_IMAGES = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n")
(root / 'js/bosses.js').write_text(out, encoding='utf-8')
print('js/bosses.js ·', len(items), 'jefe(s) con imagen')
