// Builds web-ready images from assets-src/. Re-run any time you replace a source image: npm run assets
import sharp from 'sharp';
import fs from 'node:fs';

const AV = 'assets-src/avatar-source.png';   // AI avatar (hero wallpaper)

// 1) Hero image. Crop the bottom a little (mid-thigh) for composition; keeps the frame free of the corner mark.
const av = await sharp(AV).metadata();
const cropH = Math.min(av.height, Math.round(av.width * 1.585));
const hero = sharp(AV).extract({ left: 0, top: 0, width: av.width, height: cropH });
await hero.clone().png({ compressionLevel: 9 }).toFile('assets-src/avatar-hero.png'); // master for the depth model (not deployed)
await hero.clone().webp({ quality: 84 }).toFile('public/avatar.webp');
await hero.clone().resize(900).webp({ quality: 80 }).toFile('public/avatar-mobile.webp');
// Poster used before WebGL boots (and for reduced motion) – same frame as the wallpaper.
if (!fs.existsSync('public/hero-poster.webp')) await hero.clone().resize(1200).webp({ quality: 78 }).toFile('public/hero-poster.webp'); // replaced by `npm run poster`

// 2) About portrait (Fig. 02): the second avatar. Crop keeps head, phone and the red thread, and leaves out
//    the generator's corner mark. Re-measure the crop if you swap the picture.
const PA = 'assets-src/portrait-avatar-source.png';
const pa = await sharp(PA).metadata();
const pbox = { left: 0, top: 0, width: Math.round(pa.width * 0.898), height: Math.round(pa.height * 0.954) };
await sharp(PA).extract(pbox).resize(1100).webp({ quality: 82 }).toFile('public/portrait.webp');
await sharp(PA).extract(pbox).resize(640).webp({ quality: 80 }).toFile('public/portrait-640.webp');

// 2b) Hero figure: the avatar cut out of its background (alpha from `npm run cutout` + scripts/merge-alpha.py).
if (fs.existsSync('assets-src/hero-alpha-merged.png')) {
  const W = av.width, H = cropH;
  const rgb = await sharp('assets-src/avatar-hero.png').resize(W, H).removeAlpha().raw().toBuffer();
  const alpha = await sharp('assets-src/hero-alpha-merged.png').resize(W, H).greyscale().raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rgb[i * 3];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  const fig = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
  await fig.clone().webp({ quality: 86, alphaQuality: 90 }).toFile('public/hero-figure.webp');
  await fig.clone().resize(900).webp({ quality: 82, alphaQuality: 90 }).toFile('public/hero-figure-mobile.webp');
}

// 3) Open Graph image 1200x630: wallpaper crop + name.
// background: the captured scene still if it exists (npm run poster), otherwise a crop of the avatar
const ogBg = fs.existsSync('public/hero-poster.webp')
  ? await sharp('public/hero-poster.webp').resize(1200, 630, { fit: 'cover', position: 'right' }).toBuffer()
  : await sharp(AV).extract({ left: 0, top: Math.round(av.height * 0.08), width: av.width, height: Math.round(av.width * 0.525) })
      .resize(1200, 630).modulate({ brightness: 0.62 }).toBuffer();
const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#07080B" stop-opacity=".92"/><stop offset=".65" stop-color="#07080B" stop-opacity=".35"/><stop offset="1" stop-color="#07080B" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="84" cy="96" r="6" fill="#F2463A"/>
  <text x="102" y="102" font-family="Consolas, monospace" font-size="20" fill="#C9CED8" letter-spacing="3">B.TECH CSE (AI/ML) · LPU</text>
  <text x="76" y="420" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="150" fill="#ECEEF2" letter-spacing="-4">AYUSH RAJ</text>
  <text x="80" y="490" font-family="Georgia, serif" font-style="italic" font-size="44" fill="#ECEEF2">Building with code and AI.</text>
</svg>`;
await sharp(ogBg).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 84 }).toFile('public/og-image.jpg');

for (const f of ['hero-figure.webp', 'hero-figure-mobile.webp', 'avatar.webp', 'avatar-mobile.webp', 'hero-poster.webp', 'portrait.webp', 'og-image.jpg'])
  console.log(f.padEnd(20), (fs.statSync('public/' + f).size / 1024).toFixed(0) + ' KB');

// 4) Project previews: every PNG in assets-src/<project>/ becomes public/projects/<project>-<n>.webp
for (const dir of fs.readdirSync('assets-src', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const files = fs.readdirSync(`assets-src/${dir.name}`).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  fs.mkdirSync('public/projects', { recursive: true });
  let i = 1;
  for (const f of files) {
    const out = `public/projects/${dir.name}-${i++}.webp`;
    await sharp(`assets-src/${dir.name}/${f}`).resize(1280).webp({ quality: 78 }).toFile(out);
    await sharp(`assets-src/${dir.name}/${f}`).resize(760).webp({ quality: 76 }).toFile(out.replace('.webp', '-760.webp'));
    console.log(out.padEnd(36), `<- ${f}`);
  }
}
