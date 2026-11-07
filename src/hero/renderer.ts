import * as THREE from 'three';
import { gsap } from 'gsap';
import { scene, targetTone, type Tone } from '../lib/scene';
import { quadFragment, quadVertex, particleFragment, particleVertex } from './shaders';
import { characterFragment, shardFragment, shardVertex } from './characterShaders';

export type CharacterFx = {
  /** effects map: R = glowing thread, G = phone screen */
  src: string;
  /** emitter positions, 0..1 of the figure image */
  threads: [number, number][];
  phone: [number, number];
};

export type RendererOptions = {
  canvas: HTMLCanvasElement;
  /** media for the wallpaper (video mode) or the cut-out figure (character mode) */
  imageSrc: string;
  depthSrc: string;
  video?: HTMLVideoElement | null;
  /** character mode: the figure is an RGBA cut-out plus an effects map */
  character?: CharacterFx | null;
  focal: { x: number; y: number };
  intensity: number;
  /** scroll drives currentTime instead of looping */
  scrub?: boolean;
  onProgress?: (p: number) => void;
};

export type WallpaperRenderer = {
  enter: (instant?: boolean) => void;
  dispose: () => void;
};

const hex = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const cssVar = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return hex(fallback);
  const [r, g, b] = v.split(/\s+/).map(Number); // vars are stored as "r g b"
  return new THREE.Vector3(r / 255, g / 255, b / 255);
};

// CPU copy of the shader's value noise, for values that are the same on every pixel (computed once per frame, not per pixel)
const fract = (x: number) => x - Math.floor(x);
function hash2(x: number, y: number) {
  x = fract(x * 123.34);
  y = fract(y * 456.21);
  const d = x * (x + 45.32) + y * (y + 45.32);
  return fract((x + d) * (y + d));
}
function noise2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function loadTexture(loader: THREE.TextureLoader, src: string) {
  return new Promise<THREE.Texture>((resolve, reject) => loader.load(src, resolve, undefined, reject));
}

