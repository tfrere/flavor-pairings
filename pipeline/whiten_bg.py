"""Remap the cream illustration background to pure white.

Samples each image's outer edge (uniform background) and applies a
per-channel multiplicative gain so that color becomes white. Combined
with CSS mix-blend-mode: multiply, white backgrounds disappear on any
surface (white cards stay light, the cream page tints them back).

Regenerates the 160px small variants from the whitened 320px images.
"""
import glob
import os
from statistics import median

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "public", "img")
SM_DIR = os.path.join(IMG_DIR, "sm")


def edge_color(im: Image.Image) -> tuple[int, int, int]:
    px = im.load()
    w, h = im.size
    samples = []
    for x in range(0, w, 7):
        samples += [px[x, 1], px[x, h - 2]]
    for y in range(0, h, 7):
        samples += [px[1, y], px[w - 2, y]]
    return tuple(int(median(c[i] for c in samples)) for i in range(3))


count = 0
for path in sorted(glob.glob(os.path.join(IMG_DIR, "*.webp"))):
    im = Image.open(path).convert("RGB")
    edge = edge_color(im)
    gain = tuple(255 / max(edge[i], 1) for i in range(3))
    im = Image.merge(
        "RGB",
        [
            ch.point(lambda v, g=gain[i]: min(255, round(v * g)))
            for i, ch in enumerate(im.split())
        ],
    )
    im.save(path, "WEBP", quality=82)
    sm = im.resize((160, 160), Image.LANCZOS)
    sm.save(os.path.join(SM_DIR, os.path.basename(path)), "WEBP", quality=80)
    count += 1

print(f"whitened {count} images (+ sm variants)")
