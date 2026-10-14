// Weather sky: the moving scene behind the weather card and the weather popup header (tint, sun / moon glow,
// drifting clouds, rain, snow, hail, fog, wind, lightning) and the animated weather icons used for the forecast.
// The scene is plain HTML built once per condition and cached, so Lit re-renders never restart the animations.
// Cloud textures are value-noise drawn on a canvas once, in small idle steps, and handed to the shadow tree as
// custom properties on the panel host (--sk-<name>); until they are ready the sky simply has no clouds.
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { num } from "./util.js";
import { motionOn } from "./motion.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const sstep = (e0, e1, x) => { const v = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return v * v * (3 - 2 * v); };

/** apparent temperature when the weather entity does not give one (Steadman: temperature, humidity, wind) */
export function feelsLike(a) {
  if (a.apparent_temperature != null) return num(a.apparent_temperature);
  const T = num(a.temperature), rh = num(a.humidity), ws = num(a.wind_speed); if (T == null || rh == null || ws == null) return null;
  const ms = (a.wind_speed_unit || "km/h") === "m/s" ? ws : (a.wind_speed_unit === "mph" ? ws * 0.447 : ws / 3.6);
  const e = rh / 100 * 6.105 * Math.exp(17.27 * T / (237.7 + T));
  return T + 0.33 * e - 0.7 * ms - 4;
}

/* =========================================================== animated icons =========================================================== */
// the gradients live once in the panel root (wxDefs): an id inside a display:none block (the hidden weather bar on a phone)
// would leave every icon that points at it without its fill
const DEFS = `<defs>
  <radialGradient id="hcw-sun" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#ffd166"/><stop offset="1" stop-color="#ffa53d"/></radialGradient>
  <linearGradient id="hcw-cl" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="140"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d6deea"/></linearGradient>
  <linearGradient id="hcw-clg" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="140"><stop offset="0" stop-color="#dfe4ec"/><stop offset="1" stop-color="#9ea8b8"/></linearGradient>
  <linearGradient id="hcw-cld" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="140"><stop offset="0" stop-color="#b9b3cf"/><stop offset="1" stop-color="#6f6890"/></linearGradient>
  <radialGradient id="hcw-moon" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9d4f0"/></radialGradient>
  <mask id="hcw-mm"><rect width="200" height="200" fill="#fff"/><circle cx="122" cy="80" r="44" fill="#000"/></mask></defs>`;
