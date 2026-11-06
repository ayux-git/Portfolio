import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scene } from './scene';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** One shared loop: GSAP's ticker drives Lenis, ScrollTrigger and the WebGL renderer. */
export function initSmoothScroll() {
  if (scene.reducedMotion) return null;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', (e: { velocity: number }) => {
    scene.scrollVelocity = Math.abs(e.velocity);
    ScrollTrigger.update();
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: scene.reducedMotion ? 'auto' : 'smooth' });
  // move keyboard focus to the section for screen readers / keyboard users
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

export function stopScroll(stop: boolean) {
  if (!lenis) return;
  if (stop) lenis.stop();
  else lenis.start();
}

export { gsap, ScrollTrigger };
