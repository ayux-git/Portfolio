import { useEffect, useState } from 'react';
import HeroWallpaper from './hero/HeroWallpaper';
import { hero } from './content';
import { scene } from './lib/scene';
import { initSmoothScroll, stopScroll, ScrollTrigger } from './lib/smoothScroll';
import Loader from './components/Loader';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Progress from './components/Progress';
import Hero from './components/Hero';
import Work from './components/Work';
import About from './components/About';
import Toolkit from './components/Toolkit';
import Proof from './components/Proof';
import Beyond from './components/Beyond';
import Contact from './components/Contact';

function usePointerInput() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      scene.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scene.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      scene.pointer.active = true;
    };
    const onLeave = () => (scene.pointer.active = false);
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') scene.pointer.active = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    // Device tilt on phones (iOS asks for permission on the first tap)
    let base: number | null = null;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (base === null) base = e.beta;
      scene.tilt.x = Math.max(-1, Math.min(1, e.gamma / 30));
      scene.tilt.y = Math.max(-1, Math.min(1, -(e.beta - base) / 30));
      scene.tilt.enabled = true;
    };
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    const enableTilt = () => {
      if (DOE?.requestPermission)
        DOE.requestPermission()
          .then((s) => s === 'granted' && window.addEventListener('deviceorientation', onTilt))
          .catch(() => {});
      else window.addEventListener('deviceorientation', onTilt);
    };
    if (scene.coarse && !scene.reducedMotion) {
      if (DOE?.requestPermission) window.addEventListener('touchend', enableTilt, { once: true });
      else enableTilt();
    }
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, []);
}

/** Each section after the hero sets the wallpaper's tone as it becomes active. */
function useSectionTones(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-tone]')).map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) {
            scene.section = el.dataset.tone!;
            window.dispatchEvent(new CustomEvent('section-change', { detail: el.dataset.tone }));
          }
        },
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, [enabled]);
}

export default function App() {
  const [loadProgress, setLoadProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const lenis = initSmoothScroll();
    lenis?.stop();
    if (!scene.coarse) document.documentElement.classList.add('has-cursor');
    return () => lenis?.destroy();
  }, []);

  usePointerInput();
  useSectionTones(entered);

  const onEntered = () => {
    scene.entered = true;
    setEntered(true);
    stopScroll(false);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <HeroWallpaper
        image={hero.image}
        imageMobile={hero.imageMobile}
        depth={hero.depth}
        poster={hero.poster}
        posterMobile={hero.posterMobile}
        focal={hero.focal}
        video={hero.video}
        character={hero.character}
        overlayIntensity={hero.overlayIntensity}
        entered={entered}
        onProgress={setLoadProgress}
        onReady={() => {
          setLoadProgress(1);
          setReady(true);
        }}
      />
      <div className="grain" aria-hidden="true" />
      {!entered && <Loader progress={loadProgress} ready={ready} onDone={onEntered} />}
      <Cursor />
      <Nav visible={entered} />
      <Progress />
      <main id="main" className="relative z-10">
        <Hero entered={entered} />
        <Work />
        <About />
        <Toolkit />
        <Proof />
        <Beyond />
        <Contact />
      </main>
    </>
  );
}
