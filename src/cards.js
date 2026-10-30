// Card renderers. Each returns a lit template. `p` is the panel (for hass, popups, services).
import { t, locale, timeOpts } from "./i18n.js";
import { html, nothing } from "lit";
import { directive, Directive, PartType } from "lit/directive.js";
import { classMap } from "lit/directives/class-map.js";
import { icon, isOn, unavailable, num, relTime, shortDate, sinceText, domain } from "./util.js";
import { name, deviceName } from "./model.js";
import { applianceState, applianceEnd, eventWhen, nextEvent } from "./extras2.js";
import { spark } from "./extras3.js";
import { tw } from "./motion.js";
import { sky, feelsLike } from "./sky.js";
import { graphCard, stepGraph } from "./graph.js";
import { peopleCard, securityCard, todoCard, todoEntity, evCard, evReady, timersCard, timerList, solarCard, solarReady, gardenCard, gardenReady } from "./cards2.js";
import "./camsnap.js";

const HOLD_MS = 500;

/** Tap/hold wiring for a card. tap(): toggle or open, hold(): open details. */
export function press(p, opts) {
  let timer = null, held = false, x0 = 0, y0 = 0;
  const cancel = () => { clearTimeout(timer); timer = null; };
  const h = {
    opts,
    "@pointerdown": e => {
      if (e.target.closest(".ctl, .slider, .vslider, .seg") || (e.target.closest("button") && e.target.closest("button") !== e.currentTarget)) return;
      held = false; x0 = e.clientX; y0 = e.clientY;
      timer = setTimeout(() => { held = true; if (h.opts.hold) { h.opts.hold(); try { navigator.vibrate?.(10); } catch {} } }, HOLD_MS);
    },
    "@pointermove": e => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 8) cancel(); },
    "@pointerup": cancel, "@pointerleave": cancel, "@pointercancel": cancel,
    "@click": e => {
      if (e.target.closest(".ctl, .slider, .vslider, .seg") || (e.target.closest("button") && e.target.closest("button") !== e.currentTarget)) return;
      if (Date.now() - (e.currentTarget.__skipClick || 0) < 500) return;   // slider was just released
      if (held || p.stripDragged()) { held = false; return; }
      (h.opts.tap || h.opts.hold)?.();
    },
    "@contextmenu": e => e.preventDefault(),
  };
  return h;
}
// lit cannot spread listeners, so apply them via a directive-free helper:
export const bind = (el, handlers) => { for (const [k, fn] of Object.entries(handlers)) if (k.startsWith("@")) el.addEventListener(k.slice(1), fn); };

/* MDI names used in the code -> our own thin-line icon (dist/icons, dev/make-icons.mjs), so every card icon has one style.
   Anything not listed (or an icon the user picked) still renders as MDI. */
const OWN = {
  "mdi:thermometer": "thermometer", "mdi:water-outline": "water", "mdi:water-percent": "water", "mdi:water-alert-outline": "leak", "mdi:motion-sensor": "motion",
  "mdi:dishwasher": "dishwasher", "mdi:washing-machine": "washing_machine", "mdi:tumble-dryer": "dryer", "mdi:stove": "oven", "mdi:microwave": "microwave",
  "mdi:coffee-maker": "coffee", "mdi:water-boiler": "boiler", "mdi:power-plug-outline": "plug", "mdi:power-socket-eu": "plug", "mdi:television-play": "tv",
  "mdi:television-classic": "tv", "mdi:palette-outline": "sparkles", "mdi:checkbox-blank-circle-outline": "sensor", "mdi:smoke-detector-outline": "smoke",
  "mdi:battery": "battery", "mdi:battery-20": "battery", "mdi:battery-50": "battery", "mdi:robot-outline": "robot", "mdi:code-braces": "code", "mdi:swap-vertical": "swap",
  "mdi:server": "server", "mdi:server-outline": "server", "mdi:chip": "chip", "mdi:harddisk": "harddisk", "mdi:update": "update", "mdi:home-import-outline": "home",
  "mdi:home-assistant": "home", "mdi:solar-power-variant-outline": "solar", "mdi:timer-outline": "timer", "mdi:devices": "devices", "mdi:floor-plan": "floorplan",
  "mdi:counter": "counter", "mdi:shape-outline": "shapes", "mdi:lan-disconnect": "network_off", "mdi:radar": "radar", "mdi:cctv": "camera", "mdi:door": "door",
  "mdi:window-closed-variant": "window", "mdi:fire": "gas", "mdi:flash-outline": "electric", "mdi:lightning-bolt-outline": "electric", "mdi:lightbulb-outline": "lamp",
  "mdi:trash-can-outline": "trash", "mdi:calendar-blank-outline": "calendar", "mdi:fan": "fan", "mdi:lock": "lock", "mdi:lock-open-variant": "lock_open", "mdi:lock-clock": "lock",
};
// entity-provided icons (System Monitor and the like) by keyword
const OWN_RE = [[/cpu|chip|memory/, "chip"], [/harddisk|disk|database/, "harddisk"], [/thermometer|temperature/, "thermometer"], [/water|humidity/, "water"], [/battery/, "battery"],
  [/lightning|flash/, "electric"], [/server/, "server"], [/timer|clock/, "timer"], [/lan|network|wifi|ethernet|router/, "access_point"], [/update|restart|reload/, "update"],
  [/motion|walk/, "motion"], [/door/, "door"], [/window/, "window"], [/lightbulb|lamp/, "lamp"], [/home/, "home"], [/television|monitor/, "tv"], [/fan/, "fan"]];
const ownFor = mdi => OWN[mdi] || (mdi?.startsWith("mdi:") ? OWN_RE.find(([re]) => re.test(mdi))?.[1] : null);
/** "hacasa:<name>" = one of our own icons (icons/<name>.svg; hacasa:logo = the mark) */
export const ownName = v => typeof v === "string" && v.startsWith("hacasa:") ? (v.slice(7) === "logo" ? "hacasa" : v.slice(7)) : null;
export const ico = (mdi, svg) => (svg = svg || ownName(mdi) || ownFor(mdi)) ? html`<img class="ico" src=${icon(svg)} alt="">` : html`<ha-icon icon=${mdi}></ha-icon>`;
/** an icon exactly as chosen, never swapped for one of ours: hacasa:… is our SVG (as a mask, so it takes the colour and the
    --mdc-icon-size of wherever it sits, like ha-icon), anything else goes to Home Assistant */
export const anyIco = v => ownName(v) ? html`<ha-icon class="own" style=${`--own:url("${icon(ownName(v))}")`}></ha-icon>` : html`<ha-icon icon=${v}></ha-icon>`;
/** the user's icon when one is set, else the default (which may map onto our own set) */
export const uico = (v, mdi, svg) => v ? anyIco(v) : ico(mdi, svg);
/** per-card user settings (name, icon, tap behaviour, hidden) */
/* ---------- per-card behaviour: panel-wide defaults per card type, overridden per card ---------- */
/** card type used for the defaults: entity domain, "plug" for a switch with a power meter, "appliance" for devices with a programme */
export const cardType = (p, id) => id.startsWith("device:") ? "appliance" : id.split(".")[0];
export const cardCfg = (p, id) => {
  const type = cardType(p, id), dp = p._prevDef?.type === type ? p._prevDef : null;   // _prevDef: the Card defaults form's draft, while its preview renders (per-card settings left out)
  return { ...(dp ? dp.draft : (p.config.cardDefaults || {})[type] || {}), ...(dp ? {} : p._preview?.id === id ? p._preview.draft : (p.config.cards || {})[id] || {}) };   // _preview: the card form's draft, while its preview renders
};
/** a rendered visibility template counts as false when it is one of these (or empty) */
export const condFalse = v => /^(false|0|no|off|none|unknown|unavailable|)$/i.test(String(v ?? "").trim());
/** is the card hidden by its visibility condition? `key` is its entry in p.templates ("card:<id>" or a template card id).
    Not rendered yet = hidden (no flash); a template error (also: non-admin users) = shown, so a condition never loses a card silently */
export function condHidden(p, key, tpl, invert) {
  if (!tpl) return false;
  const r = p.templates?.[key]; if (!r || r.error) return false;
  if (r.visible === undefined) return true;
  const f = condFalse(r.visible); return invert ? !f : f;
}
/** hidden by a condition {visEntity, visOp, visValue} (a comparison on an entity state) or {tplVisible} (Jinja, rendered as p.templates[tplKey]);
    tplVisibleInvert flips it. Used by cards and status pills */
export function condHiddenBy(p, c, tplKey) {
  if (c.visEntity) {
    const s = p.hass.states[c.visEntity]; if (!s) return false;
    const v = s.state, w = String(c.visValue ?? ""), n = num(v), m = num(w);
    const ok = c.visOp === "ne" ? v !== w : c.visOp === "gt" ? (n != null && m != null && n > m) : c.visOp === "lt" ? (n != null && m != null && n < m) : v === w;
    return c.tplVisibleInvert ? ok : !ok;
  }
  if (c.tplVisible) return condHidden(p, tplKey, c.tplVisible, c.tplVisibleInvert);
  return false;
}
/** tap / hold handlers from the settings: tap = toggle (default when the card can toggle) | popup | more | none; hold = popup (default) | more | none */
export function pressFor(p, id, toggle, popup) {
  const cfg = cardCfg(p, id), run = k => k === "toggle" && toggle ? toggle : k === "popup" ? popup : k === "more" ? () => p.moreInfo(id.startsWith("device:") ? cfg.key || id : id) : k === "none" ? () => {} : null;
  const tap = run(cfg.tap) || (toggle || popup), hold = run(cfg.hold) || popup;
  return { tap, hold };
}
/** classes that hide the name, subtitle or corner state when the user switched them off */
export const infoCls = cfg => ({ noname: !!cfg.hideName, nosub: !!cfg.hideSub, nostate: !!cfg.hideState });
/** user-defined action buttons (label, icon, domain.service, JSON data) on the bottom line; `target` = the entity_id used
    when the data has none (default: the card's own id; a group passes its members) */
export function customActions(p, id, target) {
  const acts = (cardCfg(p, id).actions || []).filter(a => a && a.label && a.service);
  if (!acts.length) return nothing;
  const run = a => ev => { ev.stopPropagation(); const [d, s] = a.service.split("."); let data = {}; try { data = a.data ? JSON.parse(a.data) : {}; } catch {} if (!data.entity_id && !id.startsWith("device:")) data.entity_id = target || id; p.call(d, s, data); };
  return html`<div class="ctl row" @click=${ev => ev.stopPropagation()}>${acts.slice(0, 3).map(a => html`<button @click=${run(a)}>${a.icon ? anyIco(a.icon) : nothing}${a.label}</button>`)}</div>`;
}
/** text override for a field ("state" = corner, "label" = subtitle, "foot" = bottom line) when the card has a template for it */
export const ovr = (p, id, field) => { const v = p.templates?.["card:" + id]?.[field]; return v == null || v === "" ? null : String(v); };
export const hasActs = (p, id) => (cardCfg(p, id).actions || []).some(a => a && a.label && a.service);

