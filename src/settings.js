// Settings page: edits a draft of the config and stores it per user with Home Assistant's
// frontend user-data storage (frontend/set_user_data). config.json stays the base; user data overrides it.
// The page is split into tabs (left) so each topic stays small.
import { t, locale, LANGUAGES } from "./i18n.js";
import { html, nothing } from "lit";
import { domain, slug, SUFFIX, VERSION } from "./util.js";
import { QUICK_TYPES, QUICK_DOMAINS, triggerCandidates, selfUpdate } from "./features.js";
import { PAGES } from "./pages.js";
import { defaultsGrid } from "./defaults.js";
import { dragRows } from "./drag.js";
import { iconInput } from "./iconpicker.js";
import { solarSettings } from "./cards2.js";

export const USER_DATA_KEY = "hacasa_nova" + (SUFFIX ? "_dev" : "");

// carried over once when the key is empty: pre-release names, or (dev build) a copy of the real settings
const OLD_USER_DATA_KEYS = SUFFIX ? ["hacasa_nova"] : ["kamer_panel", "homio_panel"];
/** null = nothing stored yet. Throws when Home Assistant could not be asked (connection lost, HA starting):
 *  that must never look like an empty store, or the wizard opens and saving it wipes the real settings (#172) */
export async function loadUserConfig(hass) {
  const r = await hass.callWS({ type: "frontend/get_user_data", key: USER_DATA_KEY });
  if (r?.value) return r.value;
  for (const key of OLD_USER_DATA_KEYS) {
    const o = await hass.callWS({ type: "frontend/get_user_data", key });
    if (o?.value) { await hass.callWS({ type: "frontend/set_user_data", key: USER_DATA_KEY, value: o.value }); console.info(`[hacasa-nova] settings migrated from ${key}`); return o.value; }
  }
  return null;
}
export const saveUserConfig = (hass, value) => hass.callWS({ type: "frontend/set_user_data", key: USER_DATA_KEY, value });

/** deep-ish merge: home + home.energy, cards and pages are merged per key, everything else is replaced */
export function mergeConfig(...layers) {
  const out = {};
  for (const l of layers) { if (!l) continue; for (const [k, v] of Object.entries(l)) {
    if (k === "home" && v && typeof v === "object") out.home = { ...(out.home || {}), ...v, energy: { ...(out.home?.energy || {}), ...(v.energy || {}) } };
    else if ((k === "cards" || k === "pages") && v && typeof v === "object") out[k] = { ...(out[k] || {}), ...v };
    else out[k] = v; } }
  return out;
}

/* ---------- small form helpers ---------- */
export const field = (label, control, sub) => html`<label class="f"><span>${label}${sub ? html`<small>${sub}</small>` : nothing}</span>${control}</label>`;
export const text = (v, on, ph = "") => html`<input type="text" .value=${v ?? ""} placeholder=${ph} @change=${e => on(e.target.value || null)}>`;
const number = (v, on) => html`<input type="number" .value=${v ?? ""} @change=${e => on(e.target.value === "" ? null : +e.target.value)}>`;
export const check = (v, on) => html`<input type="checkbox" .checked=${!!v} @change=${e => on(e.target.checked)}>`;
const sortByName = list => list.sort((a, b) => (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id, locale()));
export const select = (hass, dom, v, on, { empty = t("automatisch"), filter = null } = {}) => {
  const opts = sortByName(Object.values(hass.states).filter(s => domain(s.entity_id) === dom && (!filter || filter(s))));
  return html`<select @change=${e => on(e.target.value || null)}><option value="">${empty}</option>${opts.map(s => html`<option value=${s.entity_id} ?selected=${s.entity_id === v}>${s.attributes.friendly_name || s.entity_id}</option>`)}</select>`;
};
export const selectDoms = (hass, doms, v, on, empty = t("kies")) => {
  const opts = sortByName(Object.values(hass.states).filter(s => doms.includes(domain(s.entity_id))));
  return html`<select @change=${e => on(e.target.value || null)}><option value="">${empty}</option>${opts.map(s => html`<option value=${s.entity_id} ?selected=${s.entity_id === v}>${s.attributes.friendly_name || s.entity_id}</option>`)}</select>`;
};
/** pill choice; `def` is what applies when nothing is chosen and picking it stores nothing (marked "std") */
export const pills = (opts, cur, def, on) => html`<div class="seg">${opts.map(o => html`<button class=${(cur ?? def) === o.v ? "on" : ""} @click=${() => on(o.v === def ? undefined : o.v)}>${o.l}${o.v === def ? html`<sup>${t("std")}</sup>` : nothing}</button>`)}</div>`;
/** visibility condition (cards, status pills): a comparison on an entity state ("simple") or a Jinja template ("tpl"), plus
    "show when true / false". setMode(mode, patch) switches the mode and clears the other mode's fields; row(label, control, sub) lays out a line */
