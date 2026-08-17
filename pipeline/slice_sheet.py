"""Slice a 3x3 generated illustration sheet into 9 ingredient webp tiles.

Usage: python3 slice_sheet.py <sheet.png> <slug1> ... <slug9>
Slugs are given row by row, left to right. Spaces in ingredient names -> dashes.
"""
import sys

from PIL import Image

OUT_DIR = __file__.rsplit("/", 2)[0] + "/public/img"
SIZE = 320

sheet_path, *slugs = sys.argv[1:]
assert len(slugs) == 9, f"expected 9 slugs, got {len(slugs)}"

im = Image.open(sheet_path).convert("RGB")
w, h = im.size
for i, s in enumerate(slugs):
    r, c = divmod(i, 3)
    tile = im.crop((c * w // 3, r * h // 3, (c + 1) * w // 3, (r + 1) * h // 3))
    tile = tile.resize((SIZE, SIZE), Image.LANCZOS)
    tile.save(f"{OUT_DIR}/{s}.webp", "WEBP", quality=82)
print("sliced:", " ".join(slugs))
