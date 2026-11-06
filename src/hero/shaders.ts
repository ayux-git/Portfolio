/* Wallpaper shaders. Coordinates: `p` is screen uv with a TOP-LEFT origin. */

export const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const quadFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2  uRes;        // drawing-buffer pixels
uniform vec2  uDepthTexel; // 1 / depth texture size
uniform float uDpr;
uniform float uTime;
uniform vec4  uLayout;     // sharp subject layer: left, top, width, height (screen uv)
uniform vec4  uBack;       // blurred backdrop layer
uniform vec4  uFeather;    // feather width per edge of the subject layer (l, r, t, b), layer uv
uniform vec2  uFocal;      // subject focal point on screen
uniform vec2  uMouse;      // smoothed pointer, -1..1, y up
uniform vec2  uLight;      // cursor light position on screen
uniform float uLightOn;
uniform float uVel;        // pointer speed 0..1
uniform float uProgress;   // hero scroll 0..1
uniform float uEnter;      // entrance 0..1
uniform float uDim;
uniform float uDither;
uniform float uZoom;
uniform float uTint;
uniform float uFog;
uniform float uShiftX;
uniform float uPulse;
uniform float uIntensity;
uniform float uParallax;
uniform vec3  uAccent;
uniform vec3  uInk;
uniform vec3  uBg;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
// ordered (Bayer) dither threshold, 8x8
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float depthAt(vec2 uv) { return texture2D(uDepth, clamp(uv, 0.0, 1.0), 1.0).r; }

float rainLayer(vec2 uv, float scale, float speed, float seed) {
  uv.x += uv.y * 0.16;
  vec2 g = vec2(uv.x * scale, uv.y * scale * 0.07 - uTime * speed);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float h = hash(id + seed);
  float x = abs(f.x - 0.5 - (h - 0.5) * 0.6);
  float streak = smoothstep(0.07, 0.0, x) * smoothstep(0.0, 0.3, f.y) * smoothstep(1.0, 0.6, f.y);
  return streak * step(0.9, h);
}

