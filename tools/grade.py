"""Dunkles Color-Grading fuer die Studio-Fotos.
Originale bleiben unveraendert in ./originals -> Ausgabe nach public/img/.
Aufruf: python3 tools/grade.py
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "img")
os.makedirs(OUT, exist_ok=True)

NAMES = {
    "1580": "lounge-sofa", "1581": "lounge-wide", "1582": "lounge-lamp",
    "1583": "control-corner", "1584": "lounge-guitar", "1585": "mic-closeup",
    "1586": "vocal-booth", "1587": "buddha-monitor", "1588": "diffusor",
    "1589": "bass-wall", "1590": "room-full", "1591": "room-depth",
    "1592": "shelf-figure", "1593": "shelf-records", "1594": "shelf-detail",
    "1595": "desk-chair", "1596": "desk-wide",
}

# Bereits bearbeitete Fotos: nur Größe, leichte Vignette & Korn (kein dunkles Grading)
LIGHT = {"6107": "team-bw", "6108": "team-color", "6485": "room-lounge"}

def light(img, seed=0):
    a = np.asarray(img).astype(np.float32) / 255.0
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 * 0.9 + ((yy - h / 2) / (h / 2)) ** 2 * 0.7)
    a = a * (1 - 0.35 * smoothstep(0.5, 1.4, d))[..., None]
    a = a + np.random.default_rng(seed).normal(0, 0.008, (h, w)).astype(np.float32)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def grade(img, seed=0):
    W3 = np.array([0.2126, 0.7152, 0.0722], np.float32)
    a = np.asarray(img).astype(np.float32) / 255.0
    # 1) Weissabgleich: nur den gruen-gelben Stich der Wand dezent zuruecknehmen
    lum = a @ W3
    mid = (lum > 0.25) & (lum < 0.8)
    means = a[mid].mean(axis=0)
    gain = means.mean() / means
    gain = 1 + (gain - 1) * 0.35
    a = np.clip(a * gain, 0, 1)

    # 2) Lokaler Kontrast ("Clarity") auf Basis einer stark weichgezeichneten Kopie
    base = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))).astype(np.float32) / 255
    a = np.clip(a + (a - base) * 0.22, 0, 1)

    # 3) Belichtung runter (linear)
    lin = a ** 2.2
    lum_l = lin @ W3
    mx = lin.max(axis=2); mn = lin.min(axis=2)
    sat = (mx - mn) / (mx + 1e-4)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    warmness = np.clip((r - b) / (mx + 1e-4) * 1.6, 0, 1)
    # neutrale, helle Flaechen (Wand / Decke) staerker abdunkeln als warme Lichtquellen
    flat = (1 - np.clip(sat * 2.2, 0, 1))
    expo = 0.46 * (1 - 0.45 * flat * smoothstep(0.05, 0.4, lum_l) * (1 - smoothstep(0.55, 0.85, lum_l))) * (1 + 0.35 * warmness)
    lin = lin * expo[..., None]
    a = np.clip(lin, 0, 1) ** (1 / 2.2)
    lum = a @ W3

    # 4) Kontrastkurve: tiefe Schatten, weich abrollende Lichter
    def curve(x):
        x = np.clip(x, 0, 1)
        s = x * x * (3 - 2 * x)
        y = 0.7 * s + 0.3 * x
        y = y ** 1.12
        y = 1 - (1 - y) ** 1.08
        return 0.012 + y * (0.975 - 0.012)
    new_lum = curve(lum)
    ratio = (new_lum + 1e-4) / (lum + 1e-4)
    a = np.clip(a * ratio[..., None], 0, 1)
    lum = new_lum

    # 5) Saettigung: kuehles/neutrales zurueck, Holz & Lampen warm lassen
    gray = lum[..., None]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    warm = np.clip((r - b) * 4.0, 0, 1)
    satf = 0.7 + 0.42 * warm
    a = gray + (a - gray) * satf[..., None]

    # 6) Split-Toning: Schatten kuehl-petrol, Lichter bernstein
    sh = (1 - smoothstep(0.0, 0.4, lum))[..., None]
    hi = smoothstep(0.4, 1.0, lum)[..., None]
    a = a + sh * np.array([-0.010, 0.006, 0.020], np.float32)
    a = a + hi * np.array([0.055, 0.020, -0.05], np.float32)

    # 7) Bloom um Lichtquellen
    hl = np.clip((lum - 0.62) / 0.38, 0, 1)
    hl_img = Image.fromarray((hl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(40))
    bloom = np.asarray(hl_img).astype(np.float32)[..., None] / 255
    a = a + bloom * np.array([0.30, 0.17, 0.06], np.float32) * 0.55

    # 8) Vignette
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xx - w / 2) / (w / 2); dy = (yy - h / 2) / (h / 2)
    d = np.sqrt(dx * dx * 0.9 + dy * dy * 0.7)
    vig = 1 - 0.7 * smoothstep(0.3, 1.4, d)
    a = a * vig[..., None]

    # 9) Feines Filmkorn
    rng = np.random.default_rng(seed)
    grain = rng.normal(0, 0.011, (h, w)).astype(np.float32)
    a = a + grain[..., None] * (0.5 + 0.5 * (1 - lum[..., None]))

    a = np.clip(a, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8))

def main(only=None):
    files = sorted(glob.glob(os.path.join(ROOT, "originals", "IMG_*.JPG")))
    for i, f in enumerate(files):
        key = os.path.basename(f)[4:8]
        if only and key not in only:
            continue
        if key in LIGHT and f.upper().endswith(".HEIC"):
            continue
        name = LIGHT.get(key) or NAMES.get(key, key)
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im.thumbnail((1600, 1600), Image.LANCZOS)
        g = light(im, seed=i) if key in LIGHT else grade(im, seed=i)
        g = g.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
        g.save(os.path.join(OUT, f"{name}.jpg"), quality=84, optimize=True, progressive=True)
        t = g.copy(); t.thumbnail((720, 720), Image.LANCZOS)
        t.save(os.path.join(OUT, f"{name}-sm.jpg"), quality=80, optimize=True, progressive=True)
        print("ok", name)

if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
