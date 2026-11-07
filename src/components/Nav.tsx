import { useEffect, useState } from 'react';
import { nav, site } from '../content';
import { scrollToTarget, stopScroll } from '../lib/smoothScroll';
import { Download } from './Icons';
import Magnetic from './Magnetic';

export default function Nav({ visible }: { visible: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => setActive((e as CustomEvent<string>).detail);
    window.addEventListener('section-change', on);
    const top = () => window.scrollY < window.innerHeight * 0.8 && setActive(null);
    window.addEventListener('scroll', top, { passive: true });
    return () => {
      window.removeEventListener('section-change', on);
      window.removeEventListener('scroll', top);
    };
  }, []);

  useEffect(() => {
    stopScroll(open);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    stopScroll(false); // Lenis ignores scrollTo while stopped (menu open); restart before jumping
    scrollToTarget(href);
  };

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[opacity,transform] duration-1000 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
    >
      <nav aria-label="Primary" className="page flex items-center justify-between pt-4 md:pt-5">
        <a href="#hero" onClick={go('#hero')} className="glass flex h-11 items-center gap-2.5 rounded-full border border-ink/10 pl-2 pr-4">
          <span className="display flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[15px] text-bg">{site.shortName}</span>
          <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/80 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {site.status}
          </span>
          <span className="sr-only">{site.name}, back to top</span>
        </a>

        <ul className="glass hidden h-11 items-center gap-1 rounded-full border border-ink/10 px-1.5 md:flex">
          {nav.map((n) => {
            const id = n.href.slice(1);
            const isActive = active === id || (id === 'about' && active === 'proof') || (id === 'about' && active === 'beyond');
            return (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={go(n.href)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative block rounded-full px-4 py-2 text-[13px] transition-colors duration-300 ${isActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`}
                >
                  <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-ink/10 transition-[opacity,transform] duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`} />
                  <span className="relative">{n.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Magnetic>
            <a href={site.resume} download className="btn h-11 py-0" data-cursor="CV">
              Resume <Download />
            </a>
          </Magnetic>
          <button
            type="button"
            className="glass flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-px w-4 bg-ink transition-transform duration-300 ${open ? 'top-1.5 rotate-45' : 'top-0.5'}`} />
              <span className={`absolute left-0 h-px w-4 bg-ink transition-transform duration-300 ${open ? 'top-1.5 -rotate-45' : 'top-2.5'}`} />
            </span>
          </button>
        </div>
      </nav>
    </header>

      {/* Kept outside <header>: its transform would turn `fixed inset-0` into header-sized. */}
      {open && (
        <div id="mobile-menu" className="menu-in fixed inset-0 z-40 bg-bg/90 backdrop-blur-xl md:hidden">
          <ul className="page flex h-full flex-col justify-center gap-2">
            {nav.map((n, i) => (
              <li key={n.href} className="menu-item-in" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
                <a href={n.href} onClick={go(n.href)} className="display flex items-baseline gap-4 py-1 text-[18vw]">
                  <span className="label text-[11px]">0{i + 1}</span>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