export const label = (p, e) => cardCfg(p, e.id).name || name(p.hass, e);
export const isHidden = (p, id) => !!cardCfg(p, id).hidden;
export const icoFor = (p, id, mdi, svg) => uico(cardCfg(p, id).icon, mdi, svg);
/** tap/hold wiring honouring the per-card "tap" override: toggle (default) or popup */
const toggleOrPopup = (p, id, toggle, popup) => pressFor(p, id, toggle, popup);

/** small centred dot between two parts of a line */
export const dot = () => html`<i class="dt"></i>`;
const Cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const ua = () => html`<span class="ua" title=${t("Onbereikbaar")}><ha-icon icon="mdi:alert-circle-outline"></ha-icon></span>`;
/** card background tint for a coloured light (rgb or colour temperature) */
function lightTint(s) {
  const a = s?.attributes || {}, mode = a.color_mode;
  let rgb = null;
  if (["hs", "rgb", "xy", "rgbw", "rgbww"].includes(mode) && a.rgb_color) rgb = a.rgb_color;
  else if (mode === "color_temp" && a.color_temp_kelvin) { const k = a.color_temp_kelvin; rgb = k < 3000 ? [255, 190, 120] : k < 4500 ? [255, 225, 190] : [205, 225, 255]; }
  else if (!mode && a.rgb_color) rgb = a.rgb_color;
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return `linear-gradient(135deg, rgba(${r},${g},${b},.08), rgba(${r},${g},${b},.08)), rgba(255,255,255,.4)`;
}
/* ---------- light card bottom: brightness steps, colour dots or today's usage (per-card setting "bottom") ---------- */
const TONES = [["#ffb46e", 2700, "warm wit"], ["#fff2e0", 4000, "neutraal wit"], ["#cfe3ff", 5500, "koel wit"]];
const DEFAULT_COLORS = ["#ffb46e", "#f27a5c", "#7fb6ff", "#9fcf8a"];
const hex2rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
export const lightCaps = s => { const m = s?.attributes?.supported_color_modes || []; return { rgb: m.some(x => ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(x)), ct: m.includes("color_temp"), dim: m.some(x => x !== "onoff") }; };
/** 24 hourly bars (or a text line) from the entity's on/off history; loads on first use */
export function todayBottom(p, id, cfg) {
  const h = p.lightHist?.[id]; if (!h) { p.loadLightHist(id); return html`<div class="lbl"><span>…</span></div>`; }
  const dur = `${Math.floor(h.onMin / 60) ? `${Math.floor(h.onMin / 60)} ${t("u")} ` : ""}${h.onMin % 60} min`;
  if (cfg.todayStyle === "text") return html`<div class="lbl today"><span>${t("Vandaag")} <b>${dur}</b> ${t("aan")}${dot()}<b>${h.count}×</b></span></div>`;
  const nowH = new Date().getHours(), order = Array.from({ length: 24 }, (_, i) => (nowH + 1 + i) % 24);
  return html`<div class="lbl bars" title=${t("Vandaag {t} aan", { t: dur })}>${order.map(i => html`<i class=${classMap({ on: h.bars[i] > 0 })} style="height:${Math.max(9, h.bars[i] * 100)}%"></i>`)}</div>`;
}
/** battery of the same device, bottom-right, when the card setting asks for it */
export function batteryCorner(p, e) {
  if (!cardCfg(p, e.id).showBattery || !e.reg?.device_id) return nothing;
  const b = p.rooms.flatMap(r => r.ents.battery).find(x => x.reg?.device_id === e.reg.device_id), v = b ? num(b.state?.state) : null;
  if (v == null) return nothing;
  return html`<div class=${classMap({ bat: true, low: v <= (p.config.home?.lowBattery ?? 20) })}>${ico(v <= 20 ? "mdi:battery-20" : v <= 50 ? "mdi:battery-50" : "mdi:battery", "battery")}${Math.round(v)}%</div>`;
}
export const batteryOf = (p, e) => e?.reg?.device_id ? p.rooms.flatMap(r => r.ents.battery).find(x => x.reg?.device_id === e.reg.device_id) || null : null;
function lightBottom(p, e, s, on, pct) {
  const cfg = cardCfg(p, e.id), caps = lightCaps(s), mode = cfg.bottom || (caps.dim ? "steps" : "none");
  if (mode === "today") return todayBottom(p, e.id, cfg);
  return lightLane(mode, caps, cfg, lightState(s), data => p.call("light", "turn_on", { entity_id: e.id, ...data }));
}
/** what the bottom lane needs to know about a light: on, brightness %, current colour / colour temperature */
export const lightState = s => { const on = isOn(s), a = s?.attributes || {}; return { on, pct: on ? Math.round((a.brightness || 255) / 2.55) : 0, rgb: on && a.rgb_color ? a.rgb_color : null, kelvin: on ? num(a.color_temp_kelvin) : null, ctWord: on ? ctWord(s) : "" }; };
/** the light card's bottom lane: brightness steps or colour dots (mode "steps" | "colors"; anything else = nothing).
    Shared with light groups, which pass the combined capabilities and state of their members and a call that targets all of them. */
export function lightLane(mode, caps, cfg, st, call) {
  const act = data => ev => { ev.stopPropagation(); call(data); };
  if (mode === "steps" && caps.dim) {
    const near = st.on ? [25, 50, 75, 100].reduce((a, b) => Math.abs(b - st.pct) < Math.abs(a - st.pct) ? b : a) : null;
    return html`<div class="lbl steps" @click=${ev => ev.stopPropagation()}>${[25, 50, 75, 100].map(v => html`<button class=${classMap({ on: near === v })} @click=${act({ brightness_pct: v })}>${v}</button>`)}</div>`;
  }
  if (mode === "colors" && (caps.rgb || caps.ct)) {
    if (caps.rgb) {
      const cols = (cfg.colors || DEFAULT_COLORS).map(h => [h, hex2rgb(h)]).filter(x => x[1]).slice(0, 6), cur = st.rgb;
      const d = c => cur ? Math.hypot(c[0] - cur[0], c[1] - cur[1], c[2] - cur[2]) : 1e9, best = cur ? cols.reduce((x, y) => d(y[1]) < d(x[1]) ? y : x) : null;
      return html`<div class="lbl cols" @click=${ev => ev.stopPropagation()}>${cols.map(([h, c]) => html`<button class=${classMap({ on: best === cols.find(x => x[0] === h) && d(c) < 60 })} style="background:${h}" @click=${act({ rgb_color: c })}></button>`)}${st.ctWord ? html`<span>${st.ctWord}</span>` : nothing}</div>`;
    }
    const k = st.kelvin, best = k != null ? TONES.reduce((x, y) => Math.abs(y[1] - k) < Math.abs(x[1] - k) ? y : x) : null;
    return html`<div class="lbl cols" @click=${ev => ev.stopPropagation()}>${TONES.map(tn => html`<button class=${classMap({ on: best === tn })} style="background:${tn[0]}" title=${t(tn[2])} @click=${act({ color_temp_kelvin: tn[1] })}></button>`)}${best ? html`<span>${t(best[2])}</span>` : nothing}</div>`;
  }
  return nothing;
}
/** warm / neutral / cool white for a light in colour-temperature mode */
function ctWord(s) { const k = s?.attributes?.color_temp_kelvin; if (!k || s.attributes.color_mode !== "color_temp") return ""; return k < 3300 ? t("warm wit") : k < 5000 ? t("neutraal wit") : t("koel wit"); }
function lightIcon(s) {
  const n = (s?.attributes?.friendly_name || "").toLowerCase();
  if (/plafond|ceiling|pendel|hang|spot/.test(n)) return "pendent";
  return "lamp";
}

