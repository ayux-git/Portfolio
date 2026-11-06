import { useRef } from 'react';
import { about, site } from '../content';
import { useReveal } from '../lib/reveal';
import { scene } from '../lib/scene';
import DitherPortrait from './DitherPortrait';

export default function About() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="about" data-tone="about" aria-labelledby="about-title" className="relative py-[16vh]">
      <div className="page">
        <div className="mb-8 flex items-center gap-4">
          <span className="label whitespace-nowrap text-ink/80">02 / About</span>
          <span className="relative h-px flex-1 overflow-hidden">
            <span data-sweep className="absolute inset-0 block bg-ink/15" />
          </span>
        </div>

        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <figure data-reveal className="md:col-span-5 md:self-start lg:sticky lg:top-[14vh]">
            <DitherPortrait src="/portrait.webp" srcSmall="/portrait-640.webp" alt={about.portraitAlt} ratio={about.portraitRatio} accentBoxes={about.portraitAccent} />
            <figcaption className="label mt-4 flex justify-between text-[10px] text-ink/55">
              <span>Fig. 02: off duty, at 1 bit</span>
              <span>{scene.coarse ? 'Tap to resolve' : 'Hover or click to resolve'}</span>
            </figcaption>
          </figure>

          <div className="md:col-span-7 md:pl-6 lg:pl-12">
            <h2 id="about-title" className="display text-[clamp(56px,8.5vw,136px)]">
              <span className="block overflow-hidden pb-[0.04em]">
                <span data-line className="block">{about.heading[0]}</span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-line className="serif-em block text-[0.92em] leading-[0.95]">{about.heading[1]}</span>
              </span>
            </h2>
            <div className="mt-10 space-y-5 text-[17px] leading-relaxed text-ink/75 md:text-[18px]">
              {about.paragraphs.map((p) => (
                <p key={p} data-reveal>{p}</p>
              ))}
            </div>

            <dl data-reveal className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 text-sm">
              {[
                ['Studying', site.role],
                ['At', site.school],
                ['Graduating', site.graduation],
                ['Looking for', 'AI/ML internships, GSoC'],
              ].map(([k, v]) => (
                <div key={k} className="bg-[rgb(11_13_18/0.9)] p-5">
                  <dt className="label text-[10px]">{k}</dt>
                  <dd className="mt-1.5 text-ink/90">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-16">
              <h3 data-reveal className="label mb-6 flex items-center gap-2 text-ink/80">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Currently learning
              </h3>
              <p data-reveal className="serif-em -mt-2 mb-6 text-[clamp(22px,2vw,28px)] leading-snug text-ink/85">{about.learningNote}</p>
              <ol className="divide-y divide-ink/10 border-y border-ink/10">
                {about.learning.map((l, i) => (
                  <li key={l.topic} data-reveal className="grid grid-cols-[48px_1fr] items-baseline gap-2 py-5 md:grid-cols-[64px_220px_1fr]">
                    <span className="font-mono text-xs text-ink/55">0{i + 1}</span>
                    <span className="font-display text-xl font-semibold tracking-tight">{l.topic}</span>
                    <span className="col-start-2 text-[15px] text-ink/60 md:col-start-auto">{l.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
