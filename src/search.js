// Search bar under the navigation: rooms, pages and entities. Tap = open the matching popup (or HA's dialog).
import { html, nothing } from "lit";
import { t } from "./i18n.js";
import { domain, num, isOn, unavailable, icon } from "./util.js";
import { PAGES } from "./pages.js";

const DOM_ICON = { light: "mdi:lightbulb-outline", switch: "mdi:power-socket-eu", media_player: "mdi:speaker", cover: "mdi:window-shutter", climate: "mdi:thermostat", fan: "mdi:fan", lock: "mdi:lock-outline", vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", camera: "mdi:cctv", binary_sensor: "mdi:radiobox-marked", sensor: "mdi:gauge", scene: "mdi:palette-outline", script: "mdi:script-text-outline", automation: "mdi:robot-outline", person: "mdi:account-outline", input_boolean: "mdi:toggle-switch-outline", update: "mdi:update", weather: "mdi:weather-partly-cloudy", calendar: "mdi:calendar-blank-outline" };
const QUIET = new Set(["zone", "sun", "event", "tts", "stt", "conversation", "device_tracker", "number", "select", "button", "input_number", "input_select", "input_text", "input_datetime", "image", "todo", "siren", "text", "time", "date", "datetime"]);

const stateText = s => unavailable(s) ? t("Onbereikbaar") : s.state === "on" ? t("Aan") : s.state === "off" ? t("Uit") : num(s.state) != null ? `${s.state}${s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : ""}` : s.state.length <= 14 ? s.state : "";

/** open the panel's own popup for an entity when it has one, otherwise HA's more-info */
function openFor(p, s, m) {
  const id = s.entity_id, d = domain(id), e = m?.e || { id, state: s, reg: p.hass.entities?.[id] || {} }, r = m?.r;
  if (r) { const st = r.ents.strips.find(x => x.switches.some(w => w.id === id)); if (st) return p.openPopup({ type: "strip", st }); const a = r.ents.appliances.find(x => x.switch?.id === id || x.power?.id === id || x.op?.id === id || x.extra?.some(w => w.id === id)); if (a) return p.openPopup({ type: "appliance", a }); }
  switch (d) {
    case "light": case "cover": case "fan": case "lock": case "vacuum": case "humidifier": case "media": return p.openPopup({ type: d, e });
    case "media_player": return p.openPopup({ type: "media", e });
    case "switch": case "input_boolean": return p.openPopup({ type: "switch", e });
    case "climate": return p.openPopup({ type: "climate", s });
    case "camera": return p.openPopup({ type: "camera", s });
    case "weather": return p.openPopup({ type: "weather" });
    case "scene": return p.call("scene", "turn_on", { entity_id: id });
    case "script": return p.call("script", "turn_on", { entity_id: id });
    case "binary_sensor": { const dc = s.attributes.device_class, kind = ["door", "garage_door", "opening", "garage"].includes(dc) ? "door" : dc === "window" ? "window" : ["motion", "occupancy", "presence"].includes(dc) ? "motion" : "binary"; return r ? p.openPopup({ type: "sensor", e, kind }) : p.moreInfo(id); }
    default: return p.moreInfo(id);
  }
}

export function searchResults(p, q) {
  const hit = s => (s || "").toLowerCase().includes(q), starts = s => (s || "").toLowerCase().startsWith(q);
  const hits = [];
  for (const r of p.rooms) if (hit(r.name)) hits.push({ label: r.name, sub: t("Kamer"), icon: "mdi:floor-plan", rank: starts(r.name) ? 0 : 1, go: () => { p.search = ""; p.go(r); } });
  for (const [k, v] of Object.entries(PAGES)) if (hit(t(v.label))) hits.push({ label: t(v.label), sub: t("Pagina"), icon: v.icon, rank: starts(t(v.label)) ? 0 : 1, go: () => { p.search = ""; p.goPath("__" + k + "__"); } });
  const inRoom = new Map(); for (const r of p.rooms) for (const e of r.ents.all) inRoom.set(e.id, { e, r });
  for (const s of Object.values(p.hass.states)) {
    const d = domain(s.entity_id); if (QUIET.has(d)) continue;
    const n = s.attributes.friendly_name || s.entity_id;
    if (!hit(n) && !hit(s.entity_id)) continue;
    const m = inRoom.get(s.entity_id);
    hits.push({ label: n, sub: m ? m.r.name : d.replace(/_/g, " "), icon: s.attributes.icon || DOM_ICON[d] || "mdi:circle-outline", state: stateText(s), rank: (starts(n) ? 0 : 2) + (m ? 0 : 1), go: () => { p.search = ""; openFor(p, s, m); } });
  }
  return hits.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "nl"));
}

export function searchBar(p) {
  if (p.settings || !p.searchOpen) return nothing;
  const q = (p.search || "").trim().toLowerCase(), res = q ? searchResults(p, q).slice(0, 12) : [];
  return html`<div class="searchbar">
    <div class="sinput pill"><ha-icon icon="mdi:magnify"></ha-icon>
      <input type="text" autofocus .value=${p.search} placeholder=${t("Zoek kamers, apparaten, pagina's…")} @input=${e => { p.search = e.target.value; }} @keydown=${e => { if (e.key === "Enter" && res[0]) res[0].go(); }}>
      <button title=${t("Sluiten")} @click=${() => { p.search = ""; p.searchOpen = false; }}><img src=${icon("close")} alt=""></button></div>
    ${q ? html`<ul class="sres">${res.map(r => html`<li @click=${r.go}><ha-icon icon=${r.icon}></ha-icon><div>${r.label}<small>${r.sub}</small></div>${r.state ? html`<span class="st">${r.state}</span>` : nothing}</li>`)}
      ${!res.length ? html`<li class="none">${t("Niets gevonden")}</li>` : nothing}</ul>` : nothing}
  </div>`;
}

export const searchStyles = `
  /* drops down under the room pill when the search icon in the pill is tapped */
  .nav .searchbar{position:absolute;top:0;left:50%;transform:translateX(-50%);height:auto;display:block;width:min(520px,100%);z-index:6;animation:downT .15s var(--ease) both}
  .sinput{display:flex;align-items:center;gap:8px;height:46px;padding:0 8px 0 16px}
  .sinput ha-icon{--mdc-icon-size:18px;opacity:.7;flex:none}
  .sinput input{flex:1;border:0;background:transparent;color:#fff;font:inherit;font-size:14px;outline:none;min-width:0}
  .sinput input::placeholder{color:rgba(255,255,255,.55)}
  .sinput button{width:28px;height:28px;border:0;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center;cursor:pointer;flex:none}
  .sinput button img{width:13px}
  .sres{list-style:none;margin-top:8px;border-radius:var(--r);background:var(--card);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);max-height:min(60vh,520px);overflow-y:auto;scrollbar-width:none}
  .sres li{display:grid;grid-template-columns:28px 1fr max-content;gap:14px;align-items:center;padding:12px 16px;cursor:pointer;font-size:15px;font-weight:600;border-top:1px solid rgba(255,255,255,.08)}
  .sres li:first-child{border-top:0}
  .sres li:hover{background:rgba(255,255,255,.1)}
  .sres li ha-icon{--mdc-icon-size:22px}
  .sres li small{display:block;font-size:12px;font-weight:500;opacity:.7}
  .sres li .st{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.8;white-space:nowrap}
  .sres li.none{cursor:default;opacity:.7;grid-template-columns:1fr}
  @media (max-width:900px){ .nav .searchbar{left:0;right:0;transform:none;width:auto} }
`;
