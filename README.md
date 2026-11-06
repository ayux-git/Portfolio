# Ayush Raj: portfolio

A cinematic, single-page portfolio. The hero is a **live character scene**: the AI avatar is cut out of its background and rendered in a WebGL shader as a low-key figure with a cool rim light, the phone in his hand lighting his face, the **red thread on his wrists glowing and giving off energy**, a large ring behind him whose bright crescent turns toward the cursor, floating shards, smoke and ground fog. It resolves out of a **1-bit dithered "signal" into full color** as the page loads, then dissolves back into the signal as you scroll. That signal stays behind the rest of the site as one continuous scene.

Stack: Vite, React, TypeScript, Tailwind CSS, three.js (custom shader), GSAP + ScrollTrigger, Lenis.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Node 18+ (built and tested on Node 24).

## Edit the content

**Everything the site says lives in [`src/content.ts`](src/content.ts):** name, links, intro, projects, skills, achievements, hobbies, contact copy and the hero media settings. Each block has a comment showing how to add an entry:

- **New project:** copy an object in `projects`. The right side of each card is a small built-in diagram (`preview.kind`: `assistant`, `weather`, `matrix`) or `none`.
- **New certificate / achievement:** add to `achievements`.
- **Experience / open source (GSoC etc.):** add to `experience`. The section stays hidden while that list is empty.