export const condFields = (draft, upd, mode, setMode, row, hint, listId = "hcn-entities") => html`
  ${row(t("Voorwaarde"), html`<div class="seg">${[["simple", t("Eenvoudig")], ["tpl", t("Template")]].map(([v, l]) => html`<button class=${mode === v ? "on" : ""} @click=${() => setMode(v, v === "simple" ? { tplVisible: undefined } : { visEntity: undefined, visOp: undefined, visValue: undefined })}>${l}</button>`)}</div>`, hint)}
  ${mode === "simple" ? html`
    ${row(t("Entiteit"), html`<input type="text" list=${listId} .value=${draft.visEntity || ""} placeholder="sensor.x" @change=${e => upd({ visEntity: e.target.value || undefined })}>`)}
    ${row(t("Vergelijking"), html`<div class="seg">${[["", t("is")], ["ne", t("is niet")], ["gt", t("groter dan")], ["lt", t("kleiner dan")]].map(([v, l]) => html`<button class=${(draft.visOp || "") === v ? "on" : ""} @click=${() => upd({ visOp: v || undefined })}>${l}</button>`)}</div>`)}
    ${row(t("Waarde"), html`<input type="text" .value=${draft.visValue ?? ""} placeholder="on" @change=${e => upd({ visValue: e.target.value === "" ? undefined : e.target.value })}>`, t("de staat van de entiteit, bv. on, off, 21.5"))}`
  : row(t("Template"), html`<input type="text" .value=${draft.tplVisible || ""} placeholder="{{ states('sensor.x') | int < 30 }}" @change=${e => upd({ tplVisible: e.target.value || undefined })}>`, t("Jinja; onwaar is false, 0, no, off, none of leeg, alles anders is waar"))}
  ${row(t("Tonen als"), html`<div class="seg two">${[[false, t("waar")], [true, t("onwaar")]].map(([v, l]) => html`<button class=${!!draft.tplVisibleInvert === v ? "on" : ""} @click=${() => upd({ tplVisibleInvert: v || undefined })}>${l}</button>`)}</div>`, t("zichtbaar als de voorwaarde dit oplevert"))}`;
/** chip list that toggles entity ids in/out of a list (null list = "all") */
const chips = (states, cur, allIds, setList, extra = () => nothing) => html`<div class="chips">${states.map(s => { const all = !cur; const on = all || cur.includes(s.entity_id);
  return html`<button class=${on ? "on" : ""} title=${s.entity_id} @click=${() => { const c = cur || allIds; setList(on ? c.filter(x => x !== s.entity_id) : [...c, s.entity_id]); }}>${s.attributes.friendly_name || s.entity_id}${extra(s)}</button>`; })}</div>`;

export const TABS = [
  { id: "algemeen", label: t("Algemeen"), sub: t("titel, foto's, slaapstand"), icon: "mdi:tune" },
  { id: "paginas", label: t("Pagina's"), sub: t("kaarten, volgorde, titels"), icon: "mdi:view-dashboard-edit-outline" },
  { id: "standaard", label: t("Kaartstandaarden"), sub: t("tikken, vasthouden, onderaan per soort kaart"), icon: "mdi:card-bulleted-settings-outline" },
  { id: "kamers", label: t("Kamers"), sub: t("welke en in welke volgorde"), icon: "mdi:floor-plan" },
  { id: "startpagina", label: t("Startpagina"), sub: t("sensoren, weer, scènes, media"), icon: "mdi:home-outline" },
  { id: "acties", label: t("Snelle acties"), sub: t("knoppen onder de begroeting"), icon: "mdi:flash-outline" },
  { id: "meldingen", label: t("Bewegen & deurbel"), sub: t("bewegingsbalk, camera-popup"), icon: "mdi:motion-sensor" },
  { id: "agenda", label: t("Agenda & afval"), sub: t("kalenders en ophaaldagen"), icon: "mdi:calendar-blank-outline" },
  { id: "energie", label: t("Energie"), sub: t("vermogen, verbruik, gas"), icon: "mdi:lightning-bolt-outline" },
  { id: "templates", label: t("Templatekaarten"), sub: t("eigen kaarten met Jinja"), icon: "mdi:code-braces" },
  { id: "meer", label: t("Meer-menu"), sub: t("eigen links"), icon: "mdi:dots-horizontal-circle-outline" },
  { id: "modi", label: t("Modi"), sub: t("gast, vakantie, …"), icon: "mdi:account-switch-outline" },
  { id: "kaarten", label: t("Kaartinstellingen"), sub: t("per kaart gewijzigd"), icon: "mdi:card-bulleted-settings-outline" },
];

