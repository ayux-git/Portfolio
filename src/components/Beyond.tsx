import { useRef } from 'react';
import { beyond } from '../content';
import { useReveal } from '../lib/reveal';
import SectionHead from './SectionHead';

/** Hand-drawn line glyphs. They draw themselves on hover. */
const GLYPHS: Record<(typeof beyond)[number]['glyph'], string> = {
  // a jian (straight sword) crossing a circle: wushu
  wushu: 'M14 66 L66 14 M58 14 H66 V22 M20 52 L28 60 M10 70 L18 62 M40 8 A32 32 0 1 1 39.9 8',
  // pencil + a face contour
  sketch: 'M12 68 L22 66 L66 22 L58 14 L14 58 Z M54 18 L62 26 M30 30 C 30 18, 46 14, 50 26 C 54 38, 44 46, 40 50',
  // three rising candlesticks on a baseline
  trading: 'M8 68 H72 M20 34 V62 M15 42 H25 V54 H15 Z M40 24 V52 M35 30 H45 V44 H35 Z M60 12 V40 M55 18 H65 V32 H55 Z',
  // controller
  game: 'M18 30 H62 C 72 30, 76 60, 66 62 C 58 64, 54 52, 48 52 H32 C 26 52, 22 64, 14 62 C 4 60, 8 30, 18 30 Z M22 41 H32 M27 36 V46 M52 38 a1.5 1.5 0 1 0 0.1 0 M58 44 a1.5 1.5 0 1 0 0.1 0',
  // open book
  book: 'M40 22 C 30 16, 18 16, 8 20 V62 C 18 58, 30 58, 40 64 C 50 58, 62 58, 72 62 V20 C 62 16, 50 16, 40 22 Z M40 22 V64',
};

export default function Beyond() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section ref={root} id="beyond" data-tone="beyond" aria-labelledby="beyond-title" className="relative py-[16vh]">
      <div className="page">
        <SectionHead id="beyond-title" index="05" label="Beyond code" title={['Off the', 'keyboard.']} />
        <ul className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {beyond.map((b, i) => (
            <li
              key={b.title}
              data-reveal
              tabIndex={0}
              className="glass group relative flex min-h-[300px] w-[72vw] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-ink/10 p-6 transition-colors duration-500 hover:border-ink/25 focus-visible:border-ink/25 sm:w-[44vw] lg:w-auto"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] text-ink/55">0{i + 1}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-accent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
              </div>
              <svg viewBox="0 0 80 80" className="glyph my-6 h-20 w-20 text-ink/75" aria-hidden="true">
                <path d={GLYPHS[b.glyph]} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
              </svg>
              <div>
                <h3 className="serif-em text-[30px] leading-none">{b.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink/60">{b.line}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
