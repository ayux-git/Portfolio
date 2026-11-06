import { useEffect, useMemo, useRef, useState } from 'react';
import { scene } from '../lib/scene';

function useInView<T extends Element>(ref: React.RefObject<T>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

/** Campus Care: how the health assistant answers, as described in the project (RAG via an Edge Function, rule-based fallback). */
export function AssistantPreview() {
  const mono = { fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: 1.5 } as const;
  const steps = [
    { x: 60, label: 'QUESTION', sub: 'EN · HI · PA' },
    { x: 200, label: 'RETRIEVE', sub: 'context (RAG)' },
    { x: 340, label: 'EDGE FN', sub: 'Supabase' },
    { x: 480, label: 'MODEL', sub: 'Anthropic API' },
  ];
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl border border-ink/10 bg-[#0b0e14]" aria-hidden="true">
      <svg viewBox="0 0 640 440" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <g className="isobars" stroke="rgb(142 214 255 / 0.08)" fill="none" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M-40 ${60 + i * 42} C 140 ${20 + i * 46}, 320 ${110 + i * 38}, 700 ${50 + i * 44}`} />
          ))}
        </g>
        {/* main path */}
        <path d="M60 170 H580" stroke="rgb(142 214 255 / 0.3)" strokeWidth="1" />
        <path className="flow" d="M60 170 H580" stroke="rgb(142 214 255 / 0.9)" strokeWidth="1.5" fill="none" />
        {steps.map((s) => (
          <g key={s.label}>
            <circle cx={s.x} cy="170" r="5" fill="#0b0e14" stroke="rgb(142 214 255)" strokeWidth="1.5" />
            <text x={s.x} y="140" textAnchor="middle" fill="rgb(236 238 242 / 0.85)" style={mono}>{s.label}</text>
            <text x={s.x} y="200" textAnchor="middle" fill="rgb(236 238 242 / 0.55)" style={{ ...mono, fontSize: 10, letterSpacing: 0.5 }}>{s.sub}</text>
          </g>
        ))}
        <circle cx="580" cy="170" r="6" fill="rgb(242 70 58)" />
        <text x="580" y="140" textAnchor="middle" fill="rgb(236 238 242)" style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 24 }}>answer</text>
        {/* fallback branch */}
        <path d="M340 176 C 340 260, 420 300, 580 300 V 176" stroke="rgb(236 238 242 / 0.35)" strokeDasharray="3 5" fill="none" />
        <text x="440" y="326" textAnchor="middle" fill="rgb(236 238 242 / 0.6)" style={mono}>RULE-BASED FALLBACK</text>
      </svg>
      <span className="label absolute bottom-4 left-5 text-[10px] text-ink/55">Health assistant · how a question is answered</span>
    </div>
  );
}

/** AtmosFit: the inputs that actually drive the recommendation, flowing into one decision. */
export function WeatherPreview() {
  const inputs = ['Feels-like', 'Rain chance', 'Wind', 'UV', 'Snow', 'Air quality'];
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl border border-ink/10 bg-[#0b0e14]" aria-hidden="true">
      <svg viewBox="0 0 640 440" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {/* drifting isobars */}
        <g className="isobars" stroke="rgb(142 214 255 / 0.10)" fill="none" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M-40 ${60 + i * 42} C 140 ${20 + i * 46}, 320 ${110 + i * 38}, 700 ${50 + i * 44}`} />
          ))}
        </g>
        {inputs.map((label, i) => {
          const y = 70 + i * 56;
          return (
            <g key={label}>
              <text x="36" y={y + 4} fill="rgb(236 238 242 / 0.75)" fontFamily="Geist Mono, monospace" fontSize="12" letterSpacing="1.5">
                {label.toUpperCase()}
              </text>
              <path d={`M170 ${y} C 300 ${y}, 330 220, 430 220`} stroke="rgb(142 214 255 / 0.35)" strokeWidth="1" fill="none" />
              <path className="flow" d={`M170 ${y} C 300 ${y}, 330 220, 430 220`} stroke="rgb(142 214 255 / 0.9)" strokeWidth="1.5" fill="none" style={{ animationDelay: `${i * 0.35}s` }} />
              <circle cx="166" cy={y} r="2.5" fill="rgb(142 214 255)" />
            </g>
          );
        })}
        <circle cx="440" cy="220" r="34" fill="none" stroke="rgb(236 238 242 / 0.25)" />
        <circle cx="440" cy="220" r="5" fill="rgb(242 70 58)" />
        <text x="440" y="282" textAnchor="middle" fill="rgb(236 238 242 / 0.55)" fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="1.5">
          + AGE · GENDER
        </text>
        <path d="M476 220 H 560" stroke="rgb(236 238 242 / 0.4)" strokeDasharray="3 5" />
        <text x="566" y="216" fill="rgb(236 238 242)" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="26">what</text>
        <text x="566" y="242" fill="rgb(236 238 242)" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="26">to wear</text>
      </svg>
      <span className="label absolute bottom-4 left-5 text-[10px] text-ink/55">Inputs from Open-Meteo · output on a 3D avatar</span>
    </div>
  );
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RailMatrix: a coach seen as a matrix of berths, filled by a seeded generator (same seed, same coach). */
export function MatrixPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [seed, setSeed] = useState(42);
  useEffect(() => {
    if (!inView || scene.reducedMotion) return;
    const t = window.setInterval(() => setSeed((s) => (s === 42 ? 7 : s === 7 ? 1024 : 42)), 2600);
    return () => window.clearInterval(t);
  }, [inView]);
  const cells = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: 72 }, () => {
      const v = r();
      return v < 0.52 ? 'booked' : v < 0.78 ? 'free' : v < 0.9 ? 'rac' : 'wl';
    });
  }, [seed]);
  const color = { booked: 'bg-ink/[0.07]', free: 'border border-ink/40', rac: 'bg-neon/70', wl: 'bg-accent' } as const;
  const berth = ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU', 'LB', 'MB', 'UB', 'SL'];

  return (
    <div ref={ref} className="flex h-full min-h-[340px] flex-col rounded-2xl border border-ink/10 bg-[#0b0e14] p-5 md:p-7" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="label text-[10px]">Coach S4 · sleeper</span>
        <span className="font-mono text-[11px] tabular-nums text-ink/60">seed {String(seed).padStart(4, '0')}</span>
      </div>
      <div className="mt-6 grid grid-cols-12 gap-1.5 md:gap-2">
        {cells.map((c, i) => (
          <div key={i} className="flex flex-col items-center justify-center">
            <span className={`block aspect-[1/1.15] w-full rounded-[3px] transition-colors duration-700 ${color[c as keyof typeof color]}`} style={{ transitionDelay: `${(i % 12) * 25 + Math.floor(i / 12) * 30}ms` }} />
            {i < 12 && <span className="mt-1 hidden font-mono text-[8px] text-ink/55 lg:block">{berth[i]}</span>}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2 rounded-[2px] border border-ink/40" /> Available</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2 rounded-[2px] bg-neon/70" /> RAC</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2 rounded-[2px] bg-accent" /> Waitlist</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2 rounded-[2px] bg-ink/[0.07]" /> Booked</span>
      </div>
    </div>
  );
}
