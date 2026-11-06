import { useEffect, useRef, useState } from 'react';

const NAMES: Record<string, string> = {
  work: '01 / Work',
  about: '02 / About',
  skills: '03 / Toolkit',
  proof: '04 / Proof',
  beyond: '05 / Off the keyboard',
  contact: '06 / Contact',
};

/** Quiet scroll progress + current section, running vertically in the right gutter on wide screens. */
export default function Progress() {
  const bar = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('00 / Signal');

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        if (bar.current) bar.current.style.transform = `scaleY(${p})`;
        if (window.scrollY < window.innerHeight * 0.8) setName('00 / Signal');
      });
    };
    const onSection = (e: Event) => setName(NAMES[(e as CustomEvent<string>).detail] ?? '');
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('section-change', onSection);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('section-change', onSection);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 xl:flex">
      <span className="label text-[10px] text-ink/60 [writing-mode:vertical-rl]">{name}</span>
      <div className="relative h-20 w-px bg-ink/15">
        <div ref={bar} className="absolute inset-0 origin-top bg-ink" style={{ transform: 'scaleY(0)' }} />
      </div>
    </div>
  );
}
