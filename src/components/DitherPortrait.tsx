import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { scene } from '../lib/scene';

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/**
 * The real photo at 1 bit: bright pixels become off-white dots, the figure is cut
 * out of them, and only the red thread on the wrist keeps the accent colour.
 * A lens under the cursor (or a tap / Enter) resolves the actual photograph.
 */
type Box = [number, number, number, number]; // x0, y0, x1, y1 as 0..1 of the image

export default function DitherPortrait({
  src,
  srcSmall,
  alt,
  ratio,
  accentBoxes,
}: {
  src: string;
  srcSmall?: string;
  alt: string;
  ratio: number;
  /** only red pixels inside these boxes keep the accent colour (the red thread); omit to allow anywhere */
  accentBoxes?: Box[];
}) {
  const wrap = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.decoding = 'async';
    img.src = srcSmall ?? src; // the 1-bit pass only needs a small source
    let cancelled = false;
    const draw = () => {
      const c = canvas.current;
      const w = wrap.current;
      if (!c || !w || cancelled) return;
      const cell = 2;
      const cols = Math.max(80, Math.floor(w.clientWidth / cell));
      const rows = Math.round(cols / ratio);
      c.width = cols;
      c.height = rows;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, cols, rows);
      const data = ctx.getImageData(0, 0, cols, rows);
      const d = data.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          let l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          // the photo is backlit: lift the shadows so the face reads as dots, not a solid shape
          l = Math.min(1, Math.max(0, (Math.pow(l, 0.5) - 0.08) / 0.86));
          const th = (BAYER8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
          // the red thread: strongly red pixels, only inside the accent boxes (keeps hair highlights / neon out)
          const fx = x / cols, fy = y / rows;
          const inBox = !accentBoxes || accentBoxes.some(([x0, y0, x1, y1]) => fx >= x0 && fx <= x1 && fy >= y0 && fy <= y1);
          const thread = inBox && r > 60 && r > g * 2.1 && r > b * 1.9;
          if (thread) { d[i] = 242; d[i + 1] = 70; d[i + 2] = 58; d[i + 3] = 255; }
          else if (l * 0.92 > th) { d[i] = 236; d[i + 1] = 238; d[i + 2] = 242; d[i + 3] = 210; }
          else d[i + 3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
    };
    img.onload = draw;
    const ro = new ResizeObserver(() => img.complete && draw());
    if (wrap.current) ro.observe(wrap.current);
    return () => { cancelled = true; ro.disconnect(); };
  }, [src, srcSmall, ratio, accentBoxes]);

  // lens follows the cursor
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', `${e.clientX - r.left}px`);
      el.style.setProperty('--y', `${e.clientY - r.top}px`);
    };
    const enter = (e: PointerEvent) => {
      move(e); // open the lens under the pointer, even if it arrived by scrolling
      if (!resolved) gsap.to(el, { '--r': '140px', duration: scene.reducedMotion ? 0 : 0.6, ease: 'power3.out' });
    };
    const leave = () => !resolved && gsap.to(el, { '--r': '0px', duration: scene.reducedMotion ? 0 : 0.5, ease: 'power3.in' });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, [resolved]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (resolved) {
      el.style.setProperty('--x', `${el.clientWidth / 2}px`);
      el.style.setProperty('--y', `${el.clientHeight / 2}px`);
    }
    gsap.to(el, { '--r': resolved ? `${Math.hypot(el.clientWidth, el.clientHeight)}px` : '0px', duration: scene.reducedMotion ? 0 : 1.1, ease: 'expo.inOut' });
  }, [resolved]);

  return (
    <button
      ref={wrap}
      type="button"
      onClick={() => setResolved((r) => !r)}
      aria-pressed={resolved}
      aria-label={resolved ? 'Show the 1-bit version of the portrait' : 'Show the full-colour portrait'}
      data-cursor={resolved ? 'Signal' : 'Resolve'}
      className="relative block w-full overflow-hidden rounded-[22px] border border-ink/10 bg-bg text-left"
      style={{ aspectRatio: String(ratio), ['--r' as string]: '0px', ['--x' as string]: '50%', ['--y' as string]: '50%' }}
    >
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" style={{ imageRendering: 'pixelated' }} />
      <img
        src={src}
        srcSet={srcSmall ? `${srcSmall} 640w, ${src} 1100w` : undefined}
        sizes="(min-width: 768px) 40vw, 92vw"
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          WebkitMaskImage: 'radial-gradient(circle var(--r) at var(--x) var(--y), #000 55%, transparent 100%)',
          maskImage: 'radial-gradient(circle var(--r) at var(--x) var(--y), #000 55%, transparent 100%)',
        }}
      />
    </button>
  );
}
