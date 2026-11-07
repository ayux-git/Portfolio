import { useEffect, useRef } from 'react';
import { projects, type Project } from '../content';
import { useReveal } from '../lib/reveal';
import { gsap, ScrollTrigger } from '../lib/smoothScroll';
import { scene } from '../lib/scene';
import SectionHead from './SectionHead';
import { ArrowUpRight, GitHub } from './Icons';
import { AssistantPreview, MatrixPreview, WeatherPreview } from './Previews';

function ProjectCard({ p, i, total }: { p: Project; i: number; total: number }) {
  const card = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);

  // hover: preview tilts toward the cursor, light follows across the card
  useEffect(() => {
    const el = card.current;
    const pv = preview.current;
    if (!el || !pv || scene.coarse || scene.reducedMotion) return;
    const rx = gsap.quickTo(pv, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(pv, 'rotationY', { duration: 0.8, ease: 'power3' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
      ry((x - 0.5) * 7);
      rx(-(y - 0.5) * 5);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  const live = p.links.find((l) => !/github/i.test(l.href));
  const repo = p.links.find((l) => /github/i.test(l.href));

  return (
    <article
      ref={card}
      data-card
      aria-labelledby={`${p.slug}-title`}
      className="group overflow-hidden rounded-[28px] border border-ink/10 bg-[rgb(11_13_18/0.97)] sticky"
      data-index={i}
    >
      {/* light that follows the cursor across the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgb(var(--ink) / 0.06), transparent 60%)' }}
      />
      <div className="relative grid h-full gap-10 p-6 md:grid-cols-12 md:gap-8 md:p-10 lg:p-12">
        <div className="flex flex-col md:col-span-5">
          <div className="flex items-center justify-between">
            <span className="label">
              {String(i + 1).padStart(2, '0')} <span className="text-ink/55">/ {String(total).padStart(2, '0')}</span>
            </span>
            <span className="chip border-accent/40 text-accent">{p.context}</span>
          </div>
          <h3 id={`${p.slug}-title`} className="display mt-8 text-[clamp(52px,6.6vw,104px)]">
            {p.title}
          </h3>
          <p className="serif-em mt-2 text-[clamp(22px,2vw,30px)] leading-tight text-ink/85">{p.subtitle}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-ink/75">{p.summary}</p>
          <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-ink/60">
            {p.points.map((pt) => (
              <li key={pt} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-ink/40" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-7 flex flex-wrap gap-1.5" aria-label="Tech stack">
            {p.stack.map((s) => (
              <li key={s} className="chip">{s}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3 pt-2 md:mt-auto">
            {live && (
              <a href={live.href} target="_blank" rel="noreferrer" className="btn btn-solid" data-cursor="Open">
                {live.label} <ArrowUpRight />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            {repo && (
              <a href={repo.href} target="_blank" rel="noreferrer" className="btn" data-cursor="Code">
                <GitHub className="h-4 w-4" /> Source <ArrowUpRight />
                <span className="sr-only">for {p.title} on GitHub (opens in a new tab)</span>
              </a>
            )}
            {!live && <span className="label self-center text-[10px] text-ink/55">No live demo right now</span>}
          </div>
        </div>
        <div className="md:col-span-7" style={{ perspective: '1200px' }}>
          <div ref={preview} className="h-full min-h-[280px] will-change-transform md:min-h-0" style={{ transformStyle: 'preserve-3d' }}>
            {p.preview.kind === 'assistant' && <AssistantPreview />}
            {p.preview.kind === 'weather' && <WeatherPreview />}
            {p.preview.kind === 'matrix' && <MatrixPreview />}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Work() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  // Stacked cards. Each card sticks so that its BOTTOM is on screen (even if it is taller than the window),
  // and the gap after it is a reading pause: the next card only slides over once you have scrolled past that gap.
  useEffect(() => {
    const el = root.current;
    // sticky stacking only moves with the user's own scroll, so it stays on with reduced motion; only the sink effect is skipped
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
    let lastW = 0, lastH = 0;
    const place = () => {
      // mobile browsers fire resize when the address bar slides; ignore those small height changes
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
      lastW = window.innerWidth;
      lastH = window.innerHeight;
      cards.forEach((c, i) => {
        const offset = window.innerHeight * 0.11 + i * 22;
        const fit = window.innerHeight - c.offsetHeight - 24; // keeps the last line visible
        c.style.top = `${Math.min(offset, fit)}px`;
      });
      ScrollTrigger.refresh();
    };
    place();
    window.addEventListener('resize', place);
    const ctx = gsap.context(() => {
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next || scene.reducedMotion) return;
        // sink back only while the next card is actually covering this one
        gsap.to(c, {
          scale: 0.93,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: { trigger: next, start: () => `top ${Math.min(window.innerHeight, parseFloat(c.style.top) + c.offsetHeight)}px`, end: 'top 15%', scrub: true, invalidateOnRefresh: true },
        });
      });
    }, el);
    return () => {
      window.removeEventListener('resize', place);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} id="work" data-tone="work" aria-labelledby="work-title" className="relative pb-[16vh] pt-[18vh]">
      <div className="page">
        <SectionHead
          id="work-title"
          index="01"
          label="Work"
          title={['Three builds,', 'shipped end to end.']}
          aside="Case studies, newest first. Each one taught me something the tutorials skipped."
        />
        <div className="flex flex-col gap-[28vh] md:gap-[38vh]">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} p={p} i={i} total={projects.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
