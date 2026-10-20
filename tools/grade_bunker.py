"""Bunker-West-Fotos & Grundriss fuer die Startseite.
Quelle: alter Bunker-Prototyp (~/Documents/BunkerWest) -> public/img/bunker/
Aufruf: python3 tools/grade_bunker.py [Quellordner]
"""
import os, sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grade import grade, light

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Documents/BunkerWest")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img", "bunker")
os.makedirs(OUT, exist_ok=True)

PHOTOS = {
    "assets/img/hero.jpg": "hero", "assets/img/g1.jpg": "gallery-wide", "assets/img/g6.jpg": "gallery-walk",
    "assets/img/g2.jpg": "fashion", "assets/img/g3.jpg": "dinner-detail", "assets/img/g5.jpg": "dinner",
    "assets/img/gg5.jpg": "exhibition", "assets/img/gg2.jpg": "exhibition-2", "assets/img/gg3.jpg": "exhibition-3",
    "assets/rooms/foyer-1.jpg": "foyer", "assets/rooms/foyer-2.jpg": "bar",
    "assets/rooms/halle1-1.jpg": "halle1", "assets/rooms/halle1-2.jpg": "halle1-2", "assets/rooms/halle1-3.jpg": "halle1-hatch",
    "assets/rooms/halle12.jpg": "halle12", "assets/rooms/halle2-1.jpg": "halle2",
    "assets/rooms/history-1.jpg": "history", "assets/rooms/lager-1.jpg": "lager",
    "assets/rooms/studio6-1.jpg": "studio6", "assets/rooms/studio6-2.jpg": "studio6-2",
}
# schon dunkel/inszeniert -> nur leichte Vignette
SOFT = {"fashion", "dinner-detail"}

def mix(img, seed):
    g = np.asarray(grade(img, seed)).astype(np.float32)
    l = np.asarray(light(img, seed)).astype(np.float32) * 0.82
    return Image.fromarray(np.clip(g * 0.7 + l * 0.3, 0, 255).astype(np.uint8))

def plan(img):
    """Grundriss entfaerben (Farbe kommt spaeter ueber die Verfuegbarkeit) – hell und dunkel."""
    a = np.asarray(img.convert("L")).astype(np.float32) / 255
    a = np.clip((a - 0.12) / 0.8, 0, 1)                      # Papier ganz weiss, Linien satt
    light_v = 0.97 - (1 - a) * 0.80                          # helle Version
    dark_v = 0.07 + (1 - a) * 0.55                           # invertiert: Linien hell auf dunkel
    for name, v, tint in (("plan-light", light_v, (1.0, 0.995, 0.985)), ("plan-dark", dark_v, (0.93, 1.0, 0.95))):
        rgb = np.stack([v * tint[0], v * tint[1], v * tint[2]], -1)
        Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, f"{name}.jpg"), quality=86, optimize=True)

for i, (src, name) in enumerate(PHOTOS.items()):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    g = light(im, i) if name in SOFT else mix(im, i)
    g = g.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=2))
    g.save(os.path.join(OUT, f"{name}.jpg"), quality=82, optimize=True, progressive=True)
    t = g.copy(); t.thumbnail((720, 720), Image.LANCZOS)
    t.save(os.path.join(OUT, f"{name}-sm.jpg"), quality=78, optimize=True, progressive=True)
    print("ok", name)
plan(Image.open(os.path.join(SRC, "assets/plan.jpg")))
print("ok plan")
