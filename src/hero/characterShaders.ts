/* ===========================================================================
 * CHARACTER SCENE (image mode)
 * The avatar is cut out (alpha), rendered low-key with a cool rim light, lit by
 * the phone in his hand and by the cursor. The red thread on his wrists glows and
 * gives off rising energy. Behind him a large ring whose bright crescent turns
 * toward the light, a dotted "signal" ring, smoke and ground fog. Shards float in
 * a separate layer. Same tone / dither / entrance pipeline as the wallpaper.
 * Coordinates: `p` is screen uv with a TOP-LEFT origin.
 * ========================================================================= */

export const characterFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uImage;   // figure, RGBA (cut-out)
uniform sampler2D uDepth;
uniform sampler2D uFx;      // R = red thread, G = phone screen
uniform vec2  uRes;
uniform vec2  uDepthTexel;
uniform vec2  uFigTexel;
uniform float uDpr;
uniform float uTime;
uniform vec4  uLayout;
uniform vec2  uFocal;
uniform vec3  uRing;        // centre (camera space) + radius (height units)
uniform vec2  uThreadA;     // emitters, figure uv
uniform vec2  uThreadB;
uniform vec2  uPhone;
uniform vec2  uMouse;
uniform vec2  uLight;
uniform float uLightOn;
uniform float uVel;
uniform float uProgress;
uniform float uEnter;
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
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float depthAt(vec2 uv) { return texture2D(uDepth, clamp(uv, 0.0, 1.0), 1.0).r; }
float alphaAt(vec2 uv, float bias) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uImage, uv, bias).a;
}

