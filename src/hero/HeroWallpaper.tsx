import { useEffect, useRef, useState } from 'react';
import { scene } from '../lib/scene';
import type { CharacterFx, WallpaperRenderer } from './renderer';

export type HeroWallpaperProps = {
  image: string;
  imageMobile?: string;
  depth: string;
  poster: string;
  /** optional portrait-screen poster */
  posterMobile?: string;
  /** face position in the media (0..1). Keeps it in frame on every screen. */
  focal: { x: number; y: number };
  video?: {
    enabled: boolean;
    webm?: string;
    mp4?: string;
    mobileMp4?: string;
    largeWebm?: string;
    largeMp4?: string;
    focal?: { x: number; y: number };
    /** map hero scroll progress to currentTime (needs an all-intra clip) */
    scrub?: boolean;
  };
  /** character scene: RGBA cut-out of the figure + effects map. Used when there is no video. */
  character?: { figure: string; figureMobile?: string; fx: CharacterFx } | null;
  /** 0..1.5 strength of fog, rain, particles and grain */
  overlayIntensity?: number;
  /** what to show when WebGL is unavailable: the poster image, or the plain looping video if one exists */
  fallback?: 'poster' | 'video';
  /** start the entrance (light comes up, signal resolves) */
  entered: boolean;
  onProgress?: (p: number) => void;
  onReady?: (mode: Mode) => void;
};

export type Mode = 'loading' | 'webgl-video' | 'webgl-image' | 'video' | 'poster';

async function videoExists(url?: string) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    // dev servers answer unknown paths with index.html, so check the type too
    return r.ok && (r.headers.get('content-type') ?? '').startsWith('video');
  } catch {
    return false;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

type Conn = { effectiveType?: string; saveData?: boolean };

/** Pick the lightest clip that suits this screen. 4K/1440p only on big screens with a fast connection. */
async function pickVideoSources(v: NonNullable<HeroWallpaperProps['video']>) {
  const conn = (navigator as Navigator & { connection?: Conn }).connection;
  const slow = conn?.saveData || (conn?.effectiveType && conn.effectiveType !== '4g');
  const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const large = window.matchMedia('(min-width: 2200px)').matches && !slow && conn?.effectiveType === '4g';

  if (mobile && (await videoExists(v.mobileMp4))) return [{ src: v.mobileMp4!, type: 'video/mp4' }];
  if (large) {
    const [w, m] = await Promise.all([videoExists(v.largeWebm), videoExists(v.largeMp4)]);
    const out = [];
    if (w) out.push({ src: v.largeWebm!, type: 'video/webm' });
    if (m) out.push({ src: v.largeMp4!, type: 'video/mp4' });
    if (out.length) return out;
  }
  const [w, m] = await Promise.all([videoExists(v.webm), videoExists(v.mp4)]);
  const out = [];
  if (w) out.push({ src: v.webm!, type: 'video/webm' });
  if (m) out.push({ src: v.mp4!, type: 'video/mp4' });
  return out;
}

function makeVideo(sources: { src: string; type: string }[], poster: string) {
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto', poster });
  video.crossOrigin = 'anonymous';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  for (const s of sources) {
    const el = document.createElement('source');
    el.src = s.src;
    el.type = s.type;
    video.appendChild(el);
  }
  return new Promise<HTMLVideoElement | null>((resolve) => {
    let settled = false;
    const done = (v: HTMLVideoElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (v) v.play().catch(() => {});
      resolve(v);
    };
    const timer = window.setTimeout(() => done(null), 8000);
    // metadata is enough to size the texture; frames stream in as they decode
    video.addEventListener('loadedmetadata', () => done(video), { once: true });
    video.addEventListener('error', () => done(null), { once: true });
    // <source> errors don't reach the <video>; if the last source fails, give up right away
    video.lastElementChild?.addEventListener('error', () => done(null), { once: true });
    video.load();
  });
}

export default function HeroWallpaper(props: HeroWallpaperProps) {
  const { image, imageMobile, depth, poster, posterMobile, focal, video: videoCfg, character, overlayIntensity = 1, fallback = 'video', entered, onProgress, onReady } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plainVideoHost = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WallpaperRenderer | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [shade, setShade] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let createdVideo: HTMLVideoElement | null = null;

    (async () => {
      const finish = (m: Mode) => {
        if (cancelled) return;
        setMode(m);
        onReady?.(m);
      };
      if (scene.reducedMotion) return finish('poster');

      const sources = videoCfg?.enabled ? await pickVideoSources(videoCfg) : [];
      const video = sources.length ? await makeVideo(sources, poster) : null;
      createdVideo = video;
      if (cancelled) return;

      if (!hasWebGL()) {
        if (video && fallback === 'video' && plainVideoHost.current) {
          video.className = 'h-full w-full object-cover';
          video.style.objectPosition = `${(videoCfg?.focal ?? focal).x * 100}% ${(videoCfg?.focal ?? focal).y * 100}%`;
          plainVideoHost.current.appendChild(video);
          return finish('video');
        }
        return finish('poster');
      }

      try {
        const { createRenderer } = await import('./renderer');
        if (cancelled || !canvasRef.current) return;
        const mobile = window.matchMedia('(max-width: 768px)').matches;
        const useCharacter = !video && !!character;
        const r = await createRenderer({
          canvas: canvasRef.current,
          imageSrc: useCharacter
            ? (mobile && character!.figureMobile) || character!.figure
            : mobile && imageMobile ? imageMobile : image,
          depthSrc: depth,
          video,
          character: useCharacter ? character!.fx : null,
          focal: video ? videoCfg?.focal ?? focal : focal,
          intensity: overlayIntensity,
          scrub: !!videoCfg?.scrub,
          onProgress,
        });
        if (cancelled) return r.dispose();
        rendererRef.current = r;
        canvasRef.current.addEventListener('webglcontextlost', () => setMode('poster'));
        document.documentElement.dataset.heroMode = video ? 'webgl-video' : useCharacter ? 'webgl-character' : 'webgl-image';
        finish(video ? 'webgl-video' : 'webgl-image');
      } catch (err) {
        console.warn('[HeroWallpaper] WebGL failed, showing poster', err);
        finish('poster');
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      createdVideo?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (entered) rendererRef.current?.enter(scene.reducedMotion);
  }, [entered, mode]);

  // Non-WebGL modes: dim the wallpaper as you scroll so content stays readable.
  useEffect(() => {
    if (mode === 'webgl-image' || mode === 'webgl-video' || mode === 'loading') return;
    const onScroll = () => setShade(Math.min(1, window.scrollY / window.innerHeight));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mode]);

  const webgl = mode === 'webgl-image' || mode === 'webgl-video';
  const pos = `${focal.x * 100}% ${focal.y * 100}%`;

  return (
    <div className="hero-wallpaper pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg" aria-hidden="true">
      {/* Poster composition: same layout as the WebGL scene, used before boot, for reduced motion and as fallback */}
      <div className={`absolute inset-0 transition-opacity duration-[1600ms] ${webgl ? 'opacity-0' : entered || scene.reducedMotion ? 'opacity-100' : 'opacity-0'}`}>
        <picture>
          {posterMobile && <source media="(max-aspect-ratio: 1/1)" srcSet={posterMobile} />}
          <img src={poster} alt="" {...{ fetchpriority: 'high' }} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
        </picture>
        <div ref={plainVideoHost} className="absolute inset-0" />
        <div className="absolute inset-0 bg-bg transition-opacity duration-300" style={{ opacity: shade * 0.72 }} />
      </div>
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${webgl ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
