"""Slice a 2x2 generated illustration sheet into up to 4 ingredient webp tiles.

Usage: python3 slice_sheet4.py <sheet.png> <slug1> ... <slug4>
Slugs are given row by row, left to right (top-left, top-right,
bottom-left, bottom-right). Pass "-" to skip a cell.

Each cell is inset slightly to drop the grid lines, then padded
top/bottom with the sampled background color to a square (keeps the
whole illustration with extra margin) and resized to 320x320.
"""
import sys
from statistics import median

from PIL import Image

OUT_DIR = __file__.rsplit("/", 2)[0] + "/public/img"
SIZE = 320

sheet_path, *slugs = sys.argv[1:]
assert 1 <= len(slugs) <= 4, f"expected 1-4 slugs, got {len(slugs)}"

im = Image.open(sheet_path).convert("RGB")
w, h = im.size
cw, ch = w // 2, h // 2
inset = max(4, cw // 40)  # ~2.5% to cut off grid lines and bleed


def edge_color(tile: Image.Image) -> tuple[int, int, int]:
    """Median color of the tile's outer 3px ring (the cream background)."""
    px = tile.load()
    tw, th = tile.size
    samples = []
    for x in range(0, tw, 7):
        samples += [px[x, 1], px[x, th - 2]]
    for y in range(0, th, 7):
        samples += [px[1, y], px[tw - 2, y]]
    return tuple(int(median(c[i] for c in samples)) for i in range(3))


for i, s in enumerate(slugs):
    if s == "-":
        continue
    r, c = divmod(i, 2)
    tile = im.crop(
        (c * cw + inset, r * ch + inset, (c + 1) * cw - inset, (r + 1) * ch - inset)
    )
    tw, th = tile.size
    side = max(tw, th)
    sq = Image.new("RGB", (side, side), edge_color(tile))
    sq.paste(tile, ((side - tw) // 2, (side - th) // 2))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    sq.save(f"{OUT_DIR}/{s}.webp", "WEBP", quality=82)

print("sliced:", " ".join(s for s in slugs if s != "-"))
