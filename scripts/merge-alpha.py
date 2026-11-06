# Merges the matting model's alpha (great hair) with a depth-based mask (complete body) into one matte.
# Usage: python scripts/merge-alpha.py  (reads assets-src/hero-alpha.png + public/hero-depth.png)
import numpy as np
from PIL import Image, ImageFilter
a = Image.open('assets-src/hero-alpha.png').convert('L')
W, H = a.size
d = Image.open('public/hero-depth.png').convert('L').resize((W, H), Image.BILINEAR)
A = np.asarray(a, np.float32) / 255
D = np.asarray(d, np.float32) / 255
dm = np.clip((D - 0.30) / 0.12, 0, 1)            # near = figure (and railing)
yy, xx = np.mgrid[0:H, 0:W]
x, y = xx / W, yy / H
dm[(x > 0.86) & (y > 0.55)] = 0                    # right-hand railing
dm[(x < 0.16) & (y > 0.83)] = 0                    # railing post + bar at the bottom-left
m = np.maximum(A, dm)
img = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
img.save('assets-src/hero-alpha-merged.png')
print('merged matte saved', img.size)
