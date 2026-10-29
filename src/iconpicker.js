// Icon picker: every icon field is an icon button + the text field; the button opens a search overlay over everything
// (also over an open popup, so its draft stays). The Material Design Icons names come from the build ("hcn:mdi"), so the
// search works offline: by name, alias ("bulb", "person") and category ("Home Automation").
import { html, nothing } from "lit";
import { t } from "./i18n.js";
import MDI, { TAGS } from "hcn:mdi";
import { ICON_NAMES } from "./util.js";
import { anyIco } from "./cards.js";

let LIST = null;
/** [{ n: name, w: "name + aliases + categories" in lower case }] once, on first use */
const icons = () => LIST || (LIST = MDI.split("\n").map(l => { const [n, a = "", c = ""] = l.split("|");
  return { n, w: `${n} ${a} ${[...c].map(ch => TAGS[ch.charCodeAt(0) - 65] || "").join(" ")}`.toLowerCase() }; }));

/** what the picker shows before anything is typed: icons a home dashboard uses most */
const POPULAR = ["home-outline", "sofa-outline", "bed-outline", "silverware-fork-knife", "stove", "shower", "toilet", "desk", "garage", "flower-outline",
  "lightbulb-outline", "lightbulb-group-outline", "ceiling-light-outline", "floor-lamp-outline", "lamp-outline", "led-strip-variant", "string-lights", "wall-sconce-outline",
  "power-socket-eu", "power-plug-outline", "toggle-switch-outline", "fan", "air-conditioner", "radiator", "thermometer", "thermostat", "water-percent", "air-filter",
  "television", "speaker", "music", "cast", "movie-open-outline", "gamepad-variant-outline", "book-open-variant", "palette-outline",
  "washing-machine", "tumble-dryer", "dishwasher", "fridge-outline", "coffee-maker-outline", "kettle-outline", "microwave", "robot-vacuum",
  "door", "door-open", "window-closed-variant", "window-open-variant", "window-shutter", "blinds", "gate", "lock-outline", "lock-open-variant-outline", "doorbell",
  "shield-home-outline", "cctv", "motion-sensor", "smoke-detector-variant", "water-alert-outline", "battery-outline",
  "lightning-bolt", "solar-power-variant-outline", "fire", "car-outline", "ev-station", "trash-can-outline", "recycle", "calendar-blank-outline", "clock-outline", "alarm",
  "bell-outline", "account-outline", "account-group-outline", "dog", "cat", "sprinkler-variant", "weather-partly-cloudy", "weather-night", "sleep", "information-outline",
  "alert-circle-outline", "check-circle-outline", "star-outline", "heart-outline", "cog-outline", "wifi", "router-wireless", "printer-outline", "text"];

