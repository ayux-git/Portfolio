// Visual + reactivity check with Playwright (uses the installed Microsoft Edge, no browser download).
// Usage: npm run dev  (in another terminal), then: node scripts/verify.mjs [outDir] [url]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'verify-shots';
const url = process.argv[3] ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out, { recursive: true });
const shot = (name) => path.join(out, name + '.png');

async function diff(a, b) {
  const load = (f) => sharp(f).resize(320).greyscale().raw().toBuffer();
  const [x, y] = await Promise.all([load(a), load(b)]);
  let s = 0;
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]);
  return +(s / x.length).toFixed(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const report = {};

async function boot(page) {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.bringToFront();
  await page.waitForSelector('[role=status][aria-label=Loading]', { state: 'detached', timeout: 20000 });
  await wait(4800); // entrance: light comes up, signal resolves, name reveals
  return errors;
}

async function scrollToSel(page, sel, extra = 0) {
  await page.evaluate(([s, e]) => {
    const el = document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + e);
  }, [sel, extra]);
  await wait(2200);
}

// ---------------- desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = await boot(page);
  await page.screenshot({ path: shot('d-01-hero-rest') });
  await wait(1200);
  await page.screenshot({ path: shot('d-02-hero-rest-later') });
  report.idleDrift = await diff(shot('d-01-hero-rest'), shot('d-02-hero-rest-later'));

  // cursor: sweep to the left side, then to the face / right side
  for (let i = 0; i <= 20; i++) await page.mouse.move(200 + i * 5, 250 + i * 3), await wait(16);
  await wait(1800);
  await page.screenshot({ path: shot('d-03-cursor-left') });
  for (let i = 0; i <= 40; i++) await page.mouse.move(300 + i * 25, 310 + i * 10), await wait(16);
  await wait(1800);
  await page.screenshot({ path: shot('d-04-cursor-right') });
  report.cursorLeftVsRest = await diff(shot('d-02-hero-rest-later'), shot('d-03-cursor-left'));
  report.cursorLeftVsRight = await diff(shot('d-03-cursor-left'), shot('d-04-cursor-right'));

  // hover a button -> light pulse into the scene
  const btn = page.locator('#hero a.btn-solid');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await wait(250);
  await page.screenshot({ path: shot('d-05-hover-pulse') });

  // scroll through the pinned hero
  const vh = 900;
  for (const [name, y] of [['d-06-scroll-35', vh * 0.45], ['d-07-scroll-75', vh * 0.98], ['d-08-scroll-end', vh * 1.32]]) {
    await page.mouse.wheel(0, y - (await page.evaluate(() => window.scrollY)));
    await wait(2400);
    await page.screenshot({ path: shot(name) });
  }
  report.scroll35VsRest = await diff(shot('d-04-cursor-right'), shot('d-06-scroll-35'));
  report.scrollEndVs35 = await diff(shot('d-06-scroll-35'), shot('d-08-scroll-end'));

  for (const id of ['work', 'about', 'skills', 'proof', 'beyond', 'contact']) {
    await scrollToSel(page, '#' + id, id === 'work' ? 120 : 40);
    await page.screenshot({ path: shot('d-sec-' + id) });
  }
  // second project card in its stacked position
  await scrollToSel(page, '[data-card]:nth-child(2)', -100);
  await page.screenshot({ path: shot('d-sec-work-card2') });

  // scroll back up: everything should reverse
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(3000);
  await page.screenshot({ path: shot('d-09-back-to-top') });
  report.backToTopVsRest = await diff(shot('d-01-hero-rest'), shot('d-09-back-to-top'));
  report.desktopErrors = errors;
  await page.close();
}

// ---------------- mobile
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = await boot(page);
  await page.screenshot({ path: shot('m-01-hero') });
  for (const id of ['work', 'about', 'skills', 'contact']) {
    await scrollToSel(page, '#' + id, 60);
    await page.screenshot({ path: shot('m-sec-' + id) });
  }
  report.mobileOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  report.mobileErrors = errors;
  await ctx.close();
}

// ---------------- 360px + reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await wait(1500);
  await page.screenshot({ path: shot('r-360-reduced-hero') });
  report.reducedOverflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
