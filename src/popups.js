// Popup renderers. `pop` is the panel's open popup descriptor {type, ...}; `p` the panel.
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { icon, isOn, unavailable, num, relTime, shortDate, domain } from "./util.js";
import { name } from "./model.js";
import { PAGES } from "./pages.js";
import { keypad, bars } from "./extras.js";
import { eventWhen, timeline, applianceState } from "./extras2.js";
import { wasteColor, wasteWhen, condText, condIcon, condSvg, label, camStream, attFilter, ATT_FILTERS, mediaView , lightCaps, batteryOf, groupMembers } from "./cards.js";
import { roomPresets, snapshot, applyPreset, presetMatches, installUpdate, pendingUpdates } from "./features.js";
import { modeList, toggleMode } from "./extras3.js";
import { field, text, select, check } from "./settings.js";
import { LANGUAGES } from "./i18n.js";
import { fetchHistory } from "./extras2.js";

const close = html`<img src=${icon("close")} alt=${t("sluiten")} data-close>`;
const entityOf = pop => pop.e?.id || pop.s?.entity_id || pop.st?.id || pop.a?.id || (pop.type === "weather" ? CUR?.p?.home?.weather?.entity_id : null) || null;
/** header buttons: ⋯ (card options) when the popup belongs to an entity, and close */
const hbtns = (p, pop) => html`<span class="hb">${entityOf(pop) ? html`<button title=${t("Opties")} @click=${() => p.openPopup({ ...pop, menu: !pop.menu, form: false })}><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>` : nothing}<button data-close title=${t("Sluiten")}><img src=${icon("close")} alt="sluiten" data-close></button></span>`;
const li = (mdi, label, value, { on = false, sub = "", onclick = null, svg = null, img = null } = {}) =>
  html`<li class="${on ? "on" : ""} ${onclick ? "tap" : ""}" @click=${onclick || nothing}>${img ? html`<img class="avatar" src=${img} alt="">` : svg ? html`<img class="ico" src=${icon(svg)} alt="">` : html`<ha-icon icon=${mdi}></ha-icon>`}<div>${label}${sub ? html`<small>${sub}</small>` : nothing}</div><span class="st">${value}</span></li>`;
const range = (label, v, oninput, { min = 0, max = 100, unit = "%" } = {}) =>
  html`<div class="prow"><span>${label}</span><b>${v}${unit}</b><input type="range" min=${min} max=${max} .value=${String(v)} @change=${e => oninput(+e.target.value)}></div>`;