/** Dutch and German search words → the English words in icon names (MDI is English only) */
const WORDS = {
  lamp: "lamp light bulb", lampen: "lamp light bulb", licht: "light bulb lamp", verlichting: "light lamp", leuchte: "lamp light", birne: "bulb", gluehbirne: "bulb", glühbirne: "bulb",
  deur: "door", deuren: "door", tür: "door", tuer: "door", raam: "window", ramen: "window", fenster: "window", rolluik: "shutter roller blind", gordijn: "curtain blind", rollladen: "shutter roller", vorhang: "curtain",
  slot: "lock", schloss: "lock", sleutel: "key", schlüssel: "key", poort: "gate", tor: "gate garage", garage: "garage", deurbel: "doorbell", klingel: "doorbell bell",
  verwarming: "radiator thermostat heat", heizung: "radiator thermostat heat", thermostaat: "thermostat", temperatuur: "thermometer temperature", temperatur: "thermometer temperature",
  ventilator: "fan", lüfter: "fan", airco: "air-conditioner", klimaanlage: "air-conditioner", vocht: "water-percent humidity", luftfeuchtigkeit: "water-percent humidity",
  stekker: "plug socket", stopcontact: "socket", steckdose: "socket", schakelaar: "switch", schalter: "switch", stroom: "lightning flash power", strom: "lightning flash power", energie: "lightning flash power", zon: "sun solar", sonne: "sun solar", zonnepaneel: "solar", gas: "gas fire",
  tv: "television", fernseher: "television", televisie: "television", muziek: "music", musik: "music", luidspreker: "speaker", lautsprecher: "speaker", boek: "book", buch: "book", film: "movie",
  keuken: "kitchen silverware stove", küche: "kitchen silverware stove", kueche: "kitchen silverware stove", bank: "sofa", sofa: "sofa", bed: "bed", bett: "bed", slaapkamer: "bed", schlafzimmer: "bed", badkamer: "shower bath", bad: "bath shower", douche: "shower", dusche: "shower", wc: "toilet",
  wasmachine: "washing-machine", waschmaschine: "washing-machine", droger: "tumble-dryer", trockner: "tumble-dryer", vaatwasser: "dishwasher", spülmaschine: "dishwasher", koelkast: "fridge", kühlschrank: "fridge", koffie: "coffee", kaffee: "coffee", oven: "stove oven", herd: "stove",
  stofzuiger: "vacuum robot", staubsauger: "vacuum robot", tuin: "flower tree sprinkler", garten: "flower tree sprinkler", plant: "flower sprout", pflanze: "flower sprout", water: "water", wasser: "water",
  afval: "trash recycle", müll: "trash recycle", muell: "trash recycle", vuilnis: "trash", auto: "car", laadpaal: "ev-station", fiets: "bicycle bike", fahrrad: "bicycle bike",
  camera: "cctv camera", kamera: "cctv camera", beweging: "motion run", bewegung: "motion run", rook: "smoke", rauch: "smoke", alarm: "alarm shield", beveiliging: "shield security", sicherheit: "shield security",
  agenda: "calendar", kalender: "calendar", klok: "clock", uhr: "clock", wekker: "alarm", batterij: "battery", batterie: "battery", netwerk: "wifi network router", netzwerk: "wifi network router",
  persoon: "account person", person: "account person", gezin: "account-group", familie: "account-group", hond: "dog", hund: "dog", kat: "cat", katze: "cat", kind: "baby child", baby: "baby",
  weer: "weather", wetter: "weather", regen: "rain", sneeuw: "snow", schnee: "snow", wolk: "cloud", wolke: "cloud", nacht: "night moon", maan: "moon", mond: "moon", slapen: "sleep", schlafen: "sleep",
  instellingen: "cog settings", einstellungen: "cog settings", huis: "home house", haus: "home house", thuis: "home", zuhause: "home", ster: "star", stern: "star", hart: "heart", herz: "heart",
};
const MAX = 240;
/** a query as words, each with its translations; an icon matches when every word (or one of its translations) occurs */
const parse = q => { q = String(q || "").toLowerCase().replace(/^(mdi|hacasa):/, "").trim(); const words = q.split(/[\s_-]+/).filter(Boolean);
  return { q, words, joined: words.join("-"), alts: words.map(w => [w, ...(WORDS[w] || "").split(" ").filter(Boolean)]) }; };
const score = (name, { joined, words }) => name === joined ? 0 : name.startsWith(joined) ? 1 : name.includes(joined) ? 2 : words.every(w => name.includes(w)) ? 3 : 4;

/** Material Design Icons matching `q` (no query: the popular ones) */
export function searchIcons(q) {
  const all = icons(), pq = parse(q);
  if (!pq.q) { const have = new Set(all.map(x => x.n)); return { list: POPULAR.filter(n => have.has(n)), total: all.length, popular: true }; }
  const hits = [];
  for (const x of all) if (pq.alts.every(a => a.some(w => x.w.includes(w)))) hits.push([score(x.n, pq), x.n]);
  hits.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || a[1].localeCompare(b[1]));
  return { list: hits.slice(0, MAX).map(h => h[1]), total: hits.length };
}