Colors, spacing and fonts: CSS variables at the top of [`src/index.css`](src/index.css) (`--accent` is the red thread from the avatar's bracelet). Fonts are loaded in [`index.html`](index.html).

## Where files go

| File | Put it here | Then run |
| --- | --- | --- |
| AI avatar (hero) | `assets-src/avatar-source.png` | the hero pipeline below |
| About picture (Fig. 02) | `assets-src/portrait-avatar-source.png` | `npm run assets`, then check the crop and the `portraitAccent` boxes in `content.ts` |
| CV | `public/Ayush_Raj_CV.pdf` (exact name) | – |
| Live-wallpaper clip | `public/hero-loop.webm` + `public/hero-loop.mp4` | see below |
| Mobile clip (optional) | `public/hero-loop-mobile.mp4` | – |
| Large-screen clip (optional) | `public/hero-loop-1440.webm` / `.mp4` | – |
| Poster (first frame) | `public/hero-poster.webp` | auto-made from the avatar; replace when you add a clip |
| Social share image | `public/og-image.jpg` (1200×630) | auto-made by `npm run assets`; replace any time |

### Hero pipeline (after replacing the avatar)

```bash
npm run assets                 # crops the avatar -> assets-src/avatar-hero.png (+ web images, Fig. 02, OG image)
npm run depth                  # Depth Anything V2 (small), local ONNX -> public/hero-depth.png
npm run cutout                 # MODNet background removal -> assets-src/hero-alpha.png
python scripts/merge-alpha.py  # hair from the matte + body from the depth map -> assets-src/hero-alpha-merged.png
npm run assets                 # again: builds public/hero-figure.webp (+ mobile) with that alpha
python scripts/make-fx.py      # glow map (red thread, phone) -> public/hero-fx.png; prints emitter positions
npm run dev                    # then, in another terminal:
npm run poster                 # captures stills of the live scene -> public/hero-poster(-mobile).webp
npm run assets                 # last time: rebuilds the OG image from the new still
```

Paste the positions `make-fx.py` prints into `hero.character.fx` in `content.ts`. The boxes inside `make-fx.py` (where the wrists and phone are) and the railing cut-outs in `merge-alpha.py` are tuned to the current avatar, so adjust them if you change the picture. The models download on first run (~100 MB for depth, ~25 MB for the matte).

---

## The live wallpaper: video mode

Until a clip exists, the hero uses the **character scene** (cut-out avatar + depth map + glow map). When `public/hero-loop.webm` and/or `public/hero-loop.mp4` appear, the site switches to **video mode automatically**. The clip plays as a texture inside the same shader, so the cursor and scroll reactions still work. No code change needed.

### 1. Make the clip

Use any image-to-video tool on `assets-src/avatar-source.png`. A prompt that matches the scene:

> Slow cinematic push-in, camera almost still. Light rain falling, hair and jacket moving slightly in the wind, subject breathing calmly, neon signs softly flickering, embers drifting upward. No cuts, no face changes, seamless loop, 8–12 seconds.

Keep a **16:9, 3840×2160 master** (`master.mp4`) for yourself. Never ship it.

### 2. Make it loop seamlessly (crossfade the last second into the first)

`ffmpeg` 4.3+ is needed (`winget install ffmpeg`). Set `D` to the clip length in seconds:

```bash
D=10
ffmpeg -i master.mp4 -filter_complex \
 "[0:v]split[a][b];[a]trim=start=1,setpts=PTS-STARTPTS[main];[b]trim=0:1,setpts=PTS-STARTPTS[head];[main][head]xfade=transition=fade:duration=1:offset=$((D-2))[out]" \
 -map "[out]" -an -c:v libx264 -crf 14 master-loop.mp4
```

The output starts at original second 1 and ends by fading into seconds 0–1, so the last frame flows straight into the first.

### 3. Web versions (no audio, 24–30 fps, aim for under 6 MB)

```bash
# 1080p default, H.264 MP4
ffmpeg -i master-loop.mp4 -vf "scale=1920:-2,fps=30" -c:v libx264 -profile:v high -preset slow -crf 24 \
  -pix_fmt yuv420p -movflags +faststart -an public/hero-loop.mp4

# 1080p default, VP9 WebM (loaded first by browsers that support it)
ffmpeg -i master-loop.mp4 -vf "scale=1920:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 \
  -deadline good -cpu-used 2 -an public/hero-loop.webm
#   (AV1 alternative: -c:v libsvtav1 -preset 6 -crf 40)

# optional 1440p, only loaded on screens ≥2200px wide on a fast connection
ffmpeg -i master-loop.mp4 -vf "scale=2560:-2,fps=30" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -an public/hero-loop-1440.mp4
ffmpeg -i master-loop.mp4 -vf "scale=2560:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -an public/hero-loop-1440.webm

# mobile: 720p-wide portrait crop around the face (move 0.5 toward your face's x position, 0..1)
ffmpeg -i master-loop.mp4 -vf "crop=ih*9/16:ih:(iw-ih*9/16)*0.5:0,scale=720:-2,fps=30" -c:v libx264 -preset slow -crf 26 \
  -pix_fmt yuv420p -movflags +faststart -an public/hero-loop-mobile.mp4
```

The 4K master is never loaded. The site picks the mobile clip on phones, the 1440p clip only on very large screens with a fast connection (and never with Save-Data on), and the 1080p clip otherwise.

### 4. Poster and depth map from the first frame

```bash
ffmpeg -i public/hero-loop.mp4 -frames:v 1 assets-src/hero-frame.png
ffmpeg -i assets-src/hero-frame.png -vf scale=1600:-2 -c:v libwebp -quality 78 public/hero-poster.webp
npm run depth -- assets-src/hero-frame.png     # writes public/hero-depth.png for the clip
```

Then set `hero.video.focal` in `content.ts` to where the face sits in the clip (0..1 of width and height). This keeps the face in frame on every screen. **Regenerating the depth map matters:** the parallax and the cursor light come from it.

### 5. Optional: scroll-scrubbed mode

With an all-intra clip (every frame a keyframe), scroll position can drive the clip's time instead of looping:

```bash
ffmpeg -i master-loop.mp4 -vf "scale=1920:-2,fps=30" -c:v libx264 -g 1 -keyint_min 1 -crf 26 \
  -pix_fmt yuv420p -movflags +faststart -an public/hero-loop.mp4
```

Then set `hero.video.scrub: true`. All-intra files are 2–4× bigger. If scrubbing feels choppy, switch back to `false` to restore the normal loop, which eases into slow motion while you scroll.

---

## Deploy to Vercel

**Dashboard:** push this folder to a GitHub repo, then at vercel.com choose **Add New → Project**, import the repo and accept the detected settings (Framework: **Vite**, Build: `npm run build`, Output: `dist`). Deploy.

**CLI:**

```bash
npm i -g vercel
vercel          # first run links the project, gives a preview URL
vercel --prod   # production
```

`vercel.json` sets long cache headers for hashed assets and a week for media.

## Check it yourself

With `npm run dev` running:

```bash
node scripts/verify.mjs verify-shots
```

This drives Microsoft Edge through Playwright. It captures desktop, mobile (390 px) and 360 px reduced-motion screenshots and moves the mouse, hovers and scrolls with before/after captures. It prints how much the frame changed (idle drift vs. cursor vs. scroll), console errors and horizontal overflow.

## How the hero works (short version)

- `src/hero/HeroWallpaper.tsx` picks the mode: **WebGL + video**, **WebGL + image**, a **plain looping video** (no WebGL) or the **static poster** (reduced motion / failure). Props: media sources, focal point, overlay intensity and fallback behavior.
- `src/hero/renderer.ts` + `shaders.ts`: one full-screen fragment shader plus an embers layer, driven by GSAP's ticker (the same loop that drives Lenis and ScrollTrigger). Pixel ratio is capped at 1.5 (1.25 on phones), it renders at ~30 fps once you leave the hero, pauses when the tab is hidden, and pauses the video off-hero.
- `src/lib/scene.ts`: shared state (pointer, tilt, scroll progress, active section) and the background tone for each section.
- `prefers-reduced-motion`: no WebGL, no smooth scroll, no cursor effects. The static poster shows instead, with simple fades.