/* ---------- entity cards (room page) ---------- */
export function lightCard(p, e) {
  const s = e.state, on = isOn(s), un = unavailable(s);
  const pct = on ? Math.round((s.attributes.brightness || 255) / 2.55) : 0;
  const dim = s?.attributes?.supported_color_modes?.some(m => m !== "onoff");
  const tint = on && !cardCfg(p, e.id).noColor ? lightTint(s) : null;
  return html`<div class=${classMap({ card: true, light: true, vs: !!dim, on, unavailable: un, tinted: !!tint, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })} style=${tint ? `background:${tint}` : ""}
      ${pressDir(p, toggleOrPopup(p, e.id, () => p.call("light", "toggle", { entity_id: e.id }), () => p.openPopup({ type: "light", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, "mdi:lightbulb-outline", lightIcon(s))}</div>
    <div class="c">${ovr(p, e.id, "state") ?? (un ? t("Onbereikbaar") : on ? (dim ? `${pct}%` : t("Aan")) : t("Uit"))}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${ovr(p, e.id, "label") ?? (un ? t("Onbereikbaar") : html`${Cap(sinceText(s?.last_changed))}${on && ctWord(s) ? html`${dot()}${ctWord(s)}` : nothing}`)}</div>
    ${ovr(p, e.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, e.id, "foot")}</span></div>` : lightBottom(p, e, s, on, pct)}${batteryCorner(p, e)}${customActions(p, e.id)}
    ${dim ? html`<div class="vslider" style="--v:${pct}%" @pointerdown=${ev => vsliderDrag(ev, v => v ? p.call("light", "turn_on", { entity_id: e.id, brightness_pct: v }) : p.call("light", "turn_off", { entity_id: e.id }))}><i></i></div>` : nothing}
  </div>`;
}

export function switchCard(p, e) {
  const s = e.state, on = isOn(s), un = unavailable(s), d = e.id.split(".")[0];
  const svc = d === "input_boolean" ? "input_boolean" : "switch";
  return html`<div class=${classMap({ card: true, on, unavailable: un, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })}
      ${pressDir(p, toggleOrPopup(p, e.id, () => p.call(svc, "toggle", { entity_id: e.id }), () => p.openPopup({ type: "switch", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, "mdi:power-socket-eu", "plug")}</div>
    <div class="c">${ovr(p, e.id, "state") ?? (un ? t("Onbereikbaar") : on ? t("Aan") : t("Uit"))}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${ovr(p, e.id, "label") ?? (un ? t("Onbereikbaar") : html`${on ? t("Aan") : t("Uit")}${dot()}${sinceText(s?.last_changed)}`)}</div>
    ${ovr(p, e.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, e.id, "foot")}</span></div>` : nothing}${batteryCorner(p, e)}${customActions(p, e.id)}
  </div>`;
}

/* streaming apps: name, brand colour and icon for the card when the player gives no artwork.
   Android TV reports package ids (com.netflix.ninja), Cast/Apple TV report names (Netflix). */
const APPS = [
  [/netflix/i, "Netflix", "#e50914", "mdi:netflix"], [/youtube/i, "YouTube", "#ff0000", "mdi:youtube"], [/plex/i, "Plex", "#e5a00d", "mdi:plex"],
  [/spotify/i, "Spotify", "#1db954", "mdi:spotify"], [/disney/i, "Disney+", "#113ccf", "mdi:movie-star-outline"], [/amazonvideo|prime ?video|com\.amazon\.avod/i, "Prime Video", "#00a8e1", "mdi:filmstrip"],
  [/videoland/i, "Videoland", "#e3001b", "mdi:filmstrip"], [/npo/i, "NPO Start", "#ff6d00", "mdi:television-classic"], [/hbo|com\.wbd\.stream|^max$/i, "Max", "#002be7", "mdi:filmstrip"],
  [/skyshowtime/i, "SkyShowtime", "#5d2ec6", "mdi:filmstrip"], [/kodi/i, "Kodi", "#17b2e7", "mdi:kodi"], [/twitch/i, "Twitch", "#9146ff", "mdi:twitch"],
  [/com\.apple\.tv|^tv$|apple ?tv/i, "Apple TV", "#555555", "mdi:apple"], [/ziggo/i, "Ziggo GO", "#f48c00", "mdi:television-classic"], [/kpn/i, "KPN TV", "#00c300", "mdi:television-classic"],
];
const LAUNCHER = /launcher|leanback|com\.google\.android\.tvlauncher|^home$|^startscherm$/i;
export function appInfo(raw) {
  if (!raw || LAUNCHER.test(raw)) return null;
  const m = APPS.find(([re]) => re.test(raw));
  if (m) return { name: m[1], color: m[2], icon: m[3] };
  const nm = raw.includes(".") && !raw.includes(" ") ? raw.split(".").filter(x => !/^(com|nl|tv|android|app|apps|google|sony|dtv)$/i.test(x)).pop() || raw : raw;   // com.sony.dtv.livingfit -> Livingfit
  return { name: nm.charAt(0).toUpperCase() + nm.slice(1), color: null, icon: "mdi:television-play" };
}
/** what a TV card shows: title, artwork and app from whichever linked player knows most; controls go to the player that is playing */
export function mediaView(p, e) {
  const main = p.hass.states[e.id] || e.state, cands = [main, ...(e.linked || []).map(id => p.hass.states[id])].filter(s => s && !unavailable(s));
  const active = s => s.state === "playing" || s.state === "paused";
  const info = cands.find(s => active(s) && s.attributes.entity_picture) || cands.find(s => active(s) && s.attributes.media_title) || cands.find(s => s.attributes.media_title && s.state !== "off") || main;
  const a = info?.attributes || {}, mainOff = main?.state === "off" || main?.state === "standby";
  const app = appInfo(a.app_name || main?.attributes?.app_name || (cands.find(s => s.attributes.app_name && s.state !== "off")?.attributes.app_name) || main?.attributes?.source);
  const title = a.media_series_title && a.media_title ? `${a.media_series_title} · ${a.media_title}` : a.media_title || null;
  return { main, info, app, title, artist: a.media_artist || null, art: !mainOff || active(info) ? a.entity_picture_local || a.entity_picture || null : null,   // _local = HA's proxy; the raw URL can be http on the LAN (Music Assistant) and gets blocked
    playing: cands.some(s => s.state === "playing"), paused: info?.state === "paused", off: mainOff && !cands.some(active), ctl: info && info !== main && active(info) ? info.entity_id : e.id };
}

export function mediaCard(p, e) {
  const v = mediaView(p, e), s = v.main, on = v.playing, un = unavailable(s) && !v.playing, off = v.off;
  const st = off ? t("Uit") : on ? t("Speelt af") : v.paused ? t("Gepauzeerd") : t("Aan");
  const act = (svc, id = v.ctl) => ev => { ev.stopPropagation(); p.call("media_player", svc, { entity_id: id }); };
  const cfg = cardCfg(p, e.id);
  const live = !off && !un && !cfg.noArt ? v.art : null, brand = !live && !off && !un && v.app && !cfg.noArt ? v.app : null;
  const art = live || (!brand && !un && !cfg.noIdleArt && p.config.mediaIdleImage ? p.config.mediaIdleImage : null);
  const a = v.info?.attributes || {}, dur = num(a.media_duration), pos = num(a.media_position);
  const prog = on && dur ? Math.min(100, Math.max(0, ((pos ?? 0) + (a.media_position_updated_at ? (Date.now() - new Date(a.media_position_updated_at)) / 1000 : 0)) / dur * 100)) : v.paused && dur && pos != null ? pos / dur * 100 : null;
  const kind = a.media_content_type === "music" || a.media_artist ? "music" : "tv";
  const corner = un ? t("Onbereikbaar") : v.app && !off && v.title ? `${st} · ${v.app.name}` : st;
  return html`<div class=${classMap({ card: true, media: true, actions: true, on, unavailable: un, art: !!art, appart: !!brand })} style=${art ? `background-image:url("${art}")` : brand?.color ? `--app:${brand.color}` : ""}
      ${pressDir(p, { tap: () => p.openPopup({ type: "media", e }) })}>
    ${un ? ua() : nothing}
    ${brand ? html`<ha-icon class="appi" icon=${brand.icon}></ha-icon>` : nothing}
    <div class="i">${icoFor(p, e.id, kind === "music" ? "mdi:music-note-outline" : "mdi:television-play", kind === "music" ? "music" : "tv")}</div>
    <div class="c">${corner}</div>
    <div class="n">${v.title && !off ? v.title : label(p, e)}</div>
    <div class="s">${v.title && !off ? [v.artist, label(p, e)].filter(Boolean).join(" · ") : un ? t("Onbereikbaar") : v.app && !off ? v.app.name : st}</div>
    ${prog != null ? html`<div class="prog"><i style="width:${prog.toFixed(1)}%"></i></div>` : nothing}
    <div class="ctl">
      <button @click=${act("media_previous_track")} title=${t("Vorige")}><ha-icon icon="mdi:skip-previous"></ha-icon></button>
      <button class="main" @click=${act(off ? "turn_on" : "media_play_pause", off ? e.id : v.ctl)} title=${t("Afspelen/pauze")}><ha-icon icon=${off ? "mdi:power" : on ? "mdi:pause" : "mdi:play"}></ha-icon></button>
      <button @click=${act("media_next_track")} title=${t("Volgende")}><ha-icon icon="mdi:skip-next"></ha-icon></button>
    </div>
  </div>`;
}

export function coverCard(p, e) {
  const s = e.state, un = unavailable(s), pos = num(s?.attributes?.current_position);
  const on = s?.state === "open" || s?.state === "opening";
  const st = { open: t("Open"), closed: t("Dicht"), opening: t("Gaat open"), closing: t("Gaat dicht") }[s?.state] || s?.state;
  const act = (svc) => ev => { ev.stopPropagation(); p.call("cover", svc, { entity_id: e.id }); };
  const hasPos = pos != null && (s.attributes.supported_features & 4);
  return html`<div class=${classMap({ card: true, actions: !hasPos, vs: !!hasPos, on, unavailable: un, ...infoCls(cardCfg(p, e.id)) })}
      ${pressDir(p, pressFor(p, e.id, null, () => p.openPopup({ type: "cover", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, "mdi:window-shutter", "window")}</div>
    <div class="c">${un ? t("Onbereikbaar") : hasPos ? `${pos}%` : st}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${un ? t("Onbereikbaar") : hasPos ? html`${st}${dot()}${sinceText(s?.last_changed)}` : Cap(sinceText(s?.last_changed))}</div>
    ${hasPos ? html`<div class="vslider" style="--v:${pos}%" @pointerdown=${ev => vsliderDrag(ev, v => p.call("cover", "set_cover_position", { entity_id: e.id, position: v }))}><i></i></div>` : html`<div class="ctl">
      <button @click=${act("open_cover")} title=${t("Open")}><img src=${icon("increase")} alt=""></button>
      <button class="down" @click=${act("close_cover")} title=${t("Dicht")}><img src=${icon("increase")} alt=""></button>
    </div>`}
  </div>`;
}

/** climate bottom line (phones hide .tg, the rail knob shows it): setpoint (when the big number is the current temperature) · the per-card "bottom" choice:
 *  heating = time spent heating/cooling today, outside = weather temperature, none, or (default) humidity / active preset */
const durText = m => m >= 60 ? t("{h}u {m}m", { h: Math.floor(m / 60), m: m % 60 }) : t("{m} min", { m });
const climateFoot = (p, s, target, mode) => {
  const a = s.attributes, hum = num(a.current_humidity), pm = a.preset_mode && a.preset_mode !== "none" ? a.preset_mode : null;
  const PL = { home: t("Thuis"), away: t("Weg"), sleep: t("Slaap"), eco: t("Eco"), boost: t("Boost"), comfort: t("Comfort") };
  let extra;
  if (mode === "heating") { const h = p.climateHist?.[s.entity_id]; if (!h) { p.loadClimateHist(s.entity_id); extra = "…"; } else if (h.known) { const cool = h.cool > h.heat; extra = html`<ha-icon icon=${cool ? "mdi:snowflake" : "mdi:fire"}></ha-icon>${durText(cool ? h.cool : h.heat)}<span class="lng"> ${cool ? t("gekoeld vandaag") : t("verwarmd vandaag")}</span>`; } }
  else if (mode === "outside") { const v = num(p.home?.weather?.attributes?.temperature); if (v != null) extra = t("{v} buiten", { v: Math.round(v) + "°" }); }
  if (extra === undefined && mode !== "none") extra = hum != null ? t("{n}% vocht", { n: Math.round(hum) }) : pm ? (PL[pm] || Cap(pm)) : null;
  const bits = [target != null && s.state !== "off" ? html`<span class="tg">${t("Doel {v}", { v: target.toFixed(1) + "°" })}</span>` : null, extra].filter(Boolean);
  return bits.map((b, i) => html`${i ? dot() : nothing}${b}`);
};
export function climateCard(p, s, title = t("Verwarming")) {
  if (!s) return nothing;
  title = cardCfg(p, s.entity_id).name || title;
  const un = unavailable(s), target = num(s.attributes.temperature), cur = num(s.attributes.current_temperature);
  const on = s.state !== "off" && !un, step = s.attributes.target_temp_step || 0.5;
  const set = (d) => ev => { ev.stopPropagation(); if (target != null) p.call("climate", "set_temperature", { entity_id: s.entity_id, temperature: +(target + d).toFixed(1) }); };
  const cfg = cardCfg(p, s.entity_id);
  const modes = !cfg.noMode ? (s.attributes.hvac_modes || []).filter(m => m !== "heat_cool" || !s.attributes.hvac_modes.includes("auto")) : [];
  const MI = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew", heat_cool: "mdi:autorenew", dry: "mdi:water-percent", fan_only: "mdi:fan" };
  const presets = !cfg.noPreset ? (s.attributes.preset_modes || []) : [];
  const pr = presets.filter(x => /^(home|away|thuis|weg)$/i.test(x)).length === 2 ? presets.filter(x => /^(home|away|thuis|weg)$/i.test(x)) : presets.slice(0, 2);
  const PL = { home: t("Thuis"), away: t("Weg"), sleep: t("Slaap"), eco: t("Eco"), boost: t("Boost"), comfort: t("Comfort"), none: t("Geen") };
  const action = s.attributes.hvac_action ? ({ heating: t("Verwarmt"), cooling: t("Koelt"), idle: t("Rust"), off: t("Uit"), drying: t("Droogt"), fan: t("Ventileert") }[s.attributes.hvac_action] || s.attributes.hvac_action) : on ? ({ heat: t("Verwarmen"), cool: t("Koelen"), auto: t("Auto"), heat_cool: t("Auto"), dry: t("Drogen"), fan_only: t("Ventileren") }[s.state] || s.state) : t("Uit");
  const lo = num(s.attributes.min_temp) ?? 7, hi = num(s.attributes.max_temp) ?? 35, v = target != null ? Math.max(0, Math.min(100, (target - lo) / (hi - lo) * 100)) : 0;
  const setTo = val => p.call("climate", "set_temperature", { entity_id: s.entity_id, temperature: +val.toFixed(1) });
  return html`<div class=${classMap({ card: true, climate: true, on, unavailable: un, heating: s.attributes.hvac_action === "heating", cooling: s.attributes.hvac_action === "cooling" })}
      ${pressDir(p, { tap: () => p.openPopup({ type: "climate", s }) })}>
    ${un ? ua() : nothing}<i class="hglow"></i>
    <div class="i">${icoFor(p, s.entity_id, "mdi:radiator", "heating")}</div>
    <div class="c">${un ? t("Onbereikbaar") : action}</div>
    <div class="s big">${un ? t("Onbereikbaar") : cur != null ? tw(`${cur.toFixed(1)}°`) : target != null ? tw(`${target.toFixed(1)}°`) : s.state}</div>
    <div class="n">${title}</div>
    ${modes.length > 1 ? html`<div class="ctl row" @click=${ev => ev.stopPropagation()}>
      ${modes.length > 1 ? modes.slice(0, 4).map(m => html`<button class=${classMap({ mode: true, on: s.state === m })} title=${m} @click=${() => p.call("climate", "set_hvac_mode", { entity_id: s.entity_id, hvac_mode: m })}><ha-icon icon=${MI[m] || "mdi:thermostat"}></ha-icon></button>`) : nothing}
    </div>` : nothing}
    ${target != null ? html`<div class="rail" style="--v:${v.toFixed(1)}" @pointerdown=${ev => railDrag(ev, lo, hi, step, setTo)}>
      <em class="up" @click=${set(step)}>+</em><i></i><b data-v=${target.toFixed(1)}></b><em class="dn" @click=${set(-step)}>−</em>
    </div>` : nothing}
    <div class="lbl"><span>${climateFoot(p, s, cur != null ? target : null, cfg.bottom)}</span></div>
  </div>`;
}

export function sensorCard(p, e, kind) {
  const s = e.state, on = isOn(s), un = unavailable(s), dc = s?.attributes?.device_class;
  const txt = un ? t("Onbereikbaar") : kind === "door" ? (on ? t("Open") : t("Dicht")) : kind === "window" ? (on ? t("Open") : t("Dicht"))
    : kind === "motion" ? (on ? t("Nu") : relTime(s?.last_changed)) : (on ? t("Aan") : t("Uit"));
  const mdi = kind === "door" ? "mdi:door" : kind === "window" ? "mdi:window-closed-variant" : kind === "motion" ? "mdi:motion-sensor"
    : dc === "smoke" ? "mdi:smoke-detector-outline" : dc === "moisture" ? "mdi:water-alert-outline" : "mdi:checkbox-blank-circle-outline";
  const line = un ? t("Onbereikbaar") : kind === "motion" ? html`${t("Laatste beweging")}${dot()}${on ? t("nu") : relTime(s?.last_changed)}` : html`${txt}${dot()}${sinceText(s?.last_changed)}`;
  const graph = cardCfg(p, e.id).bottom === "graph";
  return html`<div class=${classMap({ card: true, on, unavailable: un, graph, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })} ${pressDir(p, pressFor(p, e.id, null, () => p.openPopup({ type: "sensor", e, kind })))}>
    ${un ? ua() : nothing}${graph ? stepGraph(p, e.id) : nothing}
    <div class="i">${icoFor(p, e.id, mdi, kind === "door" ? "door" : kind === "window" ? "window" : kind === "motion" ? "motion" : null)}</div>
    <div class="c">${ovr(p, e.id, "state") ?? (un ? t("Onbereikbaar") : kind === "motion" ? (on ? t("Nu") : t("Rustig")) : txt)}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${ovr(p, e.id, "label") ?? line}</div>
    ${ovr(p, e.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, e.id, "foot")}</span></div>` : cardCfg(p, e.id).bottom === "today" ? todayBottom(p, e.id, cardCfg(p, e.id)) : graph ? todayBottom(p, e.id, { todayStyle: "text" }) : nothing}${batteryCorner(p, e)}${customActions(p, e.id)}
  </div>`;
}

/* ---------- fan / lock / vacuum / humidifier ---------- */
export function fanCard(p, e) {
  const s = e.state, on = isOn(s), un = unavailable(s), pct = num(s?.attributes?.percentage);
  return html`<div class=${classMap({ card: true, fan: true, vs: pct != null, on, unavailable: un, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })}
      ${pressDir(p, toggleOrPopup(p, e.id, () => p.call("fan", "toggle", { entity_id: e.id }), () => p.openPopup({ type: "fan", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, "mdi:fan", "fan")}</div>
    <div class="c">${ovr(p, e.id, "state") ?? (un ? t("Onbereikbaar") : on ? (pct != null ? `${pct}%` : t("Aan")) : t("Uit"))}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${ovr(p, e.id, "label") ?? (un ? t("Onbereikbaar") : Cap(sinceText(s?.last_changed)))}</div>
    ${ovr(p, e.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, e.id, "foot")}</span></div>` : nothing}
    ${pct != null ? html`<div class="vslider" style="--v:${on ? pct : 0}%" @pointerdown=${ev => vsliderDrag(ev, v => v ? p.call("fan", "set_percentage", { entity_id: e.id, percentage: v }) : p.call("fan", "turn_off", { entity_id: e.id }))}><i></i></div>` : nothing}
  </div>`;
}
export function lockCard(p, e) {
  const s = e.state, un = unavailable(s), locked = s?.state === "locked", busy = /ing$/.test(s?.state || "");
  const st = { locked: t("Vergrendeld"), unlocked: t("Ontgrendeld"), locking: t("Vergrendelt…"), unlocking: t("Ontgrendelt…"), jammed: t("Geblokkeerd"), open: t("Open") }[s?.state] || s?.state;
  return html`<div class=${classMap({ card: true, on: !locked && !un, unavailable: un, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })}
      ${pressDir(p, toggleOrPopup(p, e.id, () => p.call("lock", locked ? "unlock" : "lock", { entity_id: e.id }), () => p.openPopup({ type: "lock", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, locked ? "mdi:lock" : busy ? "mdi:lock-clock" : "mdi:lock-open-variant", busy ? null : locked ? "lock" : "lock_open")}</div>
    <div class="c">${ovr(p, e.id, "state") ?? (un ? t("Onbereikbaar") : st)}</div>
    <div class="n">${label(p, e)}</div>
    <div class="s">${ovr(p, e.id, "label") ?? (un ? t("Onbereikbaar") : html`${st}${dot()}${sinceText(s?.last_changed)}`)}</div>
    ${ovr(p, e.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, e.id, "foot")}</span></div>` : nothing}${batteryCorner(p, e)}${customActions(p, e.id)}
  </div>`;
}
export function vacuumCard(p, e) {
  const s = e.state, un = unavailable(s), cleaning = s?.state === "cleaning", batt = num(s?.attributes?.battery_level);
  const st = { cleaning: t("Aan het stofzuigen"), docked: t("In het dock"), idle: t("Klaar"), paused: t("Gepauzeerd"), returning: t("Keert terug"), error: t("Fout") }[s?.state] || s?.state;
  const act = svc => ev => { ev.stopPropagation(); p.call("vacuum", svc, { entity_id: e.id }); };
  return html`<div class=${classMap({ card: true, actions: true, on: cleaning, unavailable: un })} ${pressDir(p, { tap: () => p.openPopup({ type: "vacuum", e }) })}>
    ${un ? ua() : nothing}
    <div class="n">${label(p, e)}</div>
    <div class="s">${un ? t("Onbereikbaar") : st}</div>
    <div class="lbl">${batt != null ? t("Batterij {n}%", { n: batt }) : ""}</div>
    <div class="ctl">
      <button @click=${act(cleaning ? "pause" : "start")} title=${cleaning ? t("Pauze") : t("Start")}><ha-icon icon=${cleaning ? "mdi:pause" : "mdi:play"}></ha-icon></button>
      <button @click=${act("return_to_base")} title=${t("Naar dock")}><ha-icon icon="mdi:home-import-outline"></ha-icon></button>
    </div>
  </div>`;
}
export function humidifierCard(p, e) {
  const s = e.state, un = unavailable(s), on = isOn(s), target = num(s?.attributes?.humidity), cur = num(s?.attributes?.current_humidity);
  const set = d => ev => { ev.stopPropagation(); if (target != null) p.call("humidifier", "set_humidity", { entity_id: e.id, humidity: Math.max(0, Math.min(100, target + d)) }); };
  return html`<div class=${classMap({ card: true, actions: true, on, unavailable: un })} ${pressDir(p, { tap: () => p.openPopup({ type: "humidifier", e }) })}>
    ${un ? ua() : nothing}
    <div class="n">${label(p, e)}</div>
    <div class="s">${un ? t("Onbereikbaar") : on ? (target != null ? t("Doel {n}%", { n: target }) : t("Aan")) : t("Uit")}</div>
    <div class="lbl">${cur != null ? t("Nu {v}", { v: cur + "%" }) : ""}${s?.attributes?.action ? ` · ${{ humidifying: t("bevochtigen"), drying: t("drogen"), idle: t("rust"), off: t("uit") }[s.attributes.action] || s.attributes.action}` : ""}</div>
    <div class="ctl">
      <button @click=${set(5)} title=${t("Hoger")}><img src=${icon("increase")} alt=""></button>
      <button class="down" @click=${set(-5)} title=${t("Lager")}><img src=${icon("increase")} alt=""></button>
    </div>
  </div>`;
}

/** appliance: a plug with a power sensor or a device with an operation-state sensor (auto-detected). tap = details, hold = details */
export const APPLIANCE_ACTIVE = ["running", "waiting", "alert", "done"];
/** energy (kWh, total_increasing) sensor on the same device as the plug, for today's use and hourly bars */
export const energyOf = (p, dev) => dev ? Object.values(p.hass.entities || {}).map(e => p.hass.states[e.entity_id]).find(s => s && (p.hass.entities[s.entity_id]?.device_id === dev) && s.attributes.unit_of_measurement === "kWh" && s.attributes.state_class === "total_increasing") || null : null;
const eur = v => "€ " + (Math.round(v * 100) / 100).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** plug with a power meter: watts as the hero; bottom = sparkline (default) / timer chips / cost / hourly bars */
function plugCard(p, a, st, title, cfg, acts) {
  const W = st.power != null ? Math.round(st.power) : null, sw = a.switch, on = sw ? isOn(sw.state) : st.st === "running";
  const en = energyOf(p, a.device), h = p.plugHist?.[a.id]; if (!h || Date.now() - h.at > 5 * 60000) p.loadPlug(a.id, a.power.id, en?.entity_id);
  const mode = cfg.bottom || "spark", price = num(p.config.home?.energy?.price);
  const since = sw?.state?.last_changed ? sinceText(sw.state.last_changed) : "";
  const tmr = p.plugTimers?.[a.id], left = tmr ? Math.max(0, Math.round((tmr.at - Date.now()) / 60000)) : null, plain = !!a.plain;
  let bottom = nothing;
  if (mode === "timer") bottom = html`<div class="lbl chips" @click=${ev => ev.stopPropagation()}>${[15, 30, 60].map(m => html`<button class=${classMap({ on: tmr?.min === m })} @click=${() => p.setPlugTimer(a, m)}>${m}</button>`)}</div>`;
  else if (mode === "cost") bottom = price ? html`<div class="lbl cost"><span>${h?.today != null ? html`${t("Vandaag")} <b>${eur(h.today * price)}</b>` : ""}${!on && W > 0.5 ? html`${h?.today != null ? dot() : nothing}${t("Sluipverbruik")} <b>${eur(W * 24 * 30 / 1000 * price)}</b> / ${t("maand")}` : nothing}</span></div>` : html`<div class="lbl"><span>${t("Stel een kWh-prijs in bij Energie")}</span></div>`;
  else if (mode === "bars") bottom = h?.rows ? html`<div class="lbl bars">${h.rows.map(r => html`<i class=${classMap({ on: r.v > 0.01 })} style="height:${Math.max(9, r.v / (h.maxH || 1) * 100)}%"></i>`)}</div>` : html`<div class="lbl"><span>…</span></div>`;
  else if (mode === "spark" && h?.peak) bottom = html`<div class="lbl"><span>${t("piek {w} W om {t}", { w: h.peak.v, t: new Date(h.peak.t).toLocaleTimeString(locale(), timeOpts()) })}</span></div>`;
  return html`<div class=${classMap({ card: true, plug: true, appl: acts.length > 0, hasspk: mode === "spark" && !!h?.spark?.length, on, unavailable: st.st === "unknown", ...infoCls(cfg) })}
      ${pressDir(p, pressFor(p, a.id, sw ? () => p.call("switch", "toggle", { entity_id: sw.id }) : null, () => p.openPopup({ type: "appliance", a })))}>
    ${st.st === "unknown" ? ua() : nothing}
    <div class="i">${uico(cfg.icon, "mdi:power-plug-outline", "plug")}</div>
    <div class="c">${ovr(p, a.id, "state") ?? (left != null ? html`<i></i>${t("uit over {n} min", { n: left })}` : st.st === "unknown" ? t("Geen meting") : plain ? (on ? t("Aan") : t("Uit")) : st.st === "running" ? t("Bezig") : st.st === "done" ? t("Klaar") : on ? (W > 0.5 ? t("Standby") : t("Aan")) : t("Uit"))}</div>
    <div class="s big">${W ?? "–"}<small>W</small></div>
    <div class="n">${title}</div>
    <div class="meta">${ovr(p, a.id, "label") ?? html`${h?.today != null ? html`${t("Vandaag")} <b>${h.today.toFixed(1)} kWh</b>${since ? dot() : nothing}` : nothing}${since}`}</div>
    ${ovr(p, a.id, "foot") != null ? html`<div class="lbl"><span>${ovr(p, a.id, "foot")}</span></div>` : bottom}
    ${mode === "spark" && h?.spark?.length > 1 ? html`<div class="spk">${spark(h.spark, 110, 34)}</div>` : nothing}
    ${acts.length ? html`<div class="ctl row" @click=${ev => ev.stopPropagation()}>${acts.map(x => html`<button class=${classMap({ on: !!x.on })} @click=${x.run}><ha-icon icon=${x.icon}></ha-icon>${x.label}</button>`)}</div>` : nothing}
  </div>`;
}
export function applianceCard(p, a) {
  const cfg = cardCfg(p, a.id), thr = cfg.threshold ?? 5;
  const st = applianceState(p.hass, a, thr);
  const title = cfg.name || deviceName(p.hass, a.device);
  const opS = a.op ? p.hass.states[a.op.id] : null, prog = a.program ? p.hass.states[a.program.id] : null;
  const line = a.op ? applianceEnd(st) || (opS ? sinceText(opS.last_changed) : "") : a.switch ? html`${isOn(a.switch.state) ? t("Stekker aan") : t("Stekker uit")}${dot()}${sinceText(a.switch.state?.last_changed)}` : "";
  const progName = prog && !unavailable(prog) ? String(p.hass.formatEntityState?.(prog) ?? prog.state).split(".").pop().split("_program_").pop().replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2") : "";   // Home Connect enums: Dishcare.Dishwasher.Program.Auto2 or dishcare_dishwasher_program_auto_2 -> Auto 2
  const foot = [progName, st.progress != null ? `${Math.round(st.progress)}%` : "", st.power != null ? `${Math.round(st.power)} W` : "", a.door && p.hass.states[a.door.id]?.state === "open" ? t("Deur open") : ""].filter(Boolean);
  const acts = [];
  if (a.stop && !a.plain && ["running", "waiting"].includes(st.st)) acts.push({ icon: "mdi:stop", label: t("Stop"), run: () => p.call("button", "press", { entity_id: a.stop.id }) });
  if (a.switch && a.op && !unavailable(a.switch.state)) acts.push({ icon: "mdi:power", label: isOn(a.switch.state) ? t("Uit") : t("Aan"), on: isOn(a.switch.state), run: () => p.call("switch", "toggle", { entity_id: a.switch.id }) });
  if (!a.op && a.power) return plugCard(p, a, st, title, cfg, acts);
  return html`<div class=${classMap({ card: true, appl: acts.length > 0, on: APPLIANCE_ACTIVE.includes(st.st), running: st.st === "running", unavailable: st.st === "unknown" })}
      ${pressDir(p, { tap: () => p.openPopup({ type: "appliance", a }), hold: () => p.openPopup({ type: "appliance", a }) })}>
    ${st.st === "unknown" ? ua() : nothing}
    <div class="i">${uico(cfg.icon, applianceIcon(title))}</div>
    <div class="c">${st.label}</div>
    <div class="n">${title}</div><div class="s">${line || st.label}</div>
    ${foot.length ? html`<div class="lbl">${foot.map((x, i) => html`${i ? dot() : nothing}${x}`)}</div>` : nothing}
    ${acts.length ? html`<div class="ctl row" @click=${ev => ev.stopPropagation()}>${acts.map(x => html`<button class=${classMap({ on: !!x.on })} @click=${x.run}><ha-icon icon=${x.icon}></ha-icon>${x.label}</button>`)}</div>` : nothing}
  </div>`;
}
export const applianceIcon = n => /was|wash/i.test(n) && !/vaat|dish/i.test(n) ? "mdi:washing-machine" : /droger|dryer/i.test(n) ? "mdi:tumble-dryer" : /vaat|dish/i.test(n) ? "mdi:dishwasher" : /oven/i.test(n) ? "mdi:stove" : /koffie|coffee/i.test(n) ? "mdi:coffee-maker" : /magnetron|micro/i.test(n) ? "mdi:microwave" : /pomp|pump|boiler|warmte/i.test(n) ? "mdi:water-boiler" : "mdi:power-plug-outline";

/** user-defined template card: name/icon fixed, state + label are Jinja templates rendered by HA */
export function templateCard(p, tc, i) {
  const r = p.templates?.[tc.id] || {}, on = /^(on|aan|true|open|playing|home|thuis)$/i.test(String(r.state || "").trim()) || r.state?.startsWith?.("!");
  const state = String(r.state ?? "…").replace(/^!/, "");
  const tap = () => { if (tc.tap === "toggle" && tc.entity) p.call(tc.entity.split(".")[0] === "input_boolean" ? "input_boolean" : "homeassistant", "toggle", { entity_id: tc.entity }); else if (tc.tap === "service" && tc.service) { const [d, s] = tc.service.split("."); let data = {}; try { data = JSON.parse(tc.data || "{}"); } catch {} p.call(d, s, data); } else if (tc.tap === "navigate" && tc.path) p.goPath(tc.path); else if (tc.entity) p.moreInfo(tc.entity); };
  return html`<div class=${classMap({ card: true, on, unavailable: r.error })} ${pressDir(p, { tap, hold: tc.entity ? () => p.moreInfo(tc.entity) : null })}>
    <div class="n">${tc.name || t("Template")}</div><div class="s" title=${r.error && p.hass.user?.is_admin ? r.msg || "" : ""}>${r.error ? (p.hass.user?.is_admin ? t("Templatefout") : t("alleen voor beheerders")) : state}</div>
    ${r.label ? html`<div class="lbl">${r.label}</div>` : nothing}
    <div class="i">${uico(tc.icon, "mdi:code-braces")}</div>
  </div>`;
}

/** scenes assigned to this room's area */
export function roomScenesCard(p, scenes) {
  return html`<div class="card scenes" ${pressDir(p, {})}>
    <div class="i">${ico("mdi:shape-outline", "shapes")}</div>
    <div class="n">${t("Scènes")}</div>
    <div class="s">${scenes.slice(0, 4).map(e => html`<button title=${label(p, e)} @click=${ev => { ev.stopPropagation(); p.call("scene", "turn_on", { entity_id: e.id }); }}>${anyIco(cardCfg(p, e.id).icon || e.state?.attributes?.icon || "mdi:palette-outline")}<small>${label(p, e)}</small></button>`)}</div>
  </div>`;
}
/** HA MJPEG stream URL for a camera state (entity_picture -> camera_proxy_stream) */
export function camStream(s) {
  const token = s?.attributes?.access_token, base = s?.attributes?.entity_picture?.split("?")[0]?.replace("camera_proxy", "camera_proxy_stream");
  return token && base ? `${base}?token=${token}` : s?.attributes?.entity_picture || null;
}
/** camera assigned to this room */
export function roomCameraCard(p, e) {
  const s = e.state, un = unavailable(s), pic = s?.attributes?.entity_picture || null;
  return html`<div class=${classMap({ card: true, cam: true, unavailable: un })}
      ${pressDir(p, { tap: () => p.openPopup({ type: "camera", s }), hold: () => p.moreInfo(e.id) })}>
    ${pic ? html`<hcn-cam-snap .src=${pic} .stream=${camStream(s)} .live=${!!cardCfg(p, e.id).live}></hcn-cam-snap>` : nothing}
    ${un ? ua() : nothing}
    <div class="n">${label(p, e)}</div>
    <div class="s">${un ? t("Onbereikbaar") : s.state === "recording" ? t("Neemt op") : s.state === "streaming" ? t("Live") : t("Camera")}</div>
    ${!pic ? html`<div class="i">${ico("mdi:cctv", "camera")}</div>` : nothing}
  </div>`;
}

/** power strip: one card, one button per socket (tap toggles, hold = details) */
export function stripCard(p, st) {
  const on = st.switches.filter(e => isOn(e.state)).length, un = st.switches.every(e => unavailable(e.state));
  const title = cardCfg(p, st.id).name || deviceName(p.hass, st.device);
  return html`<div class=${classMap({ card: true, pstrip: true, on: on > 0, unavailable: un })} ${pressDir(p, { tap: () => p.openPopup({ type: "strip", st }), hold: () => p.openPopup({ type: "strip", st }) })}>
    ${un ? ua() : nothing}
    <div class="n">${title}</div>
    <div class="s">${un ? t("Onbereikbaar") : on ? t("{n} van {m} aan", { n: on, m: st.switches.length }) : t("Alles uit")}</div>
    <div class="socks">${st.switches.map((e, i) => html`<button class=${classMap({ on: isOn(e.state), unavailable: unavailable(e.state) })} title=${label(p, e)}
        ${pressDir(p, { tap: () => p.call("switch", "toggle", { entity_id: e.id }), hold: () => p.openPopup({ type: "switch", e }) })}>
        ${anyIco(cardCfg(p, e.id).icon || "mdi:power-socket-eu")}<small>${cardCfg(p, e.id).name || (i + 1)}</small></button>`)}</div>
  </div>`;
}

/** attention filter: all · unavailable · updates · system (HA notifications, failed automations) · batteries */
export const ATT_FILTERS = [["all", "Alles"], ["unavailable", "Onbereikbaar"], ["update", "Updates"], ["system", "Systeem"], ["battery", "Batterijen"]];
export const attFilter = (p, list) => { const f = p.attFilter || "all"; return f === "all" ? list : list.filter(a => f === "system" ? (a.kind === "notification" || a.kind === "automation") : a.kind === f); };

/** "Voordeur · Garage +2 dicht": the first two names and a count for the rest */
export const footList = (names, suffix = "") => { const parts = [...names.slice(0, 2), names.length > 2 ? `+${names.length - 2}` : null].filter(Boolean); return html`${parts.map((x, i) => html`${i ? dot() : nothing}${x}`)}${suffix ? " " + suffix : ""}`; };

/** three lines for the attention card: the two longest-unavailable devices, then the emptiest battery, else the oldest system
    message (notification / failed automation), else the oldest update; with none of those a third unavailable device */
export function pickAttention(list) {
  const oldest = arr => [...arr].sort((a, b) => new Date(a.since || 0) - new Date(b.since || 0));
  const un = oldest(list.filter(a => a.kind === "unavailable"));
  const out = un.slice(0, 2);
  const batt = [...list.filter(a => a.kind === "battery")].sort((a, b) => (a.value ?? 100) - (b.value ?? 100))[0];
  const sys = oldest(list.filter(a => a.kind === "notification" || a.kind === "automation"))[0];
  const ups = list.filter(a => a.kind === "update");
  const upd = ups.length ? { ...oldest(ups)[0], name: t("Update beschikbaar"), text: String(ups.length) } : null;
  const third = batt || sys || upd || un[2];
  if (third) out.push(third);
  for (const a of list) if (out.length < 3 && !out.includes(a) && a.kind !== "update") out.push(a);   // fewer than two unavailable: fill up with whatever is left
  if (out.length < 3 && upd && !out.includes(upd)) out.push(upd);
  return out;
}

/* ---------- home cards: [{ key, label, tpl }] so the page config can hide/reorder them ---------- */
/* ---------- value card: a plain sensor added to a page (temperature, power, text …) ---------- */
const DC_LABEL = { temperature: "Temperatuur", humidity: "Vochtigheid", power: "Vermogen", energy: "Energie", battery: "Batterij", illuminance: "Licht", pressure: "Druk", voltage: "Spanning", current: "Stroom" };
const fmtVal = v => v.toLocaleString(locale(), { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 });
export function valueCard(p, e) {
  const s = e.state, un = unavailable(s), v = num(s?.state), unit = s?.attributes?.unit_of_measurement || "", dc = s?.attributes?.device_class;
  const mdi = s?.attributes?.icon || (dc === "temperature" ? "mdi:thermometer" : dc === "humidity" ? "mdi:water-percent" : ["power", "energy"].includes(dc) ? "mdi:flash-outline" : dc === "battery" ? "mdi:battery" : dc === "illuminance" ? "mdi:brightness-6" : "mdi:gauge");
  const corner = ovr(p, e.id, "state") ?? (DC_LABEL[dc] ? t(DC_LABEL[dc]) : "");
  return html`<div class=${classMap({ card: true, value: true, unavailable: un, acts: hasActs(p, e.id), ...infoCls(cardCfg(p, e.id)) })} ${pressDir(p, pressFor(p, e.id, null, () => p.openPopup({ type: "value", e })))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, e.id, mdi)}</div>
    ${corner ? html`<div class="c">${corner}</div>` : nothing}
    ${un ? html`<div class="n">${label(p, e)}</div><div class="s">${t("Onbereikbaar")}</div>`
      : v != null ? html`<div class="s big">${tw(fmtVal(v))}<small>${unit}</small></div><div class="nm">${label(p, e)}</div>`
      : html`<div class="n">${label(p, e)}</div><div class="s">${ovr(p, e.id, "label") ?? s?.state ?? ""}</div>`}
    <div class="lbl"><span>${ovr(p, e.id, "foot") ?? sinceText(s?.last_changed)}</span></div>
    ${customActions(p, e.id)}${batteryCorner(p, e)}
  </div>`;
}
/** card kind of a binary sensor: the "Soort" card setting, else the device class */
export const kindOf = (p, e) => cardCfg(p, e.id).kind || (() => { const dc = e.state?.attributes?.device_class; return ["door", "garage_door", "opening", "garage"].includes(dc) ? "door" : dc === "window" ? "window" : ["motion", "occupancy", "presence"].includes(dc) ? "motion" : "binary"; })();
/** the card for an entity picked by hand (home view additions, the add-card preview), by domain */
export function cardFor(p, e) {
  switch (domain(e.id)) {
    case "light": return lightCard(p, e); case "switch": case "input_boolean": return switchCard(p, e); case "fan": return fanCard(p, e); case "lock": return lockCard(p, e); case "cover": return coverCard(p, e);
    case "climate": return climateCard(p, e.state, name(p.hass, e)); case "media_player": return mediaCard(p, { linked: [], ...e }); case "vacuum": return vacuumCard(p, e); case "humidifier": return humidifierCard(p, e);
    case "camera": return roomCameraCard(p, e); case "binary_sensor": return sensorCard(p, e, kindOf(p, e)); case "sensor": return valueCard(p, e); default: return null;
  }
}

/* ---------- cards added to a page by hand (pages[key].add) ---------- */
/** `$entity` in a template card's texts and action = the entity it was placed with */
export const substEntity = (str, entity) => !str || !entity ? str : str.replace(/\$entity(?![\w])/g, entity);
export const templateOf = (p, key) => (p.config.templates || []).find(x => x.id === key.split(":")[1]) || null;
/** a placed template card: the template with the fields filled in at placement (cards[key].fields) on top */
export function templateInstance(p, key) {
  const c = cardCfg(p, key), tc = key.startsWith("tpl:once:") ? c.once : templateOf(p, key); if (!tc) return null;   // tpl:once:<n> carries its own definition
  const fl = c.fields || {}, m = { ...tc, ...Object.fromEntries(Object.entries(fl).filter(([, v]) => v)) }, sub = s => substEntity(s, fl.entity);
  return { ...m, id: key, name: c.name || m.name, icon: c.icon || m.icon, state: sub(m.state), label: sub(m.label), visible: sub(m.visible), entity: fl.entity || null, data: sub(m.data), path: sub(m.path), ask: undefined, room: undefined };
}
/** template card instances on every page ("tpl:<template>:<n>") with their texts filled in, for subscribeTemplates */
export function templateInstances(p) {
  const out = [];
  for (const pc of Object.values(p.config.pages || {})) for (const key of (pc.add || [])) { if (!key.startsWith("tpl:")) continue; const m = templateInstance(p, key); if (m) out.push({ id: key, state: m.state, label: m.label, visible: m.visible }); }
  return out;
}
/** { label, tpl } for a key in pages[page].add: an entity, a template instance, or one of the panel's own cards */
export function addedCard(p, key, pageKey) {
  if (key.startsWith("tpl:")) { const m = templateInstance(p, key); return m ? { label: m.name || t("Template"), tpl: templateCard(p, m, 0) } : null; }
  if (key.includes(".")) { const s = p.hass.states[key]; if (!s) return null; const e = { id: key, state: s, reg: p.hass.entities?.[key] || {} }; const tpl = cardFor(p, e); return tpl ? { label: label(p, e), tpl } : null; }
  const c = findCard(p, key, pageKey); return c ? { label: c.label, tpl: c.tpl } : null;
}
/** one of the panel's own cards by key: "room:<id>:<key>" for a room-bound card, else a home card or a card of any room.
    _noAdded stops the pages' add lists from being followed while we look, so two pages cannot point at each other forever */
export function findCard(p, key, exceptPage) {
  if (p._noAdded) return null;
  p._noAdded = true;
  try {
    const m = /^room:([^:]+):(.+)$/.exec(key);
    if (m) { const r = p.rooms.find(x => x.id === m[1]); return r ? p.roomCards(r, true).find(c => c.key === m[2]) || null : null; }
    if (exceptPage !== "home") { const c = homeCards(p, p.home, true).find(c => c.key === key); if (c) return c; }
    for (const r of p.rooms) if (r.id !== exceptPage) { const c = p.roomCards(r, true).find(c => c.key === key); if (c) return c; }
    return null;
  } finally { p._noAdded = false; }
}

/** cards the home view shows by itself: attention, weather, household, and security / agenda when the entities exist.
    Everything else (thermostat, waste, scenes, energy, list, timers, car, solar, garden, a media player …) is picked through Add card and
    lives in pages.home.add, so the bin in edit mode removes it again. Groups, graphs and template cards made for the home view stay. */
const HOME_DEFAULT = ["attention", "weather", "people", "security", "agenda"];
export function homeCards(p, h, all = false) {
  const list = homeAllCards(p, h);
  if (all) return list;
  const added = new Set([...(p.config.pages?.home?.add || []), ...(p.config.pages?.home?.keep || [])]);
  return list.filter(x => HOME_DEFAULT.includes(x.key) || added.has(x.key) || x.key.startsWith("group:") || x.key.startsWith("graph:") || x.key.startsWith("tpl"));
}
function homeAllCards(p, h) {
  const cards = [], add = (key, label, tpl) => cards.push({ key, label, tpl });
  if (h.climate) add("climate", t("Thermostaat"), climateCard(p, h.climate));
  add("attention", t("Aandacht"), html`<div class=${classMap({ card: true, list: true, calm: !h.attention.length })} ${pressDir(p, { tap: () => p.openPopup({ type: "attention" }) })}>
    <div class="i">${ico("mdi:palette-outline", "sparkles")}</div>
    <div class="c">${h.attention.length ? `${h.attention.length} ${h.attention.length === 1 ? t("melding") : t("meldingen")}` : t("Alles in orde")}</div>
    <div class="n">${t("Aandacht")}</div>
    <div class="s">${h.attention.length ? pickAttention(h.attention).map(a => html`<span>${ico(a.icon)}<b>${a.name}</b><em>${a.text}</em></span>`) : html`<span>${t("Geen onbereikbare apparaten, lege batterijen of updates")}</span>`}</div></div>`);
  // cards new in 3.1: security (with an alarm or a lock), household, to-do list, timers, EV, solar; edit mode hides what you do not want
  if (h.alarm || p.rooms.some(r => r.ents.locks.length)) add("security", t("Beveiliging"), securityCard(p, h));
  if (h.persons.length) add("people", t("Huishouden"), peopleCard(p, h));
  { const td = todoEntity(p); if (td) add("todo", t("Lijst"), todoCard(p, td)); }
  if (timerList(p).length) add("timers", t("Timers"), timersCard(p));
  if (evReady(p)) add("ev", t("Auto"), evCard(p));
  if (solarReady(p)) add("solar", t("Zon"), solarCard(p));
  const openCard =(key, title, all, open, popup, mdi, svg) => { const closed = all.filter(e => !open.includes(e)), nm = e => name(p.hass, e);
    const latest = all.map(e => e.state?.last_changed).filter(Boolean).sort().at(-1);
    return add(key, title, html`<div class=${classMap({ card: true, on: open.length > 0, foot: true })} ${pressDir(p, { tap: () => p.openPopup({ type: popup }) })}>
      <div class="i">${ico(mdi, svg)}</div>
      <div class="c">${open.length ? t("{n} open", { n: open.length }) : t("Dicht")}</div>
      <div class="n">${title}</div>
      <div class="s">${open.length ? open.slice(0, 2).map((e, i) => html`${i ? html`<br>` : nothing}<b>${nm(e)}</b> ${t("open sinds {t}", { t: relTime(e.state?.last_changed) })}`) : html`${t("Alles dicht")}${dot()}${sinceText(latest)}`}</div>
      <div class="lbl">${footList((open.length ? closed : all).map(nm))}</div></div>`); };
  if (h.weather) add("weather", t("Weer"), weatherCard(p, h.weather));
  if (h.waste.length) { const w = h.waste[0], later = h.waste.slice(1, 3);
    add("waste", t("Afval"), html`<div class=${classMap({ card: true, hassub: later.length > 0 })} ${pressDir(p, { tap: () => p.openPopup({ type: "waste" }) })}>
    <div class="i">${ico("mdi:trash-can-outline", wasteIcon(w.label))}</div>
    <div class="n">${w.label}</div><div class="s">${t("Ophalen")}${dot()}${w.days === 0 ? t("vandaag") : w.days === 1 ? t("morgen") : wasteWhen(w)}</div>
    ${later.length ? html`<div class="subc">${later.map(x => html`<div><b>${wasteWhen(x)}</b><span>${x.label}</span></div>`)}</div><div class="lbl mob"><span>${later[0].label}${dot()}${wasteWhen(later[0])}</span></div>` : nothing}</div>`); }
  if (h.scenes.length) add("scenes", t("Scènes"), html`<div class="card scenes" ${pressDir(p, {})}>
    <div class="i">${ico("mdi:shape-outline", "shapes")}</div>
    <div class="n">${t("Scènes")}</div><div class="s">${h.scenes.slice(0, 4).map(s => html`<button title=${s.attributes.friendly_name} @click=${ev => { ev.stopPropagation(); p.call("scene", "turn_on", { entity_id: s.entity_id }); }}><ha-icon icon=${s.attributes.icon || "mdi:palette-outline"}></ha-icon><small>${s.attributes.friendly_name}</small></button>`)}</div></div>`);
  // agenda: next event (events are fetched by the panel into p.events)
  if (h.calendars.length && p.events) { const ev = nextEvent(p.events), later = p.events.filter(x => x !== ev && x.end > new Date()).slice(0, 2);
    const when = x => { const today = new Date(); today.setHours(0, 0, 0, 0); const d = x.start < new Date(today.getTime() + 86400000) ? "" : x.start < new Date(today.getTime() + 2 * 86400000) ? t("Morgen") + " " : x.start.toLocaleDateString(locale(), { weekday: "short" }).replace(".", "") + " "; return d + (x.allDay ? t("hele dag") : x.start.toLocaleTimeString(locale(), timeOpts())); };
    add("agenda", t("Agenda"), html`<div class=${classMap({ card: true, hassub: later.length > 0 })} ${pressDir(p, { tap: () => p.openPopup({ type: "agenda" }) })}>
    <div class="i">${ico("mdi:calendar-blank-outline", "calendar")}</div>
    <div class="n">${ev ? ev.summary : t("Niets gepland")}</div><div class="s">${ev ? eventWhen(ev) : t("vandaag en morgen")}</div>
    ${later.length ? html`<div class="subc">${later.map(x => html`<div><b>${when(x)}</b><span>${x.summary}</span></div>`)}</div><div class="lbl mob"><span>${later[0].allDay ? when(later[0]).replace(t("hele dag"), "").trim() || t("Vandaag") : when(later[0])}${dot()}${later[0].summary}</span></div>` : nothing}</div>`); }
  for (const g of (p.config.groups || []).filter(g => (!g.room || g.room === "home") && g.members?.length)) add("group:" + g.id, g.name || t("Groep"), groupCard(p, g));
  for (const g of (p.config.graphs || []).filter(g => (!g.room || g.room === "home") && g.entity)) add("graph:" + g.id, g.name || t("Grafiek"), graphCard(p, g));
  // template cards placed on the home view
  (p.config.templates || []).filter(tc => (!tc.room || tc.room === "home") && !condHidden(p, tc.id, tc.visible, tc.visibleInvert)).forEach((tc, i) => add(tc.id, tc.name || t("Template"), templateCard(p, tc, i)));
  // cards added to the home view by hand (edit mode → Kaart toevoegen): entities, template instances, the panel's own cards
  if (!p._noAdded) for (const key of (p.config.pages?.home?.add || [])) { if (cards.some(c => c.key === key)) continue; const c = addedCard(p, key, "home"); if (c) add(key, c.label, c.tpl); }
  if (h.energy.power) add("energy", t("Energie"), html`<div class="card" ${pressDir(p, { tap: () => p.openPopup({ type: "energy" }) })}>
    <div class="n">${t("Energie")}</div><div class="s">${tw(`${Math.round(num(h.energy.power.state) ?? 0)} W`)}</div>
    <div class="lbl">${h.energy.today ? t("Vandaag {n} kWh", { n: num(h.energy.today.state)?.toFixed(1) }) : ""}</div><div class="i">${ico("mdi:flash-outline", "electric")}</div></div>`);
  if (gardenReady(p)) add("garden", t("Tuin"), gardenCard(p));
  return cards;
}

/** hourly conditions worth a heads-up on the weather card */
const PRECIP = { rainy: "Regen", pouring: "Stortregen", lightning: "Onweer", "lightning-rainy": "Onweer", snowy: "Sneeuw", "snowy-rainy": "Natte sneeuw", hail: "Hagel", fog: "Mist" };
/** "Regen verwacht rond 16:00" from the next twelve hours, "Droog de komende uren" when nothing is coming, "" without a forecast */
export function wxExpect(p, short = false) {
  const soon = (p.wx?.hourly || []).filter(f => new Date(f.datetime) > new Date() && new Date(f.datetime) - Date.now() < 12 * 3600000).find(f => PRECIP[f.condition]);
  const at = soon ? new Date(soon.datetime).toLocaleTimeString(locale(), timeOpts()) : "";
  if (short) return soon ? t("{what} rond {t}", { what: t(PRECIP[soon.condition]), t: at }) : p.wx?.hourly?.length ? t("Droog") : "";
  return soon ? t("{what} verwacht rond {t}", { what: t(PRECIP[soon.condition]), t: at }) : p.wx?.hourly?.length ? t("Droog de komende uren") : "";
}
/* ---------- weather card: the sky of sky.js behind a big temperature, high / low and today's precipitation in the corner,
   tomorrow as one sentence at the bottom ("Morgen half bewolkt met 16° en 20% kans op regen") ---------- */
const sameDay = (a, b) => a.toDateString() === b.toDateString();
/** today's and tomorrow's daily forecast, found by date (some integrations start the list at tomorrow) */
export function wxDays(p) {
  const d = p.wx?.daily || [], now = new Date(), tom = new Date(now.getTime() + 864e5);
  return { today: d.find(f => sameDay(new Date(f.datetime), now)) || null, tomorrow: d.find(f => sameDay(new Date(f.datetime), tom)) || null };
}
const snowy = c => c === "snowy" || c === "snowy-rainy";
const DROP = html`<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1C3.6 3 2.5 4.6 2.5 6.1a2.5 2.5 0 0 0 5 0C7.5 4.6 6.4 3 5 1z" fill="currentColor"/></svg>`;
const FLAKE = html`<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" aria-hidden="true"><path d="M5 1v8M1.5 3l7 4M1.5 7l7-4M4 1.6 5 2.6 6 1.6M4 8.4l1-1 1 1"/></svg>`;
/** the condition as a word inside the sentence about tomorrow */
const wxAdj = c => ({ sunny: t("zonnig"), "clear-night": t("helder"), partlycloudy: t("half bewolkt"), cloudy: t("bewolkt"), rainy: t("regenachtig"), pouring: t("stortregen"), lightning: t("onweerachtig"), "lightning-rainy": t("onweerachtig"),
  snowy: t("sneeuw"), "snowy-rainy": t("natte sneeuw"), hail: t("hagel"), fog: t("mistig"), windy: t("winderig"), "windy-variant": t("winderig") }[c] || t("wisselvallig"));
/** the sentence about tomorrow; the chance only from 20%, a flake for snow; short = the phone version without "kans op regen" */
function tomorrowLine(f, short) {
  const temp = Math.round(num(f.temperature) ?? 0), pc = num(f.precipitation_probability), wet = pc != null && pc >= 20, snow = snowy(f.condition), what = wxAdj(f.condition);
  const s = !wet ? t("Morgen {what} met {temp}", { what }) : short ? t("Morgen {what} met {temp} en {chance}", { what })
    : snow ? t("Morgen {what} met {temp} en {chance} kans op sneeuw", { what }) : t("Morgen {what} met {temp} en {chance} kans op regen", { what });
  return s.split(/(\{temp\}|\{chance\})/).map(x => x === "{temp}" ? html`<b>${temp}°</b>` : x === "{chance}" ? html`<span class="pp">${snow ? FLAKE : DROP}${Math.round(pc)}%</span>` : x);
}
export function weatherCard(p, w) {
  const a = w.attributes, { today, tomorrow } = wxDays(p), feels = feelsLike(a), temp = Math.round(num(a.temperature) ?? 0);
  const hi = num(today?.temperature), lo = num(today?.templow), mm = num(today?.precipitation), pc = num(today?.precipitation_probability), snow = snowy(w.state) || snowy(today?.condition);
  const expect = wxExpect(p) || (a.wind_speed != null ? `${t("wind")} ${Math.round(a.wind_speed)} ${a.wind_speed_unit || t("km/u")}` : "");
  const rainBit = mm != null ? html`<span class=${classMap({ mm: true, dry: !mm })}>${snow ? FLAKE : DROP}${mm.toLocaleString(locale(), { maximumFractionDigits: 1 })} mm</span>`
    : pc != null ? html`<span class=${classMap({ mm: true, dry: pc < 20 })}>${snow ? FLAKE : DROP}${Math.round(pc)}%</span>` : nothing;
  return html`<div class="card wxsky" ${pressDir(p, { tap: () => p.openPopup({ type: "weather" }) })}>
    ${sky(p, w.state)}
    <div class="tnow"><b>${tw(String(temp))}<sup>°</sup></b>${feels != null ? html`<span>${t("voelt als {v}", { v: Math.round(feels) + "°" })}</span>` : nothing}</div>
    ${hi != null || rainBit !== nothing ? html`<div class="c wxc">${hi != null ? html`<span class="hl">${Math.round(hi)}°${lo != null ? html`<em>/${Math.round(lo)}°</em>` : nothing}</span>` : nothing}${rainBit}</div>` : nothing}
    <div class="n">${condText(w.state)}</div><div class="s">${expect}</div>
    ${tomorrow ? html`<div class="snt"><span class="lg">${tomorrowLine(tomorrow, false)}</span><span class="sh">${tomorrowLine(tomorrow, true)}</span></div>` : nothing}
  </div>`;
}
/* ---------- group card: user-defined set of lights (kind "light") or switches / fans / plugs (kind "plug") ---------- */
const svcFor = id => id.split(".")[0] === "input_boolean" ? "input_boolean" : id.split(".")[0] === "light" ? "light" : id.split(".")[0] === "fan" ? "fan" : "switch";
const memberIcon = x => x.id.startsWith("light.") ? lightIcon(x.s) : x.id.startsWith("fan.") ? "fan" : "plug";
/** "light" (every member a light: brightness steps and colours on the card) or "plug" (switches, plugs, fans); groups made before the split are told apart by their members */
export const groupKind = g => g.kind || ((g.members || []).length && g.members.every(id => id.startsWith("light.")) ? "light" : "plug");
/** members as [{ id, s, on, name }] */
export const groupMembers = (p, g) => (g.members || []).map(id => { const s = p.hass.states[id]; return s ? { id, s, on: isOn(s), name: cardCfg(p, id).name || s.attributes.friendly_name || id } : null; }).filter(Boolean);
/** what the lights of a group can do together: a capability when any member has it */
export const groupCaps = m => m.map(x => lightCaps(x.s)).reduce((a, c) => ({ rgb: a.rgb || c.rgb, ct: a.ct || c.ct, dim: a.dim || c.dim }), { rgb: false, ct: false, dim: false });
/** the state of a light group for the bottom lane: on when any is on, the average brightness of the lit members, the colour of the first lit one */
const groupLightState = m => {
  const lit = m.filter(x => x.on).map(x => lightState(x.s));
  if (!lit.length) return { on: false, pct: 0, rgb: null, kelvin: null, ctWord: "" };
  const first = lit.find(x => x.rgb) || lit.find(x => x.kelvin != null) || lit[0];
  return { on: true, pct: Math.round(lit.reduce((a, x) => a + x.pct, 0) / lit.length), rgb: first.rgb, kelvin: first.kelvin, ctWord: first.ctWord };
};
export function groupCard(p, g0) {
  const g = p._preview?.id === "group:" + g0.id && p._preview.gd ? p._preview.gd : g0;   // the card form edits the definition itself; its preview shows the draft
  const id = "group:" + g.id, cfg = cardCfg(p, id), m = groupMembers(p, g), on = m.filter(x => x.on).length, any = on > 0, kind = groupKind(g);
  const toggleOne = x => ev => { ev.stopPropagation(); p.call(svcFor(x.id), "toggle", { entity_id: x.id }); };
  const all = () => { for (const x of m) p.call(svcFor(x.id), any ? "turn_off" : "turn_on", { entity_id: x.id }); };
  const popup = () => p.openPopup({ type: "group", g });
  const style = cfg.style || g.style || "tiles", ids = m.map(x => x.id);
  const foot = ovr(p, id, "foot");
  // bottom lane: a template, else (light groups) the light card's steps / colours aimed at every member, else the count style's track
  const lane = foot != null ? html`<div class="lbl"><span>${foot}</span></div>`
    : kind === "light" && ids.length ? lightLane(cfg.bottom || "none", groupCaps(m), cfg, groupLightState(m), data => p.call("light", "turn_on", { entity_id: ids, ...data })) : nothing;
  const names = m.filter(x => x.on).map(x => x.name).join(" · ");
  const track = style === "count" && lane === nothing ? html`<div class="lbl track"><span>${any ? names : t("Alles uit")}</span><i style="--v:${m.length ? on / m.length * 100 : 0}%"></i></div>` : nothing;
  return html`<div class=${classMap({ card: true, group: true, [style]: true, lane: lane !== nothing, on: any, acts: hasActs(p, id), ...infoCls(cfg) })} ${pressDir(p, pressFor(p, id, cfg.tap === "toggle" ? all : null, popup))}>
    <div class="i">${uico(g.icon, "mdi:shape-outline", "shapes")}</div>
    <div class="c">${ovr(p, id, "state") ?? (style === "count" ? (kind === "light" ? t("Lampen") : t("Stekkers")) : any ? t("{n} van {m} aan", { n: on, m: m.length }) : t("Alles uit"))}</div>
    <div class="n">${cfg.name || g.name}</div>
    ${style === "count" ? html`<div class="s big">${on}<small>/ ${m.length} ${t("aan")}</small></div>`
      : style === "list" ? html`<div class="s glist">${m.slice(0, 4).map(x => html`<div class=${classMap({ on: x.on })}><i></i>${ico(null, memberIcon(x))}<span>${x.name}</span><b>${x.on ? t("Aan") : t("Uit")}</b></div>`)}</div>`
      : html`<div class="s gtiles" @click=${ev => ev.stopPropagation()}>${m.slice(0, 5).map(x => html`<button class=${classMap({ on: x.on })} title=${x.name} @click=${toggleOne(x)}>${ico(null, memberIcon(x))}<small>${x.name}</small></button>`)}</div>`}
    ${lane}${track}${customActions(p, id, ids)}
  </div>`;
}

/* ---------- helpers ---------- */
export const wasteIcon = l => /gft|groen|bio|organic|garden|food|compost/i.test(l) ? "gft" : /pmd|plastic|pbd|packaging/i.test(l) ? "pmd" : /papier|paper|karton|cardboard/i.test(l) ? "papier" : /rest|grijs|grey|general|residual|landfill/i.test(l) ? "rest" : "trash";
export const wasteColor = l => /gft|groen/i.test(l) ? "#8fd16a" : /pmd|plastic/i.test(l) ? "#ffb24d" : /papier|paper/i.test(l) ? "#7fb6ff" : /rest/i.test(l) ? "#bbb" : "#fff";
export const wasteWhen = w => w.days == null ? w.state : w.days === 0 ? t("vandaag") : w.days === 1 ? t("morgen") : w.days <= 7 ? new Date(w.date).toLocaleDateString(locale(), { weekday: "long" }) : new Date(w.date).toLocaleDateString(locale(), { day: "numeric", month: "short" }).replace(".", "");
export const wasteSentence = w => w.days == null ? `${w.label}: ${w.state}` : w.days <= 7 ? t("{label} wordt {when} opgehaald", { label: w.label, when: wasteWhen(w) }) : t("{label} wordt op {when} opgehaald", { label: w.label, when: wasteWhen(w) });
export const condText = c => ({ "clear-night": t("Helder"), cloudy: t("Bewolkt"), fog: t("Mist"), hail: t("Hagel"), lightning: t("Onweer"), "lightning-rainy": t("Onweer"), partlycloudy: t("Half bewolkt"), pouring: t("Stortregen"), rainy: t("Regen"), snowy: t("Sneeuw"), "snowy-rainy": t("Natte sneeuw"), sunny: t("Zonnig"), windy: t("Winderig"), "windy-variant": t("Winderig"), exceptional: t("Uitzonderlijk") }[c] || c || "");
/** thin SVG icon for a weather condition (see icons/) */
export const condSvg = c => ({ "clear-night": "moon", cloudy: "cloud", fog: "fog", hail: "snow", lightning: "lightning", "lightning-rainy": "lightning", partlycloudy: "partly_cloudy", pouring: "pouring", rainy: "rain", snowy: "snow", "snowy-rainy": "snow", sunny: "sun", windy: "wind", "windy-variant": "wind" }[c] || "cloud");
/** colour weather glyphs (home card, header block, weather popup); the room cards keep the thin-line icons */
const WX_EMOJI = { sunny: "☀️", "clear-night": "🌙", partlycloudy: "⛅", cloudy: "☁️", rainy: "🌧️", pouring: "🌧️", lightning: "⛈️", "lightning-rainy": "⛈️", snowy: "🌨️", "snowy-rainy": "🌨️", hail: "🌨️", fog: "🌫️", windy: "💨", "windy-variant": "💨", exceptional: "⚠️" };
export const wxEmoji = c => html`<span class="wxe">${WX_EMOJI[c] || "☁️"}</span>`;
export const condIcon = c => ({ "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant" }[c] || "mdi:weather-cloudy");

/** Drag on the in-card slider: converts pointer x to percent and calls fn on release (and while dragging, throttled). */
function sliderDrag(ev, fn) {
  ev.stopPropagation();
  const el = ev.currentTarget, r = el.getBoundingClientRect();
  const pct = x => Math.max(1, Math.min(100, Math.round((x - r.left) / r.width * 100)));
  let last = 0;
  const move = e => { const v = pct(e.clientX); el.style.setProperty("--v", v + "%"); if (Date.now() - last > 250) { last = Date.now(); fn(v); } };
  const up = e => { fn(pct(e.clientX)); el.closest(".card").__skipClick = Date.now(); removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  move(ev); addEventListener("pointermove", move); addEventListener("pointerup", up);
}

/** Drag on the climate rail: pointer y -> temperature between lo and hi, snapped to step; taps on the + / − ends are left to their own handlers. */
function railDrag(ev, lo, hi, step, fn) {
  if (ev.target.tagName === "EM") return;
  ev.stopPropagation();
  const el = ev.currentTarget, r = el.getBoundingClientRect(), pad = 26;
  const temp = y => { const k = Math.max(0, Math.min(1, (r.bottom - pad - y) / (r.height - 2 * pad))); return Math.round((lo + k * (hi - lo)) / step) * step; };
  let last = 0, cur = null;
  const move = e => { cur = temp(e.clientY); el.style.setProperty("--v", ((cur - lo) / (hi - lo) * 100).toFixed(1)); el.querySelector("b").setAttribute("data-v", cur.toFixed(1)); if (Date.now() - last > 300) { last = Date.now(); fn(cur); } };
  const up = () => { if (cur != null) fn(cur); el.closest(".card").__skipClick = Date.now(); removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  move(ev); addEventListener("pointermove", move); addEventListener("pointerup", up);
}

/** Drag on the vertical bar: pointer y -> percent (bottom = 0), fn on release and while dragging (throttled). */
function vsliderDrag(ev, fn) {
  ev.stopPropagation();
  const el = ev.currentTarget, r = el.getBoundingClientRect();
  const pct = y => Math.max(0, Math.min(100, Math.round((r.bottom - y) / r.height * 100)));
  let last = 0;
  const move = e => { const v = pct(e.clientY); el.style.setProperty("--v", v + "%"); if (Date.now() - last > 250) { last = Date.now(); fn(v); } };
  const up = e => { fn(pct(e.clientY)); el.closest(".card").__skipClick = Date.now(); removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  move(ev); addEventListener("pointermove", move); addEventListener("pointerup", up);
}

/* press() as a lit directive so it can be used inline in templates */
class PressDirective extends Directive {
  constructor(part) { super(part); if (part.type !== PartType.ELEMENT) throw new Error("pressDir on elements only"); }
  update(part, [p, opts]) {
    if (!part.element.__press) { part.element.__press = press(p, opts); bind(part.element, part.element.__press); }
    part.element.__press.opts = opts;   // always the latest closures after a re-render
    return nothing;
  }
  render() { return nothing; }
}
export const pressDir = directive(PressDirective);