export async function createRenderer(opts: RendererOptions): Promise<WallpaperRenderer> {
  const { canvas, video } = opts;
  const characterMode = !video && !!opts.character;
  const mobile = scene.coarse || window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  // Render resolution. The shader is fill-rate bound (cost grows with pixel count), so:
  //  - the hero renders at up to `maxDprFor()`, lowered step by step if this GPU can't hold the frame rate;
  //  - past the hero, on touch screens, the dimmed and dithered backdrop renders at half CSS resolution
  //    (0.5 keeps the dither cells whole pixels: 2 CSS px = 1 render px).
  const dprCap = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  // pixel budget, so 1440p / 4K / high-DPI screens don't shade 4-8M pixels a frame (1080p stays native)
  const PIXEL_BUDGET = mobile ? 0.65e6 : 2.1e6;
  const maxDprFor = (w: number, h: number) => Math.max(0.5, Math.min(dprCap, Math.sqrt(PIXEL_BUDGET / (w * h))));
  // Touch screens only: on desktop the cursor's "lens" resolves the image sharply mid-page, and half
  // resolution visibly softens it. Phones have no cursor, and their GPUs gain the most.
  const BACKDROP_DPR = scene.coarse ? 0.5 : Infinity;
  let quality = 1;
  const dpr = maxDprFor(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x07080b, 1);

  // ---------- textures
  const loader = new THREE.TextureLoader();
  const total = characterMode ? 3 : 2;
  let done = 0;
  const tick = <T,>(t: T) => (opts.onProgress?.(++done / total), t);
  const [depthTex, fxTex] = await Promise.all([
    loadTexture(loader, opts.depthSrc).then(tick),
    characterMode ? loadTexture(loader, opts.character!.src).then(tick) : Promise.resolve(null),
  ]);
  let imageTex: THREE.Texture;
  let imageAspect: number;
  if (video) {
    const vt = new THREE.VideoTexture(video);
    vt.generateMipmaps = true;
    vt.minFilter = THREE.LinearMipmapLinearFilter;
    imageTex = vt;
    imageAspect = video.videoWidth / video.videoHeight || 16 / 9;
    tick(null);
  } else {
    imageTex = await loadTexture(loader, opts.imageSrc).then(tick);
    const img = imageTex.image as HTMLImageElement;
    imageAspect = img.width / img.height;
  }
  for (const t of [imageTex, depthTex, fxTex]) {
    if (!t) continue;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = false; // the shaders work in top-left screen coordinates
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
  }
  const depthImg = depthTex.image as HTMLImageElement;
  const imgEl = imageTex.image as HTMLImageElement;

  // ---------- fullscreen scene
  const fx = opts.character;
  const uniforms = {
    uImage: { value: imageTex },
    uDepth: { value: depthTex },
    uFx: { value: fxTex },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDepthTexel: { value: new THREE.Vector2(1 / depthImg.width, 1 / depthImg.height) },
    uFigTexel: { value: new THREE.Vector2(1 / (imgEl.width || 1536), 1 / (imgEl.height || 2435)) },
    uDpr: { value: dpr },
    uTime: { value: 0 },
    uGust: { value: 1 },
    uFlick: { value: 1 },
    uFlame: { value: 1 },
    uLayout: { value: new THREE.Vector4(0, 0, 1, 1) },
    uBack: { value: new THREE.Vector4(0, 0, 1, 1) },
    uFeather: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFocal: { value: new THREE.Vector2(0.5, 0.4) },
    uRing: { value: new THREE.Vector3(0.65, 0.4, 0.42) },
    uThreadA: { value: new THREE.Vector2(...(fx?.threads[0] ?? [0, 0])) },
    uThreadB: { value: new THREE.Vector2(...(fx?.threads[1] ?? fx?.threads[0] ?? [0, 0])) },
    uPhone: { value: new THREE.Vector2(...(fx?.phone ?? [0, 0])) },
    uMouse: { value: new THREE.Vector2() },
    uLight: { value: new THREE.Vector2(0.5, 0.35) },
    uLightOn: { value: 0.35 },
    uVel: { value: 0 },
    uProgress: { value: 0 },
    uEnter: { value: 0 },
    uDim: { value: 0 },
    uDither: { value: 0 },
    uZoom: { value: 1 },
    uTint: { value: 0 },
    uFog: { value: 0.35 },
    uShiftX: { value: 0 },
    uPulse: { value: 0 },
    uIntensity: { value: opts.intensity },
    uParallax: { value: 1 },
    uAccent: { value: cssVar('--accent', '#F2463A') },
    uInk: { value: cssVar('--ink', '#ECEEF2') },
    uBg: { value: cssVar('--bg', '#07080B') },
  };
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: characterMode ? characterFragment : quadFragment,
      uniforms,
      depthTest: false,
      depthWrite: false,
    }),
  );
  quad.renderOrder = 0;

  // ---------- floating shards (character mode)
  const shardCount = characterMode ? (mobile ? 16 : 38) : 0;
  const shardSeeds = new Float32Array(shardCount * 4);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(shardCount * 3), 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(shardSeeds, 4));
  const sUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uAspect: { value: 1 },
    uPx: { value: dpr },
    uMouse: uniforms.uMouse,
    uLight: uniforms.uLight,
    uLightOn: uniforms.uLightOn,
    uAccent: uniforms.uAccent,
    uOpacity: { value: 0 },
  };
  const shards = new THREE.Points(
    sGeo,
    new THREE.ShaderMaterial({ vertexShader: shardVertex, fragmentShader: shardFragment, uniforms: sUniforms, transparent: true, depthTest: false, depthWrite: false }),
  );
  shards.frustumCulled = false;
  shards.renderOrder = 1;

  // ---------- dust + embers
  const count = mobile ? 90 : 240;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const pUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uAspect: { value: 1 },
    uPx: { value: dpr },
    uMouse: uniforms.uMouse,
    uLight: uniforms.uLight,
    uLightOn: uniforms.uLightOn,
    uAccent: uniforms.uAccent,
    uOpacity: { value: 0 },
  };
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: pUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.renderOrder = 2;

  const scene3 = new THREE.Scene();
  scene3.add(quad, shards, points);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---------- layout: keep the face in frame on every aspect ratio
  const focal = opts.focal;
  function layoutCharacter(A: number, a: number) {
    // the figure stands on the right on wide screens (room for the headline), centred on phones
    const H = A >= 1 ? 1.12 : 0.94;
    const W = (H * a) / A;
    const tx = A >= 1 ? (A > 1.3 ? 0.68 : 0.64) : 0.5;
    let left = tx - focal.x * W;
    if (A >= 1) left = Math.min(left, 1 - W * 0.82);
    const top = A >= 1 ? 0.07 : 0.03;
    uniforms.uLayout.value.set(left, top, W, H);
    uniforms.uFocal.value.set(left + focal.x * W, top + focal.y * H);
    const R = A >= 1 ? 0.43 : Math.min(0.42, A * 0.62);
    uniforms.uRing.value.set(left + 0.5 * W, top + 0.37 * H, R);

    // far shards keep clear of the figure (they would read as floating in front of it); near ones go anywhere
    const figL = left * 2 - 1, figR = (left + W) * 2 - 1;
    for (let i = 0; i < shardCount; i++) {
      const near = Math.random() ** 0.8;
      let x = Math.random();
      if (near < 0.6) {
        for (let tries = 0; tries < 12; tries++) {
          const nx = x * 2.2 - 1.1;
          if (nx < figL + 0.1 || nx > figR - 0.1) break;
          x = Math.random();
        }
      }
      shardSeeds.set([x, Math.random(), near, Math.random()], i * 4);
    }
    sGeo.attributes.aSeed.needsUpdate = true;
  }

  function layoutWallpaper(A: number, a: number) {
    // Landscape screen + portrait media: the subject takes ~58% of the width on the right,
    // the rest is the same frame as an out-of-focus backdrop (room for the headline).
    const wMin = A >= 1 && a < A * 0.8 ? (A > 1.5 ? 0.58 : 0.66) : 1;
    let H = Math.max(1, (wMin * A) / a);
    let W = (H * a) / A;
    if (W >= 1 && H >= 1 && wMin === 1) {
      if (a > A) { H = 1; W = a / A; } else { W = 1; H = A / a; }
    }
    const tx = W < 1 ? 1 - W + focal.x * W : A < 1 ? 0.5 : 0.62;
    const ty = A < 1 ? 0.25 : 0.34;
    let left = tx - focal.x * W;
    let top = ty - focal.y * H;
    left = W < 1 ? Math.min(Math.max(left, 0), 1 - W) : Math.min(Math.max(left, 1 - W), 0);
    top = Math.min(Math.max(top, 1 - H), 0);
    uniforms.uLayout.value.set(left, top, W, H);
    const fw = 0.22;
    uniforms.uFeather.value.set(left > 0.001 ? fw : 0, left + W < 0.999 ? fw : 0, 0, 0);
    uniforms.uFocal.value.set(left + focal.x * W, top + focal.y * H);
    let bW: number, bH: number;
    if (a > A) { bH = 1.12; bW = (bH * a) / A; } else { bW = 1.12; bH = (bW * A) / a; }
    uniforms.uBack.value.set((1 - bW) / 2, Math.max(1 - bH, Math.min(0, 0.32 - focal.y * bH)), bW, bH);
  }

  let scale = 0;
  function applyScale(s: number, force = false) {
    if (s === scale && !force) return;
    scale = s;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(s);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * s, h * s);
    uniforms.uDpr.value = pUniforms.uPx.value = sUniforms.uPx.value = s;
  }
  const targetScale = (inHero: boolean) => {
    const hero = Math.max(0.5, maxDprFor(window.innerWidth, window.innerHeight) * quality);
    return inHero ? hero : Math.min(hero, BACKDROP_DPR);
  };

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    applyScale(targetScale(scene.heroProgress < 0.999 || scene.section === null), true);
    pUniforms.uAspect.value = sUniforms.uAspect.value = w / h;
    if (characterMode) layoutCharacter(w / h, imageAspect);
    else layoutWallpaper(w / h, imageAspect);
  }
  layout();
  window.addEventListener('resize', layout);
  if (video) video.addEventListener('loadedmetadata', () => { imageAspect = video.videoWidth / video.videoHeight; layout(); });

  // ---------- per-frame state
  const tone: Tone = { ...targetTone() };
  const mouse = { x: 0, y: 0 };
  const light = { x: 0.42, y: 0.38 };
  let lastPx = 0, lastPy = 0, vel = 0, particleClock = 0, frame = 0, rate = 1;
  let visible = !document.hidden;

  // Adaptive quality: if frames keep coming in slow, render fewer pixels. Only ever steps down, so it can't oscillate.
  const samples: number[] = [];
  let settle = 120; // ignore start-up (texture upload, shader warm-up) and the frames after each change
  function govern(deltaMs: number) {
    if (!visible || deltaMs > 250) return; // tab switches and stalls aren't render cost
    if (settle > 0) return void settle--;
    samples.push(deltaMs);
    if (samples.length < 60) return;
    samples.sort((a, b) => a - b);
    const median = samples[30];
    samples.length = 0;
    if (median > 20 && quality > 0.5) {
      quality = Math.max(0.5, quality - 0.25);
      settle = 45;
    }
  }

  const onVis = () => {
    visible = !document.hidden;
    settle = 60;
    if (video) visible ? video.play().catch(() => {}) : video.pause();
  };
  document.addEventListener('visibilitychange', onVis);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function render(time: number, deltaMs: number) {
    if (!visible) return;
    govern(deltaMs);
    const inHero = scene.heroProgress < 0.999 || scene.section === null;
    applyScale(targetScale(inHero));
    frame++;
    // Outside the hero the scene is a dim background: render at ~30 fps to save power.
    if (!inHero && frame % 2 === 1) return;
    const dt = Math.min(deltaMs, 50) / 16.67;

    // pointer (or device tilt / idle drift)
    let px = scene.pointer.x, py = scene.pointer.y;
    if (!scene.pointer.active) {
      if (scene.tilt.enabled) { px = scene.tilt.x; py = scene.tilt.y; }
      else { px = Math.sin(time * 0.21) * 0.45; py = Math.cos(time * 0.17) * 0.25 + 0.1; }
    }
    const k = 1 - Math.pow(1 - 0.075, dt);
    mouse.x = lerp(mouse.x, px, k);
    mouse.y = lerp(mouse.y, py, k);
    const kl = 1 - Math.pow(1 - 0.12, dt);
    light.x = lerp(light.x, (px + 1) / 2, kl);
    light.y = lerp(light.y, (1 - py) / 2, kl);
    const speed = Math.hypot(px - lastPx, py - lastPy);
    lastPx = px; lastPy = py;
    vel = lerp(vel, Math.min(speed * 25, 1), 0.08);
    const lightTarget = scene.pointer.active || scene.tilt.enabled ? 1 : 0.4;
    uniforms.uLightOn.value = lerp(uniforms.uLightOn.value, lightTarget, 0.04 * dt);

    const tgt = targetTone();
    const kt = 1 - Math.pow(1 - 0.06, dt);
    (Object.keys(tone) as (keyof Tone)[]).forEach((key) => (tone[key] = lerp(tone[key], tgt[key], kt)));

    scene.pulse *= Math.pow(0.93, dt);
    scene.scrollVelocity *= Math.pow(0.9, dt);

    uniforms.uTime.value = time;
    // same value on every pixel: computed here once instead of in the fragment shader
    uniforms.uGust.value = 0.45 + 0.55 * smoothstep(0.2, 0.8, noise2(time * 0.45, 3.7));
    uniforms.uFlick.value = 0.9 + 0.1 * noise2(time * 3.0, 7.0);
    uniforms.uFlame.value = 0.8 + 0.2 * Math.sin(time * 3.1) + 0.1 * noise2(time * 5.0, 1.0);
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uLight.value.set(light.x, light.y);
    uniforms.uVel.value = vel;
    uniforms.uProgress.value = lerp(uniforms.uProgress.value, scene.heroProgress, kt);
    uniforms.uDim.value = tone.dim;
    uniforms.uDither.value = tone.dither;
    uniforms.uZoom.value = tone.zoom;
    uniforms.uTint.value = tone.tint;
    uniforms.uFog.value = tone.fog;
    uniforms.uShiftX.value = tone.shiftX;
    uniforms.uPulse.value = lerp(uniforms.uPulse.value, scene.pulse, 0.15);
    uniforms.uParallax.value = 1 + scene.heroProgress * 0.8;

    // particles and shards speed up while scrolling, then calm down
    const sv = Math.min(scene.scrollVelocity / 30, 1);
    particleClock += (deltaMs / 1000) * (1 + sv * 4) * (inHero ? 1 : 2);
    const fade = uniforms.uEnter.value * (1 - tone.dim * 0.7) * opts.intensity;
    pUniforms.uTime.value = sUniforms.uTime.value = time;
    pUniforms.uSpeed.value = sUniforms.uSpeed.value = particleClock;
    pUniforms.uOpacity.value = fade;
    sUniforms.uOpacity.value = Math.min(1, fade * 1.3) * (1 - tone.dither * 0.5);

    // video, scrub mode: scroll position picks the frame (smoothed, one seek at a time)
    if (video && opts.scrub && video.duration) {
      if (!video.paused) video.pause();
      const target = Math.min(scene.heroProgress, 0.999) * video.duration;
      if (!video.seeking && Math.abs(video.currentTime - target) > 1 / 30) video.currentTime = lerp(video.currentTime, target, 0.35);
    }
    // video, loop mode: ease into slow motion while scrolling, recover after
    else if (video) {
      const targetRate = sv > 0.08 ? 0.5 : 1;
      rate = lerp(rate, targetRate, 0.05 * dt);
      if (Math.abs(video.playbackRate - rate) > 0.02) video.playbackRate = rate;
      if (!inHero && !video.paused) video.pause();
      else if (inHero && video.paused && visible) video.play().catch(() => {});
    }

    renderer.render(scene3, camera);
  }

  // compile shaders off the main thread where KHR_parallel_shader_compile is available
  try {
    await renderer.compileAsync(scene3, camera);
  } catch {
    /* falls back to compiling on first render */
  }
  const tickerFn = (time: number, deltaTime: number) => render(time, deltaTime);
  gsap.ticker.add(tickerFn);

  return {
    enter(instant = false) {
      if (instant) uniforms.uEnter.value = 1;
      else gsap.to(uniforms.uEnter, { value: 1, duration: 3.2, ease: 'power2.inOut' });
    },
    dispose() {
      gsap.ticker.remove(tickerFn);
      window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onVis);
      for (const o of [quad, shards, points]) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      imageTex.dispose();
      depthTex.dispose();
      fxTex?.dispose();
      renderer.dispose();
    },
  };
}
