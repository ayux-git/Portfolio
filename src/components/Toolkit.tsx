import { useEffect, useMemo, useRef, useState } from 'react';
import { skills } from '../content';
import { useReveal } from '../lib/reveal';
import { gsap } from '../lib/smoothScroll';
import { scene } from '../lib/scene';
import SectionHead from './SectionHead';

type Node = { name: string; group: string; x: number; y: number; learning?: boolean };

/** Deterministic constellation layout: groups around a hub, skills around each group. */
function useConstellation() {
  return useMemo(() => {
    const W = 600, H = 520, cx = W / 2, cy = H / 2;
    const hubs = skills.map((g, gi) => {
      const a = (gi / skills.length) * Math.PI * 2 - Math.PI / 2 + 0.3;
      return { id: g.id, label: g.label, x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 160, a };
    });
    const nodes: Node[] = [];
    skills.forEach((g, gi) => {
      const h = hubs[gi];
      g.items.forEach((it, i) => {
        const spread = Math.min(1.9, 0.42 * g.items.length);
        const a = h.a + (i / Math.max(1, g.items.length - 1) - 0.5) * spread;
        const r = 62 + (i % 2) * 22;
        nodes.push({ name: it.name, group: g.id, learning: it.learning, x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r });
      });
    });
    return { W, H, cx, cy, hubs, nodes };
  }, []);
}

export default function Toolkit() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<string>('all');
  const [hover, setHover] = useState<string | null>(null);
  const c = useConstellation();
  useReveal(root);

  // constellation drifts in depth with the cursor
  useEffect(() => {
    const el = svg.current;
    if (!el || scene.coarse || scene.reducedMotion) return;
    const layers = [
      { sel: '[data-layer="far"]', amt: 6 },
      { sel: '[data-layer="mid"]', amt: 12 },
      { sel: '[data-layer="near"]', amt: 20 },
    ].map((l) => ({ x: gsap.quickTo(el.querySelector(l.sel), 'x', { duration: 1.2 }), y: gsap.quickTo(el.querySelector(l.sel), 'y', { duration: 1.2 }), amt: l.amt }));
    const move = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      layers.forEach((l) => { l.x(nx * l.amt); l.y(ny * l.amt); });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const on = (group: string) => active === 'all' || active === group;
  const tabs = [{ id: 'all', label: 'All' }, ...skills.map((s) => ({ id: s.id, label: s.label }))];

  return (
    <section ref={root} id="skills" data-tone="skills" aria-labelledby="skills-title" className="relative py-[16vh]">
      <div className="page">
        <SectionHead id="skills-title" index="03" label="Toolkit" title={['What I', 'build with.']} aside="Grouped the way I use them. No percentages: I'd rather show the projects." />

        <div data-reveal className="mb-12">
          <div role="group" aria-label="Filter skills by group" className="glass -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-full border border-ink/10 p-1 [scrollbar-width:none]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={active === t.id}
                onClick={() => setActive(t.id)}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] transition-colors ${active === t.id ? 'text-bg' : 'text-ink/65 hover:text-ink'}`}
              >
                <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-ink transition-[opacity,transform] duration-300 ${active === t.id ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="label mt-3 pl-4 text-[10px] text-ink/55">Pick a cluster. Anything marked “learning” is in progress.</p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div data-reveal className="hidden lg:col-span-6 lg:block">
            <svg ref={svg} viewBox={`0 0 ${c.W} ${c.H}`} className="w-full overflow-visible" aria-hidden="true">
              <g data-layer="far">
                {c.hubs.map((h) => (
                  <line key={h.id} x1={c.cx} y1={c.cy} x2={h.x} y2={h.y} stroke="rgb(var(--ink))" strokeOpacity={on(h.id) ? 0.22 : 0.06} className="transition-[stroke-opacity] duration-500" />
                ))}
                <circle cx={c.cx} cy={c.cy} r="22" fill="none" stroke="rgb(var(--ink) / 0.25)" />
                <circle cx={c.cx} cy={c.cy} r="4" fill="rgb(var(--accent))" />
              </g>
              <g data-layer="mid">
                {c.nodes.map((n) => {
                  const h = c.hubs.find((x) => x.id === n.group)!;
                  return <line key={n.name} x1={h.x} y1={h.y} x2={n.x} y2={n.y} stroke="rgb(var(--ink))" strokeOpacity={on(n.group) ? 0.3 : 0.05} className="transition-[stroke-opacity] duration-500" />;
                })}
                {c.hubs.map((h) => (
                  <g key={h.id} className="transition-opacity duration-500" opacity={on(h.id) ? 1 : 0.25}>
                    <circle cx={h.x} cy={h.y} r="3" fill="rgb(var(--ink))" />
                    <text x={h.x} y={h.y - 12} textAnchor="middle" fill="rgb(var(--ink) / 0.6)" fontFamily="Geist Mono, monospace" fontSize="9.5" letterSpacing="1.5">
                      {h.label.toUpperCase()}
                    </text>
                  </g>
                ))}
              </g>
              <g data-layer="near">
                {c.nodes.map((n) => {
                  const lit = hover === n.name;
                  const visible = on(n.group);
                  return (
                    <g key={n.name} className="transition-opacity duration-500" opacity={visible ? 1 : 0.15}>
                      {lit && <circle cx={n.x} cy={n.y} r="14" fill="rgb(var(--accent) / 0.18)" />}
                      <circle cx={n.x} cy={n.y} r={lit ? 5 : 3.2} fill={lit ? 'rgb(var(--accent))' : n.learning ? 'none' : 'rgb(var(--neon))'} stroke={n.learning ? 'rgb(var(--neon))' : 'none'} />
                      {(lit || (active !== 'all' && visible)) && (
                        <text x={n.x + 9} y={n.y + 3.5} fill="rgb(var(--ink))" fontFamily="Geist, sans-serif" fontSize="11">
                          {n.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div id="skill-list" className="space-y-8 lg:col-span-6">
            {skills.map((g) => (
              <div key={g.id} data-reveal className={`transition-opacity duration-500 ${on(g.id) ? 'opacity-100' : 'opacity-25'}`}>
                <h3 className="label mb-3 text-[10px]">{g.label}</h3>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <li
                      key={it.name}
                      onPointerEnter={() => setHover(it.name)}
                      onPointerLeave={() => setHover(null)}
                      className={`rounded-full border px-4 py-2 text-[14px] transition-colors duration-300 ${hover === it.name ? 'border-accent/70 text-ink' : 'border-ink/15 text-ink/85'}`}
                    >
                      {it.name}
                      {it.learning && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ink/55">learning</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