const modes = (items, cls = "") => html`<div class="modes ${cls}">${items.map(m => html`<button class=${m.on ? "on" : ""} @click=${m.go}>${m.label}</button>`)}</div>`;
let CUR = null; // current {p, pop} while rendering, so wrap() can draw the header buttons
const wrap = (title, big, sub, body) => {
  const { p, pop } = CUR;
  if (pop.menu) body = html`<ul class="menu-list">
    ${li("mdi:tune", t("Kaart instellen"), "", { sub: t("naam, icoon, gedrag, verbergen"), onclick: () => p.openPopup({ ...pop, menu: false, form: true }) })}
    ${li("mdi:open-in-new", t("Openen in Home Assistant"), "", { sub: entityOf(pop), onclick: () => { p.popup = null; const id = entityOf(pop); id.startsWith("device:") ? p.goPath(`/config/devices/device/${id.slice(7)}`) : p.moreInfo(id); } })}
  </ul>`;
  else if (pop.form && entityOf(pop)) body = cardForm(p, pop);   // popups without an entity (presets) render their own form
  return html`<div class="popup"><h2>${title} ${hbtns(p, pop)}</h2><div class="big">${big}</div><div class="sub">${sub}</div>${body}</div>`;
};
/** a switch whose device also has a power sensor or an operation-state sensor can be shown as an appliance (bezig / klaar) */
const applianceCapable = (p, id) => { const dev = p.hass.entities?.[id]?.device_id; return !!dev && Object.values(p.hass.entities).some(e => e.device_id === dev && e.entity_id !== id && (p.hass.states[e.entity_id]?.attributes.device_class === "power" || p.hass.states[e.entity_id]?.attributes.unit_of_measurement === "W" || e.translation_key === "operation_state" || /_operation_state$/.test(e.entity_id))); };
const TICKER_KINDS = { home: { energy: t("Energie"), waste: t("Afval"), agenda: t("Agenda"), notifications: t("Meldingen"), attention: t("Aandacht"), doors: t("Open deuren"), weather: t("Weer"), modes: t("Modi"), appliances: t("Huishoudapparaten") }, room: { lights: t("Lampen"), doors: t("Open deuren/ramen"), media: t("Media"), battery: t("Batterij laag"), appliances: t("Huishoudapparaten") } };
/** sensible wizard defaults: what the panel already detected */
function wizardDefaults(p) {
  const h = p.config.home || {};
  return { language: p.config.language, title: p.userConfig?.title, rooms: p.rooms.map(r => r.id), roomImage: p.userConfig?.roomImage, homeImage: p.userConfig?.homeImage,
    home: { weather: p.home?.weather?.entity_id, climate: p.home?.climate?.entity_id, alarm: p.home?.alarm?.entity_id, energy: { power: h.energy?.power, today: h.energy?.today } } };
}
function cardForm(p, pop) {
  const id = entityOf(pop), cur = (p.config.cards || {})[id] || {}, draft = pop.draft || { ...cur };
  const upd = patch => p.openPopup({ ...pop, draft: { ...draft, ...patch } });
  const dom = id.split(".")[0], canToggle = ["light", "switch", "input_boolean", "fan", "lock"].includes(dom) || (pop.type === "appliance" && !!pop.a.switch);
  const opt = (key, lbl, sub) => html`<label class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span><input type="checkbox" .checked=${!draft[key]} @change=${e => upd({ [key]: e.target.checked ? undefined : true })}></label>`;
  return html`<div class="form">
    <label class="f"><span>${t("Naam")}</span><input type="text" .value=${draft.name || ""} placeholder=${p.hass.states[id]?.attributes.friendly_name || (id.startsWith("device:") ? (p.hass.devices?.[id.slice(7)]?.name_by_user || p.hass.devices?.[id.slice(7)]?.name || "") : "")} @change=${e => upd({ name: e.target.value || undefined })}></label>
    <label class="f"><span>${t("Icoon")}</span><input type="text" .value=${draft.icon || ""} placeholder="mdi:lightbulb-outline" @change=${e => upd({ icon: e.target.value || undefined })}></label>
    ${["light", "switch", "fan", "binary_sensor", "lock", "cover", "climate", "media_player"].includes(dom) || pop.type === "appliance" ? html`
    <label class="f"><span>${t("Tikken")}</span><select @change=${e => upd({ tap: e.target.value || undefined })}>
      <option value="" ?selected=${!draft.tap}>${t("standaard")}${canToggle ? ` (${t("schakelen")})` : ` (${t("details")})`}</option>
      ${canToggle ? html`<option value="toggle" ?selected=${draft.tap === "toggle"}>${t("schakelen")}</option>` : nothing}
      <option value="popup" ?selected=${draft.tap === "popup"}>${t("details openen")}</option><option value="more" ?selected=${draft.tap === "more"}>${t("Home Assistant-dialoog")}</option><option value="none" ?selected=${draft.tap === "none"}>${t("niets")}</option></select></label>
    <label class="f"><span>${t("Vasthouden")}</span><select @change=${e => upd({ hold: e.target.value || undefined })}>
      <option value="" ?selected=${!draft.hold}>${t("standaard")} (${t("details")})</option><option value="more" ?selected=${draft.hold === "more"}>${t("Home Assistant-dialoog")}</option><option value="none" ?selected=${draft.hold === "none"}>${t("niets")}</option></select></label>
    <label class="f"><span>${t("Tonen")}<small>${t("naam, ondertitel, staat in de hoek")}</small></span><span class="chk3"><label><input type="checkbox" .checked=${!draft.hideName} @change=${e => upd({ hideName: e.target.checked ? undefined : true })}> ${t("Naam")}</label><label><input type="checkbox" .checked=${!draft.hideSub} @change=${e => upd({ hideSub: e.target.checked ? undefined : true })}> ${t("Ondertitel")}</label><label><input type="checkbox" .checked=${!draft.hideState} @change=${e => upd({ hideState: e.target.checked ? undefined : true })}> ${t("Staat")}</label></span></label>
    <div class="f acts"><span>${t("Actieknoppen")}<small>${t("max. 3 · label, mdi:icoon, domein.service, JSON-data (entity_id = deze kaart als je niets invult)")}</small></span><div>
      ${[0, 1, 2].map(i => { const a = (draft.actions || [])[i] || {}; const setA = patch => { const list = [0, 1, 2].map(k => (draft.actions || [])[k] || {}); list[i] = { ...list[i], ...patch }; const clean = list.filter(x => x.label || x.service || x.icon || x.data); upd({ actions: clean.length ? clean : undefined }); };
        return html`<div class="arow"><input type="text" placeholder=${t("label")} .value=${a.label || ""} @change=${e => setA({ label: e.target.value || undefined })}><input type="text" placeholder="mdi:…" .value=${a.icon || ""} @change=${e => setA({ icon: e.target.value || undefined })}><input type="text" placeholder="light.turn_on" .value=${a.service || ""} @change=${e => setA({ service: e.target.value || undefined })}><input type="text" placeholder='{"brightness_pct": 50}' .value=${a.data || ""} @change=${e => setA({ data: e.target.value || undefined })}></div>`; })}
    </div></div>` : nothing}
    ${["light", "switch", "fan", "binary_sensor", "lock"].includes(dom) || pop.type === "appliance" ? html`
    <label class="f"><span>${t("Staat (template)")}<small>${t("tekst in de hoek, Jinja")}</small></span><input type="text" .value=${draft.tplState || ""} placeholder="{{ states('sensor.x') }} W" @change=${e => upd({ tplState: e.target.value || undefined })}></label>
    <label class="f"><span>${t("Ondertitel (template)")}</span><input type="text" .value=${draft.tplSub || ""} placeholder="{{ relative_time(states.light.x.last_changed) }}" @change=${e => upd({ tplSub: e.target.value || undefined })}></label>
    <label class="f"><span>${t("Onderaan (template)")}<small>${t("vervangt de keuze hierboven")}</small></span><input type="text" .value=${draft.tplFoot || ""} @change=${e => upd({ tplFoot: e.target.value || undefined })}></label>` : nothing}
    ${dom === "switch" ? html`<label class="f"><span>${t("Vermogenssensor")}<small>${t("maakt er een stekkerkaart van (watt, verbruik, timer)")}</small></span>${select(p.hass, "sensor", draft.power, v => upd({ power: v || undefined }), { empty: t("automatisch (zelfde apparaat)"), filter: s => s.attributes.unit_of_measurement === "W" })}</label>` : nothing}
    ${dom === "light" ? opt("noColor", t("Kleur tonen"), t("kaart kleurt mee met de lamp")) : nothing}
    ${dom === "light" ? html`<label class="f"><span>${t("Onderaan")}<small>${t("wat de kaart onderaan toont")}</small></span><select @change=${e => upd({ bottom: e.target.value || undefined })}>
      <option value="" ?selected=${!draft.bottom}>${t("automatisch")}</option><option value="none" ?selected=${draft.bottom === "none"}>${t("niets")}</option>
      ${lightCaps(p.hass.states[id]).dim ? html`<option value="steps" ?selected=${draft.bottom === "steps"}>${t("helderheid-stappen")}</option>` : nothing}
      ${lightCaps(p.hass.states[id]).rgb || lightCaps(p.hass.states[id]).ct ? html`<option value="colors" ?selected=${draft.bottom === "colors"}>${t("kleuren")}</option>` : nothing}
      <option value="today" ?selected=${draft.bottom === "today"}>${t("vandaag aan (uren)")}</option></select></label>` : nothing}
    ${dom === "light" && draft.bottom === "colors" && lightCaps(p.hass.states[id]).rgb ? html`<label class="f"><span>${t("Kleuren")}<small>${t("hex-kleuren, gescheiden door komma's")}</small></span><input type="text" .value=${(draft.colors || []).join(", ")} placeholder="#ffb46e, #f27a5c, #7fb6ff, #9fcf8a" @change=${e => upd({ colors: e.target.value.split(",").map(x => x.trim()).filter(x => /^#[0-9a-f]{6}$/i.test(x)).length ? e.target.value.split(",").map(x => x.trim()).filter(x => /^#[0-9a-f]{6}$/i.test(x)) : undefined })}></label>` : nothing}
    ${dom === "binary_sensor" ? html`<label class="f"><span>${t("Onderaan")}<small>${t("wat de kaart onderaan toont")}</small></span><select @change=${e => upd({ bottom: e.target.value || undefined })}><option value="" ?selected=${!draft.bottom}>${t("niets")}</option><option value="today" ?selected=${draft.bottom === "today"}>${t("vandaag (uren)")}</option></select></label>` : nothing}
    ${(dom === "light" || dom === "binary_sensor") && draft.bottom === "today" ? html`<label class="f"><span>${t("Weergave")}</span><select @change=${e => upd({ todayStyle: e.target.value || undefined })}><option value="" ?selected=${!draft.todayStyle}>${t("balkjes per uur")}</option><option value="text" ?selected=${draft.todayStyle === "text"}>${t("tekst")}</option></select></label>` : nothing}
    ${dom === "media_player" ? opt("noArt", t("Albumhoes tonen"), t("als achtergrond tijdens afspelen")) : nothing}
    ${pop.type === "appliance" && pop.a.power && !pop.a.op ? html`<label class="f"><span>${t("Onderaan")}<small>${t("wat de kaart onderaan toont")}</small></span><select @change=${e => upd({ bottom: e.target.value || undefined })}><option value="" ?selected=${!draft.bottom}>${t("vermogenslijn")}</option><option value="timer" ?selected=${draft.bottom === "timer"}>${t("timer (15 / 30 / 60 min)")}</option><option value="cost" ?selected=${draft.bottom === "cost"}>${t("kosten")}</option><option value="bars" ?selected=${draft.bottom === "bars"}>${t("verbruik per uur")}</option><option value="none" ?selected=${draft.bottom === "none"}>${t("niets")}</option></select></label>` : nothing}
    ${pop.type === "appliance" && pop.a.power ? html`<label class="f"><span>${t("Drempel (W)")}<small>${t("boven = bezig")}</small></span><input type="number" .value=${String(draft.threshold ?? 5)} @change=${e => upd({ threshold: e.target.value === "" || +e.target.value === 5 ? undefined : +e.target.value })}></label>` : nothing}
    ${dom === "media_player" ? html`<label class="f"><span>${t("Gekoppelde speler")}<small>${t("titel en hoes van deze speler, bijv. de Chromecast van dezelfde tv")}</small></span>${select(p.hass, "media_player", draft.link, v => upd({ link: v || undefined }), { empty: t("automatisch"), filter: s => s.entity_id !== id })}</label>` : nothing}
    ${dom === "media_player" ? opt("noIdleArt", t("Achtergrond bij stilstand"), t("de animatie uit Panel instellingen")) : nothing}
    ${dom === "climate" ? opt("noMode", t("Modus-knoppen"), t("uit / verwarmen / auto op de kaart")) : nothing}
    ${dom === "switch" && (applianceCapable(p, id) || draft.power) ? html`<label class="f"><span>${t("Apparaatfuncties")}<small>${t("bezig / klaar op basis van het vermogen")}</small></span><input type="checkbox" .checked=${!cur.noAppliance} @change=${e => p.setApplianceMode(id, e.target.checked)}></label>` : nothing}
    ${pop.type === "appliance" ? html`<label class="f"><span>${t("Apparaatfuncties")}<small>${pop.a.op ? t("bezig / klaar volgens het apparaat zelf") : t("bezig / klaar op basis van het vermogen")}</small></span><input type="checkbox" .checked=${!pop.a.plain} @change=${e => p.setApplianceMode(pop.a.key, e.target.checked)}></label>` : nothing}
    ${dom === "camera" ? html`<label class="f"><span>${t("Live beeld")}<small>${t("stream op de kaart i.p.v. een foto elke 10 s")}</small></span><input type="checkbox" .checked=${!!draft.live} @change=${e => upd({ live: e.target.checked || undefined })}></label>` : nothing}
    ${batteryOf(p, pop.e || { id, reg: p.hass.entities?.[id] }) ? html`<label class="f"><span>${t("Batterij tonen")}<small>${t("percentage rechtsonder op de kaart")}</small></span><input type="checkbox" .checked=${!!draft.showBattery} @change=${e => upd({ showBattery: e.target.checked || undefined })}></label>` : nothing}
    <label class="f"><span>${t("Verbergen")}</span><input type="checkbox" .checked=${!!draft.hidden} @change=${e => upd({ hidden: e.target.checked || undefined })}></label>
    <div class="modes n3" style="margin-top:14px">
      <button class="on" @click=${() => p.saveCardSettings(id, draft)}>${t("Opslaan")}</button>
      <button @click=${() => p.saveCardSettings(id, null)}>${t("Herstel")}</button>
      <button @click=${() => p.openPopup({ ...pop, form: false, draft: null })}>${t("Annuleren")}</button>
    </div>
  </div>`;
}

export function renderPopup(p, pop) {
  CUR = { p, pop };
  const hass = p.hass, home = p.home, roomName = p.room?.name || t("Thuis");
  switch (pop.type) {
    case "light": {
      const s = hass.states[pop.e.id] || pop.e.state, on = isOn(s), un = unavailable(s);
      const pct = on ? Math.round((s.attributes.brightness || 255) / 2.55) : 0;
      const kelvin = s.attributes.color_temp_kelvin, kmin = s.attributes.min_color_temp_kelvin || 2000, kmax = s.attributes.max_color_temp_kelvin || 6500;
      const modesList = s.attributes.supported_color_modes || [];
      const dim = modesList.some(m => m !== "onoff"), ct = modesList.includes("color_temp"), color = modesList.some(m => ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(m));
      const set = data => p.call("light", "turn_on", { entity_id: pop.e.id, ...data });
      const hs = s.attributes.hs_color || [0, 0], inColor = ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(s.attributes.color_mode);
      const SW = [[t("Rood"), 0], [t("Oranje"), 30], [t("Geel"), 55], [t("Groen"), 120], [t("Blauw"), 225], [t("Paars"), 280], [t("Roze"), 330]];
      return wrap(roomName, label(p, pop.e), un ? t("Onbereikbaar") : on ? (dim ? `${t("Aan")} · ${pct}%` : t("Aan")) : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => p.call("light", "toggle", { entity_id: pop.e.id }) }], "n2")}
        ${dim ? range(t("Helderheid"), pct, v => set({ brightness_pct: v })) : nothing}
        ${color ? html`<div class="prow"><span>${t("Kleur")}</span><b>${inColor ? `${Math.round(hs[0])}°` : "–"}</b><input type="range" class="hue" min="0" max="360" .value=${String(Math.round(hs[0]))} @change=${e => set({ hs_color: [+e.target.value, Math.max(hs[1] || 0, 60)] })}></div>
          <div class="swatches">${SW.map(([n, h]) => html`<button title=${n} class=${inColor && Math.abs(hs[0] - h) < 12 ? "on" : ""} style="background:hsl(${h} 90% 55%)" @click=${() => set({ hs_color: [h, 100] })}></button>`)}<button title=${t("Wit")} class=${!inColor ? "on" : ""} style="background:#fff" @click=${() => ct ? set({ color_temp_kelvin: 4000 }) : set({ hs_color: [0, 0] })}></button></div>
          ${range(t("Verzadiging"), Math.round(hs[1] || 0), v => set({ hs_color: [hs[0], v] }))}` : nothing}
        ${ct ? html`<div class="prow"><span>${t("Kleurtemperatuur")}</span><b>${kelvin ? kelvin + " K" : "–"}</b><input type="range" class="ct" min=${kmin} max=${kmax} .value=${String(kelvin || kmin)} @change=${e => set({ color_temp_kelvin: +e.target.value })}></div>` : nothing}
        ${ct ? modes([{ label: t("Warm"), on: !inColor && kelvin && kelvin < 3200, go: () => set({ color_temp_kelvin: Math.max(kmin, 2700) }) }, { label: t("Neutraal"), on: !inColor && kelvin >= 3200 && kelvin < 4800, go: () => set({ color_temp_kelvin: 4000 }) }, { label: t("Koel"), on: !inColor && kelvin >= 4800, go: () => set({ color_temp_kelvin: Math.min(kmax, 5500) }) }], "n3") : nothing}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.brightness ? li("mdi:brightness-6", t("Helderheid"), `${pct}%`) : nothing}</ul>`);
    }
    case "strip": {
      const st = pop.st;
      return wrap(roomName, (p.config.cards || {})[st.id]?.name || (hass.devices?.[st.device]?.name_by_user || hass.devices?.[st.device]?.name || t("Stekkerdoos")), t("{n} van {m} aan", { n: st.switches.filter(e => isOn(hass.states[e.id])).length, m: st.switches.length }), html`
        ${modes([{ label: t("Alles aan"), go: () => p.call("switch", "turn_on", { entity_id: st.switches.map(e => e.id) }) }, { label: t("Alles uit"), go: () => p.call("switch", "turn_off", { entity_id: st.switches.map(e => e.id) }) }], "n2")}
        <ul>${st.switches.map(e => { const s = hass.states[e.id]; return li((p.config.cards || {})[e.id]?.icon || "mdi:power-socket-eu", label(p, e), isOn(s) ? t("Aan") : unavailable(s) ? t("Onbereikbaar") : t("Uit"), { on: isOn(s), sub: s?.attributes?.current_power_w ? `${s.attributes.current_power_w} W` : relTime(s?.last_changed), onclick: () => p.call("switch", "toggle", { entity_id: e.id }) }); })}</ul>`);
    }
    case "switch": {
      const s = hass.states[pop.e.id], on = isOn(s), d = pop.e.id.split(".")[0];
      return wrap(roomName, label(p, pop.e), on ? t("Aan") : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => p.call(d === "input_boolean" ? "input_boolean" : d === "fan" ? "fan" : "switch", "toggle", { entity_id: pop.e.id }) }], "n2")}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.current_power_w ? li("mdi:flash-outline", t("Verbruik"), `${s.attributes.current_power_w} W`) : nothing}</ul>`);
    }
    case "fan": {
      const s = hass.states[pop.e.id], on = isOn(s), pct = num(s.attributes.percentage), presets = s.attributes.preset_modes || [];
      const call = (svc, data = {}) => p.call("fan", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), on ? `${t("Aan")}${pct != null ? " · " + pct + "%" : ""}` : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => call("toggle") }], "n2")}
        ${pct != null ? range(t("Snelheid"), pct, v => call("set_percentage", { percentage: v })) : nothing}
        ${presets.length ? modes(presets.slice(0, 4).map(m => ({ label: m, on: s.attributes.preset_mode === m, go: () => call("set_preset_mode", { preset_mode: m }) })), presets.length < 4 ? "n" + presets.length : "") : nothing}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.oscillating != null ? li("mdi:arrow-oscillating", t("Oscilleren"), s.attributes.oscillating ? t("Aan") : t("Uit"), { on: s.attributes.oscillating, onclick: () => call("oscillate", { oscillating: !s.attributes.oscillating }) }) : nothing}</ul>`);
    }
    case "lock": {
      const s = hass.states[pop.e.id], locked = s.state === "locked";
      const call = svc => p.call("lock", svc, { entity_id: pop.e.id });
      return wrap(roomName, label(p, pop.e), locked ? t("Vergrendeld") : s.state === "unlocked" ? t("Ontgrendeld") : s.state, html`
        ${modes([{ label: t("Vergrendelen"), on: locked, go: () => call("lock") }, { label: t("Ontgrendelen"), on: s.state === "unlocked", go: () => call("unlock") }], "n2")}
        <ul>${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}${s.attributes.changed_by ? li("mdi:account-outline", t("Door"), s.attributes.changed_by) : nothing}</ul>`);
    }
    case "vacuum": {
      const s = hass.states[pop.e.id], batt = num(s.attributes.battery_level), cleaning = s.state === "cleaning";
      const call = svc => p.call("vacuum", svc, { entity_id: pop.e.id });
      return wrap(roomName, label(p, pop.e), { cleaning: t("Aan het stofzuigen"), docked: t("In het dock"), idle: t("Klaar"), paused: t("Gepauzeerd"), returning: t("Keert terug"), error: t("Fout") }[s.state] || s.state, html`
        ${modes([{ label: cleaning ? t("Pauze") : t("Start"), on: cleaning, go: () => call(cleaning ? "pause" : "start") }, { label: t("Stop"), go: () => call("stop") }, { label: t("Dock"), go: () => call("return_to_base") }, { label: t("Zoek"), go: () => call("locate") }])}
        <ul>${batt != null ? li(batt < 20 ? "mdi:battery-20" : "mdi:battery", t("Batterij"), `${batt}%`) : nothing}${s.attributes.fan_speed ? li("mdi:fan", t("Zuigkracht"), s.attributes.fan_speed) : nothing}${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}</ul>`);
    }
    case "humidifier": {
      const s = hass.states[pop.e.id], on = isOn(s), target = num(s.attributes.humidity), cur = num(s.attributes.current_humidity), ms = s.attributes.available_modes || [];
      const call = (svc, data = {}) => p.call("humidifier", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), on ? t("Doel {n}%", { n: target ?? "?" }) : t("Uit"), t("Nu {v}", { v: (cur ?? "?") + "%" }), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => call("toggle") }], "n2")}
        ${target != null ? range(t("Doelvochtigheid"), target, v => call("set_humidity", { humidity: v }), { min: s.attributes.min_humidity || 0, max: s.attributes.max_humidity || 100 }) : nothing}
        ${ms.length ? modes(ms.slice(0, 4).map(m => ({ label: m, on: s.attributes.mode === m, go: () => call("set_mode", { mode: m }) })), ms.length < 4 ? "n" + ms.length : "") : nothing}`);
    }
    case "media": {
      const v = mediaView(p, pop.e), s = v.main, vol = Math.round((s.attributes.volume_level ?? 0) * 100), on = v.playing;
      const call = (svc, data = {}) => p.call("media_player", svc, { entity_id: pop.e.id, ...data }), ctl = svc => p.call("media_player", svc, { entity_id: v.ctl });
      const big = v.title ? `${v.title}${v.artist ? " · " + v.artist : ""}` : v.app && !v.off ? v.app.name : v.off ? t("Uit") : s.state;
      return wrap(roomName, label(p, pop.e), big, html`
        ${v.art && !v.off ? html`<div class="mart" style=${`background-image:url("${v.art}")`}></div>` : nothing}
        ${modes([{ label: t("Vorige"), go: () => ctl("media_previous_track") }, { label: on ? t("Pauze") : t("Speel"), on, go: () => ctl("media_play_pause") }, { label: t("Volgende"), go: () => ctl("media_next_track") }, { label: v.off ? t("Aan") : t("Uit"), go: () => call(v.off ? "turn_on" : "turn_off") }])}
        ${s.attributes.volume_level != null ? range(t("Volume"), vol, v => call("volume_set", { volume_level: v / 100 })) : nothing}
        <ul>${s.attributes.source_list ? s.attributes.source_list.slice(0, 8).map(src => li("mdi:import", src, "", { on: src === s.attributes.source, onclick: () => call("select_source", { source: src }) })) : nothing}
        ${v.app && !v.off ? li(v.app.icon, t("App"), v.app.name) : nothing}
        ${v.info && v.info !== s ? li("mdi:link-variant", t("Info van"), v.info.attributes.friendly_name || v.info.entity_id, { sub: t("gekoppelde speler"), onclick: () => p.moreInfo(v.info.entity_id) }) : nothing}
        ${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}</ul>`);
    }
    case "cover": {
      const s = hass.states[pop.e.id], pos = num(s.attributes.current_position);
      const call = (svc, data = {}) => p.call("cover", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), { open: t("Open"), closed: t("Dicht"), opening: t("Gaat open"), closing: t("Gaat dicht") }[s.state] || s.state, html`
        ${modes([{ label: t("Open"), go: () => call("open_cover") }, { label: t("Stop"), go: () => call("stop_cover") }, { label: t("Dicht"), go: () => call("close_cover") }, { label: t("Half"), go: () => call("set_cover_position", { position: 50 }) }])}
        ${pos != null ? range(t("Positie"), pos, v => call("set_cover_position", { position: v })) : nothing}
        <ul>${li("mdi:history", t("Laatst bewogen"), relTime(s.last_changed))}</ul>`);
    }
    case "climate": {
      const s = hass.states[pop.s.entity_id], target = num(s.attributes.temperature), cur = num(s.attributes.current_temperature), step = s.attributes.target_temp_step || 0.5;
      const call = (svc, data = {}) => p.call("climate", svc, { entity_id: s.entity_id, ...data });
      const hv = s.attributes.hvac_modes || [], pr = s.attributes.preset_modes || [];
      const lbl = { heat: t("Verwarmen"), cool: t("Koelen"), auto: t("Auto"), heat_cool: t("Auto"), off: t("Uit"), dry: t("Drogen"), fan_only: t("Ventileren") };
      const rooms = p.rooms.filter(r => r.temp != null);
      return wrap(t("Verwarming"), target != null ? `${target.toFixed(1)}°` : s.state, `${t("Nu {v}", { v: cur != null ? cur.toFixed(1) + "°" : "?" })}${s.attributes.hvac_action ? " · " + ({ heating: t("verwarmen"), idle: t("rust"), cooling: t("koelen"), off: t("uit") }[s.attributes.hvac_action] || s.attributes.hvac_action) : ""}`, html`
        <div class="therm"><div style="font-size:15px;font-weight:600">${t("Doeltemperatuur")}</div>
          <button @click=${() => call("set_temperature", { temperature: +(target + step).toFixed(1) })}><img src=${icon("increase")} alt=""></button>
          <button class="down" @click=${() => call("set_temperature", { temperature: +(target - step).toFixed(1) })}><img src=${icon("increase")} alt=""></button></div>
        ${hv.length > 1 ? modes(hv.map(m => ({ label: lbl[m] || m, on: s.state === m, go: () => call("set_hvac_mode", { hvac_mode: m }) })), hv.length === 2 ? "n2" : hv.length === 3 ? "n3" : "") : nothing}
        ${pr.length ? modes(pr.slice(0, 4).map(m => ({ label: m, on: s.attributes.preset_mode === m, go: () => call("set_preset_mode", { preset_mode: m }) })), pr.length === 2 ? "n2" : pr.length === 3 ? "n3" : "") : nothing}
        <ul>${rooms.map(r => li("mdi:thermometer", r.name, `${r.temp.toFixed(1)}°`, { svg: "heating", onclick: () => p.go(r) }))}</ul>`);
    }
    case "sensor": {
      const s = hass.states[pop.e.id], on = isOn(s);
      const batt = p.room?.ents.battery.find(b => b.reg.device_id && b.reg.device_id === pop.e.reg.device_id);
      if (pop.history === undefined) p.loadHistory(pop);
      return wrap(roomName, label(p, pop.e), pop.kind === "motion" ? (on ? t("Beweging") : t("Geen beweging")) : on ? t("Open") : t("Dicht"), html`
        <ul>${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}${batt ? li("mdi:battery", t("Batterij"), `${batt.state.state}%`) : nothing}</ul>
        <div class="prow" style="margin-top:18px"><span>${t("Laatste 24 uur")}</span><b>${pop.history?.filter?.(r => r.s === "on").length ?? "…"}×</b></div>
        ${pop.history === undefined || pop.history === null && !pop.loaded ? html`<div class="sub">${t("Laden…")}</div>` : timeline(pop.history, pop.kind)}`);
    }
    case "agenda": {
      const evs = p.events || [];
      return wrap(t("Agenda"), evs.length ? t("{n} afspraken", { n: evs.length }) : t("Niets gepland"), t("Vandaag en morgen"), html`
        <ul>${evs.map(ev => li("mdi:calendar-blank-outline", ev.summary, "", { sub: `${eventWhen(ev)}${ev.location ? " · " + ev.location : ""}`, on: ev.start <= new Date() && ev.end > new Date() }))}</ul>`);
    }
    case "appliance": {
      const a = pop.a, cfg = (p.config.cards || {})[a.id] || {}, thr = cfg.threshold ?? 5;
      const st = applianceState(hass, a, thr), sw = a.switch ? hass.states[a.switch.id] : null, title = cfg.name || (hass.devices?.[a.device]?.name_by_user || hass.devices?.[a.device]?.name || t("Apparaat"));
      if (a.op) {
        const left = end => { const m = Math.max(0, Math.round((end - Date.now()) / 60000)); return m >= 60 ? t("nog {h} u {m} min", { h: Math.floor(m / 60), m: m % 60 }) : t("nog {m} min", { m }); };
        const fmt = e => { const s = e && hass.states[e.id]; if (!s || unavailable(s)) return null; const v = hass.formatEntityState?.(s) ?? s.state;
          return v === s.state && /_program_/.test(v) ? v.split("_program_").pop().replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) : v; };   // untranslated "dishcare_dishwasher_program_auto_2" → "Auto 2"
        const prog = fmt(a.program), door = a.door ? hass.states[a.door.id]?.state : null, canStop = a.stop && ["running", "waiting"].includes(st.st) && hass.states[a.stop.id] && hass.states[a.stop.id].state !== "unavailable";   // a button's normal state is "unknown"
        const btns = [...(sw ? [{ label: sw.state === "on" ? t("Uitzetten") : t("Aanzetten"), on: sw.state === "on", go: () => p.call("switch", "toggle", { entity_id: a.switch.id }) }] : []), ...(canStop ? [{ label: t("Programma stoppen"), go: () => p.call("button", "press", { entity_id: a.stop.id }) }] : [])];
        return wrap(roomName, title, st.label, html`
          ${btns.length ? modes(btns, "n2") : nothing}
          ${st.progress != null && ["running", "waiting"].includes(st.st) ? html`<div class="pbar" style="margin-top:14px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden"><i style="display:block;height:100%;width:${Math.max(0, Math.min(100, st.progress))}%;background:#fff"></i></div>` : nothing}
          <ul>${prog ? li("mdi:playlist-play", t("Programma"), prog, { onclick: () => p.moreInfo(a.program.id) }) : nothing}${st.progress != null && st.st !== "off" ? li("mdi:progress-clock", t("Voortgang"), `${Math.round(st.progress)}%`, { onclick: () => p.moreInfo(a.progress.id) }) : nothing}${st.end ? li("mdi:clock-end", t("Klaar om"), st.end.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }), { sub: left(st.end), onclick: () => p.moreInfo(a.finish.id) }) : nothing}${st.doneAt ? li("mdi:check", t("Klaar sinds"), relTime(st.doneAt.toISOString())) : nothing}${door ? li("mdi:door", t("Deur"), door === "open" ? t("Open") : door === "locked" ? t("Vergrendeld") : t("Dicht"), { on: door === "open", onclick: () => p.moreInfo(a.door.id) }) : nothing}${(a.extra || []).map(x => { const s = hass.states[x.id]; return li("mdi:toggle-switch-outline", (s?.attributes.friendly_name || x.id).replace(title, "").trim() || x.id, isOn(s) ? t("Aan") : t("Uit"), { on: isOn(s), onclick: () => p.call("switch", "toggle", { entity_id: x.id }) }); })}${(a.flags || []).map(x => { const s = hass.states[x.id]; return li("mdi:information-variant", (s?.attributes.friendly_name || x.id).replace(title, "").trim() || x.id, unavailable(s) ? "–" : isOn(s) ? t("Aan") : t("Uit"), { on: isOn(s), onclick: () => p.moreInfo(x.id) }); })}${li("mdi:information-outline", t("Status"), fmt(a.op) || "–", { sub: relTime(hass.states[a.op.id]?.last_changed), onclick: () => p.moreInfo(a.op.id) })}</ul>`);
      }
      const ps = hass.states[a.power.id];
      return wrap(roomName, cfg.name || (hass.devices?.[a.device]?.name_by_user || hass.devices?.[a.device]?.name || t("Apparaat")), st.label, html`
        ${sw ? modes([{ label: sw.state === "on" ? t("Stekker uit") : t("Stekker aan"), on: sw.state === "on", go: () => p.call("switch", "toggle", { entity_id: a.switch.id }) }], "n2") : nothing}
        <ul>${li("mdi:flash-outline", t("Vermogen nu"), st.power != null ? `${Math.round(st.power)} W` : "–", { onclick: () => p.moreInfo(a.power.id) })}${li("mdi:tune", t("Drempel"), `${thr} W`, { sub: t("aanpassen via ⋯") })}${st.doneAt ? li("mdi:check", t("Klaar sinds"), relTime(st.doneAt.toISOString())) : nothing}${ps ? li("mdi:history", t("Laatste meting"), relTime(ps.last_updated)) : nothing}</ul>
        <div class="sub" style="margin-top:12px">${t("Bezig zolang het vermogen boven de drempel ligt; daarna \"Klaar\" tot het apparaat weer start.")}</div>`);
    }
    case "alarm": {
      const s = home.alarm; if (!s) return nothing;
      const lbl = { disarmed: t("Uitgeschakeld"), armed_home: t("Thuis"), armed_away: t("Weg"), armed_night: t("Nacht"), armed_vacation: t("Vakantie"), arming: t("Inschakelen…"), pending: t("Wachten…"), triggered: t("ALARM") };
      const needsCode = svc => !!s.attributes.code_format && (svc === "alarm_disarm" || s.attributes.code_arm_required !== false);
      const call = svc => needsCode(svc) ? p.openPopup({ ...pop, pending: svc, code: "" }) : p.call("alarm_control_panel", svc, { entity_id: s.entity_id });
      const blockers = [...home.doorsOpen, ...home.windowsOpen];
      return wrap(t("Alarm"), lbl[s.state] || s.state, s.attributes.changed_by ? t("Laatst gewijzigd door {by}, {t}", { by: s.attributes.changed_by, t: relTime(s.last_changed) }) : relTime(s.last_changed), pop.pending ? keypad(p, pop) : html`
        ${modes([{ label: t("Uit"), on: s.state === "disarmed", go: () => call("alarm_disarm") }, { label: t("Thuis"), on: s.state === "armed_home", go: () => call("alarm_arm_home") }, { label: t("Weg"), on: s.state === "armed_away", go: () => call("alarm_arm_away") }, { label: t("Nacht"), on: s.state === "armed_night", go: () => call("alarm_arm_night") }])}
        ${blockers.length ? html`<ul>${blockers.map(e => li("mdi:door-open", name(hass, e), t("Open"), { sub: e.room?.name, svg: "door" }))}</ul>` : nothing}`);
    }
    case "attention":
      { const items = attFilter(p, home.attention);
      return wrap(t("Aandacht"), `${items.length} ${items.length === 1 ? t("melding") : t("meldingen")}`, t("Apparaten, batterijen en automatiseringen"), html`
        <div class="modes att">${ATT_FILTERS.map(([k, l]) => { const n = attFilter({ attFilter: k }, home.attention).length; return html`<button class=${(p.attFilter || "all") === k ? "on" : ""} @click=${() => { p.attFilter = k; }}>${t(l)}${n ? html`<b class="cnt">${n}</b>` : nothing}</button>`; })}</div>
        <ul>${items.map(a => li(a.icon, a.name, a.kind === "battery" ? `${a.value}%` : a.kind === "unavailable" ? t("Offline") : a.kind === "notification" ? t("Sluiten") : a.kind === "update" ? t("Installeren") : t("Fout"), { sub: a.kind === "notification" ? `${a.text} · ${relTime(a.since)}` : a.kind === "update" ? a.text : `${a.room ? a.room.name + " · " : ""}${a.since ? relTime(a.since) : a.text}`, onclick: a.kind === "notification" ? () => p.call("persistent_notification", "dismiss", { notification_id: a.id }) : a.kind === "update" ? () => { const u = pendingUpdates(hass).find(x => x.id === a.id); if (u) installUpdate(p, u); } : a.room ? () => p.go(a.room) : null }))}</ul>`);
      }
    case "doors": case "windows": {
      const list = pop.type === "doors" ? [...home.doors, ...home.windows] : home.windows, open = list.filter(e => isOn(e.state)), isDoor = e => home.doors.includes(e);
      return wrap(pop.type === "doors" ? (home.windows.length && home.doors.length ? t("Deuren & ramen") : home.doors.length ? t("Deuren") : t("Ramen")) : t("Ramen"), open.length ? t("{n} open", { n: open.length }) : t("Alles dicht"), t("{n} met sensor", { n: list.length }), html`
        <ul>${list.map(e => li(isDoor(e) ? "mdi:door" : "mdi:window-closed-variant", name(hass, e), isOn(e.state) ? t("Open") : t("Dicht"), { on: isOn(e.state), sub: `${e.room.name} · ${relTime(e.state?.last_changed)}`, svg: isDoor(e) ? "door" : "window", onclick: () => p.go(e.room) }))}</ul>`);
    }
    case "lights":
      return wrap(t("Lampen"), home.lightsOn.length ? t("{n} aan", { n: home.lightsOn.length }) : t("Alles uit"), t("van {n} lampen", { n: home.lights.length }), html`
        ${home.lightsOn.length ? modes([{ label: t("Alles uit"), go: () => p.call("light", "turn_off", { entity_id: home.lightsOn.map(e => e.id) }) }], "n2") : nothing}
        <ul>${[...home.lightsOn, ...home.lights.filter(e => !isOn(e.state))].map(e => li("mdi:lightbulb-outline", name(hass, e), isOn(e.state) ? `${Math.round((e.state.attributes.brightness || 255) / 2.55)}%` : t("Uit"), { on: isOn(e.state), sub: e.room.name, svg: "lamp", onclick: () => p.call("light", "toggle", { entity_id: e.id }) }))}</ul>`);
    case "waste":
      return wrap(t("Afval"), home.waste[0] ? `${home.waste[0].label} ${wasteWhen(home.waste[0])}` : t("Geen data"), t("Ophaaldagen"), html`
        <ul>${home.waste.map((w, i) => li("mdi:trash-can-outline", html`<i class="dot" style="background:${wasteColor(w.label)}"></i>${w.label}`, wasteWhen(w), { on: i === 0, sub: w.days > 7 && w.date ? new Date(w.date).toLocaleDateString(locale(), { weekday: "long" }) : "" }))}</ul>`);
    case "people":
      return wrap(t("Wie is thuis"), t("{n} van {m}", { n: home.home, m: home.persons.length }), home.persons.filter(s => s.state === "home").map(s => s.attributes.friendly_name).join(", ") || t("Niemand thuis"), html`
        <ul>${home.persons.map(s => li("mdi:account-outline", s.attributes.friendly_name, s.state === "home" ? t("Thuis") : s.state === "not_home" ? t("Weg") : s.state, { on: s.state === "home", sub: relTime(s.last_changed), img: s.attributes.entity_picture || null }))}</ul>`);
    case "weather": {
      const w = home.weather, a = w.attributes, fc = pop.forecast || [], dfc = (pop.dailyForecast || []).slice(0, 7);
      const hourly = fc.filter(f => f.datetime && (new Date(f.datetime) - Date.now()) < 36e5 * 30).slice(0, 8);
      const wxi = c => html`<img class="ico" src=${icon(condSvg(c))} alt="">`;
      const rain = f => f.precipitation_probability != null ? `${Math.round(f.precipitation_probability)}%` : f.precipitation ? `${f.precipitation} mm` : "";
      const hours = hourly.length ? html`<div class="prow" style="margin-top:6px"><span>${t("Komende uren")}</span><b>${a.precipitation_unit && hourly.some(f => f.precipitation_probability != null) ? t("kans op neerslag") : ""}</b></div>
        <div class="fc hours">${hourly.map(f => html`<div>${new Date(f.datetime).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}${wxi(f.condition)}<b>${Math.round(f.temperature)}°</b>${rain(f) ? html`<em>${rain(f)}</em>` : nothing}</div>`)}</div>` : nothing;
      const todayKey = new Date().toDateString();
      const week = dfc.length ? html`<div class="prow" style="margin-top:18px"><span>${t("Deze week")}</span><b></b></div><div class="fc week">${dfc.map(f => { const d = new Date(f.datetime), isT = d.toDateString() === todayKey;
        return html`<div class=${isT ? "today" : ""}>${isT ? t("Vandaag") : d.toLocaleDateString(locale(), { weekday: "short" })}${wxi(f.condition)}<b>${Math.round(f.temperature)}°</b>${f.templow != null ? html`<small>${Math.round(f.templow)}°</small>` : nothing}${rain(f) ? html`<em>${rain(f)}</em>` : nothing}</div>`; })}</div>` : nothing;
      const bearing = b => typeof b === "number" ? ["N", "NO", "O", "ZO", "Z", "ZW", "W", "NW"][Math.round(b / 45) % 8] : b;
      const sun = home.sun, hm = iso => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
      const details = [
        a.apparent_temperature != null ? li("mdi:thermometer", t("Gevoelstemperatuur"), `${Math.round(a.apparent_temperature)}°`) : null,
        a.humidity != null ? li("mdi:water-outline", t("Luchtvochtigheid"), `${a.humidity}%`) : null,
        a.wind_speed != null ? li("mdi:weather-windy", t("Wind"), `${Math.round(a.wind_speed)} ${a.wind_speed_unit || t("km/u")}${a.wind_bearing != null ? " · " + bearing(a.wind_bearing) : ""}`) : null,
        a.pressure != null ? li("mdi:gauge", t("Luchtdruk"), `${Math.round(a.pressure)} ${a.pressure_unit || "hPa"}`) : null,
        a.uv_index != null ? li("mdi:sun-wireless-outline", t("UV-index"), `${a.uv_index}`) : null,
        a.visibility != null ? li("mdi:eye-outline", t("Zicht"), `${a.visibility} ${a.visibility_unit || "km"}`) : null,
        sun ? li("mdi:weather-sunset-up", t("Zonsopkomst"), hm(sun.attributes.next_rising)) : null,
        sun ? li("mdi:weather-sunset-down", t("Zonsondergang"), hm(sun.attributes.next_setting)) : null,
      ].filter(Boolean);
      return wrap(t("Weer"), `${Math.round(num(a.temperature) ?? 0)}° · ${condText(w.state)}`, a.attribution || "", html`
        ${hours}${week}
        ${!hourly.length && !dfc.length ? html`<div class="sub">${pop.loading ? t("Laden…") : t("Geen verwachting beschikbaar")}</div>` : nothing}
        ${details.length ? html`<ul>${details}</ul>` : nothing}`);
    }
    case "page": {
      const key = pop.key, isHome = key === "home", r = isHome ? null : p.rooms.find(x => x.id === key); if (!isHome && !r) return nothing;
      const cur = p.pageCfg(key), d = pop.draft || { ...cur, hidden: [...(cur.hidden || [])], order: [...(cur.order || [])], ticker: { ...(cur.ticker || {}) }, lines: (cur.lines || []).map(l => ({ ...l })) };
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const all = p.orderCards(p.pageCards(key), d.order), hid = new Set(d.hidden);
      const move = (i, dir) => { const keys = all.map(c => c.key), j = i + dir; if (j < 0 || j >= keys.length) return; [keys[i], keys[j]] = [keys[j], keys[i]]; upd({ order: keys }); };
      const kinds = TICKER_KINDS[isHome ? "home" : "room"];
      const defImage = isHome ? (p.config.homeImage || "") : ((p.config.roomImage || "").replace("{slug}", r.slug));
      return html`<div class="popup wide"><h2>${t("Pagina instellen")} ${hbtns(p, pop)}</h2><div class="big">${isHome ? t("Startpagina") : r.name}</div><div class="sub">${t("Titel, foto, kaarten en de meldingenregel van deze pagina")}</div>
        <div class="form">
          <label class="f"><span>${t("Titel")}</span><input type="text" .value=${d.title || ""} placeholder=${isHome ? (p.config.home?.greeting || t("automatisch (Goedemorgen …)")) : (p.hass.areas?.[key]?.name || r.name)} @change=${e => upd({ title: e.target.value || undefined })}></label>
          <label class="f"><span>${t("Foto")}<small>${t("pad of URL")}</small></span><input type="text" .value=${d.image || ""} placeholder=${defImage} @change=${e => upd({ image: e.target.value || undefined })}></label>
        </div>
        <div class="prow" style="margin-top:18px"><span>${t("Kaarten")}</span><b>${t("{a} van {b} zichtbaar", { a: all.length - hid.size, b: all.length })}</b></div>
        <ul class="plist">${all.map((c, i) => html`<li class=${hid.has(c.key) ? "off" : ""}><ha-icon icon=${hid.has(c.key) ? "mdi:eye-off-outline" : "mdi:eye-outline"}></ha-icon><div>${c.label}<small>${c.key.includes(".") || c.key.startsWith("device:") ? c.key : ""}</small></div>
          <span class="btns"><button title=${hid.has(c.key) ? t("Tonen") : t("Verbergen")} @click=${() => upd({ hidden: hid.has(c.key) ? d.hidden.filter(k => k !== c.key) : [...d.hidden, c.key] })}><ha-icon icon=${hid.has(c.key) ? "mdi:eye-outline" : "mdi:eye-off-outline"}></ha-icon></button><button title=${t("Omhoog")} ?disabled=${i === 0} @click=${() => move(i, -1)}>↑</button><button title=${t("Omlaag")} ?disabled=${i === all.length - 1} @click=${() => move(i, 1)}>↓</button></span></li>`)}
          ${!all.length ? html`<li><div>${t("Geen kaarten op deze pagina")}</div></li>` : nothing}</ul>
        <div class="prow" style="margin-top:18px"><span>${t("Meldingenregel")}</span><b>${t("tik om uit/aan te zetten")}</b></div>
        <div class="chips">${Object.entries(kinds).map(([k, l]) => html`<button class=${d.ticker[k] === false ? "" : "on"} @click=${() => upd({ ticker: { ...d.ticker, [k]: d.ticker[k] === false ? undefined : false } })}>${t(l)}</button>`)}</div>
        <div class="prow" style="margin-top:18px"><span>${t("Eigen regels")}</span><b>Jinja</b></div>
        <div class="form lines">${(d.lines || []).map((l, i) => html`<div class="lrow"><input type="text" .value=${l.icon || ""} placeholder="mdi:text" @change=${e => upd({ lines: d.lines.map((x, j) => j === i ? { ...x, icon: e.target.value || undefined } : x) })}><input type="text" .value=${l.text || ""} placeholder=${t("template, bv. {{ states('sensor.x') }} °C")} @change=${e => upd({ lines: d.lines.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}><button @click=${() => upd({ lines: d.lines.filter((_, j) => j !== i) })}>×</button></div>`)}
          <button class="addline" @click=${() => upd({ lines: [...(d.lines || []), { icon: "mdi:text", text: "" }] })}>${t("+ eigen regel")}</button></div>
        <div class="modes n3" style="margin-top:18px">
          <button class="on" @click=${() => p.savePage(key, { title: d.title, image: d.image, lines: (d.lines || []).filter(l => l.text).length ? d.lines.filter(l => l.text) : undefined, hidden: d.hidden.length ? d.hidden : undefined, order: d.order.length ? d.order : undefined, ticker: Object.values(d.ticker).some(v => v === false) ? Object.fromEntries(Object.entries(d.ticker).filter(([, v]) => v === false)) : undefined })}>${t("Opslaan")}</button>
          <button @click=${() => p.savePage(key, null)}>${t("Herstel")}</button>
          <button data-close>${t("Annuleren")}</button></div></div>`;
    }
    case "wizard": {
      const d = pop.draft || wizardDefaults(p), step = pop.step || 0;
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const updHome = (k, v) => upd({ home: { ...d.home, [k]: v } }), updEnergy = (k, v) => updHome("energy", { ...(d.home.energy || {}), [k]: v });
      const goStep = s => p.openPopup({ ...pop, draft: d, step: s });
      const areas = Object.values(hass.areas || {}).sort((a, b) => a.name.localeCompare(b.name, "nl"));
      const steps = [
        { title: t("Welkom"), body: html`<div class="sub">${t("In vier stappen staat het panel klaar. Alles is later aan te passen bij Panel instellingen.")}</div><div class="form">
            ${field(t("Taal"), html`<select @change=${e => { upd({ language: e.target.value || undefined }); }}><option value="" ?selected=${!d.language}>${t("automatisch (taal van Home Assistant)")}</option>${Object.entries(LANGUAGES).map(([k, l]) => html`<option value=${k} ?selected=${d.language === k}>${l}</option>`)}</select>`)}
            ${field(t("Titel"), text(d.title, v => upd({ title: v || undefined }), t("Thuis") + "."), t("linksboven in de navigatie"))}</div>` },
        { title: t("Kamers"), body: html`<div class="sub">${t("Kies de ruimtes die als kamer in de navigatie komen. De volgorde pas je later aan bij Kamers.")}</div>
            <div class="chips">${areas.map(a => { const on = d.rooms.includes(a.area_id); return html`<button class=${on ? "on" : ""} @click=${() => upd({ rooms: on ? d.rooms.filter(x => x !== a.area_id) : [...d.rooms, a.area_id] })}>${a.name}</button>`; })}</div>
            ${!areas.length ? html`<div class="sub" style="margin-top:12px">${t("Geen ruimtes gevonden. Maak eerst ruimtes aan in Home Assistant en wijs apparaten toe.")}</div>` : nothing}` },
        { title: t("Startpagina"), body: html`<div class="sub">${t("Welke entiteiten de vaste kaarten op de startpagina gebruiken. Leeg = geen kaart.")}</div><div class="form">
            ${field(t("Weer"), select(hass, "weather", d.home.weather, v => updHome("weather", v), { empty: t("geen") }))}
            ${field(t("Thermostaat"), select(hass, "climate", d.home.climate, v => updHome("climate", v), { empty: t("geen") }))}
            ${field(t("Alarm"), select(hass, "alarm_control_panel", d.home.alarm, v => updHome("alarm", v), { empty: t("geen") }))}
            ${field(t("Vermogen"), select(hass, "sensor", d.home.energy?.power, v => updEnergy("power", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "W" }), "W")}
            ${field(t("Verbruik vandaag"), select(hass, "sensor", d.home.energy?.today, v => updEnergy("today", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "kWh" }), "kWh")}</div>` },
        { title: t("Foto's"), body: html`<div class="sub">${t("Een foto per kamer als achtergrond; {slug} wordt de kamernaam (bv. woonkamer.jpg). Zonder foto krijgt elke kamer een rustige kleurverloop. Per kamer aanpassen kan later via de paginainstellingen.", { slug: "{slug}" })}</div><div class="form">
            ${field(t("Kamerfoto"), text(d.roomImage, v => upd({ roomImage: v || undefined }), "/local/images/rooms/{slug}.jpg"))}
            ${field(t("Foto startpagina"), text(d.homeImage, v => upd({ homeImage: v || undefined }), "/local/images/rooms/home.jpg"))}</div>` },
      ];
      const last = step === steps.length - 1;
      return html`<div class="popup wide wiz"><h2>${t("Installatie")} · ${step + 1}/${steps.length}</h2><div class="big">${steps[step].title}</div>
        ${steps[step].body}
        <div class="wfoot"><span class="dots">${steps.map((_, i) => html`<i class=${i === step ? "on" : ""}></i>`)}</span>
          <div class="modes n3">${step > 0 ? html`<button @click=${() => goStep(step - 1)}>${t("Terug")}</button>` : html`<button @click=${() => p.finishWizard(null)}>${t("Overslaan")}</button>`}
            <span></span>
            <button class="on" @click=${() => last ? p.finishWizard(d) : goStep(step + 1)}>${last ? t("Klaar") : t("Volgende")}</button></div></div></div>`;
    }
    case "confirm":
      return html`<div class="popup"><h2>${pop.title || t("Bevestigen")} ${hbtns(p, pop)}</h2><div class="big">${pop.big}</div><div class="sub confirm-text">${pop.sub || ""}</div>
        <div class="modes n2"><button class="on" @click=${async () => { p.popup = null; try { await pop.ok(); } catch {} }}>${pop.okLabel || t("Ja")}</button><button data-close>${t("Annuleren")}</button></div></div>`;
    case "presets": {
      const r = p.rooms.find(x => x.id === pop.roomId); if (!r) return nothing;
      const list = roomPresets(p, r), d = pop.draft || {}, editing = pop.edit ? list.find(x => x.id === pop.edit) : null;
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const body = pop.form ? html`<div class="form">
          <label class="f"><span>${t("Naam")}</span><input type="text" .value=${d.name ?? editing?.name ?? ""} placeholder=${t("bv. Film, Lezen, Gezellig")} @change=${e => upd({ name: e.target.value })}></label>
          <label class="f"><span>${t("Icoon")}</span><input type="text" .value=${d.icon ?? editing?.icon ?? ""} placeholder="mdi:movie-open-outline" @change=${e => upd({ icon: e.target.value })}></label>
          <div class="sub" style="margin-top:12px">${editing ? t("Bewaart de opgeslagen lampstanden; alleen naam en icoon wijzigen.") : t("Slaat de huidige stand van {n} lampen op: aan/uit, helderheid en kleur.", { n: r.ents.lights.length })}</div>
          <div class="modes n2" style="margin-top:14px">
            <button class="on" @click=${() => p.savePreset(r, { id: editing?.id || Date.now().toString(36), name: (d.name ?? editing?.name) || t("Scène"), icon: (d.icon ?? editing?.icon) || undefined, states: editing ? editing.states : snapshot(p, r) })}>${t("Opslaan")}</button>
            <button @click=${() => p.openPopup({ type: "presets", roomId: r.id, manage: pop.manage })}>${t("Annuleren")}</button></div></div>`
        : html`${list.length ? html`<ul>${list.map(pr => li(pr.icon || "mdi:lightbulb-group-outline", pr.name, pop.manage ? t("Bewerken") : t("Activeren"), { on: !pop.manage && presetMatches(p, pr), sub: t("{n} van {m} lampen aan", { n: Object.values(pr.states).filter(v => v.on).length, m: Object.keys(pr.states).length }), onclick: () => pop.manage ? p.openPopup({ ...pop, form: true, edit: pr.id }) : applyPreset(p, pr) }))}</ul>` : html`<div class="sub" style="margin-top:14px">${t("Nog geen lichtscènes voor deze kamer. Zet de lampen zoals je ze wilt en sla die stand op.")}</div>`}
          <div class="modes ${list.length ? "n3" : "n2"}"><button class="on" @click=${() => p.openPopup({ ...pop, form: true, edit: null, draft: null })}>${t("+ Huidige stand")}</button>${list.length ? html`<button class=${pop.manage ? "on" : ""} @click=${() => p.openPopup({ ...pop, manage: !pop.manage })}>${pop.manage ? t("Klaar") : t("Bewerken")}</button>` : nothing}${list.length ? html`<button data-close>${t("Sluiten")}</button>` : html`<button data-close>${t("Sluiten")}</button>`}</div>
          ${pop.manage && list.length ? html`<ul>${list.map(pr => li("mdi:content-save-outline", pr.name, t("Overschrijven"), { sub: t("met de huidige lampstand"), onclick: () => p.savePreset(r, { ...pr, states: snapshot(p, r) }) }))}${list.map(pr => li("mdi:delete-outline", pr.name, t("Verwijderen"), { onclick: () => p.deletePreset(r, pr.id) }))}</ul>` : nothing}`;
      return wrap(r.name, t("Lichtscènes"), list.length ? t("{n} opgeslagen · tik = activeren", { n: list.length }) : t("Opgeslagen lampstanden voor deze kamer"), body);
    }
    case "energy": {
      const en = home.energy, r = (s, u) => s ? `${num(s.state)?.toLocaleString(locale())} ${u}` : "–";
      if (en.today && pop.hourly === undefined) p.loadHourly(pop);
      return wrap(t("Energie"), r(en.power, "W"), t("Nu"), html`${en.today ? html`<div class="prow" style="margin-top:6px"><span>${t("Vandaag per uur")}</span><b>${r(en.today, "kWh")}</b></div>${bars(pop.hourly === undefined ? null : pop.hourly)}` : nothing}<ul>${li("mdi:home-import-outline", t("Verbruik vandaag"), r(en.today, "kWh"))}${li("mdi:solar-power-variant-outline", t("Teruggeleverd"), r(en.returned, "kWh"))}${li("mdi:fire", t("Gas"), r(en.gas, "m³"))}</ul>`);
    }
    case "camera": {
      const s = hass.states[pop.s.entity_id] || pop.s;
      const src = camStream(s);
      const camRoom = p.rooms.find(r => r.ents.cameras.some(c => c.id === s.entity_id)), bell = p.config.home?.doorbell;
      const evIds = [...new Set([...(camRoom?.ents.motion.map(e => e.id) || []), ...((bell?.camera === s.entity_id && bell.triggers) || []).filter(id => domain(id) === "binary_sensor")])];
      if (evIds.length && pop.events === undefined && !pop.menu && !pop.form) p.loadCamEvents(pop, evIds);
      const body = pop.menu ? html`<ul class="menu-list">
          ${li("mdi:tune", t("Kaart instellen"), "", { sub: t("naam, live beeld, verbergen"), onclick: () => p.openPopup({ ...pop, menu: false, form: true }) })}
          ${li("mdi:open-in-new", t("Openen in Home Assistant"), "", { sub: s.entity_id, onclick: () => { p.popup = null; p.moreInfo(s.entity_id); } })}</ul>`
        : pop.form ? cardForm(p, pop)
        : html`${src ? html`<img class="stream" src=${src} alt="">` : html`<div class="sub">${t("Geen beeld beschikbaar")}</div>`}
          <div class="sub" style="margin-top:10px">${s.state === "recording" ? t("Neemt op") : s.state === "streaming" ? t("Live") : t("Inactief")} · ${relTime(s.last_changed)}${pop.by ? " · " + t("geopend door {by}", { by: pop.by }) : ""}</div>
          ${evIds.length ? html`<div class="prow" style="margin-top:18px"><span>${t("Beweging laatste 24 uur")}</span><b>${pop.events ? pop.events.length + "×" : "…"}</b></div>${pop.events ? timeline(pop.events, "motion") : nothing}` : nothing}`;
      return html`<div class="popup wide"><h2>${label(p, { id: s.entity_id, state: s })} ${hbtns(p, pop)}</h2>${body}</div>`;
    }
    case "tpl": {
      const list = p.draft?.templates || [], tp = list[pop.index]; if (!tp) return nothing;
      const upd = patch => { p.draft = { ...p.draft, templates: list.map((x, j) => j === pop.index ? { ...x, ...patch } : x) }; };
      const f = (lbl, ctrl, sub) => html`<label class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</label>`;
      const txt = (k, ph) => html`<input type="text" .value=${tp[k] || ""} placeholder=${ph} @change=${e => upd({ [k]: e.target.value || undefined })}>`;
      return html`<div class="popup wide"><h2>${t("Templatekaart")} ${hbtns(p, pop)}</h2><div class="big">${tp.name || t("Nieuwe kaart")}</div><div class="sub">${t("Tekst en label zijn Jinja-templates; Home Assistant rendert ze live. Opslaan gebeurt met de knop op de instellingenpagina.")}</div>
        <div class="form">
          ${f(t("Naam"), txt("name", "bv. Buiten"))}
          ${f(t("Icoon"), txt("icon", "mdi:thermometer"))}
          ${f(t("Plaats"), html`<select @change=${e => upd({ room: e.target.value || undefined })}><option value="" ?selected=${!tp.room}>${t("Thuis")}</option>${p.rooms.map(r => html`<option value=${r.id} ?selected=${tp.room === r.id}>${r.name}</option>`)}</select>`, t("startpagina of een kamer"))}
          ${f(t("Tekst"), txt("state", "{{ states('sensor.buiten_temperatuur') }} °C"), t("template voor de staat"))}
          ${f(t("Label"), txt("label", "{{ relative_time(states.sensor.x.last_changed) }} geleden"), "optioneel, kleine regel onderin")}
          ${f(t("Entiteit"), txt("entity", "sensor.x"), t("voor details (vasthouden) en schakelen"))}
          ${f(t("Tikken"), html`<select @change=${e => upd({ tap: e.target.value || undefined })}><option value="" ?selected=${!tp.tap}>${t("details van de entiteit")}</option><option value="toggle" ?selected=${tp.tap === "toggle"}>${t("entiteit schakelen")}</option><option value="service" ?selected=${tp.tap === "service"}>${t("actie uitvoeren")}</option><option value="navigate" ?selected=${tp.tap === "navigate"}>${t("naar pad gaan")}</option></select>`)}
          ${tp.tap === "service" ? f(t("Actie"), txt("service", "light.turn_on"), "domein.service") : nothing}
          ${tp.tap === "service" ? f(t("Data"), txt("data", '{"entity_id": "light.x", "brightness_pct": 50}'), "JSON") : nothing}
          ${tp.tap === "navigate" ? f(t("Pad"), txt("path", "/energy")) : nothing}
          <div class="modes n2" style="margin-top:16px"><button class="on" @click=${() => { p.popup = null; }}>${t("Klaar")}</button><button @click=${() => { p.draft = { ...p.draft, templates: list.filter((_, j) => j !== pop.index) }; p.popup = null; }}>${t("Verwijderen")}</button></div>
        </div></div>`;
    }
    case "group": {
      const g = pop.g, m = groupMembers(p, g), on = m.filter(x => x.on).length;
      const svc = id => id.split(".")[0] === "input_boolean" ? "input_boolean" : id.split(".")[0] === "light" ? "light" : id.split(".")[0] === "fan" ? "fan" : "switch";
      return wrap(g.name, on ? t("{n} van {m} aan", { n: on, m: m.length }) : t("Alles uit"), t("tik op een onderdeel om te schakelen"), html`
        <div class="modes n2"><button @click=${() => m.forEach(x => p.call(svc(x.id), "turn_on", { entity_id: x.id }))}>${t("Alles aan")}</button><button @click=${() => m.forEach(x => p.call(svc(x.id), "turn_off", { entity_id: x.id }))}>${t("Alles uit")}</button></div>
        <ul>${m.map(x => li(x.id.startsWith("light.") ? "mdi:lightbulb-outline" : x.id.startsWith("fan.") ? "mdi:fan" : "mdi:power-socket-eu", x.name, x.on ? t("Aan") : t("Uit"), { on: x.on, svg: x.id.startsWith("light.") ? "lamp" : x.id.startsWith("fan.") ? "fan" : "plug", onclick: () => p.call(svc(x.id), "toggle", { entity_id: x.id }) }))}</ul>`);
    }
    case "more":
      return wrap(t("Meer"), t("Overzichten"), t("Pagina's die niet bij een kamer horen"), html`
        ${modeList(p).length ? html`<div class="prow" style="margin-top:14px"><span>${t("Modi")}</span><b>${modeList(p).filter(m => m.on).map(m => m.label).join(", ") || ""}</b></div><ul style="margin-top:8px">${modeList(p).map(m => li(m.icon || "mdi:account-switch-outline", m.label, m.on ? t("Actief") : t("Uit"), { on: m.on, sub: m.s.attributes.friendly_name, onclick: () => toggleMode(p, m) }))}</ul>` : nothing}
        <div class="pages">${[...Object.entries(PAGES).map(([k, v]) => ({ label: t(v.label), sub: t(v.sub), icon: v.icon, path: "__" + k + "__" })), ...(p.config.more || []), { label: t("Home Assistant"), sub: t("Instellingen"), icon: "mdi:cog-outline", path: "/config" }, { label: t("Profiel"), sub: t("gebruiker en thema"), icon: "mdi:account-circle-outline", path: "/profile" }, { label: t("Panel instellingen"), sub: t("kamers, kaarten, foto's"), icon: "mdi:tune", path: "__settings__" }].map(m => html`<a @click=${() => m.action ? m.action() : p.goPath(m.path)}><ha-icon icon=${m.icon}></ha-icon><div>${m.label}<small>${m.sub || ""}</small></div></a>`)}</div>`);
    default: return nothing;
  }
}
