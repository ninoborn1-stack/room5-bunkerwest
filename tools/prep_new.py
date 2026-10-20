"""Neue Bunker-Fotos (Okt. 2026, s/w HDR) + offizielle Wortmarke fuer die Website.
Quelle: originals/bunker-neu -> public/img/bunker/ und public/img/logo-wordmark.png
"""
import os, sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grade import light, smoothstep

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'originals', 'bunker-neu')
OUT = os.path.join(ROOT, 'public', 'img', 'bunker')
NAMES = {
    'Hero-bild.jpg': 'hero-main', '_MG_5926-Verbessert-RR-HDR.jpg': 'stage', '_MG_5931-Verbessert-RR-HDR.jpg': 'hall-long',
    '_MG_5936-Verbessert-RR-HDR.jpg': 'room-neon', '_MG_5943-Verbessert-RR-HDR 2.jpg': 'room-doors', '_MG_5950-Verbessert-RR-HDR.jpg': 'hatch',
    '_MG_5955-Verbessert-RR-HDR 2.jpg': 'hatch-2', '_MG_5960-Verbessert-RR-HDR.jpg': 'hall-spots', '_MG_5965-Verbessert-RR-HDR.jpg': 'hall-wall',
    '_MG_5968-Verbessert-RR-HDR.jpg': 'hall-depth', '_MG_5971-Verbessert-RR-HDR.jpg': 'bar-bw',
}

def tone(img, seed):
    """Sanft abdunkeln: Lichter halten, Mitten/Schatten tiefer, leichte Vignette + Korn."""
    a = np.asarray(img).astype(np.float32) / 255
    a = np.clip(a, 0, 1) ** 1.18 * 0.92
    return light(Image.fromarray((a * 255).astype(np.uint8)), seed)

for i, (src, name) in enumerate(NAMES.items()):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
    big = 2400 if name == 'hero-main' else 1600
    im.thumbnail((big, big), Image.LANCZOS)
    g = tone(im, i).filter(ImageFilter.UnsharpMask(radius=1.1, percent=30, threshold=2))
    g.save(os.path.join(OUT, f'{name}.jpg'), quality=82 if name != 'hero-main' else 80, optimize=True, progressive=True)
    t = g.copy(); t.thumbnail((720, 720), Image.LANCZOS)
    t.save(os.path.join(OUT, f'{name}-sm.jpg'), quality=78, optimize=True, progressive=True)
    print('ok', name, g.size)

# Wortmarke: zuschneiden, verkleinern, als Alpha-Maske (Farbe kommt per CSS)
logo = Image.open(os.path.join(SRC, 'Logo_neu.png')).convert('RGBA')
logo = logo.crop(logo.getbbox())
logo.thumbnail((1800, 1800), Image.LANCZOS)
alpha = logo.split()[3]
out = Image.new('RGBA', logo.size, (0, 0, 0, 0)); out.putalpha(alpha)
out.save(os.path.join(ROOT, 'public', 'img', 'logo-wordmark.png'), optimize=True)
print('logo', logo.size)