function glyph(c) {
  const sun = (cx, cy, k) => `<g transform="translate(${cx - 100 * k} ${cy - 100 * k}) scale(${k})"><g class="w-rot">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${(100 + Math.cos(a) * 58).toFixed(1)}" y1="${(100 + Math.sin(a) * 58).toFixed(1)}" x2="${(100 + Math.cos(a) * 78).toFixed(1)}" y2="${(100 + Math.sin(a) * 78).toFixed(1)}" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>`; }).join("")}</g><circle cx="100" cy="100" r="46" fill="url(#hcw-sun)"/></g>`;
  const cloud = (fill, dx = 0, dy = 0, k = 1) => `<g class="w-bob"><g transform="translate(${dx} ${dy}) scale(${k})" fill="url(#${fill})"><circle cx="66" cy="112" r="28"/><circle cx="104" cy="92" r="40"/><circle cx="142" cy="114" r="26"/><rect x="66" y="108" width="76" height="32"/></g></g>`;
  const drops = (n, x0, y0, step = 26, col = "#a9d3ff") => Array.from({ length: n }, (_, i) => `<line class="w-drop" style="animation-delay:-${((i * .37) % 1.1).toFixed(2)}s" x1="${x0 + i * step}" y1="${y0 + (i % 2) * 8}" x2="${x0 + i * step - 5}" y2="${y0 + 16 + (i % 2) * 8}" stroke="${col}" stroke-width="9" stroke-linecap="round"/>`).join("");
  const dots = (n, x0, y0, r = 7, cls = "w-flk") => Array.from({ length: n }, (_, i) => `<circle class="${cls}" style="animation-delay:-${((i * .8) % 2.4).toFixed(1)}s" cx="${x0 + i * 28}" cy="${y0 + (i % 2) * 10}" r="${r}" fill="#fff"/>`).join("");
  const bolt = `<polygon class="w-bolt" points="106,114 82,156 100,156 90,192 128,140 108,140 120,114" fill="#ffd166"/>`;
  const wind = (y0, k = 1) => [[y0, 120], [y0 + 26, 150], [y0 + 52, 100]].map(([y, l], i) => `<path class="w-wind" style="animation-delay:-${i * .9}s" d="M${30} ${y} H${30 + l * k}${i === 1 ? ` a16 16 0 1 0 -16 -16` : ""}" fill="none" stroke="#e8edf5" stroke-width="10" stroke-linecap="round"/>`).join("");
  let g;
  switch (c) {
    case "sunny": g = sun(100, 100, 1); break;
    case "clear-night": g = `<circle cx="100" cy="100" r="54" fill="url(#hcw-moon)" mask="url(#hcw-mm)"/>` + [[156, 56, 7], [164, 124, 5], [58, 46, 5]].map(([x, y, r], i) => `<circle class="w-tw" style="animation-delay:-${i * .8}s" cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join(""); break;
    case "partlycloudy": g = sun(124, 76, .8) + cloud("hcw-cl", -8, 24, .95); break;
    case "rainy": g = cloud("hcw-cl", 0, -12) + drops(4, 66, 146); break;
    case "pouring": g = cloud("hcw-clg", 0, -16) + drops(6, 56, 140, 19); break;
    case "lightning": g = cloud("hcw-cld", 0, -16) + bolt; break;
    case "lightning-rainy": g = cloud("hcw-cld", 0, -16) + bolt + drops(1, 60, 146) + drops(1, 146, 150); break;
    case "snowy": g = cloud("hcw-cl", 0, -12) + dots(4, 64, 152); break;
    case "snowy-rainy": g = cloud("hcw-cl", 0, -12) + drops(2, 66, 146, 56) + [[96, 156], [150, 162]].map(([x, y], i) => `<circle class="w-flk" style="animation-delay:-${i * 1.2}s" cx="${x}" cy="${y}" r="7" fill="#fff"/>`).join(""); break;
    case "hail": g = cloud("hcw-clg", 0, -12) + dots(4, 64, 152, 8, "w-hail"); break;
    case "fog": g = cloud("hcw-clg", 0, -26) + [128, 150, 172].map((y, i) => `<line class="w-fog" style="animation-delay:-${i * 1.3}s" x1="${44 + i * 10}" y1="${y}" x2="${156 - i * 6}" y2="${y}" stroke="#e6e9ef" stroke-width="10" stroke-linecap="round"/>`).join(""); break;
    case "windy": g = wind(70, 1); break;
    case "windy-variant": g = cloud("hcw-cl", 10, -30, .8) + wind(130, .9); break;
    case "exceptional": g = `<path d="M100 36 L176 168 H24 Z" fill="#ffb24d" stroke="#ffb24d" stroke-width="10" stroke-linejoin="round"/><rect x="93" y="84" width="14" height="46" rx="7" fill="#3a2a10"/><circle cx="100" cy="148" r="8" fill="#3a2a10"/>`; break;
    default: g = cloud("hcw-clg", 30, -16, .72) + cloud("hcw-cl", -6, 12);
  }
  return `<svg viewBox="16 16 168 168" aria-hidden="true">${g}</svg>`;
}
/** render once in the panel root, outside anything that can be hidden */
export const wxDefs = unsafeHTML(`<svg class="wxdefs" width="0" height="0" aria-hidden="true">${DEFS}</svg>`);
const ICONS = new Map();
/** animated icon for a weather condition, `size` in px */
export function wxIcon(c, size = 24) {
  const k = `${c}|${size}`;
  if (!ICONS.has(k)) ICONS.set(k, unsafeHTML(`<span class="wxi" style="--s:${size}px">${glyph(c)}</span>`));
  return ICONS.get(k);
}