void main() {
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);

  // ---- cursor ripple: a faint ring of distortion trailing the pointer
  vec2 dl = (p - uLight) * vec2(aspect, 1.0);
  float dist = length(dl);
  p += (dl / max(dist, 1e-4)) * sin(dist * 70.0 - t * 6.0) * exp(-dist * 9.0) * uVel * 0.004 * uIntensity;

  // ---- camera: dolly toward the subject, slow drift, gentle breathing
  vec2 drift = vec2(sin(t * 0.11), cos(t * 0.087)) * 0.006;
  float z = uZoom * (1.0 + 0.006 * sin(t * 0.5));
  vec2 cp = (p - uFocal) / z + uFocal + drift + vec2(uShiftX, 0.0);

  // ---- depth parallax (two-step lookup so edges don't smear)
  vec2 mm = vec2(uMouse.x, -uMouse.y) * uParallax;
  vec2 iuv = (cp - uLayout.xy) / uLayout.zw;
  float k = 0.024;
  float d0 = depthAt(iuv);
  vec2 disp = mm * (d0 - 0.25) * k;
  float d1 = depthAt(iuv - disp / uLayout.zw);
  disp = mm * (d1 - 0.25) * k;
  vec2 suv = iuv - disp / uLayout.zw;
  // breathing: near pixels scale a hair around the chest
  vec2 chest = vec2(0.5, 0.5);
  suv = chest + (suv - chest) * (1.0 - 0.004 * sin(t * 1.05) * smoothstep(0.3, 0.6, d1));

  vec4 e = vec4(suv.x, 1.0 - suv.x, suv.y, 1.0 - suv.y);
  float mask = smoothstep(0.0, max(uFeather.x, 1e-4), e.x) * smoothstep(0.0, max(uFeather.y, 1e-4), e.y)
             * smoothstep(0.0, max(uFeather.z, 1e-4), e.z) * smoothstep(0.0, max(uFeather.w, 1e-4), e.w);
  float d = depthAt(suv) * mask;

  // ---- out-of-focus backdrop (same frame, deep blur, moves the other way)
  vec2 buv = (cp - uBack.xy) / uBack.zw + mm * 0.008 / uBack.zw;
  vec3 back = texture2D(uImage, buv, 4.5).rgb
            + texture2D(uImage, buv + vec2(0.012, 0.004), 4.5).rgb
            + texture2D(uImage, buv - vec2(0.004, 0.012), 4.5).rgb;
  back *= 0.17;

  vec3 col = mix(back, texture2D(uImage, suv).rgb, mask);

  // ---- light that follows the cursor (lit from depth-map normals)
  float dx = depthAt(suv + vec2(uDepthTexel.x * 2.0, 0.0)) - depthAt(suv - vec2(uDepthTexel.x * 2.0, 0.0));
  float dy = depthAt(suv + vec2(0.0, uDepthTexel.y * 2.0)) - depthAt(suv - vec2(0.0, uDepthTexel.y * 2.0));
  vec3 n = normalize(vec3(-dx, -dy, 0.06));
  vec3 L = normalize(vec3((uLight - p) * vec2(aspect, 1.0), 0.28));
  float diffuse = max(dot(n, L), 0.0);
  float rim = pow(1.0 - n.z, 1.4) * max(dot(normalize(n.xy + 1e-5), normalize(L.xy + 1e-5)), 0.0);
  float spot = exp(-dot(dl, dl) * 3.2);
  float on = uLightOn;
  col *= 0.8 + 0.42 * spot * on + 0.22 * diffuse * spot * on * mask;
  vec3 rimCol = mix(vec3(0.72, 0.86, 1.0), uAccent, clamp(uPulse * 0.8, 0.0, 1.0));
  col += rimCol * rim * mask * smoothstep(0.15, 0.4, d) * (0.18 + 0.85 * spot * on + 0.7 * uPulse) * 0.55;

  // ---- light sweep: slow on its own, pushed across the subject by scroll
  float sweepPos = fract(t / 14.0) * 1.9 - 0.45 + uProgress * 1.1;
  float band = exp(-pow((p.x * 0.8 + p.y * 0.35) - sweepPos, 2.0) * 80.0);
  col += vec3(0.55, 0.7, 1.0) * band * mask * smoothstep(0.2, 0.5, d) * 0.14 * uIntensity;

  // ---- exposure breathing and an occasional neon flicker in the background
  col *= 1.0 + 0.035 * sin(t * 0.7);
  float flick = step(0.93, noise(vec2(t * 7.0, 3.1))) * 0.07;
  col *= 1.0 - flick * (1.0 - mask * 0.8);

  // ---- fog: drifts on its own, swirls away from the cursor, thins where the light is
  vec2 fp = p * vec2(aspect, 1.0) * 1.6;
  vec2 away = (dl / max(dist, 1e-3)) * exp(-dist * dist * 9.0) * 0.4 * on;
  vec2 flow = vec2(t * 0.025, -t * 0.012);
  float f = fbm(fp + flow - away + fbm(fp * 0.7 - flow * 1.3 + away) * 1.2);
  float fogMask = smoothstep(0.35, 0.95, f) * (0.45 + 0.55 * p.y) * (1.0 - 0.55 * d);
  fogMask *= 1.0 - 0.45 * exp(-dist * dist * 10.0) * on;
  col = mix(col, vec3(0.10, 0.14, 0.21) + col * 0.3, clamp(fogMask * uFog * uIntensity, 0.0, 0.85));

  // ---- rain, two depths, nudged by the parallax
  vec2 rp = p * vec2(aspect, 1.0);
  float rain = rainLayer(rp + mm * 0.012, 95.0, 1.7, 1.0) * 0.5 + rainLayer(rp + mm * 0.025, 48.0, 1.15, 7.0) * 0.8;
  col += vec3(0.6, 0.75, 0.95) * rain * 0.11 * uIntensity * (1.0 - uDither * 0.6);

  // ---- tone: desaturate and lean toward the accent as you scroll
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum), uTint * 0.55);
  col = mix(col, lum * uAccent * 1.7, uTint * 0.32);

  // ---- entrance: light comes up from the face outward
  float fd = length((p - uFocal) * vec2(aspect, 1.0));
  float exposure = smoothstep(fd * 0.55, fd * 0.55 + 0.4, uEnter * 1.45);

  // ---- SIGNATURE: signal -> image. A 1-bit ordered dither that resolves into colour.
  float th = bayer8(gl_FragCoord.xy / (2.0 * uDpr));
  float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float bit = step(th, pow(clamp(l2 * 1.55, 0.0, 1.0), 0.9));
  vec3 ink = mix(uInk, uAccent, uTint * 0.25 + uPulse * 0.25);
  vec3 dcol = mix(uBg, ink * (1.0 - uDim * 0.62), bit);
  float resolve = smoothstep(fd - 0.2, fd + 0.05, (uEnter - 0.35) * 2.3);
  float amt = max(uDither, 1.0 - resolve);
  // the cursor is a lens that brings the image back into focus
  amt = clamp(amt - exp(-dot(dl, dl) * 16.0) * on * 1.15 * step(0.01, uDither), 0.0, 1.0);
  float th2 = bayer8(gl_FragCoord.xy / (6.0 * uDpr));
  col = mix(col, dcol, step(th2, amt - 0.001));

  col *= 1.0 - uDim * 0.84;
  col *= exposure;

  // ---- vignette + film grain
  vec2 vq = (vUv - 0.5) * vec2(aspect, 1.0);
  float vig = smoothstep(1.25, 0.25, length(vq * vec2(0.72, 1.0)));
  col *= mix(0.5, 1.0, vig);
  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.035 * uIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uAspect;
