import { useRef } from 'react';
import { achievements, experience } from '../content';
import { useReveal } from '../lib/reveal';
import SectionHead from './SectionHead';
import { ArrowUpRight } from './Icons';

function Row({ kind, title, detail, year, href }: { kind: string; title: string; detail: string; year?: string; href?: string }) {
  const inner = (
    <>
      <span className="label text-[10px] text-ink/60">{kind}</span>
      <span className="font-display text-[clamp(22px,2.4vw,34px)] font-semibold leading-tight tracking-tight">{title}</span>
      <span className="text-[15px] text-ink/60">{detail}</span>
      <span className="flex items-center justify-end gap-2 font-mono text-xs text-ink/55">
        {year}
        {href && <ArrowUpRight />}
      </span>
    </>
  );
  const cls =
    'group relative grid grid-cols-1 gap-2 overflow-hidden py-7 md:grid-cols-[160px_1.1fr_1fr_80px] md:items-baseline md:gap-8 ' +
    'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-gradient-to-r before:from-ink/[0.05] before:to-transparent before:transition-transform before:duration-700 hover:before:scale-x-100';
  return (
    <li data-reveal className="relative border-t border-ink/10 last:border-b">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {inner}
        </a>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}

export default function Proof() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <section ref={root} id="proof" data-tone="proof" aria-labelledby="proof-title" className="relative py-[16vh]">
      <div className="page">
        <SectionHead id="proof-title" index="04" label="Proof" title={['Small wins,', 'on the record.']} aside="Early days, so the list is short and true." />

        {/* Experience / open source: renders only once content.ts has entries */}
        {experience.length > 0 && (
          <div className="mb-20">
            <h3 data-reveal className="label mb-6 text-ink/80">Experience / Open source</h3>
            <ul>
              {experience.map((e) => (
                <Row key={e.org + e.role} kind={e.period} title={`${e.role}, ${e.org}`} detail={e.detail} href={e.href} />
              ))}
            </ul>
          </div>
        )}

        <ul>
          {achievements.map((a) => (
            <Row key={a.title} {...a} />
          ))}
        </ul>
      </div>
    </section>
  );
}