/* =========================================================== cloud textures =========================================================== */
const PAL = { light: [[255, 255, 255], [172, 183, 200]], grey: [[234, 237, 243], [124, 132, 147]], dark: [[192, 198, 210], [74, 80, 95]], storm: [[164, 154, 190], [48, 43, 68]] };
const TEXTURES = ["cu-light-0", "cu-light-1", "cu-light-2", "cu-grey-0", "cu-grey-1", "cu-dark-0", "cu-storm-0", "st-grey-0", "st-grey-1", "st-dark-0", "st-dark-1", "st-storm-0", "st-storm-1", "st-light-0"];
function noise(seed) {
  let q = seed * 7919 % 233280; const r = () => (q = (q * 9301 + 49297) % 233280) / 233280;
  const a = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const v = new Float32Array(256).map(() => r()), sm = x => x * x * (3 - 2 * x);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), w = sm(y - yi), X = xi & 255, Y = yi & 255, X1 = (X + 1) & 255, Y1 = (Y + 1) & 255;
    const g = (i, j) => v[p[p[i] + j]], a0 = g(X, Y) + (g(X1, Y) - g(X, Y)) * u, a1 = g(X, Y1) + (g(X1, Y1) - g(X, Y1)) * u; return a0 + (a1 - a0) * w; };
  return (x, y) => { let s = 0, amp = .5, f = 1; for (let o = 0; o < 5; o++) { s += n(x * f + o * 17.3, y * f + o * 9.1 + 50) * amp; amp *= .5; f *= 2.03; } return s / .97; };
}
/** one cloud: a heap (cu) or a layer (st) of fbm noise, lit from above: thin tops bright, deep bottoms in shade */
function cloudTexture(shape, pal, seed) {
  const cu = shape === "cu", W = cu ? 340 : 480, H = cu ? 200 : 160, fb = noise(seed + (cu ? 11 : 53));
  let q = seed * 131 + 7; const r = () => (q = (q * 9301 + 49297) % 233280) / 233280;
  const blobs = [[.30, .64, .22], [.47, .52, .28], [.64, .56, .25], [.76, .66, .19], [.40, .70, .21], [.58, .70, .22]].map(([x, y, rr]) => [x + (r() - .5) * .08, y + (r() - .5) * .08, rr * (.85 + r() * .3)]);
  const D = new Float32Array(W * H), F = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = x / W, ny = y / H; let m;
    if (cu) { m = 0; for (const [bx, by, br] of blobs) m = Math.max(m, 1 - Math.hypot((nx - bx) * W / H, ny - by) / br); m *= sstep(.97, .74, ny); }
    else m = (1 - Math.abs(ny - .5) / .44) * sstep(0, .22, nx) * sstep(1, .78, nx);
    const f = cu ? fb(x / 34, y / 34) : fb(x / 52, y / 26);
    const edge = sstep(0, .14, nx) * sstep(1, .86, nx) * sstep(0, .2, ny) * sstep(1, .86, ny);   // never end in a straight line
    F[y * W + x] = f; D[y * W + x] = sstep(.12, .6, m * 1.3 + (f - .5) * (cu ? 1.2 : 1.7) - .08) * edge;
  }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), img = g.createImageData(W, H), [lit, sh] = PAL[pal], k1 = Math.round(H * .06), k2 = Math.round(H * .14);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = D[i]; if (d <= 0) continue;
    const up1 = y - k1 >= 0 ? D[i - k1 * W] : 0, up2 = y - k2 >= 0 ? D[i - k2 * W] : 0;
    const L = Math.min(1, Math.max(0, 1.05 - (up1 * .45 + up2 * .45) - (y / H) * .22 + (F[i] - .5) * .35));
    const o = i * 4; for (let ch = 0; ch < 3; ch++) img.data[o + ch] = sh[ch] + (lit[ch] - sh[ch]) * L; img.data[o + 3] = d * 255;
  }
  g.putImageData(img, 0, 0); return c.toDataURL();
}
const TX = {}; let txBusy = false;
/** draw the cloud textures one at a time while the browser is idle, then hand them to every host that asked */
function ensureTextures(host) {
  if (!host?.style) return;
  const apply = () => { for (const [n, url] of Object.entries(TX)) host.style.setProperty(`--sk-${n}`, `url(${url})`); };
  if (Object.keys(TX).length === TEXTURES.length) { if (!host.__skyTx) { host.__skyTx = true; apply(); } return; }
  (ensureTextures.hosts ||= new Set()).add(host);
  if (txBusy) return; txBusy = true;
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 30));
  const step = () => { const n = TEXTURES.find(x => !TX[x]);
    if (!n) { for (const h of ensureTextures.hosts) { h.__skyTx = true; for (const [k, url] of Object.entries(TX)) h.style.setProperty(`--sk-${k}`, `url(${url})`); } return; }
    const [shape, pal, seed] = n.split("-"); TX[n] = cloudTexture(shape, pal, +seed + 1); idle(step); };
  idle(step);
}

/* =========================================================== the scene =========================================================== */
/** HA condition → scene kind */
const KIND = { sunny: "sun", "clear-night": "night", partlycloudy: "partly", cloudy: "cloudy", rainy: "rain", pouring: "pour", lightning: "bolt", "lightning-rainy": "storm",
  snowy: "snow", "snowy-rainy": "sleet", hail: "hail", fog: "fog", windy: "wind", "windy-variant": "wind", exceptional: "cloudy" };
export const skyKind = c => KIND[c] || "cloudy";
// clouds per kind: [width, top (px on a 320 × 200 card), opacity, seconds per crossing, texture, blur, start 0..1]; sizes are stored as % so one scene fits every card and the popup
const CLOUDS = {
  sun: [], night: [[230, 34, .2, 140, "st-dark-0", 1.5, .45]],
  partly: [[150, -8, .95, 58, "cu-light-0", 0, .22], [112, 52, .75, 80, "cu-light-1", .6, .72]],
  cloudy: [[290, -58, .9, 95, "st-grey-0", .5, .1], [190, -16, .85, 62, "cu-grey-0", 0, .45], [240, 18, .5, 115, "st-grey-1", 1, .8], [170, -34, .9, 72, "cu-light-2", 0, .72]],
  rain: [[320, -70, .95, 85, "st-dark-0", .3, .1], [210, -34, .85, 58, "cu-dark-0", 0, .5], [280, -58, .85, 100, "st-dark-1", .8, .8]],
  storm: [[340, -74, 1, 52, "st-storm-0", .3, .1], [230, -40, .9, 40, "cu-storm-0", 0, .5], [300, -62, .9, 62, "st-storm-1", .6, .82]],
  snow: [[300, -64, .85, 100, "st-light-0", .6, .2], [190, -38, .7, 72, "cu-grey-1", .3, .7]],
  fog: [[340, -46, .45, 125, "st-light-0", 2, .3]],
  wind: [[150, -10, .85, 18, "cu-light-0", 0, .2], [120, 40, .6, 24, "cu-light-2", .6, .7]]
};
Object.assign(CLOUDS, { pour: CLOUDS.rain, bolt: CLOUDS.storm, sleet: CLOUDS.snow, hail: CLOUDS.rain });