/* ---------- HaCasa's own icons (icons/*.svg, value "hacasa:<name>") ---------- */
const UI_ONLY = ["close", "menu", "search", "increase", "decrease"];   // panel chrome, not something to put on a card
/** extra search words per own icon (the file name counts too) */
const OWN_WORDS = {
  hacasa: "logo house home", lamp: "light table", pendent: "light ceiling hanging", bulb: "light lightbulb", bulb_group: "light lightbulb group", ceiling: "light", floor_lamp: "light lamp standing",
  led_strip: "light led strip", spot: "light spotlight downlight", wall_light: "light lamp sconce", electric: "power energy lightning flash", gas: "fire flame", heating: "radiator heat",
  hot_water: "boiler water tap", boiler: "water heater", tv: "television", apple_tv: "media streaming tv", console: "gamepad game", plug: "socket power outlet", sparkles: "scene magic",
  sensor: "binary circle", counter: "number", radar: "presence", network_off: "offline lan", access_point: "wifi network wireless", motion: "person walk run", leak: "water alert",
  timer: "stopwatch", floorplan: "rooms house", kitchen: "cutlery silverware food fork knife", ac: "air conditioner cool climate", vacuum: "robot cleaner", robot: "automation",
  ev_charger: "car charging station electric", people: "family group account", person: "user account", paw: "pet dog cat animal", bed: "bedroom sleep", sofa: "living couch lounge",
  bath: "bathroom tub", shower: "bathroom", toilet: "bathroom wc", desk: "office work", garage: "car house", stairs: "landing hall steps", gate: "fence", blinds: "shutter cover roller",
  curtain: "cover drape", window_open: "window", doorbell: "door bell", shield: "alarm security", bell: "notification", alarm_clock: "clock wake", palette: "scene color colour",
  movie: "film cinema", play: "media", speaker: "music audio", headphones: "music audio", book: "read", fridge: "refrigerator kitchen", kettle: "water boil kitchen tea", printer: "print",
  router: "wifi network internet", phone: "mobile", laptop: "computer", plant: "garden flower", tree: "garden outdoor", star: "favourite favorite", heart: "favourite favorite love",
  check: "ok done", snowflake: "cold cool winter frost", gft: "waste bin organic green", pmd: "waste bin plastic", papier: "waste bin paper", rest: "waste bin general", trash: "waste bin",
  washing_machine: "laundry washer", dryer: "laundry tumble", dishwasher: "kitchen", oven: "stove kitchen", microwave: "kitchen", coffee: "kitchen", dehumidifier: "humidity",
  water: "humidity drop", thermometer: "temperature", solar: "sun power energy", partly_cloudy: "weather", rain: "weather", pouring: "weather rain", snow: "weather", sun: "weather",
  moon: "night weather", cloud: "weather", fog: "weather", lightning: "weather storm", wind: "weather", window: "window closed", door: "door closed",
};
let OWN = null;
const owns = () => OWN || (OWN = ICON_NAMES.filter(n => !UI_ONLY.includes(n)).sort().map(f => { const n = f === "hacasa" ? "logo" : f;
  return { n, f, w: `${n} ${f.replace(/_/g, " ")} ${OWN_WORDS[f] || ""}`.toLowerCase() }; }));
/** our own icons matching `q` (all of them without a query) */
export function searchOwn(q) {
  const pq = parse(q), all = owns();
  if (!pq.q) return all.map(x => x.n);
  return all.filter(x => pq.alts.every(a => a.some(w => x.w.includes(w)))).sort((a, b) => score(a.f, pq) - score(b.f, pq) || a.n.localeCompare(b.n)).map(x => x.n);
}

/** an icon field: the text field with a button after it that shows the current icon and opens the picker; `set` receives the new value or undefined */
export const iconInput = (p, v, set, ph = "mdi:shape-outline") => html`<span class="icin">
  <input type="text" .value=${v || ""} placeholder=${ph} @change=${e => set(e.target.value.trim() || undefined)}>
  <button type="button" class=${v ? "icb" : "icb ph"} title=${t("Icoon kiezen")} @click=${ev => { ev.preventDefault(); ev.stopPropagation(); p.pickIcon(v, set, ph); }}>${anyIco(v || ph)}</button>
</span>`;

/** the overlay (panel.iconPick = { cur, set, ph, q, src: "" | "hacasa" | "mdi" }) */
export function iconPicker(p) {
  const ip = p.iconPick; if (!ip) return nothing;
  const src = ip.src || "", close = () => { p.iconPick = null; };
  const own = src === "mdi" ? [] : searchOwn(ip.q), res = src === "hacasa" ? { list: [], total: 0 } : searchIcons(ip.q);
  const pick = v => { ip.set(v); close(); };
  const cur = ip.cur || "", first = own.length ? "hacasa:" + own[0] : res.list.length && !res.popular ? "mdi:" + res.list[0] : null;
  const cell = (v, label) => html`<button class=${v === cur ? "on" : ""} title=${v} @click=${() => pick(v)}>${anyIco(v)}<span>${label}</span></button>`;
  const count = n => n.toLocaleString();
  return html`<div class="ipick" @click=${close} @keydown=${e => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
    <div class="ipbox" @click=${e => e.stopPropagation()}>
      <div class="iph">
        <ha-icon icon="mdi:magnify"></ha-icon>
        <input type="search" .value=${ip.q || ""} placeholder=${t("Zoek een icoon, bv. lamp, bed, door, tv")}
          @input=${e => { p.iconPick = { ...ip, q: e.target.value }; }}
          @keydown=${e => { if (e.key === "Enter" && ip.q && first) pick(first); }}>
        <button class="ipx" title=${t("Sluiten")} @click=${close}><ha-icon icon="mdi:close"></ha-icon></button>
      </div>
      <div class="ipmeta">
        <div class="seg">${[["", t("Alles")], ["hacasa", "HaCasa"], ["mdi", "MDI"]].map(([v, l]) => html`<button class=${src === v ? "on" : ""} @click=${() => { p.iconPick = { ...ip, src: v }; }}>${l}</button>`)}</div>
        <span></span>
        ${ip.cur ? html`<button class="none" @click=${() => pick(undefined)}><ha-icon icon="mdi:close-circle-outline"></ha-icon>${t("Geen icoon")}</button>` : nothing}
      </div>
      <div class="ipscroll">
        ${src !== "mdi" ? html`<div class="iphd"><b>HaCasa</b><span>${own.length ? t("{n} iconen in de stijl van het paneel", { n: own.length }) : t("Niets gevonden")}</span></div>
          ${own.length ? html`<div class="ipgrid">${own.map(n => cell("hacasa:" + n, n.replace(/_/g, " ")))}</div>` : nothing}` : nothing}
        ${src !== "hacasa" ? html`<div class="iphd"><b>Material Design Icons</b><span>${res.popular ? t("Veelgebruikt · typ om alle {n} iconen te doorzoeken", { n: count(res.total) }) : res.total ? (res.total > MAX ? t("{n} gevonden · de eerste {m}", { n: count(res.total), m: MAX }) : t("{n} gevonden", { n: res.total })) : t("Niets gevonden; probeer een Engels woord")}</span></div>
          ${res.list.length ? html`<div class="ipgrid">${res.list.map(n => cell("mdi:" + n, n.replace(/-/g, " ")))}</div>` : nothing}` : nothing}
      </div>
    </div>
  </div>`;
}