uniform float uPx;
uniform vec2  uMouse;
uniform vec2  uLight;
uniform float uLightOn;
attribute vec4 aSeed;
varying float vAlpha;
varying float vKind;

void main() {
  float kind = step(0.6, aSeed.w);            // 0 = ember (rises), 1 = dust (drifts)
  float zd = aSeed.z;                          // 0 far .. 1 near
  float speed = mix(0.04, 0.012, kind) * (0.55 + zd * 0.9);
  float y = fract(aSeed.y + uSpeed * speed);
  vec2 pos = vec2(aSeed.x * 2.2 - 1.1, mix(-1.1, 1.1, y));
  pos.x += sin(uTime * (0.3 + zd * 0.5) + aSeed.w * 20.0) * 0.035;

  pos += uMouse * (0.006 + zd * 0.035);       // parallax by depth

  // pushed away from the cursor, then settles back as the cursor moves on
  vec2 light = vec2(uLight.x * 2.0 - 1.0, 1.0 - uLight.y * 2.0);
  vec2 dv = (pos - light) * vec2(uAspect, 1.0);
  float dd = length(dv);
  pos += (dv / max(dd, 1e-3)) / vec2(uAspect, 1.0) * exp(-dd * dd * 12.0) * 0.13 * uLightOn;

  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = uPx * mix(1.1, 3.8, zd * zd) * mix(1.0, 0.65, kind);
  float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.w * 2.0) + aSeed.w * 40.0);
  vAlpha = smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.7, y) * tw * mix(0.9, 0.45, kind);
  vKind = kind;
}
`;

export const particleFragment = /* glsl */ `
precision highp float;
uniform vec3  uAccent;
uniform float uOpacity;
varying float vAlpha;
varying float vKind;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.0, r);
  a *= a;
  vec3 ember = mix(vec3(1.0, 0.62, 0.32), uAccent, 0.45);
  vec3 dust = vec3(0.75, 0.85, 1.0);
  gl_FragColor = vec4(mix(ember, dust, vKind) * a * vAlpha * uOpacity, 1.0);
}
`;
