/**
 * Shared scene state. The DOM (scroll, cursor, hover) writes here and the
 * WebGL renderer reads it once per frame. No React state, so no re-renders.
 */
export type Tone = { dim: number; dither: number; zoom: number; tint: number; fog: number; shiftX: number };

export const HERO_END_TONE: Tone = { dim: 0.62, dither: 0.92, zoom: 1.25, tint: 0.35, fog: 0.75, shiftX: 0 };

/** Background tone per section after the hero. The wallpaper keeps living behind the content. */
export const SECTION_TONES: Record<string, Tone> = {
  work: { dim: 0.78, dither: 1, zoom: 1.32, tint: 0.3, fog: 0.8, shiftX: -0.06 },
  about: { dim: 0.8, dither: 1, zoom: 1.42, tint: 0.45, fog: 0.9, shiftX: 0.05 },
  skills: { dim: 0.78, dither: 1, zoom: 1.6, tint: 0.25, fog: 0.85, shiftX: -0.1 },
  proof: { dim: 0.8, dither: 1, zoom: 1.36, tint: 0.5, fog: 0.9, shiftX: 0.08 },
  beyond: { dim: 0.76, dither: 1, zoom: 1.28, tint: 0.55, fog: 0.8, shiftX: 0 },
  // The image comes back into focus for the call to action: a bookend to the hero.
  contact: { dim: 0.66, dither: 0.8, zoom: 1.12, tint: 0.25, fog: 0.7, shiftX: 0 },
};

export const scene = {
  /** pointer in NDC (-1..1), target values (renderer smooths them) */
  pointer: { x: 0, y: 0, active: false },
  /** 0..1 progress through the pinned hero */
  heroProgress: 0,
  /** absolute scroll velocity, smoothed, px/frame-ish */
  scrollVelocity: 0,
  /** active section id after the hero (null while in hero) */
  section: null as string | null,
  /** 0..1 light pulse when hovering links/buttons */
  pulse: 0,
  /** entrance: set to true when the loader finishes */
  entered: false,
  reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  coarse: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  /** device tilt in -1..1 (mobile), used when pointer is not active */
  tilt: { x: 0, y: 0, enabled: false },
};

export function pulseScene(amount = 1) {
  scene.pulse = Math.max(scene.pulse, amount);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** The tone the background should move toward right now. */
export function targetTone(): Tone {
  const p = scene.heroProgress;
  if (p < 1 || !scene.section) {
    return {
      dim: lerp(0, HERO_END_TONE.dim, smooth(0.15, 1, p)),
      dither: HERO_END_TONE.dither * smooth(0.5, 1, p),
      zoom: lerp(1, HERO_END_TONE.zoom, p),
      tint: HERO_END_TONE.tint * smooth(0.2, 1, p),
      fog: lerp(0.35, HERO_END_TONE.fog, p),
      shiftX: 0,
    };
  }
  return SECTION_TONES[scene.section] ?? HERO_END_TONE;
}
