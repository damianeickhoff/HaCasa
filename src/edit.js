// Edit mode (administrators): the strip of the home view or a room shows every card of that page with a hide/restore
// (or remove, for cards added by hand) button, a grip to drag it into place and an add tile at the end. Hidden cards come
// back dimmed with a banner so they can be restored. Also the "Kaart toevoegen" popup: an entity, one of the panel's own
// cards (or a new group / graph, configured right there), or a template card from the library with its fields filled in.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { domain, num, unavailable } from "./util.js";
import { cardFor, homeCards, findCard } from "./cards.js";
import { GRAPH_HOURS } from "./graph.js";

export const canEdit = p => !!p.hass?.user?.is_admin;
/** entity domains that have a card */
export const ADD_DOMAINS = ["light", "switch", "input_boolean", "fan", "lock", "cover", "climate", "media_player", "vacuum", "humidifier", "camera", "binary_sensor", "sensor"];
const DOM_ICON = { light: "mdi:lightbulb-outline", switch: "mdi:power-socket-eu", input_boolean: "mdi:toggle-switch-outline", media_player: "mdi:speaker", cover: "mdi:window-shutter", climate: "mdi:thermostat", fan: "mdi:fan", lock: "mdi:lock-outline", vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", camera: "mdi:cctv", binary_sensor: "mdi:radiobox-marked", sensor: "mdi:gauge" };
/** keys of cards the panel makes itself (not an entity, device or template instance) */
export const isBuiltin = key => !key.includes(".") && !key.startsWith("device:") && !key.startsWith("tpl:");
/** template fields a template can ask for when it is placed */
export const TPL_ASK = [["state", "Tekst"], ["label", "Label"], ["visible", "Zichtbaar (voorwaarde)"]];
/** what a group can contain: lights, switches, fans and the switch of an appliance, across all rooms */
export const groupCandidates = p => p.rooms.flatMap(r => [...r.ents.lights, ...r.ents.switches, ...r.ents.fans, ...r.ents.appliances.filter(a => a.switch).map(a => a.switch)].map(e => ({ id: e.id, name: `${r.name} · ${e.state?.attributes?.friendly_name || e.id}` })));
export const graphCandidates = p => Object.values(p.hass.states).filter(s => domain(s.entity_id) === "sensor" && num(s.state) != null).map(s => s.entity_id).sort();
export const hoursLabel = n => n % 24 ? t("{n} uur", { n }) : n === 24 ? t("24 uur") : t("{n} dagen", { n: n / 24 });

/* ---------- the strip in edit mode ---------- */
/** pointer on a card: a short press opens its settings, a drag (mouse: move; touch: hold 300 ms first) reorders */
function editDown(p, key, ev) {
  if (ev.button) return;
  ev.stopPropagation();                                                  // not the strip's own drag-to-scroll
  const shield = ev.currentTarget, touch = ev.pointerType !== "mouse", x0 = ev.clientX, y0 = ev.clientY;
  let dragging = false, moved = false, timer = null, ghost = null, ox = 0, oy = 0;
  // the card itself turns into a dashed slot; a copy of it follows the pointer (slightly lifted and tilted)
  const start = () => {
    dragging = true; p.editDrag = key; try { shield.setPointerCapture(ev.pointerId); } catch {}
    const card = shield.parentElement.querySelector(".card"), r = card.getBoundingClientRect();
    ox = x0 - r.left; oy = y0 - r.top;
    ghost = card.cloneNode(true); ghost.classList.add("dragghost"); ghost.style.width = r.width + "px"; ghost.style.height = r.height + "px";
    ghost.style.transform = `translate(${r.left}px,${r.top}px)`; shield.getRootNode().appendChild(ghost);
    requestAnimationFrame(() => ghost && ghost.classList.add("up"));
  };
  if (touch) timer = setTimeout(() => { if (!moved) start(); }, 300);
  const move = e => {
    if (!dragging) { if (Math.abs(e.clientX - x0) > 6 || Math.abs(e.clientY - y0) > 6) { moved = true; clearTimeout(timer); if (!touch) start(); } if (!dragging) return; }
    e.preventDefault();
    if (ghost) ghost.style.transform = `translate(${e.clientX - ox}px,${e.clientY - oy}px)`;
    const strip = shield.closest(".strip"), cards = [...strip.querySelectorAll(".ecard")], keys = cards.map(c => c.dataset.key);
    // drop slot: the card nearest to the pointer (a row on desktop, a grid on phones), after it when the pointer is past its centre
    let near = -1, best = Infinity, rects = cards.map(c => c.getBoundingClientRect());
    rects.forEach((r, i) => { const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (d < best) { best = d; near = i; } });
    if (near < 0) return;
    let idx = near + (e.clientX > rects[near].left + rects[near].width / 2 ? 1 : 0);
    const cur = keys.indexOf(key); if (cur >= 0 && cur < idx) idx -= 1;   // the dragged card itself sits before the slot
    const rest = keys.filter(k => k !== key), next = [...rest.slice(0, idx), key, ...rest.slice(idx)];
    if (next.join("\n") !== keys.join("\n")) p.editOrder = next;
    const sr = strip.getBoundingClientRect();
    if (e.clientX > sr.right - 70) strip.scrollLeft += 14; else if (e.clientX < sr.left + 70) strip.scrollLeft -= 14;
    if (e.clientY > sr.bottom - 70) strip.scrollTop += 14; else if (e.clientY < sr.top + 70) strip.scrollTop -= 14;
  };
  const up = () => { clearTimeout(timer); removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    if (ghost) { ghost.remove(); ghost = null; }
    if (dragging) { p.editDrag = null; p.saveOrder(); } else if (!moved) p.openCardForm(key); };
  addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}

export function editStrip(p, key) {
  const pc = p.pageCfg(key), hid = new Set(pc.hidden || []), added = new Set(pc.add || []), all = p.orderCards(p.pageCards(key), p.editOrder || pc.order);
  // groups and graphs made for this page count as hand-added too: the bin takes them away for good
  const own = c => added.has(c.key) || (c.key.startsWith("group:") && (p.config.groups || []).some(g => "group:" + g.id === c.key && (g.room || "home") === key)) || (c.key.startsWith("graph:") && (p.config.graphs || []).some(g => "graph:" + g.id === c.key && (g.room || "home") === key));
  return html`${all.map(c => { const userHid = hid.has(c.key), cond = !userHid && p.condHiddenCard(c.key);
    return html`<div class=${classMap({ ecard: true, hid: userHid || cond, lift: p.editDrag === c.key })} data-key=${c.key}>
      ${c.tpl}
      <div class="shield" @pointerdown=${ev => editDown(p, c.key, ev)}></div>
      ${userHid ? html`<button class="x eye" title=${t("Tonen")} @click=${() => p.setHidden(key, c.key, false)}><ha-icon icon="mdi:eye-outline"></ha-icon></button>`
        : cond ? html`<button class="x" title=${t("Kaart instellen")} @click=${() => p.openCardForm(c.key)}><ha-icon icon="mdi:tune"></ha-icon></button>`
        : own(c) ? html`<button class="x" title=${t("Verwijderen")} @click=${() => p.removeAdded(key, c.key)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>`
        : html`<button class="x" title=${t("Verbergen")} @click=${() => p.setHidden(key, c.key, true)}><ha-icon icon="mdi:close"></ha-icon></button>`}
      ${userHid || cond ? html`<div class="hban"><ha-icon icon=${cond ? "mdi:code-braces" : "mdi:eye-off-outline"}></ha-icon>${cond ? t("Verborgen door voorwaarde") : t("Verborgen")}</div>` : html`<div class="grip"><ha-icon icon="mdi:drag-vertical"></ha-icon></div>`}
    </div>`; })}
    <div class="card add" @click=${() => p.openPopup({ type: "add", key })}><span class="plus"><ha-icon icon="mdi:plus"></ha-icon></span><b>${t("Kaart toevoegen")}</b></div>`;
}

/** the bar at the bottom while editing (desktop; phones put it in the bottom nav) */
export const editBar = (p, key) => html`<div class="banner ebar show">
  <ha-icon icon="mdi:pencil-outline"></ha-icon><span>${key === "home" ? t("Startpagina bewerken") : t("Kamer bewerken")}</span><small>${t("sleep om te ordenen · × verbergt · tik opent de kaartinstellingen")}</small>
  <button class="ghost" @click=${() => p.openPopup({ type: "page", key })}>${t("Pagina instellen")}</button><button class="done" @click=${() => p.stopEdit()}>${t("Klaar")}</button>
</div>`;

/* ---------- "Kaart toevoegen" popup ---------- */
/** where an entity lives now: its area (directly or through its device), or null */
const areaOf = (p, id) => { const e = p.hass.entities?.[id]; return e?.area_id || (e?.device_id && p.hass.devices?.[e.device_id]?.area_id) || null; };
const stateText = s => unavailable(s) ? t("Onbereikbaar") : s.state === "on" ? t("Aan") : s.state === "off" ? t("Uit") : num(s.state) != null ? `${s.state}${s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : ""}` : s.state.length <= 14 ? s.state : "";
/** add `key` to the page, then open its card settings */
async function addKey(p, pageKey, key, { cardCfg = null, hideIn = null, haArea = false } = {}) {
  if (haArea) await p.hass.callWS({ type: "config/entity_registry/update", entity_id: key, area_id: pageKey });
  else { const pc = p.pageCfg(pageKey); await p.savePage(pageKey, { ...pc, add: [...new Set([...(pc.add || []), key])] }); }
  if (hideIn) { const pc = p.pageCfg(hideIn); await p.savePage(hideIn, { ...pc, hidden: [...new Set([...(pc.hidden || []), key])] }); }
  if (cardCfg) await p.saveCardSettings(key, cardCfg);
  setTimeout(() => p.openCardForm(key), haArea ? 800 : 50);              // a registry change arrives through hass first
}
/** a new group or graph for this page: straight into the config, then its card settings */
async function addMade(p, pageKey, kind, item) {
  const id = (kind === "groups" ? "grp" : "gr") + Date.now().toString(36);
  await p.saveUser({ [kind]: [...(p.userConfig?.[kind] || p.config[kind] || []), { ...item, id, room: pageKey }] });
  p.popup = null; setTimeout(() => p.openCardForm((kind === "groups" ? "group:" : "graph:") + id), 50);
}
/* ---------- card types, like Home Assistant's card picker: pick a type, then configure it ---------- */
const DOOR_DC = ["door", "garage_door", "opening", "garage"], MOTION_DC = ["motion", "occupancy", "presence"];
const dcOf = s => s.attributes?.device_class;
/** group "dev": an entity of these domains (and device classes); "panel": one of the panel's own cards (key); "own": group / graph / template */
export const CARD_TYPES = [
  { id: "light", group: "dev", label: "Lamp", sub: "aan/uit, helderheid, kleur", icon: "mdi:lightbulb-outline", match: s => domain(s.entity_id) === "light" },
  { id: "switch", group: "dev", label: "Schakelaar of stekker", sub: "ook met vermogensmeter", icon: "mdi:power-socket-eu", match: s => ["switch", "input_boolean"].includes(domain(s.entity_id)) },
  { id: "door", group: "dev", label: "Deur of raam", sub: "open / dicht, sinds wanneer", icon: "mdi:door", match: s => domain(s.entity_id) === "binary_sensor" && [...DOOR_DC, "window"].includes(dcOf(s)) },
  { id: "motion", group: "dev", label: "Beweging", sub: "laatste beweging", icon: "mdi:motion-sensor", match: s => domain(s.entity_id) === "binary_sensor" && MOTION_DC.includes(dcOf(s)) },
  { id: "binary", group: "dev", label: "Sensor aan/uit", sub: "rook, lek, contact …", icon: "mdi:radiobox-marked", match: s => domain(s.entity_id) === "binary_sensor" && ![...DOOR_DC, "window", ...MOTION_DC].includes(dcOf(s)) },
  { id: "value", group: "dev", label: "Waarde", sub: "temperatuur, vermogen, tekst", icon: "mdi:gauge", match: s => domain(s.entity_id) === "sensor" },
  { id: "media", group: "dev", label: "Media", sub: "speler met hoes en bediening", icon: "mdi:speaker", match: s => domain(s.entity_id) === "media_player" },
  { id: "climate", group: "dev", label: "Thermostaat", sub: "temperatuur en modus", icon: "mdi:thermostat", match: s => domain(s.entity_id) === "climate" },
  { id: "cover", group: "dev", label: "Rolluik of gordijn", sub: "open, dicht, stand", icon: "mdi:window-shutter", match: s => domain(s.entity_id) === "cover" },
  { id: "fan", group: "dev", label: "Ventilator", sub: "aan/uit en snelheid", icon: "mdi:fan", match: s => domain(s.entity_id) === "fan" },
  { id: "lock", group: "dev", label: "Slot", sub: "open / op slot", icon: "mdi:lock-outline", match: s => domain(s.entity_id) === "lock" },
  { id: "camera", group: "dev", label: "Camera", sub: "beeld op de kaart", icon: "mdi:cctv", match: s => domain(s.entity_id) === "camera" },
  { id: "other", group: "dev", label: "Overig", sub: "stofzuiger, luchtbevochtiger", icon: "mdi:robot-vacuum", match: s => ["vacuum", "humidifier"].includes(domain(s.entity_id)) },
  { id: "weather", group: "panel", label: "Weer", sub: "nu en de komende dagen", icon: "mdi:weather-partly-cloudy", key: "weather" },
  { id: "agenda", group: "panel", label: "Agenda", sub: "volgende afspraken", icon: "mdi:calendar-blank-outline", key: "agenda" },
  { id: "waste", group: "panel", label: "Afval", sub: "volgende ophaaldag", icon: "mdi:trash-can-outline", key: "waste" },
  { id: "energy", group: "panel", label: "Energie", sub: "vermogen en verbruik vandaag", icon: "mdi:flash-outline", key: "energy" },
  { id: "attention", group: "panel", label: "Aandacht", sub: "onbereikbaar, batterij, updates", icon: "mdi:alert-circle-outline", key: "attention" },
  { id: "homeclimate", group: "panel", label: "Thermostaat (thuis)", sub: "de hoofdthermostaat", icon: "mdi:home-thermometer-outline", key: "climate" },
  { id: "scenes", group: "panel", label: "Scènes", sub: "scèneknoppen van een ruimte", icon: "mdi:palette-outline", roomKey: "scenes" },
  { id: "presets", group: "panel", label: "Lichtscènes", sub: "opgeslagen lichtstanden van een ruimte", icon: "mdi:lightbulb-group-outline", roomKey: "presets" },
  { id: "group", group: "panel", label: "Groep", sub: "meerdere lampen of stekkers als één kaart", icon: "mdi:shape-outline" },
  { id: "graph", group: "panel", label: "Grafiek", sub: "verloop van een sensor", icon: "mdi:chart-line" },
  { id: "tpl", group: "own", label: "Template", sub: "uit je eigen bibliotheek", icon: "mdi:code-braces" },
];
const GROUPS = [["dev", "Apparaten"], ["panel", "Kaarten van HaCasa"], ["own", "Eigen kaarten"]];   // shipped with the panel vs. made by the user

export function addPopup(p, pop) {
  const key = pop.key, isHome = key === "home", room = isHome ? null : p.rooms.find(r => r.id === key), where = isHome ? t("Startpagina") : (room?.name || key);
  const upd = patch => p.openPopup({ ...pop, ...patch });
  const type = CARD_TYPES.find(x => x.id === pop.kind) || null, step = pop.step || 1;
  const stepLabels = [t("Soort"), t("Kiezen"), type?.id === "tpl" || type?.group === "own" ? t("Invullen") : t("Plaatsen")];
  const steps = html`<div class="steps">${stepLabels.map((l, i) => html`${i ? html`<i class="ln"></i>` : nothing}<span class=${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}><i>${i + 1 < step ? "✓" : i + 1}</i>${l}</span>`)}</div>`;
  const head = (big, sub) => html`<h2>${where}<span class="hb"><button data-close title=${t("Sluiten")}><ha-icon icon="mdi:close"></ha-icon></button></span></h2><div class="big">${big}</div><div class="sub">${sub}</div>${steps}`;
  /** the row of buttons stays in view (the lists above it can be long) */
  const foot = (...btns) => html`<div class="foot"><div class=${`modes n${btns.length}`}>${btns}</div></div>`;
  const backBtn = to => html`<button @click=${() => upd({ step: to, gd: undefined })}>${t("Terug")}</button>`;
  const f = (lbl, ctrl, sub) => html`<label class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</label>`;
  const have = new Set(p.pageCards(key).map(c => c.key));

  /** a panel card by key: unhide it when it is hidden here, add it when it exists elsewhere, else say what is missing */
  const addPanel = async k => {
    const pc = p.pageCfg(key);
    if ((pc.hidden || []).includes(k)) { await p.setHidden(key, k, false); p.popup = null; return; }
    if (have.has(k)) { p.showToast(t("Deze kaart staat al op deze pagina")); return; }
    const exists = isHome ? homeCards(p, p.home).some(c => c.key === k) : !!findCard(p, k, key);
    if (!exists) { p.showToast(t("Deze kaart is nog niet ingesteld: zie Instellingen → Startpagina")); return; }
    await addKey(p, key, k);
  };

  if (step === 1) return html`<div class="popup addp nofoot">${head(t("Kaart toevoegen"), t("Welk soort kaart?"))}
    ${GROUPS.map(([g, lbl]) => html`<div class="glbl">${t(lbl)}</div><div class="pages types">${CARD_TYPES.filter(x => x.group === g).map(x => html`
      <a @click=${() => x.key ? addPanel(x.key) : x.id === "group" ? upd({ step: 2, kind: x.id, gd: { style: "tiles", members: [] } }) : x.id === "graph" ? upd({ step: 2, kind: x.id, gd: { hours: 24 } }) : upd({ step: 2, kind: x.id, q: "" })}><ha-icon icon=${x.icon}></ha-icon><div>${t(x.label)}<small>${t(x.sub)}</small></div></a>`)}</div>`)}
    </div>`;

  if (type?.roomKey && step === 2) {
    // scenes / light scenes belong to a room: pick whose
    const opts = [...(type.roomKey === "scenes" ? [{ k: "scenes", label: t("Startpagina"), ok: homeCards(p, p.home).some(c => c.key === "scenes") }] : []), ...p.rooms.map(r => ({ k: r.id === key ? type.roomKey : `room:${r.id}:${type.roomKey}`, label: r.name, ok: p.roomCards(r).some(c => c.key === type.roomKey) }))]
      .map(o => ({ ...o, here: have.has(o.k) }));
    return html`<div class="popup addp">${head(t(type.label), t("Van welke ruimte?"))}
      <ul class="ents">${opts.map(o => html`<li class=${classMap({ tap: o.ok && !o.here, dim: !o.ok || o.here })} @click=${() => { if (o.ok && !o.here) addPanel(o.k); }}><ha-icon icon=${type.icon}></ha-icon><div>${o.label}<small>${o.here ? t("staat al op deze pagina") : o.ok ? "" : t("niets beschikbaar")}</small></div><ha-icon icon="mdi:plus"></ha-icon></li>`)}</ul>
      ${foot(backBtn(1))}</div>`;
  }
  if (type?.id === "group") {
    const gd = pop.gd || { style: "tiles", members: [] }, g = patch => upd({ gd: { ...gd, ...patch } }), cands = groupCandidates(p), ok = !!(gd.name && gd.members.length);
    return html`<div class="popup addp">${head(t("Nieuwe groep"), t("Eén kaart voor meerdere lampen, schakelaars of stekkers"))}
      <div class="form">
        ${f(t("Naam"), html`<input type="text" .value=${gd.name || ""} placeholder=${t("bv. Sfeerlampen")} @change=${e => g({ name: e.target.value || undefined })}>`)}
        ${f(t("Icoon"), html`<input type="text" .value=${gd.icon || ""} placeholder="mdi:shape-outline" @change=${e => g({ icon: e.target.value || undefined })}>`)}
        ${f(t("Stijl"), html`<div class="seg">${[["tiles", t("tegels (tikken schakelt)")], ["list", t("lijst")]].map(([v, l]) => html`<button class=${(gd.style || "tiles") === v ? "on" : ""} @click=${() => g({ style: v })}>${l}</button>`)}</div>`)}
        ${f(t("Onderdelen"), html`<div class="chips">${cands.map(c => html`<button class=${gd.members.includes(c.id) ? "on" : ""} @click=${() => g({ members: gd.members.includes(c.id) ? gd.members.filter(x => x !== c.id) : [...gd.members, c.id] })}>${c.name}</button>`)}</div>`, t("{n} gekozen", { n: gd.members.length }))}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addMade(p, key, "groups", gd)}>${t("Toevoegen en instellen")}</button>`, backBtn(1))}</div>`;
  }
  if (type?.id === "graph") {
    const gd = pop.gd || { hours: 24 }, g = patch => upd({ gd: { ...gd, ...patch } }), ok = !!gd.entity;
    return html`<div class="popup addp">${head(t("Nieuwe grafiek"), t("De lijn van een sensor over de laatste uren of dagen"))}
      <div class="form">
        ${f(t("Sensor"), html`<input type="text" list="hcn-numeric" .value=${gd.entity || ""} placeholder="sensor.x" @change=${e => g({ entity: e.target.value || undefined })}><datalist id="hcn-numeric">${graphCandidates(p).map(x => html`<option value=${x}></option>`)}</datalist>`, t("elke numerieke sensor: temperatuur, vochtigheid, vermogen, …"))}
        ${f(t("Naam"), html`<input type="text" .value=${gd.name || ""} placeholder=${gd.entity ? (p.hass.states[gd.entity]?.attributes.friendly_name || "") : ""} @change=${e => g({ name: e.target.value || undefined })}>`, t("leeg = naam van de sensor"))}
        ${f(t("Periode"), html`<div class="seg">${GRAPH_HOURS.map(n => html`<button class=${(+gd.hours || 24) === n ? "on" : ""} @click=${() => g({ hours: n })}>${hoursLabel(n)}</button>`)}</div>`)}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addMade(p, key, "graphs", gd)}>${t("Toevoegen en instellen")}</button>`, backBtn(1))}</div>`;
  }
  if (type?.id === "tpl" && step === 2) {
    const list = p.config.templates || [];
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Een templatekaart uit je bibliotheek"))}
      <ul class="ents">${list.map(tc => html`<li class="tap" @click=${() => upd({ step: 3, pick: tc.id, fields: {} })}><ha-icon icon=${tc.icon || "mdi:code-braces"}></ha-icon><div>${tc.name || t("Naamloos")}<small>${tc.state || ""}</small></div><ha-icon icon="mdi:chevron-right"></ha-icon></li>`)}</ul>
      ${!list.length ? html`<div class="sub" style="margin-top:16px">${t("Nog geen templatekaarten. Maak er een onder Instellingen → Templatekaarten.")}</div>` : nothing}
      ${foot(backBtn(1))}</div>`;
  }
  if (type?.id === "tpl" && step === 3) {
    const tc = (p.config.templates || []).find(x => x.id === pop.pick); if (!tc) return nothing;
    const fields = pop.fields || {}, setF = (k, v) => upd({ fields: { ...fields, [k]: v } }), ask = TPL_ASK.filter(([k]) => (tc.ask || []).includes(k));
    const ok = ask.every(([k]) => fields[k]);
    return html`<div class="popup addp">${head(tc.name || t("Template"), t("Vul de velden van deze kaart in"))}
      <div class="form">
        ${f(t("Entiteit"), html`<input type="text" list="hcn-entities" .value=${fields.entity || ""} placeholder="sensor.x" @change=${e => setF("entity", e.target.value || undefined)}><datalist id="hcn-entities">${Object.keys(p.hass.states).map(x => html`<option value=${x}></option>`)}</datalist>`, t("voor $entity in de templates, details (vasthouden) en schakelen"))}
        ${ask.map(([k, l]) => f(t(l), html`<input type="text" .value=${fields[k] || ""} placeholder=${tc[k] || ""} @change=${e => setF(k, e.target.value || undefined)}>`, t("door de template gevraagd")))}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addKey(p, key, `tpl:${tc.id}:${Date.now().toString(36)}`, { cardCfg: { fields } })}>${t("Toevoegen en instellen")}</button>`, backBtn(2))}</div>`;
  }
  if (type?.match && step === 2) {
    const q = (pop.q || "").toLowerCase().trim();
    const roomName = a => p.rooms.find(r => r.id === a)?.name || p.hass.areas?.[a]?.name || a;
    const all = Object.values(p.hass.states).filter(s => type.match(s) && !p.hass.entities?.[s.entity_id]?.hidden)
      .map(s => { const a = areaOf(p, s.entity_id); return { s, id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, area: a, areaName: a ? roomName(a) : "", here: have.has(s.entity_id) || a === key }; })
      .filter(x => !q || x.name.toLowerCase().includes(q) || x.id.includes(q) || x.areaName.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, locale()));
    const groups = [[t("Zonder ruimte"), all.filter(x => !x.area)], [t("In een andere ruimte"), all.filter(x => x.area && x.area !== key)], [isHome ? t("Al op de startpagina") : t("Al in deze ruimte"), all.filter(x => x.area === key || (x.here && !x.area))]].filter(g => g[1].length);
    const row = x => html`<li class=${classMap({ tap: !x.here, dim: x.here })} @click=${() => { if (!x.here) upd({ step: 3, pick: x.id, other: x.area && x.area !== key && p.rooms.some(r => r.id === x.area) ? x.area : null, place: "hacasa" }); }}>
      <ha-icon icon=${x.s.attributes.icon || type.icon}></ha-icon><div>${x.name}${x.area && x.area !== key ? html`<span class="tag">${x.areaName}</span>` : nothing}<small>${x.id}</small></div><span class="val">${stateText(x.s)}</span></li>`;
    return html`<div class="popup addp">${head(t(type.label), t("Kies een apparaat of entiteit"))}
      <div class="sinput"><ha-icon icon="mdi:magnify"></ha-icon><input type="search" .value=${pop.q || ""} placeholder=${t("Zoek op naam, id of ruimte")} autofocus @input=${e => upd({ q: e.target.value })}></div>
      ${groups.map(([lbl, list]) => html`<div class="glbl">${lbl}<b>${list.length}</b></div><ul class="ents">${list.slice(0, 40).map(row)}</ul>`)}
      ${!all.length ? html`<div class="sub" style="margin-top:16px">${t("Niets gevonden")}</div>` : nothing}
      ${foot(backBtn(1))}</div>`;
  }
  const id = pop.pick, s = p.hass.states[id], e = { id, state: s, reg: p.hass.entities?.[id] || {} }, otherName = pop.other ? (p.rooms.find(r => r.id === pop.other)?.name || pop.other) : null;
  const preview = s ? cardFor(p, e) : null;
  return html`<div class="popup addp">${head(s?.attributes.friendly_name || id, t("Waar hoort de kaart?"))}
    <ul class="place">
      <li class=${pop.place === "hacasa" ? "on tap" : "tap"} @click=${() => upd({ place: "hacasa" })}><ha-icon icon=${pop.place === "hacasa" ? "mdi:radiobox-marked" : "mdi:radiobox-blank"}></ha-icon><div>${t("Alleen in HaCasa")}<small>${isHome ? t("De kaart komt op de startpagina; in Home Assistant verandert niets.") : otherName ? t("De kaart komt in {room}. In Home Assistant blijft de entiteit in {other}.", { room: where, other: otherName }) : t("De kaart komt in {room}; in Home Assistant verandert niets.", { room: where })}</small></div><span class="st">${t("aanbevolen")}</span></li>
      ${!isHome && canEdit(p) ? html`<li class=${pop.place === "ha" ? "on tap" : "tap"} @click=${() => upd({ place: "ha" })}><ha-icon icon=${pop.place === "ha" ? "mdi:radiobox-marked" : "mdi:radiobox-blank"}></ha-icon><div>${t("Ruimte in Home Assistant wijzigen")}<small>${t("Verplaatst de entiteit naar {room} — ook in andere dashboards, automatiseringen en spraakassistenten.", { room: where })}</small></div><span class="st adm">${t("beheerder")}</span></li>` : nothing}
    </ul>
    ${pop.other && pop.place !== "ha" ? html`<ul style="margin-top:4px"><li class="tap chk" @click=${() => upd({ hideOther: !pop.hideOther })}><ha-icon icon=${pop.hideOther ? "mdi:checkbox-marked-outline" : "mdi:checkbox-blank-outline"}></ha-icon><div>${t("Verbergen in {room}", { room: otherName })}<small>${t("anders staat hij in beide")}</small></div><span></span></li></ul>` : nothing}
    ${preview ? html`<div class="pvrow"><div class="pvc">${preview}</div><p class="cap">${t("Na het toevoegen open je meteen de kaartinstellingen voor naam, icoon en onderkant.")}</p></div>` : nothing}
    ${foot(html`<button class="on" @click=${() => addKey(p, key, id, { haArea: pop.place === "ha" && !isHome, hideIn: pop.hideOther && pop.place !== "ha" ? pop.other : null })}>${t("Toevoegen en instellen")}</button>`, backBtn(2))}</div>`;
}
