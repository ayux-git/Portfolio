import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { pulseScene, scene } from '../lib/scene';

/** Dot + ring. The ring grows over interactive elements and each hover sends a light pulse into the scene. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const enabled = !scene.coarse && typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' });
    let current: Element | null = null;
    let shown = false;

    const move = (e: PointerEvent) => {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      if (shown) return;
      shown = true;
      gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.3, overwrite: 'auto' });
    };
    const over = (e: PointerEvent) => {
      const el = (e.target as Element).closest('a, button, [data-cursor]');
      if (el === current) return;
      current = el;
      if (el) {
        pulseScene(1);
        gsap.to(ring.current, { scale: el.getAttribute('data-cursor') ? 2.6 : 2, borderColor: 'rgb(242 70 58 / 0.9)', backgroundColor: 'rgb(242 70 58 / 0.1)', duration: 0.35 });
        gsap.to(dot.current, { scale: 0, duration: 0.25 });
      } else {
        gsap.to(ring.current, { scale: 1, borderColor: 'rgb(236 238 242 / 0.5)', backgroundColor: 'rgba(0,0,0,0)', duration: 0.35 });
        gsap.to(dot.current, { scale: 1, duration: 0.25 });
      }
    };
    const leave = () => {
      shown = false;
      gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.3, overwrite: 'auto' });
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[90]">
      <div ref={ring} className="absolute -left-4 -top-4 h-8 w-8 rounded-full border border-ink/50 opacity-0" />
      <div ref={dot} className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-ink opacity-0" />
    </div>
  );
}