export function renderSettings(p) {
  const hass = p.hass, d = p.draft, tab = TABS.some(x => x.id === p.stab) ? p.stab : "algemeen";
  const set = (k, v) => { p.draft = { ...d, [k]: v }; };
  const setHome = (k, v) => set("home", { ...(d.home || {}), [k]: v });
  const setEnergy = (k, v) => setHome("energy", { ...(d.home?.energy || {}), [k]: v });
  const setBell = (k, v) => setHome("doorbell", { ...(d.home?.doorbell || {}), [k]: v });

  // rooms: ordered list of selected areas + the rest
  const areas = Object.values(hass.areas || {}).map(a => ({ id: a.area_id, name: a.name, slug: slug(a.name) }));
  const selected = Array.isArray(d.rooms) ? d.rooms.map(k => areas.find(a => a.id === k || a.slug === k || a.name === k)).filter(Boolean) : p.rooms.map(r => areas.find(a => a.id === r.id)).filter(Boolean);
  const rest = areas.filter(a => !selected.some(s => s.id === a.id)).sort((a, b) => a.name.localeCompare(b.name, locale()));
  const setRooms = list => set("rooms", list.map(a => a.id));
  const move = (i, dir) => { const l = [...selected]; const j = i + dir; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setRooms(l); };

  const waste = d.home?.waste || [], setWaste = (i, k, v) => setHome("waste", waste.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const modes = d.modes || [], setMode = (i, k, v) => set("modes", modes.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const more = d.more || [], setMore = (i, k, v) => set("more", more.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const quick = d.home?.quick || [], setQuick = (i, k, v) => setHome("quick", quick.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const scenes = sortByName(Object.values(hass.states).filter(s => domain(s.entity_id) === "scene")), chosen = d.home?.scenes || null;
  const calendars = sortByName(Object.values(hass.states).filter(s => domain(s.entity_id) === "calendar"));
  const motion = p.rooms.flatMap(r => r.ents.motion.map(e => ({ ...e.state, entity_id: e.id, room: r })));

  const strip = o => JSON.stringify(o, (k, v) => v === undefined ? undefined : v);
  const dirty = strip(d) !== strip(p.config);
  const sec = (title, meta, body) => html`<section class="pcard"><h2>${title}${meta ? html`<small>${meta}</small>` : nothing}</h2>${body}</section>`;
  const pageName = key => key === "home" ? t("Startpagina") : (p.rooms.find(r => r.id === key)?.name || key);
  const cardSummary = c => [c.name && t("naam: {n}", { n: c.name }), c.icon && t("icoon: {n}", { n: c.icon }), c.tap === "popup" && t("tikken opent details"), c.hidden && t("verborgen"), c.noColor && t("kleur uit"), c.noArt && t("albumhoes uit"), c.noMode && t("modusknoppen uit"), c.noPreset && t("thuis/weg uit"), c.live && t("live beeld"), c.noAppliance && t("apparaatfuncties uit"), c.threshold != null && t("drempel {n} W", { n: c.threshold })].filter(Boolean).join(" · ");

  const content = {
    algemeen: html`
      ${sec(t("Instellingenbestand"), t("de instellingen staan per gebruiker in Home Assistant; een bestand maakt ze overdraagbaar"), html`
        <div class="f"><span>${t("Exporteren")}<small>${t("download alle instellingen als JSON")}</small></span><button @click=${() => p.exportSettings()}>${t("Download")}</button></div>
        <div class="f"><span>${t("Importeren")}<small>${t("een export of een oude config.json; wordt samengevoegd met wat er al staat")}</small></span><input type="file" accept="application/json,.json" @change=${e => { if (e.target.files[0]) p.importSettings(e.target.files[0]); e.target.value = ""; }}></div>`)}
      ${sec(t("Weergave"), "", html`
        ${field(t("Taal"), html`<select @change=${e => set("language", e.target.value || undefined)}><option value="" ?selected=${!d.language}>${t("automatisch (taal van Home Assistant)")}</option>${Object.entries(LANGUAGES).map(([k, l]) => html`<option value=${k} ?selected=${d.language === k}>${l}</option>`)}</select>`, t("direct zichtbaar na opslaan"))}
        ${field(t("Titel"), text(d.title, v => set("title", v), t("Thuis") + "."), t("linksboven in de navigatie"))}
        ${field(t("Navigatie"), html`<select @change=${e => set("navMode", e.target.value || undefined)}><option value="" ?selected=${d.navMode !== "floors"}>${t("per kamer")}</option><option value="floors" ?selected=${d.navMode === "floors"}>${t("per verdieping, kamers in een uitklapmenu")}</option></select>`, Object.keys(p.hass.floors || {}).length ? t("verdiepingen komen uit Home Assistant (Instellingen › Ruimtes)") : t("nog geen verdiepingen in Home Assistant: maak ze aan bij Instellingen › Ruimtes"))}
        ${field(t("Balk op telefoon"), pills([{ v: "", l: t("onderaan") }, { v: "top", l: t("bovenaan") }], d.phoneNav, "", v => set("phoneNav", v)), t("onderaan: thuis, kamers, twee sneltoetsen en meer; bovenaan: menu- en zoekknop in de bovenbalk zoals in 3.0"))}
        ${d.phoneNav !== "top" ? [0, 1].map(i => field(t("Sneltoets {n}", { n: i + 1 }), html`<select @change=${e => { const cur = d.bottomTabs || ["sensoren", "energie"]; const next = [...cur]; next[i] = e.target.value; set("bottomTabs", next); }}><option value="" ?selected=${(d.bottomTabs || ["sensoren", "energie"])[i] === ""}>${t("geen")}</option>${Object.entries(PAGES).map(([k, v]) => html`<option value=${k} ?selected=${(d.bottomTabs || ["sensoren", "energie"])[i] === k}>${t(v.label)}</option>`)}</select>`, i === 0 ? t("pagina's in de balk onderaan, naast de kamers") : "")) : nothing}
        ${d.navMode === "floors" ? field(t("Menu op telefoon"), html`<select @change=${e => set("navExpand", e.target.value ? true : undefined)}><option value="" ?selected=${!d.navExpand}>${t("verdieping uitklappen met tikken")}</option><option value="1" ?selected=${!!d.navExpand}>${t("alle verdiepingen uitgeklapt")}</option></select>`, t("hoe de kamers in het menu op telefoon en tablet staan")) : nothing}
        ${field(t("Kamerfoto"), text(d.roomImage, v => set("roomImage", v), "/local/images/rooms/{slug}.jpg"), t("{slug} wordt de ruimtenaam · per kamer aanpasbaar bij Pagina's", { slug: "{slug}" }))}
        ${field(t("Foto startpagina"), text(d.homeImage, v => set("homeImage", v), "/local/images/rooms/home.jpg"))}
        ${field(t("Media-achtergrond"), text(d.mediaIdleImage, v => set("mediaIdleImage", v), "/local/images/music/idle-media.gif"), t("op mediakaarten als er niets speelt; leeg = geen"))}
        ${field(t("Animaties"), check(!d.noMotion, v => set("noMotion", v ? undefined : true)), t("overgangen en kleine bewegingen; uit = alles direct, handig op een trage wandtablet"))}`)}
      ${sec(t("Gedrag"), "", html`
        ${field(t("Batterij-grens"), number(d.home?.lowBattery ?? 20, v => setHome("lowBattery", v)), t("onder dit percentage in Aandacht"))}
        ${field(t("Controleren op updates"), check(!d.noUpdateCheck, v => set("noUpdateCheck", v ? undefined : true)), t("melding op de startpagina als er een nieuwe HaCasa Nova is (alleen voor beheerders)"))}
        ${field(t("Lichtscènes"), check(!d.noPresets, v => set("noPresets", v ? undefined : true)), t("kaart in elke kamer met lampen: sla lampstanden op en roep ze terug"))}
        <div class="f"><span>${t("Slaapstand na")}<small>${t("minuten zonder aanraking; 0 = uit")}</small></span><div class="row" style="grid-template-columns:1fr max-content;margin:0">${number(d.idleMinutes ?? 0, v => set("idleMinutes", v))}<button @click=${() => p.showIdle()}>${t("Nu tonen")}</button></div></div>
        <div class="f"><span>${t("Installatiehulp")}<small>${t("opnieuw doorlopen; wijzigt alleen wat je invult")}</small></span><button @click=${() => p.openPopup({ type: "wizard", step: 0 })}>${t("Opnieuw starten")}</button></div>
        ${p.hashMode ? nothing : html`<div class="f"><span>${t("Startpagina van HA")}<small>${t("Home Assistant opent dan met dit panel (per gebruiker)")}</small></span><button class=${p.isDefault ? "on" : ""} @click=${() => p.setDefault(!p.isDefault)}>${p.isDefault ? t("HaCasa Nova is de startpagina") : t("Maak HaCasa Nova de startpagina")}</button></div>`}`)}`,

    paginas: sec(t("Pagina's"), t("per pagina: titel, foto, kaarten (tonen, verbergen, volgorde) en de meldingenregel"), html`
      <ul class="rooms">${["home", ...p.rooms.map(r => r.id)].map(key => { const pc = d.pages?.[key] || {}; const n = (pc.hidden || []).length, o = (pc.order || []).length, tk = Object.values(pc.ticker || {}).filter(v => v === false).length;
        return html`<li class="on"><span>${pageName(key)}<small>${[pc.title && t("titel: {t}", { t: pc.title }), pc.image && t("eigen foto"), n && t("{n} verborgen", { n }), o && t("eigen volgorde"), tk && t("{n} meldingen uit", { n: tk }), (pc.lines || []).length && t("{n} eigen regels", { n: pc.lines.length })].filter(Boolean).join(" · ") || t("standaard")}</small></span>
          <button @click=${() => p.openPopup({ type: "page", key })}>${t("Instellen")}</button>${Object.keys(pc).length ? html`<button title=${t("Herstel")} @click=${() => { const pages = { ...d.pages }; delete pages[key]; set("pages", pages); }}>×</button>` : nothing}</li>`; })}</ul>
      <div class="hint">${t("Sneller: houd de titel van een pagina ingedrukt.")}</div>`),

    kamers: sec(t("Kamers"), t("{n} zichtbaar · volgorde = navigatie", { n: selected.length }) + " · " + t("Meer staat altijd achteraan"), html`
      ${!Array.isArray(d.rooms) ? field(t("Maximum"), number(d.maxRooms, v => set("maxRooms", v || undefined)), t("alleen in de automatische stand: leeg = alle ruimtes met apparaten (3.0 stopte stil bij 9)")) : nothing}
      <ul class="rooms" data-drag>
      ${selected.map((a, i) => html`<li class=${p.roomDrag === a.id ? "on drag" : "on"} data-k=${a.id}><span class="grip" title=${t("Sleep om te verplaatsen")} @pointerdown=${ev => dragRows(ev, a.id, order => { p.roomDrag = a.id; setRooms(order.map(id => selected.find(x => x.id === id))); }, order => { p.roomDrag = null; setRooms(order.map(id => selected.find(x => x.id === id))); })}><ha-icon icon="mdi:drag"></ha-icon></span><span>${a.name}</span>
        <button title=${t("Omhoog")} @click=${() => move(i, -1)}>↑</button><button title=${t("Omlaag")} @click=${() => move(i, 1)}>↓</button>
        <button title=${t("Verbergen")} @click=${() => setRooms(selected.filter(x => x.id !== a.id))}>×</button></li>`)}
      ${rest.map(a => html`<li><span>${a.name}</span><button title=${t("Tonen")} @click=${() => setRooms([...selected, a])}>+</button></li>`)}
    </ul>`),

    startpagina: html`
      ${sec(t("Kop"), "", html`
        ${field(t("Temperatuur"), select(hass, "sensor", d.home?.temperature, v => setHome("temperature", v), { empty: t("gemiddelde van de kamers"), filter: s => s.attributes.device_class === "temperature" }))}
        ${field(t("Luchtvochtigheid"), select(hass, "sensor", d.home?.humidity, v => setHome("humidity", v), { empty: t("gemiddelde van de kamers"), filter: s => s.attributes.device_class === "humidity" }))}`)}
      ${sec(t("Kaarten"), t("welke entiteiten de vaste kaarten gebruiken"), html`
        ${field(t("Thermostaat"), select(hass, "climate", d.home?.climate, v => setHome("climate", v)))}
        ${field(t("Alarm"), select(hass, "alarm_control_panel", d.home?.alarm, v => setHome("alarm", v)))}
        ${field(t("Weer"), select(hass, "weather", d.home?.weather, v => setHome("weather", v)))}
        ${field(t("Weer op telefoon"), check(d.home?.wxMobile === true, v => setHome("wxMobile", v ? true : undefined)), t("het weerblok naast de begroeting ook op kleine schermen"))}
        ${field(t("Scènes"), html`<div class="chips">${scenes.map(s => { const on = chosen ? chosen.includes(s.entity_id) : scenes.indexOf(s) < 4;
          return html`<button class=${on ? "on" : ""} @click=${() => { const cur = chosen || scenes.slice(0, 4).map(x => x.entity_id); setHome("scenes", on ? cur.filter(x => x !== s.entity_id) : [...cur, s.entity_id]); }}>${s.attributes.friendly_name}</button>`; })}${!scenes.length ? html`<small>${t("Geen scènes gevonden")}</small>` : nothing}</div>`, t("op de scèneskaart"))}`)}`,

    standaard: sec(t("Kaartstandaarden"), t("tik op een kaart om de standaard voor die soort in te stellen; per kaart aan te passen via ⋯ in de popup"), defaultsGrid(p, d)),
    acties: sec(t("Snelle acties"), t("knoppen onder de begroeting op de startpagina"), html`
      ${quick.map((q, i) => html`<div class="row quick">${text(q.label, v => setQuick(i, "label", v), "label")}${iconInput(p, q.icon, v => setQuick(i, "icon", v), "mdi:flash-outline")}
        <select @change=${e => setQuick(i, "type", e.target.value)}>${Object.entries(QUICK_TYPES).map(([k, l]) => html`<option value=${k} ?selected=${(q.type || "scene") === k}>${t(l)}</option>`)}</select>
        ${q.type === "lights_off" || q.type === "media_off" ? html`<span></span>` : selectDoms(hass, q.type === "script" ? ["script"] : q.type === "entity" ? QUICK_DOMAINS : ["scene"], q.entity, v => setQuick(i, "entity", v))}
        <label title=${t("Eerst bevestigen")}>${check(q.confirm, v => setQuick(i, "confirm", v || undefined))}${t("bevestig")}</label><button @click=${() => setHome("quick", quick.filter((_, j) => j !== i))}>×</button></div>`)}
      ${!quick.length ? html`<div class="hint">${t("Nog geen acties. Bijvoorbeeld: Welterusten (script), Alles uit (alle lampen uit, met bevestiging) of Film (scène).")}</div>` : nothing}
      <button class="add" @click=${() => setHome("quick", [...quick, { label: "", type: "scene" }])}>${t("+ snelle actie")}</button>`),

    meldingen: html`
      ${sec(t("Bewegingsbalk"), t("welke sensoren de balk onderaan tonen"), html`${motion.length ? chips(motion, d.home?.bannerSensors || null, motion.map(m => m.entity_id), l => setHome("bannerSensors", l), s => html`<small style="opacity:.6"> · ${s.room.name}</small>`) : html`<small>${t("Geen bewegingssensoren in de kamers")}</small>`}`)}
      ${sec(t("Deurbel / camera-popup"), t("opent de camera als een sensor afgaat"), html`
        ${field(t("Camera"), select(hass, "camera", d.home?.doorbell?.camera, v => setBell("camera", v), { empty: t("uit") }))}
        ${field(t("Seconden"), number(d.home?.doorbell?.seconds ?? 30, v => setBell("seconds", v)), t("daarna sluit de popup vanzelf"))}
        <div class="chips">${triggerCandidates(hass).map(s => { const cur = d.home?.doorbell?.triggers || [], on = cur.includes(s.entity_id); return html`<button class=${on ? "on" : ""} title=${s.entity_id} @click=${() => setBell("triggers", on ? cur.filter(x => x !== s.entity_id) : [...cur, s.entity_id])}>${s.attributes.friendly_name || s.entity_id}</button>`; })}${!triggerCandidates(hass).length ? html`<small>${t("Geen geschikte sensoren gevonden")}</small>` : nothing}</div>`)}`,

    agenda: html`
      ${sec(t("Agenda"), t("kaart + regel in de meldingen"), html`${calendars.length ? chips(calendars, d.home?.calendars || null, calendars.map(c => c.entity_id), l => setHome("calendars", l)) : html`<small>${t("Geen agenda's gevonden")}</small>`}`)}
      ${sec(t("Afval"), t("Afvalbeheer-sensoren"), html`
        ${waste.map((w, i) => html`<div class="row">${select(hass, "sensor", w.entity, v => setWaste(i, "entity", v), { empty: t("kies sensor") })}${text(w.label, v => setWaste(i, "label", v), "label")}<button @click=${() => setHome("waste", waste.filter((_, j) => j !== i))}>×</button></div>`)}
        <button class="add" @click=${() => setHome("waste", [...waste, { entity: null, label: "" }])}>${t("+ afvalstroom")}</button>`)}`,

    energie: sec(t("Energie"), t("kaart verschijnt zodra vermogen is gekozen"), html`
      ${field(t("Vermogen nu"), select(hass, "sensor", d.home?.energy?.power, v => setEnergy("power", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "W" }))}
      ${field(t("Verbruik vandaag"), select(hass, "sensor", d.home?.energy?.today, v => setEnergy("today", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "kWh" }))}
      ${field(t("Teruggeleverd"), select(hass, "sensor", d.home?.energy?.returned, v => setEnergy("returned", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "kWh" }))}
      ${field(t("Prijs per kWh"), html`<input type="number" step="0.01" min="0" .value=${d.home?.energy?.price ?? ""} placeholder="0.30" @change=${e => setEnergy("price", e.target.value === "" ? undefined : +e.target.value)}>`, t("voor de kostenregel op stekkerkaarten"))}
      ${field(t("Gas"), select(hass, "sensor", d.home?.energy?.gas, v => setEnergy("gas", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "m³" }))}
      ${solarSettings(p, d, setEnergy, field)}`),

    templates: sec(t("Templatekaarten"), t("sjablonen met Jinja; plaatsen doe je per pagina via Bewerken → Kaart toevoegen") + (hass.user?.is_admin ? "" : " · " + t("templates rendert Home Assistant alleen voor beheerders")), html`<ul class="rooms">
      ${(d.templates || []).map((tp, i) => html`<li class="on"><span>${tp.name || t("Naamloos")}<small>${tp.ask?.length ? t("{n} invulvelden", { n: tp.ask.length }) + " · " : ""}${tp.state || t("geen template")}</small></span><button title=${t("Bewerken")} @click=${() => p.openPopup({ type: "tpl", index: i })}>✎</button><button title=${t("Verwijderen")} @click=${() => set("templates", (d.templates || []).filter((_, j) => j !== i))}>×</button></li>`)}
      ${!(d.templates || []).length ? html`<li><span>${t("Nog geen templatekaarten")}</span></li>` : nothing}
    </ul><button class="add" @click=${() => { const list = [...(d.templates || []), { id: "tpl" + Date.now().toString(36), name: "", icon: "mdi:code-braces", state: "", room: "none" }]; set("templates", list); p.openPopup({ type: "tpl", index: list.length - 1 }); }}>${t("+ templatekaart")}</button>`),

    meer: sec(t("Meer-menu"), t("eigen links naast de ingebouwde pagina's"), html`
      ${more.map((m, i) => html`<div class="row r4">${text(m.label, v => setMore(i, "label", v), "label")}${iconInput(p, m.icon, v => setMore(i, "icon", v), "mdi:link")}${text(m.path, v => setMore(i, "path", v), "/pad")}<button @click=${() => set("more", more.filter((_, j) => j !== i))}>×</button></div>`)}
      <button class="add" @click=${() => set("more", [...more, { label: "", icon: "mdi:link", path: "/" }])}>${t("+ pagina")}</button>`),

    modi: sec(t("Modi"), t("een schakelaar of input_boolean per modus; automatiseringen in Home Assistant doen de rest"), html`
      ${modes.map((m, i) => html`<div class="row r4">${text(m.label, v => setMode(i, "label", v), t("label"))}${iconInput(p, m.icon, v => setMode(i, "icon", v), "mdi:account-switch-outline")}${selectDoms(hass, ["input_boolean", "switch"], m.entity, v => setMode(i, "entity", v))}<button @click=${() => set("modes", modes.filter((_, j) => j !== i))}>×</button></div>`)}
      ${!modes.length ? html`<div class="hint">${t("Nog geen modi. Bijvoorbeeld Gast of Vakantie, gekoppeld aan een input_boolean.")}</div>` : nothing}
      <button class="add" @click=${() => set("modes", [...modes, { label: "", icon: "mdi:account-switch-outline" }])}>${t("+ modus")}</button>
      <div class="hint">${t("De modi staan in het Meer-menu; een actieve modus verschijnt in de meldingenregel van de startpagina.")}</div>`),
    kaarten: sec(t("Kaartinstellingen"), t("aanpassen via ⋯ in de popup van een kaart"), html`<ul class="rooms">
      ${Object.entries(d.cards || {}).map(([id, c]) => html`<li class="on"><span>${c.name || hass.states[id]?.attributes.friendly_name || id}<small>${cardSummary(c) || t("geen wijzigingen")}</small></span><button title=${t("Herstel")} @click=${() => { const cards = { ...d.cards }; delete cards[id]; set("cards", cards); }}>×</button></li>`)}
      ${!Object.keys(d.cards || {}).length ? html`<li><span>${t("Nog geen kaarten gewijzigd")}</span></li>` : nothing}
    </ul>`),
  };

  return html`<section class="settings page">
    <header class="phead"><div><h1>${t("HaCasa instellingen")}</h1><div class="psub">${t("Opgeslagen per gebruiker in Home Assistant. Leeg laten = automatisch of de waarde uit config.json.")} · HaCasa Nova ${VERSION}${(su => su ? html` · <a class="upd" @click=${su.open}>${t("{v} beschikbaar", { v: String(su.to).replace(/^v/, "") })}</a>` : nothing)(selfUpdate(p))}</div></div>
      <div class="actions">
        ${p.saved ? html`<span class="ok"><ha-icon icon="mdi:check-circle-outline"></ha-icon>${t("Opgeslagen")}</span>` : dirty ? html`<span class="dirty"><ha-icon icon="mdi:circle-medium"></ha-icon>${t("Niet opgeslagen")}</span>` : nothing}
        <button class=${dirty ? "primary pulse" : "primary"} @click=${() => p.saveSettings()}>${t("Opslaan")}</button>
        <button @click=${() => { if (confirm(t("Alle HaCasa-instellingen van deze gebruiker wissen en terug naar de standaard?"))) p.resetSettings(); }}>${t("Alles herstellen")}</button>
        <button @click=${() => { if (!dirty || confirm(t("Wijzigingen niet opgeslagen. Toch sluiten?"))) p.go(null); }}>${t("Sluiten")}</button>
      </div></header>
    <div class="sbody">
      <nav class="tabs">${TABS.map(tb => html`<button class=${tb.id === tab ? "on" : ""} @click=${() => { p.stab = tb.id; }}><ha-icon icon=${tb.icon}></ha-icon><span>${t(tb.label)}<small>${t(tb.sub)}</small></span></button>`)}</nav>
      <div class="scontent">${content[tab]}</div>
    </div>
  </section>`;
}

export const settingsStyles = `
  .settings .sbody{display:grid;grid-template-columns:250px minmax(0,760px);gap:16px;align-items:start}
  .settings .tabs{display:flex;flex-direction:column;gap:4px;position:sticky;top:0}
  .settings .tabs button{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;border-radius:var(--r-sm);background:var(--card);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:14px;font-weight:700;line-height:1.25}
  .settings .tabs button.on{background:var(--card-on)}
  .settings .tabs button ha-icon{--mdc-icon-size:20px;flex:none}
  .settings .tabs button span{display:block;min-width:0}
  .settings .tabs button small{display:block;font-size:12px;font-weight:500;opacity:.75;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .settings .scontent{display:flex;flex-direction:column;gap:12px}
  .settings .pcard{background:var(--card);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:var(--r);padding:22px 24px}
  .settings .pcard h2{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.95;margin-bottom:14px;display:flex;justify-content:space-between;align-items:baseline;gap:10px}
  .settings .pcard h2 small{font-size:12px;letter-spacing:0;text-transform:none;font-weight:500;opacity:.8;text-align:right;line-height:1.4}
  .settings .dsec{margin-top:14px}
  .settings .dgrid{display:grid;grid-template-columns:repeat(auto-fill,calc(var(--card-w) * .62 + 22px));gap:12px}
  .settings .dtile{display:flex;flex-direction:column;gap:10px;padding:10px;border-radius:var(--r-sm);background:rgba(255,255,255,.06);border:1px solid var(--line);text-align:left;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}
  .settings .dtile:hover{background:rgba(255,255,255,.12);border-color:var(--line-on)}
  .settings .dpv{position:relative;width:calc(var(--card-w) * .62);height:calc(var(--card-h) * .62);max-width:100%;overflow:hidden;border-radius:6px;pointer-events:none}
  .settings .dsc{position:absolute;top:0;left:0;width:var(--card-w);height:var(--card-h);transform:scale(.62);transform-origin:0 0}
  .settings .dsc .card{animation:none;width:var(--card-w);height:var(--card-h);margin:0}
  .settings .dnone{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed var(--line);border-radius:6px;color:var(--fg-3);text-align:center}
  .settings .dnone ha-icon{--mdc-icon-size:26px}
  .settings .dnone small{font-size:11px;font-weight:500}
  .settings .dl{padding:0 2px 2px}
  .settings .dl b{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700}
  .settings .dl b i{font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:rgba(255,255,255,.9);color:#1d1d1f;font-size:10px;display:inline-grid;place-items:center}
  .settings .dl small{display:block;font-size:11px;font-weight:500;color:var(--fg-3);margin-top:3px;line-height:1.35}
  .settings .dsec h4 .link{margin-left:auto;border:0;background:none;color:var(--fg-3);font:inherit;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .settings .dsec h4{display:flex;align-items:center;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);margin:0 0 8px 2px}
  .settings .chk3{display:flex;gap:14px;font-weight:600}
  .settings .chk3 label{display:inline-flex;align-items:center;gap:6px}
  .settings select[multiple]{height:auto;padding:6px}
  .settings .f{display:grid;grid-template-columns:190px 1fr;gap:12px;align-items:center;padding:10px 14px;margin-bottom:6px;background:rgba(255,255,255,.09);border-radius:var(--r-sm);font-size:14px;font-weight:600;line-height:1.3}
  .settings .f small{display:block;font-size:12px;font-weight:500;opacity:.8;margin-top:2px}
  .settings .hint{font-size:13px;opacity:.85;margin-top:12px;line-height:1.5}
  .settings input,.settings select{width:100%;border:0;border-radius:var(--r-sm);padding:10px 12px;background:rgba(0,0,0,.35);color:#fff;font:inherit;font-size:14px;outline:none;min-width:0}
  .settings select{color-scheme:dark}
  .settings select option{color:#fff;background:#2b2b2b}
  .settings .rooms{list-style:none}
  .settings .rooms li{display:flex;align-items:center;gap:6px;padding:10px 14px;margin-bottom:6px;background:rgba(255,255,255,.09);border-radius:var(--r-sm);font-size:14px;font-weight:600;opacity:.8;line-height:1.3}
  .settings .rooms li.on{opacity:1;background:rgba(255,255,255,.2)}
  .settings .rooms li span{flex:1;min-width:0}
  .settings .rooms li span.grip{flex:none;display:grid;place-items:center;width:26px;margin:-6px 2px -6px -6px;padding:6px 0;cursor:grab;touch-action:none;opacity:.6}
  .settings .rooms li span.grip ha-icon{--mdc-icon-size:20px}
  .settings .rooms li.drag{background:rgba(255,255,255,.3);box-shadow:0 8px 24px rgba(0,0,0,.25)}
  .settings .rooms li small{display:block;font-size:12px;font-weight:500;opacity:.8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .settings button{border:0;border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:13px;font-weight:700;padding:9px 13px;cursor:pointer}
  .settings button.on,.settings button.primary{background:rgba(255,255,255,.4)}
  .settings .chips{display:flex;flex-wrap:wrap;gap:6px}
  .settings .row{display:grid;grid-template-columns:1fr 1fr max-content;gap:6px;margin-bottom:4px}
  .settings .row.r4{grid-template-columns:1fr 1fr 1fr max-content}
  .settings .add{margin-top:4px}
  .settings .actions{display:flex;gap:8px;align-items:center;flex:none;flex-wrap:wrap;justify-content:flex-end}
  .settings .actions button{height:44px;padding:0 18px;letter-spacing:1px;text-transform:uppercase;font-size:12px;background:rgba(255,255,255,.12);backdrop-filter:blur(16px);border-radius:999px}
  .settings .actions button.primary{background:rgba(255,255,255,.4)}
  .settings .ok{font-size:13px;opacity:.8}
  .settings .dirty{display:inline-flex;align-items:center;gap:2px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#f2b63a}
  .settings .dirty ha-icon{--mdc-icon-size:20px}
  .settings .actions button.pulse{animation:pulse 1.6s ease-in-out infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.35)}50%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
  @media (max-width:900px){
    .settings.page{padding-top:calc(96px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))}   /* no eyebrow line above the title here, so less room under the top bar */
    .settings .phead{margin-bottom:20px}
    .settings .sbody{grid-template-columns:1fr}
    .settings .tabs{flex-direction:row;overflow-x:auto;position:static;scrollbar-width:none;padding-bottom:2px}
    .settings .tabs button{flex:none;padding:8px 12px}
    .settings .tabs button small{display:none}
    .settings .f{grid-template-columns:1fr}
    .settings .dgrid{grid-template-columns:1fr 1fr;gap:8px}
    .settings .dtile{padding:8px;gap:8px}
    .settings .dpv{width:calc(var(--card-w) * .55);height:calc(var(--card-h) * .55)}
    .settings .dsc{transform:scale(.55)}
    .settings .row,.settings .row.r4{grid-template-columns:1fr}
    .settings .actions{justify-content:flex-start}
    .settings .actions button{height:38px;padding:0 14px;font-size:11px}
  }
`;
