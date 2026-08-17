"""Generate the small (160x160) variant of every ingredient illustration.

Full size (320x320) stays at public/img/<slug>.webp; the small variant goes
to public/img/sm/<slug>.webp and is used by avatars, chips and thumbnails
through srcset.
"""
import os
from PIL import Image

IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "img")
SM_DIR = os.path.join(IMG_DIR, "sm")
os.makedirs(SM_DIR, exist_ok=True)

count = 0
for name in sorted(os.listdir(IMG_DIR)):
    if not name.endswith(".webp"):
        continue
    im = Image.open(os.path.join(IMG_DIR, name)).convert("RGB")
    im.resize((160, 160), Image.LANCZOS).save(
        os.path.join(SM_DIR, name), "WEBP", quality=78
    )
    count += 1

print(f"wrote {count} small variants to public/img/sm/")
