import { useRef, useState } from 'react';
import { contact, site } from '../content';
import { useReveal } from '../lib/reveal';
import { scrollToTarget } from '../lib/smoothScroll';
import { ArrowUpRight, Download, GitHub, LinkedIn, Mail } from './Icons';
import Magnetic from './Magnetic';

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  useReveal(root);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <section ref={root} id="contact" data-tone="contact" aria-labelledby="contact-title" className="relative flex min-h-[100svh] flex-col pt-[16vh]">
      <div className="page flex flex-1 flex-col">
        <div className="mb-10 flex items-center gap-4">
          <span className="label whitespace-nowrap text-ink/80">06 / Contact</span>
          <span className="relative h-px flex-1 overflow-hidden">
            <span data-sweep className="absolute inset-0 block bg-ink/15" />
          </span>
        </div>
        <p data-reveal className="label mb-6 flex items-center gap-2.5 text-ink/80">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {site.status}
        </p>
        <h2 id="contact-title" className="display text-[clamp(72px,14vw,232px)]">
          <span className="block overflow-hidden pb-[0.02em]">
            <span data-line className="block">{contact.heading[0]}</span>
          </span>
          <span className="block overflow-hidden pb-[0.1em]">
            <span data-line className="serif-em block text-[0.9em] leading-[0.95]">{contact.heading[1]}</span>
          </span>
        </h2>
        <p data-reveal className="mt-8 max-w-[52ch] text-[17px] leading-relaxed text-ink/75">{contact.body}</p>

        <div data-reveal className="mt-10 flex flex-wrap items-center gap-3">
          <Magnetic strength={0.35}>
            <a href={`mailto:${site.email}`} className="btn btn-solid px-6 py-4 text-base" data-cursor="Write">
              <Mail /> {site.email} <ArrowUpRight />
            </a>
          </Magnetic>
          <button type="button" onClick={copy} className="btn" aria-live="polite">
            {copied ? 'Copied' : 'Copy email'}
          </button>
        </div>
        <ul data-reveal className="mt-4 flex flex-wrap gap-3">
          <li>
            <Magnetic>
              <a href={site.socials.github.href} target="_blank" rel="noreferrer" className="btn">
                <GitHub /> GitHub <ArrowUpRight />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <a href={site.socials.linkedin.href} target="_blank" rel="noreferrer" className="btn">
                <LinkedIn /> LinkedIn <ArrowUpRight />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <a href={site.resume} download className="btn">
                Download CV <Download />
              </a>
            </Magnetic>
          </li>
        </ul>

        <footer className="mt-auto flex flex-col gap-3 border-t border-ink/10 py-8 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/55 md:mt-[18vh] md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {site.name}</span>
          {/* <span>Built with React, three.js and a lot of rain</span> */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#hero');
            }}
            className="hover:text-ink"
          >
            Back to top ↑
          </a>
        </footer>
      </div>
    </section>
  );
}