// energy rising from an emitter (q, e in aspect-corrected camera space; y grows downward)
float wisp(vec2 q, vec2 e, float t, float seed) {
  vec2 w = q - e;
  float h = -w.y;
  float hp = max(h, 0.0);
  float sway = (noise(vec2(hp * 5.0 - t * 0.7, seed)) - 0.5) * hp * 0.6;
  float spread = 0.01 + hp * 0.28;
  float n = fbm3(vec2((w.x - sway) * 10.0 / (1.0 + hp * 5.0) + seed, hp * 6.0 - t * 1.5));
  float body = exp(-pow((w.x - sway) / spread, 2.0)) * smoothstep(-0.01, 0.025, h) * exp(-hp * 6.5);
  return body * (0.25 + smoothstep(0.42, 0.8, n) * 1.6) + exp(-dot(w, w) * 2200.0) * 1.2;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 A = vec2(aspect, 1.0);
  float t = uTime;
  float on = uLightOn;
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);

  vec2 dl = (p - uLight) * A;
  float dist = length(dl);
  p += (dl / max(dist, 1e-4)) * sin(dist * 70.0 - t * 6.0) * exp(-dist * 9.0) * uVel * 0.004 * uIntensity;

  vec2 drift = vec2(sin(t * 0.11), cos(t * 0.087)) * 0.005;
  float z = uZoom * (1.0 + 0.006 * sin(t * 0.5));
  vec2 cp = (p - uFocal) / z + uFocal + drift + vec2(uShiftX, 0.0);
  vec2 mm = vec2(uMouse.x, -uMouse.y) * uParallax;
  vec2 away = (dl / max(dist, 1e-3)) * exp(-dist * dist * 7.0) * 0.35 * on;

  // ---------------- far plane: smoke + backlight haze
  vec2 bq = (cp - 0.5) * A - mm * 0.012;
  float sm = fbm(bq * 1.3 + vec2(t * 0.018, -t * 0.012) - away + fbm3(bq * 2.1 - t * 0.02) * 0.9);
  vec3 col = mix(vec3(0.012, 0.017, 0.022), vec3(0.07, 0.098, 0.118), smoothstep(0.3, 0.95, sm));
  vec2 rc = (cp - uRing.xy) * A + mm * 0.006;
  float rd = length(rc);
  col += vec3(0.15, 0.23, 0.28) * exp(-rd * rd * 4.5) * 0.65;

  // ---------------- the ring: its bright crescent turns toward the light
  float R = uRing.z;
  float ang = atan(rc.y, rc.x);
  float facing = dot(rc / max(rd, 1e-4), normalize((uLight - uRing.xy) * A + vec2(1e-4)));
  float cres = smoothstep(0.1, 1.0, facing);
  cres = cres * cres + 0.16 * smoothstep(0.5, 1.0, -facing);
  float wob = noise(vec2(ang * 5.0, t * 0.35));
  float core = exp(-pow((rd - R - (wob - 0.5) * 0.004) / 0.0032, 2.0));
  float halo = exp(-pow((rd - R) / 0.04, 2.0));
  vec3 ringCol = mix(vec3(0.82, 0.92, 1.0), uAccent, uPulse * 0.5);
  col += ringCol * (core * 1.3 + halo * 0.3) * cres * (0.88 + 0.12 * sin(t * 1.1));
  float dash = step(0.55, fract(ang * (42.0 / 6.2832) + t * 0.03));
  col += vec3(0.6, 0.7, 0.8) * exp(-pow((rd - R * 0.64) / 0.0015, 2.0)) * dash * 0.32;
  col += vec3(0.5, 0.6, 0.7) * exp(-pow((rd - R * 1.17) / 0.0018, 2.0)) * smoothstep(0.45, 1.0, facing) * 0.28;

  // ---------------- the figure
  vec2 iuv = (cp - uLayout.xy) / uLayout.zw;
  // low camera (slightly wider toward the bottom) and a small yaw toward the cursor
  iuv.x = (iuv.x - 0.5) / (1.0 + (iuv.y - 0.5) * 0.06) + 0.5;
  iuv.y += (iuv.x - 0.5) * mm.x * 0.025;
  float k = 0.022;
  float d0 = depthAt(iuv);
  vec2 disp = mm * (d0 - 0.25) * k;
  float d1 = depthAt(iuv - disp / uLayout.zw);
  disp = mm * (d1 - 0.25) * k;
  vec2 suv = iuv - disp / uLayout.zw;
  suv = vec2(0.5) + (suv - vec2(0.5)) * (1.0 - 0.004 * sin(t * 1.05) * smoothstep(0.3, 0.6, d1));
  // ---- wind: gusts move the hair and ripple the jacket; it settles to still once you scroll past the hero.
  // The face and hands are masked out so they never warp.
  float windOn = 1.0 - smoothstep(0.0, 0.5, uProgress);
  float gust = 0.45 + 0.55 * smoothstep(0.2, 0.8, noise(vec2(t * 0.45, 3.7)));
  vec2 fq = (suv - vec2(0.555, 0.255)) / vec2(0.1, 0.085);
  vec2 hq1 = (suv - vec2(0.74, 0.47)) / vec2(0.1, 0.13);
  vec2 hq2 = (suv - vec2(0.38, 0.9)) / vec2(0.09, 0.08);
  float keep = 1.0 - max(exp(-dot(fq, fq) * 1.5), max(exp(-dot(hq1, hq1) * 1.5), exp(-dot(hq2, hq2) * 1.5)));
  float hair = smoothstep(0.36, 0.06, suv.y) * keep;
  // hair: a gentle flutter
  suv.x += (noise(vec2(suv.y * 9.0 - t * 1.6, t * 0.5)) - 0.5) * 0.012 * hair * gust * windOn;
  suv.y += (noise(vec2(suv.x * 9.0 + 4.0, t * 1.3)) - 0.5) * 0.005 * hair * gust * windOn;
  // jacket: a travelling ripple, stronger toward the hem and the open edges
  float cloth = smoothstep(0.36, 0.95, suv.y) * smoothstep(0.25, 0.6, d1) * keep;
  float wave = sin(suv.y * 24.0 - t * 3.0 + noise(vec2(suv.x * 6.0, t * 0.7)) * 3.0);
  suv.x += wave * 0.011 * cloth * gust * windOn;
  suv.y += cos(suv.x * 18.0 - t * 2.4) * 0.004 * cloth * gust * windOn;

  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  vec4 fig = texture2D(uImage, clamp(suv, 0.0, 1.0));
  float legFade = smoothstep(1.0, 0.74, suv.y);
  float a = fig.a * inside * legFade;
  float d = depthAt(suv) * a;

  vec3 fc = fig.rgb;
  float fl = dot(fc, vec3(0.2126, 0.7152, 0.0722));
  vec3 lit = mix(vec3(fl), fc, 0.45) * 0.11;                      // low key: near-silhouette

  vec2 pv = (suv - uPhone) * vec2(uLayout.z * aspect, uLayout.w);
  float flick = 0.9 + 0.1 * noise(vec2(t * 3.0, 7.0));
  lit += fc * vec3(0.75, 0.88, 1.0) * exp(-dot(pv, pv) * 24.0) * 0.85 * flick;  // phone glow: face and hand only

  float ddx = depthAt(suv + vec2(uDepthTexel.x * 2.0, 0.0)) - depthAt(suv - vec2(uDepthTexel.x * 2.0, 0.0));
  float ddy = depthAt(suv + vec2(0.0, uDepthTexel.y * 2.0)) - depthAt(suv - vec2(0.0, uDepthTexel.y * 2.0));
  vec3 n = normalize(vec3(-ddx, -ddy, 0.06));
  float diff = max(dot(n, normalize(vec3((uLight - p) * A, 0.3))), 0.0);
  float spot = exp(-dot(dl, dl) * 3.0);
  lit += fc * (0.04 + 0.5 * spot * on) * (0.3 + 0.7 * diff);      // the cursor is a key light

  // rim light from the silhouette edge: all around (backlight), stronger on the side facing the cursor
  vec2 tx = uFigTexel * 2.5;
  vec2 ga = vec2(alphaAt(suv + vec2(tx.x, 0.0), 1.0) - alphaAt(suv - vec2(tx.x, 0.0), 1.0),
                 alphaAt(suv + vec2(0.0, tx.y), 1.0) - alphaAt(suv - vec2(0.0, tx.y), 1.0));
  float edge = clamp(length(ga) * 1.6, 0.0, 1.0);
  vec2 outward = -ga / max(length(ga), 1e-4);
  vec2 toLight = normalize((uLight - p) * A + vec2(1e-4));
  float rimDir = max(dot(outward, toLight), 0.0);
  vec3 rimCol = mix(vec3(0.82, 0.92, 1.0), uAccent, uPulse * 0.6);
  lit += rimCol * edge * (0.7 + 1.5 * rimDir * on + 0.6 * uPulse);
  float drim = pow(1.0 - n.z, 1.4) * max(dot(normalize(n.xy + 1e-5), toLight), 0.0);
  lit += vec3(0.7, 0.85, 1.0) * drim * smoothstep(0.15, 0.4, d) * (0.08 + 0.55 * spot * on) * 0.5;

  vec3 fxs = texture2D(uFx, clamp(suv, 0.0, 1.0)).rgb * inside;
  float flame = 0.8 + 0.2 * sin(t * 3.1) + 0.1 * noise(vec2(t * 5.0, 1.0));
  lit += uAccent * fxs.r * 2.6 * flame * (1.0 + uPulse);
  lit += vec3(0.85, 0.94, 1.0) * fxs.g * 1.3;

  col = mix(col, lit, a);
  // backlit halo just outside the silhouette
  float aBlur = alphaAt(suv, 4.5) * legFade;
  col += vec3(0.42, 0.58, 0.68) * max(aBlur - a, 0.0) * (0.45 + 0.6 * on * spot);

  // ---------------- glows + red energy from the thread
  vec3 fxb = texture2D(uFx, clamp(suv, 0.0, 1.0), 4.0).rgb * inside;
  col += uAccent * fxb.r * 2.2 * flame + vec3(0.6, 0.75, 0.9) * fxb.g * 0.8;
  vec2 q = cp * A;
  float en = wisp(q, (uLayout.xy + uThreadA * uLayout.zw) * A, t, 1.7)
           + wisp(q, (uLayout.xy + uThreadB * uLayout.zw) * A, t, 5.3) * 0.85;
  col += uAccent * en * 1.0 * (1.0 + uPulse * 0.8) * uIntensity;

  // ---------------- ground fog swallows the legs; light mid fog drifts
  float gf = fbm3(vec2(q.x * 2.2 + t * 0.03, q.y * 3.0 - t * 0.02) - away * 0.6);
  float ground = smoothstep(0.55, 1.05, p.y) * (0.55 + 0.45 * gf);
  col = mix(col, vec3(0.055, 0.08, 0.095) + col * 0.25, clamp(ground * (0.6 + uFog * 0.6), 0.0, 0.93));
  float mf = smoothstep(0.5, 0.95, fbm3(q * 1.7 + vec2(t * 0.025, 0.0) - away)) * 0.22 * uFog;
  col = mix(col, vec3(0.09, 0.12, 0.14), mf * (1.0 - 0.6 * a));

  // ---------------- tone, entrance, signal dither (same as the wallpaper)
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum), uTint * 0.55);
  col = mix(col, lum * uAccent * 1.7, uTint * 0.32);

  float fd = length((p - uFocal) * A);
  float exposure = smoothstep(fd * 0.55, fd * 0.55 + 0.4, uEnter * 1.45);

  float th = bayer8(gl_FragCoord.xy / (2.0 * uDpr));
  float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float bit = step(th, pow(clamp(l2 * 1.9, 0.0, 1.0), 0.85));
  vec3 ink = mix(uInk, uAccent, uTint * 0.25 + uPulse * 0.25);
  vec3 dcol = mix(uBg, ink * (1.0 - uDim * 0.62), bit);
  float resolve = smoothstep(fd - 0.2, fd + 0.05, (uEnter - 0.35) * 2.3);
  float amt = max(uDither, 1.0 - resolve);
  amt = clamp(amt - exp(-dot(dl, dl) * 16.0) * on * 1.15 * step(0.01, uDither), 0.0, 1.0);
  float th2 = bayer8(gl_FragCoord.xy / (6.0 * uDpr));
  col = mix(col, dcol, step(th2, amt - 0.001));

  col *= 1.0 - uDim * 0.84;
  col *= exposure;

  vec2 vq = (vUv - 0.5) * A;
  col *= mix(0.45, 1.0, smoothstep(1.25, 0.25, length(vq * vec2(0.72, 1.0))));
  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.03 * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Floating shards: dark fragments with a lit upper edge, drifting upward. Near ones are large and out of focus. */
