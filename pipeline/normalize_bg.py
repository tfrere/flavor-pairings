"""Normalize the paper background tone across all ingredient tiles.

Each generated sheet has a slightly different cream tint. For every tile
we sample the median edge color (assumed to be plain background) and apply
a per-channel multiplicative gain so that it maps onto a single shared
target cream. The gain is applied to the whole image, which preserves
linework and shading while unifying the paper tone.

Usage: python3 normalize_bg.py
"""
import os
from statistics import median

import numpy as np
from PIL import Image

IMG_DIR = __file__.rsplit("/", 2)[0] + "/public/img"
TARGET = (247, 241, 222)  # shared cream tone


def edge_color(im: Image.Image) -> tuple[int, int, int]:
    px = im.load()
    w, h = im.size
    samples = []
    for x in range(0, w, 5):
        samples += [px[x, 1], px[x, h - 2]]
    for y in range(0, h, 5):
        samples += [px[1, y], px[w - 2, y]]
    return tuple(int(median(c[i] for c in samples)) for i in range(3))


files = sorted(f for f in os.listdir(IMG_DIR) if f.endswith(".webp"))
for f in files:
    path = f"{IMG_DIR}/{f}"
    im = Image.open(path).convert("RGB")
    bg = edge_color(im)
    gain = np.array([TARGET[i] / max(bg[i], 1) for i in range(3)])
    arr = np.asarray(im, dtype=np.float32) * gain
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    out.save(path, "WEBP", quality=82)
print(f"normalized {len(files)} tiles to {TARGET}")
