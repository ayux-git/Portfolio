import { useEffect, useRef } from 'react';
import { hero, site } from '../content';
import { scene } from '../lib/scene';
import { gsap, ScrollTrigger, scrollToTarget } from '../lib/smoothScroll';
import { ArrowDown, ArrowUpRight, Download } from './Icons';
import Magnetic from './Magnetic';

/**
 * The text layer over the wallpaper. The section is 230vh tall with a sticky
 * 100vh frame, so scroll progress (0..1) drives the dolly / tone in the shader
 * and splits the headline apart in depth here.
 */
export default function Hero({ entered }: { entered: boolean }) {
  const root = useRef<HTMLElement>(null);

  // scroll scene + pointer depth (set up once)
  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top top', end: 'bottom bottom', onUpdate: (self: ScrollTrigger) => (scene.heroProgress = self.progress) };
      if (scene.reducedMotion) {
        ScrollTrigger.create(st);
        return;
      }
      gsap.timeline({ scrollTrigger: { ...st, scrub: 0.6 } })
        .to('[data-depth="1"]', { xPercent: -22, yPercent: -18, opacity: 0, filter: 'blur(10px)', ease: 'power1.in', duration: 0.8 }, 0.1)
        .to('[data-depth="2"]', { xPercent: 30, yPercent: -6, opacity: 0, filter: 'blur(6px)', ease: 'power1.in', duration: 0.8 }, 0.16)
        .to('[data-depth="3"]', { y: -70, opacity: 0, ease: 'power1.out', duration: 0.32 }, 0)
        .to('[data-depth="hint"]', { opacity: 0, duration: 0.15 }, 0)
        .to({}, { duration: 0.1 }, 0.9);

      if (scene.coarse || scene.reducedMotion) return;
      // the type sits on its own planes and drifts against the image parallax
      // plane 3 shares its element with the scroll fade (which owns `y`), so it only moves on x
      const planes = [
        { sel: '[data-plane="1"]', amt: 18, vertical: true },
        { sel: '[data-plane="2"]', amt: 30, vertical: true },
        { sel: '[data-plane="3"]', amt: 8, vertical: false },
      ].map((p) => ({
        x: gsap.quickTo(p.sel, 'x', { duration: 1.4, ease: 'power3' }),
        y: p.vertical ? gsap.quickTo(p.sel, 'y', { duration: 1.4, ease: 'power3' }) : null,
        amt: p.amt,
      }));
      const move = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        planes.forEach((p) => {
          p.x(-nx * p.amt);
          p.y?.(-ny * p.amt * 0.5);
        });
      };
      window.addEventListener('pointermove', move, { passive: true });
      return () => window.removeEventListener('pointermove', move);
    }, el);
    return () => ctx.revert();
  }, []);

  // entrance: light comes up first, then the name
  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      if (!entered) {
        gsap.set('[data-in-line]', { yPercent: 115 });
        gsap.set('[data-in]', { opacity: 0, y: 24 });
        return;
      }
      if (scene.reducedMotion) {
        gsap.set('[data-in-line], [data-in]', { yPercent: 0, y: 0, opacity: 1 });
        return;
      }
      gsap
        .timeline({ delay: 0.9 })
        .to('[data-in-line]', { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.14 })
        .to('[data-in]', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, '-=1.1');
    }, el);
    return () => {
      if (!entered) return;
      ctx.kill();
    };
  }, [entered]);

  return (
    <section ref={root} id="hero" aria-labelledby="hero-title" className="relative h-[230vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* readability: a soft shade where the type lives, never over the face */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent md:bg-gradient-to-r md:from-bg/80 md:via-bg/25 md:to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/90 to-transparent" />

        <div className="page relative flex h-full flex-col justify-end pb-[9svh] pt-24 md:pb-[11vh]">
          <div data-depth="3" data-plane="3">
            <p data-in className="label mb-5 flex items-center gap-2.5 text-ink/80 md:mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {hero.eyebrow}
            </p>
          </div>

          <h1 id="hero-title" className="display hero-name">
            <span className="sr-only">{site.name}</span>
            <span aria-hidden="true" data-depth="1" className="block">
              <span data-plane="1" className="block overflow-hidden pb-[0.02em]">
                <span data-in-line className="block">{hero.headline[0]}</span>
              </span>
            </span>
            <span aria-hidden="true" data-depth="2" className="block">
              <span data-plane="2" className="block overflow-hidden pb-[0.04em] pl-[0.55em]">
                <span data-in-line className="block">{hero.headline[1]}</span>
              </span>
            </span>
          </h1>

          <div data-depth="3" data-plane="3" className="mt-6 max-w-[560px] md:mt-8">
            <p data-in className="font-serif text-[clamp(26px,3vw,42px)] leading-[1.1] text-ink">
              {hero.sub.map((w, i) => (
                <span key={i} className={i === 1 || i === 3 ? 'italic text-ink' : 'text-ink/70'}>
                  {w}{' '}
                </span>
              ))}
            </p>
            <p data-in className="hero-intro mt-5 hidden max-w-[46ch] text-[15px] leading-relaxed text-ink/70 sm:block md:text-base">
              {hero.intro}
            </p>
            <div data-in className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <a
                  href="#work"
                  className="btn btn-solid"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToTarget('#work');
                  }}
                >
                  See my work <ArrowDown />
                </a>
              </Magnetic>
              <Magnetic>
                <a href={site.resume} download className="btn">
                  Download CV <Download />
                </a>
              </Magnetic>
            </div>
          </div>
        </div>

        {/* quiet status lines, bottom right */}
        <div data-depth="hint" className="pointer-events-none absolute bottom-6 right-[var(--gutter)] hidden flex-col items-end gap-3 md:flex">
          <a
            data-in
            href={hero.latest.href}
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#work');
            }}
            className="glass pointer-events-auto flex max-w-[300px] items-center gap-3 rounded-2xl border border-ink/10 py-2.5 pl-4 pr-3 text-left"
          >
            <span>
              <span className="label block text-[10px] text-accent">{hero.latest.label}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink/90">{hero.latest.title}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/70" />
          </a>
          <p data-in className="label text-[10px] text-ink/60">
            {scene.coarse ? 'Tilt or drag. The scene follows.' : 'Move the cursor. The light follows.'}
          </p>
        </div>
      </div>
    </section>
  );
}