export const shardVertex = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uAspect;
uniform float uPx;
uniform vec2  uMouse;
uniform vec2  uLight;
uniform float uLightOn;
attribute vec4 aSeed;
varying float vAlpha;
varying float vRot;
varying float vSeed;
varying float vNear;
void main() {
  float zd = aSeed.z;
  float y = fract(aSeed.y + uSpeed * (0.01 + 0.018 * zd));
  vec2 pos = vec2(aSeed.x * 2.2 - 1.1, mix(-1.2, 1.2, y));
  pos.x += sin(uTime * 0.2 + aSeed.w * 30.0) * 0.03;
  pos += uMouse * (0.01 + zd * 0.06);
  vec2 light = vec2(uLight.x * 2.0 - 1.0, 1.0 - uLight.y * 2.0);
  vec2 dv = (pos - light) * vec2(uAspect, 1.0);
  float dd = length(dv);
  pos += (dv / max(dd, 1e-3)) / vec2(uAspect, 1.0) * exp(-dd * dd * 8.0) * 0.16 * uLightOn;
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = uPx * mix(9.0, 54.0, zd * zd) * (0.7 + 0.6 * fract(aSeed.w * 7.0));
  float dir = fract(aSeed.w * 3.0) > 0.5 ? 1.0 : -1.0;
  vRot = aSeed.w * 6.2832 + uTime * (0.12 + 0.3 * fract(aSeed.w * 13.0)) * dir;
  vAlpha = smoothstep(0.0, 0.12, y) * smoothstep(1.0, 0.8, y);
  vSeed = aSeed.w;
  vNear = zd;
}
`;

export const shardFragment = /* glsl */ `
precision highp float;
uniform vec3  uAccent;
uniform float uOpacity;
varying float vAlpha;
varying float vRot;
varying float vSeed;
varying float vNear;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float cr = cos(vRot), sr = sin(vRot);
  vec2 r = mat2(cr, -sr, sr, cr) * c;
  float sx = 0.2 + 0.2 * fract(vSeed * 17.0);
  float sy = 0.3 + 0.16 * fract(vSeed * 29.0);
  vec2 s = vec2(r.x + r.y * (fract(vSeed * 41.0) - 0.5) * 0.8, r.y);
  float shape = abs(s.x) / sx + abs(s.y) / sy + 0.14 * sin(atan(s.y, s.x) * 3.0 + vSeed * 20.0);
  float soft = mix(0.05, 0.3, smoothstep(0.75, 1.0, vNear));
  float fill = smoothstep(1.0, 1.0 - soft, shape);
  float rimBand = smoothstep(0.55, 0.95, shape) * fill;
  float top = smoothstep(0.05, -0.25, c.y);
  vec3 rimC = fract(vSeed * 7.0) > 0.45 ? uAccent * 1.5 : vec3(0.75, 0.85, 0.95);
  vec3 col = vec3(0.03, 0.036, 0.045) + rimC * rimBand * top * 1.8;
  float alpha = fill * vAlpha * uOpacity * mix(1.0, 0.6, smoothstep(0.8, 1.0, vNear));
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;
