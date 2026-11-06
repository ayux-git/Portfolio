import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from './smoothScroll';
import { scene } from './scene';

/**
 * Inside `root`:
 *  [data-line]   -> masked line reveal (parent should be overflow-hidden)
 *  [data-reveal] -> staggered fade-up
 *  [data-sweep]  -> hairline that draws across with a light point (section transitions)
 */
export function useReveal(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || scene.reducedMotion) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-sweep]').forEach((s) => {
        gsap.fromTo(s, { scaleX: 0 }, { scaleX: 1, ease: 'expo.out', duration: 1.6, transformOrigin: 'left', scrollTrigger: { trigger: s, start: 'top 88%' } });
      });
      const lines = el.querySelectorAll<HTMLElement>('[data-line]');
      if (lines.length)
        gsap.from(lines, {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: lines[0], start: 'top 88%' },
        });
      ScrollTrigger.batch(el.querySelectorAll<HTMLElement>('[data-reveal]'), {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });
      gsap.set(el.querySelectorAll('[data-reveal]'), { opacity: 0 });
    }, el);
    return () => ctx.revert();
  }, [root]);
}
