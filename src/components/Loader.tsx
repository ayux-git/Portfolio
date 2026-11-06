import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { site } from '../content';
import { scene } from '../lib/scene';

type Props = { progress: number; ready: boolean; onDone: () => void };

/** Short name reveal while the scene loads. Hands off to the wallpaper, which lights up from black. */
export default function Loader({ progress, ready, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const [forced, setForced] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (scene.reducedMotion) return;
      gsap.from('[data-loader-letter]', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.045, delay: 0.1 });
      gsap.from('[data-loader-meta]', { opacity: 0, duration: 0.8, delay: 0.4 });
    }, root);
    const t1 = window.setTimeout(() => setMinDone(true), scene.reducedMotion ? 200 : 900);
    const t2 = window.setTimeout(() => setForced(true), 7000); // never trap the visitor
    return () => {
      ctx.revert();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // ease the visible counter toward real progress
  useEffect(() => {
    const target = Math.round((ready ? 1 : Math.max(progress * 0.9, 0.08)) * 100);
    const o = { v: shown };
    const tw = gsap.to(o, { v: target, duration: 0.6, ease: 'power2.out', onUpdate: () => setShown(Math.round(o.v)) });
    return () => { tw.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, ready]);

  useEffect(() => {
    if (leaving.current || !((ready && minDone && shown >= 100) || forced)) return;
    leaving.current = true;
    if (scene.reducedMotion) return onDone();
    gsap
      .timeline({ onComplete: onDone })
      .to('[data-loader-letter]', { yPercent: -110, duration: 0.7, ease: 'expo.in', stagger: 0.03 }, 0)
      .to('[data-loader-meta]', { opacity: 0, duration: 0.4 }, 0)
      .to('[data-loader-bar]', { scaleX: 0, transformOrigin: 'right', duration: 0.6, ease: 'expo.in' }, 0.1);
  }, [ready, minDone, shown, forced, onDone]);

  const letters = site.name.toUpperCase().split('');

  return (
    <div ref={root} className="fixed inset-0 z-[80] flex items-end bg-bg" role="status" aria-live="polite" aria-label="Loading">
      <div className="page pb-[12vh]">
        <div data-loader-meta className="label mb-6 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 00 / Signal acquiring
        </div>
        <div className="display flex overflow-hidden text-[clamp(64px,13vw,200px)]" aria-hidden="true">
          {letters.map((l, i) => (
            <span key={i} data-loader-letter className="inline-block" style={{ width: l === ' ' ? '0.28em' : undefined }}>
              {l}
            </span>
          ))}
        </div>
        <div data-loader-meta className="mt-8 flex items-center gap-6">
          <div className="relative h-px w-40 bg-ink/15">
            <div data-loader-bar className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${shown}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-muted">{String(shown).padStart(3, '0')}%</span>
        </div>
        <span className="sr-only">Loading {site.name}'s portfolio</span>
      </div>
    </div>
  );
}
