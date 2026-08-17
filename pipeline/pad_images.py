"""Normalize every ingredient illustration to a 320x320 square.

The source illustrations are square. Earlier pipeline runs padded them to
2:3 portrait (320x480) then 3:2 landscape (480x320) with an edge-matched
background; this script crops the centered original square back out of
either shape, so re-running is lossless.
"""
import os
from PIL import Image

IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "img")
SQ = 320

count = 0
for name in sorted(os.listdir(IMG_DIR)):
    if not name.endswith(".webp"):
        continue
    path = os.path.join(IMG_DIR, name)
    im = Image.open(path).convert("RGB")
    if im.size == (SQ, SQ):
        continue  # already square
    if im.size == (SQ * 3 // 2, SQ):  # padded landscape: crop center square
        im = im.crop(((im.width - SQ) // 2, 0, (im.width + SQ) // 2, SQ))
    elif im.size == (SQ, SQ * 3 // 2):  # padded portrait: crop center square
        im = im.crop((0, (im.height - SQ) // 2, SQ, (im.height + SQ) // 2))
    else:
        im = im.resize((SQ, SQ), Image.LANCZOS)
    im.save(path, "WEBP", quality=82)
    count += 1

print(f"squared {count} images to {SQ}x{SQ}")