/** a jagged line: midpoint displacement sideways to the line's own direction, so it works for falling and for crawling bolts */
function boltPath(x0, y0, x1, y1, disp, depth) {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) { const np = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, o = (Math.random() - .5) * disp, tt = .5 + (Math.random() - .5) * .2;
      np.push([ax + dx * tt - dy / len * o, ay + dy * tt + dx / len * o], [bx, by]); }
    pts = np; disp /= 1.85; }
  return pts;
}
const dPath = pts => "M" + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
const forksOf = (main, ts, len, W, H, down = 1) => ts.map(f => { const p = main[Math.floor(f * main.length)], dir = Math.random() < .5 ? -1 : 1;
  return boltPath(p[0], p[1], p[0] + dir * W * len * rnd(.6, 1.2), p[1] + H * down * rnd(.12, .3), W * .07, 4); });
/* four kinds of strike: each gives the bolt, its forks, where the sky lights up and the line width */
const BOLTS = {
  ground: (W, H) => { const x0 = W * rnd(.35, .75), main = boltPath(x0, -6, x0 + W * rnd(-.15, .15), H * 1.1, W * .2, 6); return { main, forks: forksOf(main, [.25, .45, .62], .14, W, H), fx: x0 / W, fy: 0, w: 1.5 }; },
  diagonal: (W, H) => { const main = boltPath(W * rnd(-.02, .12), -6, W * rnd(.4, .6), H * 1.1, W * .18, 6); return { main, forks: forksOf(main, [.18, .35, .5, .68], .18, W, H), fx: .1, fy: 0, w: 1.3 }; },
  spider: (W, H) => { const y0 = H * rnd(.1, .2), main = boltPath(W * rnd(-.05, .1), y0, W * rnd(.9, 1.05), H * rnd(.08, .24), H * .35, 6); return { main, forks: forksOf(main, [.15, .3, .45, .6, .75, .88], .05, W, H, .7), fx: .5, fy: y0 / H, w: 1.1, wide: true }; },
  distant: (W, H) => { const x0 = W * rnd(.65, .9), main = boltPath(x0, H * .38, x0 + W * rnd(-.06, .06), H * 1.05, W * .07, 5); return { main, forks: forksOf(main, [.35], .06, W, H * .5), fx: x0 / W, fy: .45, w: .8, dist: true }; }
};
function lightning() {
  const W = 320, H = 200;
  return Object.keys(BOLTS).sort(() => Math.random() - .5).slice(0, 3).map(kind => {
    const b = BOLTS[kind](W, H), pat = ["", "2", "3"][Math.floor(Math.random() * 3)], anim = `animation-duration:${rnd(8, 13).toFixed(1)}s;animation-delay:-${rnd(0, 12).toFixed(1)}s`;
    return `<i class="sk-fl${b.dist ? " dim" : ""}" style="--fx:${(b.fx * 100).toFixed(0)}%;--fy:${(b.fy * 100).toFixed(0)}%;animation-name:sk-flash${pat};${anim}"></i>`
      + `<svg class="sk-bolt${b.dist ? " dist" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="animation-name:sk-strike${pat};${anim}">`
      + `<path class="gw" d="${dPath(b.main)}" stroke-width="${((b.wide ? 7 : 6) * b.w / 1.5).toFixed(1)}"/>${b.forks.map(x => `<path class="gw" d="${dPath(x)}" stroke-width="${(3 * b.w / 1.5).toFixed(1)}"/>`).join("")}`
      + `${b.forks.map(x => `<path class="br" d="${dPath(x)}" stroke-width="${(.8 * b.w / 1.5).toFixed(2)}"/>`).join("")}<path class="co" d="${dPath(b.main)}" stroke-width="${b.w}"/></svg>`;
  }).join("") + `<i class="sk-fl far" style="--fx:${rnd(10, 90).toFixed(0)}%;--fy:0%;animation-name:sk-farflash;animation-duration:${rnd(12, 16).toFixed(1)}s;animation-delay:-${rnd(0, 10).toFixed(1)}s"></i>`;
}
/** falling streaks at three depths (rain) or round pellets (hail); `still` places them without motion */
function streaks(amount, ang, speed, still, hail) {
  const dx = Math.round(-Math.tan(ang * Math.PI / 180) * 280); let x = "", n = 0;
  for (const [cls, op, len, wd, dur, cnt] of [["far", .28, 9, 1, .8, 26], ["mid", .5, 16, 1.2, .66, 16], ["near", .8, 30, 1.6, .54, 7]]) {
    for (let i = 0; i < Math.round(cnt * amount); i++, n++) {
      const pos = `left:${rnd(-5, 125).toFixed(1)}%;${still ? `top:${rnd(-5, 95).toFixed(0)}%;` : ""}`, odd = n % 2 ? " sk-o" : "";
      x += hail ? `<i class="sk-h ${cls}${odd}" style="--dx:${dx}px;${pos}--z:${(wd * 2.2).toFixed(1)}px;opacity:${(op + .15).toFixed(2)};animation-duration:${(dur * .7 * rnd(.85, 1.15)).toFixed(2)}s;animation-delay:-${rnd(0, 1).toFixed(2)}s"></i>`
        : `<i class="sk-d ${cls}${odd}" style="--a:${ang}deg;--dx:${dx}px;${pos}width:${wd}px;height:${Math.round(len * rnd(.8, 1.25))}px;opacity:${(op * rnd(.75, 1)).toFixed(2)};animation-duration:${(dur * rnd(.85, 1.15) * speed).toFixed(2)}s;animation-delay:-${rnd(0, 1).toFixed(2)}s"></i>`;
    } }
  return x;
}
function flakes(amount, still) {
  let x = "", n = 0;
  for (const [cls, s0, s1, o0, o1, d0, d1, cnt] of [["far", 1.4, 2.4, .45, .65, 15, 20, 30], ["mid", 2.6, 4, .7, .9, 9, 13, 18], ["near", 5, 8, .5, .7, 6, 8, 5]]) {
    for (let i = 0; i < Math.round(cnt * amount); i++, n++) { const sz = rnd(s0, s1).toFixed(1), sw = Math.round(rnd(6, 16)) * (Math.random() < .5 ? -1 : 1);
      x += `<i class="sk-f ${cls}${n % 2 ? " sk-o" : ""}" style="--sw:${sw}px;--wx:-${Math.round(rnd(10, 30))}px;left:${rnd(0, 105).toFixed(1)}%;${still ? `top:${rnd(0, 95).toFixed(0)}%;` : ""}width:${sz}px;height:${sz}px;opacity:${rnd(o0, o1).toFixed(2)};animation-duration:${rnd(d0, d1).toFixed(1)}s;animation-delay:-${rnd(0, d1).toFixed(1)}s"></i>`; } }
  return x;
}
function buildScene(k, night, still) {
  let x = "";
  if (k === "night" || (night && k === "partly")) for (let i = 0; i < 18; i++) x += `<i class="sk-st" style="left:${rnd(2, 80).toFixed(1)}%;top:${rnd(4, 75).toFixed(1)}%;animation-delay:-${rnd(0, 4).toFixed(1)}s;transform:scale(${rnd(.5, 1.1).toFixed(2)})"></i>`;
  for (const [w, t, o, dur, tx, blur, pos] of CLOUDS[k] || []) {
    const wp = w / 320 * 100, run = (320 / w + 1) * 100 + 4, place = still ? `left:calc(${(pos * 100).toFixed(0)}% - ${(wp * (1 - pos)).toFixed(1)}%);` : "";
    x += `<i class="sk-cl" style="--w:${wp.toFixed(1)}%;--ar:${tx.startsWith("cu") ? 1.7 : 3};--tx:var(--sk-${tx});--run:${run.toFixed(0)}%;${place}top:${(t / 2).toFixed(1)}%;opacity:${o};animation-duration:${dur}s;animation-delay:-${(pos * dur).toFixed(1)}s${blur ? `;filter:blur(${blur}px)` : ""}"></i>`;
  }
  if (k === "rain" || k === "storm" || k === "pour" || k === "sleet") x += streaks({ rain: 1, storm: 1.4, pour: 1.7, sleet: .5 }[k], k === "storm" || k === "pour" ? 16 : 10, k === "storm" ? .88 : 1, still);
  if (k === "hail") x += streaks(.9, 8, 1, still, true);
  if (k === "snow" || k === "sleet") x += flakes(k === "sleet" ? .55 : 1, still);
  if (k === "rain" || k === "storm" || k === "pour" || k === "hail") { x += `<i class="sk-haze"></i>`;
    for (let i = 0; i < 7; i++) { const sl = !still && i % 3 === 0; x += `<i class="sk-gd${sl ? " sl" : ""}" style="--s:${rnd(3, 6.5).toFixed(1)}px;left:${rnd(4, 96).toFixed(1)}%;top:${rnd(5, 85).toFixed(1)}%${sl ? `;animation-duration:${rnd(7, 12).toFixed(1)}s;animation-delay:-${rnd(0, 10).toFixed(1)}s` : ""}"></i>`; } }
  if (k === "fog") x += [24, 52, 80].map((top, i) => `<i class="sk-mist" style="top:${top}%;animation-duration:${14 + i * 5}s;animation-delay:-${i * 4}s"></i>`).join("");
  if (k === "wind") for (let i = 0; i < 9; i++) x += `<i class="sk-w" style="top:${rnd(8, 92).toFixed(0)}%;width:${rnd(14, 30).toFixed(0)}%;animation-duration:${rnd(1.6, 2.8).toFixed(1)}s;animation-delay:-${rnd(0, 3).toFixed(1)}s;opacity:${rnd(.25, .55).toFixed(2)}"></i>`;
  if ((k === "storm" || k === "bolt") && !still) x += lightning();
  return `<div class="sky k-${k}${night ? " nt" : ""}${still ? " still" : ""}" aria-hidden="true">${x}</div>`;
}
const SCENES = new Map();
/** the moving sky for a condition; `slot` keeps two places (card, popup) from sharing one random layout */
export function sky(p, cond, slot = "card") {
  ensureTextures(p);
  const k = skyKind(cond), night = p.home?.sun?.state === "below_horizon" || cond === "clear-night", still = !motionOn(), key = `${slot}|${k}|${night}|${still}`;
  if (!SCENES.has(key)) SCENES.set(key, unsafeHTML(buildScene(k, night, still)));
  return SCENES.get(key);
}

