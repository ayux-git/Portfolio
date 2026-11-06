# Builds the hero effects map from the avatar: R = red thread (glows, emits energy), G = phone screen (light source).
# Prints the emitter positions (0..1 of the image) to paste into content.ts -> hero.fx
import json
import numpy as np
from PIL import Image, ImageFilter
im = np.asarray(Image.open('assets-src/avatar-hero.png').convert('RGB'), np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
yy, xx = np.mgrid[0:H, 0:W]
x, y = xx / W, yy / H
def box(x0, y0, x1, y1): return (x >= x0) & (x <= x1) & (y >= y0) & (y <= y1)
thread_zone = box(0.70, 0.46, 0.90, 0.62) | box(0.28, 0.84, 0.46, 0.97)      # two wrists
red = (r > 90) & (r > g * 2.5) & (r > b * 2.2) & thread_zone   # thread is ~5x red vs green; skin ~1.9x
lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
phone = (lum > 0.8) & box(0.62, 0.36, 0.76, 0.56)
R = Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
G = Image.fromarray((phone * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(3))
fx = Image.merge('RGB', (R, G, Image.new('L', (W, H), 0))).resize((512, round(512 * H / W)), Image.LANCZOS)
fx.save('public/hero-fx.png', optimize=True)
def centroid(mask, zone):
    m = mask & zone
    return [round(float(x[m].mean()), 3), round(float(y[m].mean()), 3)] if m.any() else None
out = {
    'threads': [centroid(red, box(0.70, 0.46, 0.90, 0.62)), centroid(red, box(0.28, 0.84, 0.46, 0.97))],
    'phone': centroid(phone, box(0.62, 0.36, 0.76, 0.56)),
    'pixels': {'thread': int(red.sum()), 'phone': int(phone.sum())},
}
print(json.dumps(out))
