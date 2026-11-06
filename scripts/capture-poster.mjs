// Captures stills of the live hero scene (UI hidden) as the poster: used while WebGL boots,
// for prefers-reduced-motion and when WebGL is unavailable.
// Usage: npm run dev   (in another terminal), then: npm run poster
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });

async function capture(viewport, scale, out, width) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.bringToFront();
  await page.waitForSelector('[aria-label=Loading]', { state: 'detached', timeout: 20000 });
  await page.addStyleTag({ content: 'main, header, .grain, [class*="z-[90]"], [class*="xl:flex"] { visibility: hidden !important; }' });
  // put the light where it flatters the face, then let the entrance finish
  await page.mouse.move(viewport.width * 0.8, viewport.height * 0.3);
  await page.waitForTimeout(5500);
  const png = await page.screenshot();
  await sharp(png).resize(width).webp({ quality: 80 }).toFile(out);
  console.log('poster written:', out);
  await ctx.close();
}

await capture({ width: 1600, height: 900 }, 1, 'public/hero-poster.webp', 1600);
await capture({ width: 390, height: 844 }, 2, 'public/hero-poster-mobile.webp', 780);
await browser.close();