/* =========================================================== styles =========================================================== */
export const skyStyles = `
  /* animated weather icons */
  .wxdefs{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
  .wxi{width:var(--s);height:var(--s);display:inline-grid;place-items:center;flex:none;vertical-align:middle}
  .wxi svg{width:100%;height:100%;display:block;overflow:visible}
  .wxi .w-rot{transform-origin:100px 100px;animation:w-spin 30s linear infinite}
  .wxi .w-bob{animation:w-bob 5s ease-in-out infinite}
  .wxi .w-drop{animation:w-drop 1.1s linear infinite}
  .wxi .w-flk{animation:w-flk 2.4s linear infinite}
  .wxi .w-hail{animation:w-drop .9s linear infinite}
  .wxi .w-tw{animation:w-tw 3s ease-in-out infinite}
  .wxi .w-bolt{animation:w-bolt 6s linear infinite}
  .wxi .w-fog{animation:w-fog 4s ease-in-out infinite alternate}
  .wxi .w-wind{stroke-dasharray:60 200;animation:w-wind 2.7s linear infinite}
  @keyframes w-spin{to{transform:rotate(360deg)}}
  @keyframes w-bob{0%,100%{transform:translateX(0)}50%{transform:translateX(-7px)}}
  @keyframes w-drop{from{transform:translateY(-6px);opacity:0}20%{opacity:1}to{transform:translateY(34px);opacity:0}}
  @keyframes w-flk{from{transform:translateY(-6px);opacity:0}20%{opacity:1}to{transform:translateY(30px);opacity:0}}
  @keyframes w-tw{0%,100%{opacity:.25}50%{opacity:.95}}
  @keyframes w-bolt{0%,76%,86%,100%{opacity:.35}78%,83%{opacity:1}}
  @keyframes w-fog{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
  @keyframes w-wind{from{stroke-dashoffset:260}to{stroke-dashoffset:0}}
  :host(.still) .wxi *{animation:none!important}

  /* the sky: a tint per condition and the moving scene, slightly soft as if seen through the window */
  .sky{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;filter:blur(1.1px)}
  .sky.k-sun{background:radial-gradient(130% 110% at 100% 0%, rgba(255,190,85,.55) 0%, rgba(255,150,60,.20) 42%, rgba(255,150,60,0) 72%)}
  .sky.k-partly{background:radial-gradient(130% 110% at 100% 0%, rgba(255,200,110,.40) 0%, rgba(255,170,80,.12) 40%, rgba(255,170,80,0) 70%),linear-gradient(170deg, rgba(120,165,220,.22), rgba(120,165,220,.05))}
  .sky.k-cloudy,.sky.k-wind{background:linear-gradient(170deg, rgba(175,185,200,.32) 0%, rgba(120,130,145,.16) 75%)}
  .sky.k-wind{background:linear-gradient(170deg, rgba(150,185,225,.26) 0%, rgba(120,140,170,.12) 75%)}
  .sky.k-rain,.sky.k-pour,.sky.k-hail{background:linear-gradient(165deg, rgba(110,140,180,.42) 0%, rgba(55,75,110,.24) 70%)}
  .sky.k-storm,.sky.k-bolt{background:linear-gradient(165deg, rgba(85,70,130,.58) 0%, rgba(35,30,60,.44) 75%)}
  .sky.k-snow,.sky.k-sleet{background:linear-gradient(170deg, rgba(215,228,248,.36) 0%, rgba(160,180,215,.18) 75%)}
  .sky.k-fog{background:linear-gradient(175deg, rgba(205,205,212,.30) 0%, rgba(150,150,160,.20) 80%)}
  .sky.k-night,.sky.k-partly.nt{background:radial-gradient(130% 110% at 100% 0%, rgba(120,140,215,.50) 0%, rgba(40,52,115,.40) 45%, rgba(18,24,58,.34) 100%)}
  /* the soft glow in the corner: warm sun, cool moon; it sits behind the clouds */
  .sky.k-sun::before,.sky.k-partly::before,.sky.k-night::before{content:"";position:absolute;width:190px;height:190px;right:-70px;top:-80px;border-radius:50%;animation:sk-pulse 7s ease-in-out infinite}
  .sky.k-sun::before{background:radial-gradient(circle, rgba(255,232,160,.85) 0%, rgba(255,205,100,.35) 35%, rgba(255,200,90,0) 70%)}
  .sky.k-partly::before{background:radial-gradient(circle, rgba(255,232,160,.7) 0%, rgba(255,205,100,.28) 35%, rgba(255,200,90,0) 70%)}
  .sky.k-night::before,.sky.k-partly.nt::before{background:radial-gradient(circle, rgba(236,242,255,.78) 0%, rgba(185,202,255,.30) 35%, rgba(170,190,255,0) 70%);animation-duration:10s}
  /* other skies after dark: the same scene a little darker */
  .sky.nt:not(.k-night):not(.k-partly)::after{content:"";position:absolute;inset:0;background:rgba(12,16,42,.3)}
  .sky .sk-cl{position:absolute;left:calc(var(--w) * -1);width:var(--w);aspect-ratio:var(--ar);background:var(--tx) center / 100% 100% no-repeat;animation:sk-drift linear infinite;will-change:transform}
  .sky .sk-d{position:absolute;top:-40px;border-radius:1px;background:linear-gradient(rgba(225,238,255,0),rgba(225,238,255,.95));transform:rotate(var(--a));animation:sk-fall linear infinite;will-change:transform}
  .sky .sk-d.near{filter:blur(.35px)}
  .sky .sk-h{position:absolute;top:-10px;width:var(--z);height:var(--z);border-radius:50%;background:radial-gradient(circle at 35% 35%, #fff, rgba(225,235,250,.75));animation:sk-fall linear infinite;--a:0deg}
  .sky .sk-f{position:absolute;top:-12px;border-radius:50%;background:radial-gradient(circle, #fff 0 34%, rgba(255,255,255,.55) 56%, rgba(255,255,255,0) 72%);animation:sk-snow ease-in-out infinite;will-change:transform}
  .sky .sk-f.near{filter:blur(1.4px)}
  .sky .sk-st{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:sk-tw 4s ease-in-out infinite}
  .sky .sk-haze{position:absolute;inset:0;background:linear-gradient(to bottom, rgba(150,170,205,0) 25%, rgba(150,170,205,.16) 100%)}
  .sky .sk-gd{position:absolute;width:var(--s);height:calc(var(--s) * 1.12);border-radius:50% 50% 48% 48% / 56% 56% 44% 44%;background:radial-gradient(circle at 36% 30%, rgba(255,255,255,.75) 0 10%, rgba(255,255,255,.12) 32%, rgba(255,255,255,0) 58%),radial-gradient(circle at 55% 78%, rgba(255,255,255,.18) 0 18%, rgba(0,0,0,.10) 60%, transparent 72%);box-shadow:0 1px 1.5px rgba(0,0,0,.18)}
  .sky .sk-gd.sl{animation:sk-slide linear infinite}
  .sky .sk-mist{position:absolute;left:-60%;width:220%;height:23%;border-radius:50%;background:rgba(238,240,246,.26);filter:blur(13px);animation:sk-mist ease-in-out infinite alternate}
  .sky .sk-w{position:absolute;left:-30%;height:1.5px;border-radius:1px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.8),rgba(255,255,255,0));animation:sk-wind linear infinite}
  .sky .sk-fl{position:absolute;inset:0;opacity:0;background:radial-gradient(75% 95% at var(--fx) var(--fy), rgba(228,232,255,.8) 0%, rgba(205,212,255,.28) 42%, rgba(205,212,255,0) 78%);mix-blend-mode:screen;animation:sk-flash linear infinite}
  .sky .sk-fl.dim{background:radial-gradient(60% 70% at var(--fx) var(--fy), rgba(220,226,255,.45) 0%, rgba(205,212,255,.12) 45%, rgba(205,212,255,0) 75%)}
  .sky svg.sk-bolt{position:absolute;inset:0;width:100%;height:100%;opacity:0;overflow:visible;animation:sk-strike linear infinite}
  .sky svg.sk-bolt.dist{filter:blur(.9px)}
  .sk-bolt path{fill:none;stroke-linecap:round;stroke-linejoin:round}
  .sk-bolt .gw{stroke:rgba(178,196,255,.85);filter:blur(2.6px)}
  .sk-bolt .co{stroke:#fff}
  .sk-bolt .br{stroke:rgba(255,255,255,.75)}
  .sk-bolt.dist .co{stroke:rgba(255,255,255,.7)}
  .sk-bolt.dist .gw{stroke:rgba(178,196,255,.55)}
  /* the still version (Animaties off): everything where it was placed, nothing moves, no lightning */
  .sky.still *,.sky.still::before{animation:none!important}
  .sky.still .sk-d,.sky.still .sk-h{transform:rotate(var(--a))}
  @keyframes sk-pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}
  @keyframes sk-drift{from{transform:translateX(0)}to{transform:translateX(var(--run))}}
  @keyframes sk-fall{from{transform:translate(0,0) rotate(var(--a))}to{transform:translate(var(--dx),280px) rotate(var(--a))}}
  @keyframes sk-snow{0%{transform:translate(0,0)}25%{transform:translate(var(--sw),70px)}50%{transform:translate(calc(var(--sw) * -.5 + var(--wx) * .5),140px)}75%{transform:translate(calc(var(--sw) * .8 + var(--wx) * .75),210px)}100%{transform:translate(var(--wx),280px)}}
  @keyframes sk-mist{from{transform:translateX(-10%)}to{transform:translateX(10%)}}
  @keyframes sk-wind{from{transform:translateX(0)}to{transform:translateX(560%)}}
  @keyframes sk-tw{0%,100%{opacity:.2}50%{opacity:.85}}
  @keyframes sk-slide{0%,62%{transform:translateY(0)}100%{transform:translateY(240px)}}
  /* a strike: on, almost out, back brighter, a short afterglow; one long flash; a triple flicker. The sky flash follows the same beats */
  @keyframes sk-strike{0%,70%{opacity:0}70.25%{opacity:1}70.7%{opacity:.12}71.2%{opacity:1}71.9%{opacity:.55}72.4%{opacity:.8}73.6%{opacity:0}100%{opacity:0}}
  @keyframes sk-flash{0%,70%{opacity:0}70.25%{opacity:.85}70.7%{opacity:.25}71.2%{opacity:1}72.4%{opacity:.5}75%{opacity:0}100%{opacity:0}}
  @keyframes sk-strike2{0%,70%{opacity:0}70.2%{opacity:1}71%{opacity:.75}72.5%{opacity:.25}74%{opacity:0}100%{opacity:0}}
  @keyframes sk-flash2{0%,70%{opacity:0}70.2%{opacity:1}71%{opacity:.6}73%{opacity:.2}75%{opacity:0}100%{opacity:0}}
  @keyframes sk-strike3{0%,70%{opacity:0}70.2%{opacity:1}70.5%{opacity:.1}70.9%{opacity:.9}71.2%{opacity:.1}71.7%{opacity:1}72.6%{opacity:.4}73.8%{opacity:0}100%{opacity:0}}
  @keyframes sk-flash3{0%,70%{opacity:0}70.2%{opacity:.9}70.5%{opacity:.2}70.9%{opacity:.8}71.2%{opacity:.2}71.7%{opacity:1}73%{opacity:.35}75%{opacity:0}100%{opacity:0}}
  @keyframes sk-farflash{0%,40%{opacity:0}40.4%{opacity:.35}41%{opacity:.08}41.5%{opacity:.28}43.5%{opacity:0}100%{opacity:0}}

  /* ===== weather card: big temperature with "voelt als", high / low + precipitation in the corner, tomorrow as a sentence ===== */
  .card.wxsky{grid-template-rows:max-content 1fr max-content max-content 12px max-content;grid-template-areas:"i c" ". ." "n n" "s s" ". ." "l l";text-shadow:0 1px 10px rgba(0,0,0,.18)}
  :where(.card.wxsky)>*:not(.sky){position:relative;z-index:1}
  .card.wxsky .tnow{grid-area:i;display:flex;align-items:baseline;gap:10px;margin-left:-2px;white-space:nowrap;min-width:0}
  .card.wxsky .tnow b{font-size:56px;font-weight:600;letter-spacing:-2.8px;line-height:.8}
  .card.wxsky .tnow b sup{font-size:22px;letter-spacing:0;vertical-align:top;line-height:1;margin-left:1px;font-weight:500;color:var(--fg-2)}
  .card.wxsky .tnow span{font-size:13px;font-weight:400;color:var(--fg-2);opacity:.8;letter-spacing:0}
  .card.wxsky .c.wxc{flex-direction:column;align-items:flex-end;justify-content:center;gap:5px;letter-spacing:.6px;overflow:visible}
  .card.wxsky .c.wxc span{display:flex;align-items:center;gap:4px;line-height:1}
  .card.wxsky .c.wxc .hl{color:#fff;font-size:12px;gap:0}
  .card.wxsky .c.wxc .hl em{font-style:normal;color:var(--fg-3)}
  .card.wxsky .c.wxc .mm{color:#a9d3ff;text-transform:none;letter-spacing:.4px}
  .card.wxsky .c.wxc .mm.dry{color:var(--fg-3)}
  .card.wxsky .c.wxc svg,.card.wxsky .snt svg{width:.85em;height:.85em;flex:none}
  .card.wxsky .s{color:var(--fg-2)}
  .card.wxsky .snt{grid-area:l;padding-top:10px;border-top:1px solid rgba(255,255,255,.18);font-size:13px;font-weight:500;line-height:1.4;color:rgba(255,255,255,.62);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
  .card.wxsky .snt b{color:#fff;font-weight:700}
  .card.wxsky .snt .pp{color:#a9d3ff;font-weight:700;white-space:nowrap}
  .card.wxsky .snt .pp svg{display:inline-block;vertical-align:-.08em;margin-right:2px}
  .card.wxsky .snt .sh{display:none}
  /* the weather popup: the header is the same sky, fading into the popup */
  .popup.wxsky{position:relative}
  .popup.wxsky .skybg{position:absolute;left:0;right:0;top:0;height:240px;z-index:-1;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,#000 40%,rgba(0,0,0,.45) 70%,transparent 100%);mask-image:linear-gradient(to bottom,#000 40%,rgba(0,0,0,.45) 70%,transparent 100%)}
  .popup.wxsky .skybg .sky{filter:blur(1.1px)}
  .popup.wxsky .wxhd b{font-size:44px}
  .popup .wxi{display:block;margin:6px auto}
  .popup .wd .wxi{margin:0 auto}
  @media (max-width:900px){
    .card.wxsky{grid-template-rows:max-content 1fr max-content 0 6px max-content}
    .card.wxsky .tnow b{font-size:30px;letter-spacing:-1.4px}
    .card.wxsky .tnow b sup{font-size:13px}
    .card.wxsky .tnow span,.card.wxsky .s{display:none}
    .card.wxsky .n{font-size:13px}
    .card.wxsky .c.wxc{gap:3px;font-size:8.5px;letter-spacing:.3px}
    .card.wxsky .c.wxc .hl{font-size:9px}
    .card.wxsky .snt{padding-top:6px;font-size:10px;line-height:1.3}
    .card.wxsky .snt .lg{display:none}
    .card.wxsky .snt .sh{display:inline}
    .sky{filter:blur(.8px)}
    .sky .sk-o{display:none}
    .card .sky.k-sun::before,.card .sky.k-partly::before,.card .sky.k-night::before{width:124px;height:124px;right:-48px;top:-54px}
  }
`;