export const iconPickerStyles = `
  .icin{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px;align-items:center;min-width:0}
  .icin .icb{width:40px;height:40px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
  .icin .icb:hover{background:rgba(255,255,255,.18);border-color:var(--line-on)}
  .icin .icb.ph{color:var(--fg-3)}
  .icin .icb ha-icon{--mdc-icon-size:20px}
  .ipick{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.35);animation:fadeIn .15s}
  .ipbox{width:min(640px,calc(100vw - 24px));height:min(560px,calc(100vh - 48px));display:flex;flex-direction:column;border-radius:10px;background:rgba(44,46,50,.78);backdrop-filter:blur(28px) saturate(1.3);-webkit-backdrop-filter:blur(28px) saturate(1.3);border:1px solid var(--line);box-shadow:0 30px 80px rgba(0,0,0,.45);overflow:hidden;color:#fff}
  .ipbox .iph{display:flex;align-items:center;gap:10px;padding:14px 14px 10px 18px}
  .ipbox .iph>ha-icon{--mdc-icon-size:20px;color:var(--fg-2);flex:none}
  .ipbox .iph input{flex:1;min-width:0;height:42px;border:1px solid var(--line);border-radius:999px;background:rgba(0,0,0,.25);color:#fff;font:inherit;font-size:15px;padding:0 16px;outline:none}
  .ipbox .iph input:focus{border-color:var(--line-on)}
  .ipbox .ipx{width:38px;height:38px;flex:none;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
  .ipbox .ipx ha-icon{--mdc-icon-size:18px}
  .ipbox .ipmeta{display:flex;align-items:center;gap:10px;padding:0 18px 10px;font-size:12px;color:var(--fg-3);font-weight:600}
  .ipbox .ipmeta>span{flex:1}
  .ipbox .ipmeta .seg button{height:30px;padding:0 12px;font-size:10px}
  .ipbox .ipmeta button.none{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 9px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .ipbox .ipmeta button.none ha-icon{--mdc-icon-size:15px}
  .ipbox .ipscroll{flex:1;overflow-y:auto;padding:0 14px 16px;overscroll-behavior:contain}
  .ipbox .iphd{display:flex;align-items:baseline;gap:10px;margin:12px 4px 8px;font-size:12px;color:var(--fg-3);font-weight:600}
  .ipbox .iphd b{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--fg-2);font-weight:700}
  .ipbox .ipgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
  .ipbox .ipgrid button{height:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;border-radius:var(--r-sm);background:rgba(255,255,255,.05);color:#fff;font:inherit;cursor:pointer;padding:6px 4px;min-width:0}
  .ipbox .ipgrid button:hover{background:rgba(255,255,255,.14);border-color:var(--line)}
  .ipbox .ipgrid button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .ipbox .ipgrid button ha-icon{--mdc-icon-size:26px}
  .ipbox .ipgrid button span{font-size:10px;font-weight:500;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.75}
  @media (max-width:900px){ .ipick{place-items:end center} .ipbox{width:100%;height:min(78vh,620px);border-radius:14px 14px 0 0} .ipbox .ipgrid{grid-template-columns:repeat(auto-fill,minmax(72px,1fr))} }
`;
