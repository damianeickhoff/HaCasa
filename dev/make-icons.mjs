// Run from the project folder: node dev/make-icons.mjs  (writes icons/*.svg, inlined into the bundle by build.mjs; dev/icons.html shows the whole set)
// Generates thin stroke icons for HaCasa Nova (50x50 viewBox, ~1.8px strokes).
import { writeFileSync } from "node:fs";
const S = sz => `fill="none" stroke="#fff" stroke-width="${(1.8 * sz / 50).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`; // same on-screen weight whatever the viewBox
// Measured content boxes (svg.getBBox in a browser). The viewBox is fitted to the drawing so each icon
// fills its box edge to edge, like Homio's originals (which have no inner margin).
const BB = {"calendar":[5,4,40,42],"camera":[4,12.49,39.1,29.51],"cloud":[2.07,11.1,43.66,27.9],"fan":[3.54,3.2,41.56,37.17],"fog":[4.25,3.63,39.69,39.37],"lightning":[4.25,3.63,39.69,43.37],"lock":[9,6,32,40],"lock_open":[9,6,32,40],"moon":[7.18,4.92,37.82,40],"partly_cloudy":[3.5,2.5,40.65,40.5],"pouring":[4.25,3.63,39.69,42.37],"rain":[4.25,4.63,39.69,40.37],"snow":[4.25,4.63,39.69,37.97],"sun":[6.5,6.5,37,37],"trash":[8,8,34,36],"wind":[5,9,38.5,32],"window":[5,5,40,40]};
const WEATHER = ["sun", "moon", "cloud", "partly_cloudy", "rain", "pouring", "snow", "lightning", "fog", "wind"]; // only these are fitted (they looked small next to the other cards)
const viewBox = n => { const b = WEATHER.includes(n) ? BB[n] : null; if (!b) return "0 0 50 50"; const pad = 1.1, w = b[2] + 2 * pad, h = b[3] + 2 * pad, sz = Math.max(w, h); return [b[0] - pad - (sz - w) / 2, b[1] - pad - (sz - h) / 2, sz, sz].map(v => +v.toFixed(2)).join(" "); };
const wrap = (inner, n) => `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="${viewBox(n)}" ${S(+viewBox(n).split(" ")[2])}>\n  ${inner}\n</svg>\n`;
// cloud silhouette, bottom-left at (x,y), width ~w
const cloud = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M6 0h24a8 8 0 0 0 1.2-15.9A11.5 11.5 0 0 0 9.4-18.6 9 9 0 0 0 6 0Z"/>`;
const rays = (cx, cy, r1, r2, n = 8) => Array.from({ length: n }, (_, i) => { const a = i * Math.PI * 2 / n; const c = Math.cos(a), s = Math.sin(a); return `<line x1="${(cx + c * r1).toFixed(1)}" y1="${(cy + s * r1).toFixed(1)}" x2="${(cx + c * r2).toFixed(1)}" y2="${(cy + s * r2).toFixed(1)}"/>`; }).join("");
const icons = {
  window: `<rect x="5" y="5" width="40" height="40" rx="2"/><line x1="25" y1="5" x2="25" y2="45"/><line x1="5" y1="25" x2="45" y2="25"/>`,
  trash: `<line x1="8" y1="12" x2="42" y2="12"/><path d="M19 12V8h12v4"/><path d="M11.5 12l2.3 32h22.4l2.3-32"/><line x1="20" y1="19" x2="20.8" y2="38"/><line x1="25" y1="19" x2="25" y2="38"/><line x1="30" y1="19" x2="29.2" y2="38"/>`,
  calendar: `<rect x="5" y="9" width="40" height="37" rx="3"/><line x1="5" y1="19" x2="45" y2="19"/><line x1="15" y1="4" x2="15" y2="13"/><line x1="35" y1="4" x2="35" y2="13"/>`,
  camera: `<rect x="5" y="15" width="30" height="13" rx="3" transform="rotate(-10 20 21.5)"/><path d="M34.5 17.8l7-1.3 1.6 8.9-7 1.2"/><line x1="13" y1="31" x2="11" y2="42"/><line x1="4" y1="42" x2="20" y2="42"/>`,
  fan: `<circle cx="25" cy="25" r="3"/>${[0, 120, 240].map(a => `<path transform="rotate(${a} 25 25)" d="M25 21C22.5 14 20.5 6 26.5 3.2 32.5 5.5 30.5 15 25 21Z"/>`).join("")}`,
  lock: `<path d="M16 21v-6a9 9 0 0 1 18 0v6"/><rect x="9" y="21" width="32" height="25" rx="3"/><circle cx="25" cy="31" r="2.6"/><line x1="25" y1="33.6" x2="25" y2="39"/>`,
  lock_open: `<path d="M34 21v-6a9 9 0 0 0-18 0v1.5"/><rect x="9" y="21" width="32" height="25" rx="3"/><circle cx="25" cy="31" r="2.6"/><line x1="25" y1="33.6" x2="25" y2="39"/>`,
  // ---- replacements for the original (third-party) set: same thin stroke style ----
  access_point: `<circle cx="25" cy="39" r="3"/><path d="M15 29.5a14 14 0 0 1 20 0"/><path d="M8 22.5a24 24 0 0 1 34 0"/>`,
  apple_tv: `<rect x="6" y="17" width="38" height="22" rx="5"/><circle cx="36" cy="28" r="1.8"/><path d="M14 28h12"/>`,
  clock: `<circle cx="25" cy="25" r="20"/><path d="M25 12v13l8 5"/>`,
  close: `<path d="M12 12l26 26M38 12L12 38"/>`,
  console: `<path d="M14 18h22a9 9 0 0 1 8.5 12l-2.6 8a5 5 0 0 1-8.6 1.2L30 35H20l-3.3 4.2A5 5 0 0 1 8.1 38l-2.6-8A9 9 0 0 1 14 18Z"/><path d="M17 24.5v8M13 28.5h8"/><circle cx="33" cy="26.5" r="1.6"/><circle cx="37.5" cy="30.5" r="1.6"/>`,
  increase: `<path d="M19 11l14 14-14 14"/>`,
  decrease: `<path d="M31 11L17 25l14 14"/>`,
  dehumidifier: `<rect x="10" y="6" width="30" height="38" rx="4"/><path d="M25 15c-4 5.5-6 8.5-6 11.5a6 6 0 0 0 12 0c0-3-2-6-6-11.5Z"/><path d="M16 38h18"/>`,
  door: `<rect x="12" y="5" width="26" height="40" rx="1.5"/><circle cx="31" cy="26" r="1.8"/><path d="M6 45h38"/>`,
  electric: `<path d="M28 5L13 28h11l-2 17 15-23H26l2-17Z"/>`,
  gas: `<path d="M25 6c2 8 9 11 9 20a9 9 0 0 1-18 0c0-4 2-7 4-9 0 4 2 6 4 6 1-6-2-10 1-17Z"/>`,
  heating: `<rect x="6" y="14" width="38" height="24" rx="3"/><path d="M14 14v24M22 14v24M30 14v24M38 14v24"/>`,
  hot_water: `<path d="M8 20h18a6 6 0 0 1 6 6v3"/><path d="M26 13v7M20 13h12M8 17v6"/><path d="M32 33c-2.5 3.5-4 5.5-4 7.5a4 4 0 0 0 8 0c0-2-1.5-4-4-7.5Z"/>`,
  lamp: `<path d="M17 6h16l6 18H11l6-18Z"/><path d="M25 24v14"/><path d="M15 44h20"/><path d="M25 38v6"/>`,
  menu: `<path d="M8 15h34M8 25h34M8 35h34"/>`,
  pendent: `<path d="M25 4v12"/><path d="M11 30a14 14 0 0 1 28 0Z"/><path d="M19 36a6 6 0 0 0 12 0"/>`,
  plug: `<path d="M18 6v10M32 6v10"/><path d="M12 16h26v6a13 13 0 0 1-26 0v-6Z"/><path d="M25 35v9"/>`,
  power_off: `<path d="M25 8v16"/><path d="M15.5 14a14 14 0 1 0 19 0"/>`,
  power_on: `<path d="M25 8v16"/><path d="M15.5 14a14 14 0 1 0 19 0"/><circle cx="25" cy="40" r="2.2" fill="#fff" stroke="none"/>`,
  // ---- card icons that used to fall back to MDI (2026-10-07): same stroke, same 50x50 box ----
  thermometer: `<path d="M20 30V9a5 5 0 0 1 10 0v21a9 9 0 1 1-10 0Z"/><circle cx="25" cy="37" r="3.2"/><line x1="25" y1="34" x2="25" y2="16"/>`,
  water: `<path d="M25 5C17 15 11 23 11 30a14 14 0 0 0 28 0c0-7-6-15-14-25Z"/><path d="M18 31a7 7 0 0 0 7 7"/>`,
  leak: `<path d="M25 5C17 15 11 23 11 30a14 14 0 0 0 28 0c0-7-6-15-14-25Z"/><line x1="25" y1="20" x2="25" y2="31"/><circle cx="25" cy="37" r="1.6" fill="#fff" stroke="none"/>`,
  motion: `<circle cx="29" cy="8" r="3.5"/><path d="M27 15l-5 13 7 6v11"/><path d="M22 28l-5 17"/><path d="M26 17l-8 4-3 7"/><path d="M27 16l6 7h7"/>`,
  dishwasher: `<rect x="9" y="5" width="32" height="40" rx="3"/><line x1="9" y1="13" x2="41" y2="13"/><circle cx="15" cy="9" r="1.3"/><line x1="23" y1="9" x2="35" y2="9"/>${[17, 22, 27, 32].map(x => `<line x1="${x}" y1="24" x2="${x}" y2="37"/>`).join("")}<line x1="14" y1="37" x2="36" y2="37"/>`,
  washing_machine: `<rect x="9" y="5" width="32" height="40" rx="3"/><line x1="9" y1="13" x2="41" y2="13"/><circle cx="15" cy="9" r="1.3"/><line x1="23" y1="9" x2="35" y2="9"/><circle cx="25" cy="29" r="10"/><path d="M17.5 30c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/>`,
  dryer: `<rect x="9" y="5" width="32" height="40" rx="3"/><line x1="9" y1="13" x2="41" y2="13"/><circle cx="15" cy="9" r="1.3"/><line x1="23" y1="9" x2="35" y2="9"/><circle cx="25" cy="29" r="10"/><path d="M21 25c2 1.5 2 3 0 4.5s-2 3 0 4.5M28 25c2 1.5 2 3 0 4.5s-2 3 0 4.5"/>`,
  oven: `<rect x="7" y="6" width="36" height="38" rx="3"/><line x1="7" y1="14" x2="43" y2="14"/>${[14, 21, 29, 36].map(x => `<circle cx="${x}" cy="10" r="1.3"/>`).join("")}<rect x="13" y="20" width="24" height="18" rx="2"/><line x1="17" y1="24" x2="33" y2="24"/>`,
  microwave: `<rect x="4" y="10" width="42" height="30" rx="3"/><rect x="9" y="15" width="24" height="20" rx="2"/><line x1="38" y1="10" x2="38" y2="40"/><circle cx="42" cy="17" r="1.3"/><circle cx="42" cy="23" r="1.3"/>`,
  coffee: `<path d="M9 19h26v12a10 10 0 0 1-10 10h-6A10 10 0 0 1 9 31Z"/><path d="M35 22h3a5 5 0 0 1 0 10h-4"/><line x1="7" y1="45" x2="37" y2="45"/><path d="M17 6c-2 2.5 2 4 0 7M24 6c-2 2.5 2 4 0 7M31 6c-2 2.5 2 4 0 7"/>`,
  boiler: `<rect x="12" y="4" width="26" height="36" rx="8"/><line x1="12" y1="15" x2="38" y2="15"/><line x1="19" y1="40" x2="19" y2="46"/><line x1="31" y1="40" x2="31" y2="46"/><path d="M25 22c-3 3.5-4 5.5-4 7.5a4 4 0 0 0 8 0c0-2-1-4-4-7.5Z"/>`,
  tv: `<rect x="4" y="8" width="42" height="28" rx="3"/><path d="M17 44h16M25 36v8"/>`,
  sparkles: `<path d="M21 6l3.2 9.8L34 19l-9.8 3.2L21 32l-3.2-9.8L8 19l9.8-3.2Z"/><path d="M37 29l1.8 5.2L44 36l-5.2 1.8L37 43l-1.8-5.2L30 36l5.2-1.8Z"/>`,
  sensor: `<circle cx="25" cy="25" r="17"/><circle cx="25" cy="25" r="5"/>`,
  smoke: `<path d="M7 16h36l-4 7H11Z"/><circle cx="25" cy="19.5" r="1.3"/><path d="M14 31c2 2 2 4 0 6s-2 4 0 6M25 31c2 2 2 4 0 6s-2 4 0 6M36 31c2 2 2 4 0 6s-2 4 0 6"/>`,
  battery: `<rect x="5" y="15" width="36" height="20" rx="3"/><path d="M41 21h3v8h-3"/><rect x="10" y="20" width="12" height="10" rx="1"/>`,
  robot: `<rect x="9" y="15" width="32" height="25" rx="5"/><circle cx="19" cy="27" r="2.6"/><circle cx="31" cy="27" r="2.6"/><path d="M25 15V9"/><circle cx="25" cy="7" r="2"/><path d="M9 25H5v8h4M41 25h4v8h-4"/><path d="M20 34h10"/>`,
  code: `<path d="M16 15L6 25l10 10M34 15l10 10-10 10M28 9l-6 32"/>`,
  swap: `<path d="M17 42V8M8 17l9-9 9 9M33 8v34M24 33l9 9 9-9"/>`,
  server: `<rect x="7" y="6" width="36" height="16" rx="3"/><rect x="7" y="28" width="36" height="16" rx="3"/><circle cx="14" cy="14" r="1.3"/><circle cx="14" cy="36" r="1.3"/><line x1="22" y1="14" x2="36" y2="14"/><line x1="22" y1="36" x2="36" y2="36"/>`,
  chip: `<rect x="12" y="12" width="26" height="26" rx="3"/><rect x="19" y="19" width="12" height="12" rx="1"/>${[18, 25, 32].map(v => `<line x1="${v}" y1="5" x2="${v}" y2="12"/><line x1="${v}" y1="38" x2="${v}" y2="45"/><line x1="5" y1="${v}" x2="12" y2="${v}"/><line x1="38" y1="${v}" x2="45" y2="${v}"/>`).join("")}`,
  harddisk: `<rect x="8" y="5" width="34" height="40" rx="3"/><circle cx="25" cy="21" r="10"/><circle cx="25" cy="21" r="2"/><path d="M27 23l6 8"/><circle cx="15" cy="39" r="1.3"/>`,
  update: `<path d="M40 22A15 15 0 0 0 12.5 15M10 28a15 15 0 0 0 27.5 7"/><path d="M12 6v9.5h9.5M38 44v-9.5h-9.5"/>`,
  home: `<path d="M6 23L25 7l19 16"/><path d="M11 19v25h28V19"/><path d="M21 44V32h8v12"/>`,
  solar: `<path d="M9 20h32l5 19H4Z"/><path d="M6.5 29.5h37M19 20l-2 19M31 20l2 19"/><path d="M25 39v6M18 45h14"/><path d="M25 5v6M15 8l3 4M35 8l-3 4"/>`,
  timer: `<circle cx="25" cy="28" r="17"/><path d="M25 28V18M20 5h10M25 5v6M39 13l3-3"/>`,
  devices: `<rect x="4" y="9" width="30" height="22" rx="2"/><path d="M12 39h14M19 31v8"/><rect x="31" y="20" width="15" height="24" rx="2.5"/><line x1="36" y1="40" x2="41" y2="40"/>`,
  floorplan: `<rect x="5" y="5" width="40" height="40" rx="2"/><path d="M5 23h14M27 23h18M23 5v10M23 23v22"/>`,
  counter: `<rect x="4" y="12" width="42" height="26" rx="3"/><path d="M12 21l3-2v12M21 22a3 3 0 0 1 6 0c0 3-6 5-6 9h6M33 19h5l-3 4a3.5 3.5 0 1 1-2.5 6"/>`,
  shapes: `<circle cx="15" cy="15" r="9"/><rect x="27" y="27" width="17" height="17" rx="2"/><path d="M35 5l9 15H26Z"/><path d="M6 44l9-15 9 15Z"/>`,
  network_off: `<rect x="18" y="5" width="14" height="11" rx="2"/><rect x="5" y="34" width="14" height="11" rx="2"/><rect x="31" y="34" width="14" height="11" rx="2"/><path d="M25 16v6M12 34v-6h26v6"/><path d="M6 6l38 38"/>`,
  radar: `<circle cx="25" cy="25" r="19"/><circle cx="25" cy="25" r="11"/><circle cx="25" cy="25" r="2.5"/><path d="M25 25l13-13"/>`,
  gft: `<path d="M23 16c-3-3-8-3-11 0-5 4-6 12-3 19 3 6 7 10 11 10 2 0 3-1 5-1s3 1 5 1c4 0 8-4 11-10 1-3 2-6 2-9a8 8 0 0 1-9-5c-2-2-5-3-8-3-1 0-2 0-3 1Z"/><path d="M25 16c0-4 3-7 6-8"/><path d="M25 10c2-4 6-5 10-4-1 4-5 6-10 4Z"/>`,
  pmd: `<path d="M20 5h10v6l4 7v22a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V18l4-7V5Z"/><path d="M16 26h18M16 34h18"/>`,
  papier: `<path d="M9 7h26v31a5 5 0 0 0 5 5H14a5 5 0 0 1-5-5V7Z"/><path d="M35 17h5v21a5 5 0 0 1-5 5"/><path d="M15 15h14M15 22h14M15 29h9"/>`,
  rest: `<path d="M18 13l-2-6h18l-2 6"/><path d="M12 13h26l-3 30H15Z"/><path d="M20 21v15M25 21v15M30 21v15"/>`,
  music: `<path d="M19 38V12l22-4v26"/><circle cx="13" cy="38" r="6"/><circle cx="35" cy="34" r="6"/>`,
  search: `<circle cx="21" cy="21" r="14"/><path d="M31.5 31.5L44 44"/>`,
  // weather
  sun: `<circle cx="25" cy="25" r="9"/>${rays(25, 25, 13.5, 18.5)}`,
  moon: `<path d="M29 5a20 20 0 1 0 16 29A16.5 16.5 0 0 1 29 5Z"/>`,
  cloud: cloud(4, 39, 1.1),
  partly_cloudy: `<circle cx="17" cy="16" r="6.5"/>${rays(17, 16, 10, 13.5, 8)}${cloud(10, 43, 0.9)}`,
  rain: `${cloud(6, 30, 1.0)}${[16, 24, 32].map(x => `<line x1="${x}" y1="36" x2="${x - 2.5}" y2="45"/>`).join("")}`,
  pouring: `${cloud(6, 29, 1.0)}${[13, 19, 25, 31, 37].map(x => `<line x1="${x}" y1="35" x2="${x - 3}" y2="46"/>`).join("")}`,
  snow: `${cloud(6, 30, 1.0)}${[16, 25, 34].map(x => `<circle cx="${x}" cy="41" r="1.6"/>`).join("")}`,
  lightning: `${cloud(6, 29, 1.0)}<path d="M26 33l-5 8h6l-3 6"/>`,
  fog: `${cloud(6, 29, 1.0)}<line x1="10" y1="37" x2="40" y2="37"/><line x1="14" y1="43" x2="36" y2="43"/>`,
  wind: `<path d="M5 18h26a4.5 4.5 0 1 0-4.5-4.5"/><path d="M5 26h34a4.5 4.5 0 1 1-4.5 4.5"/><path d="M5 34h18a3.5 3.5 0 1 1-3.5 3.5"/>`,
};
for (const [n, body] of Object.entries(icons)) writeFileSync(`icons/${n}.svg`, wrap(body, n));
console.log("icons:", Object.keys(icons).join(" "));
