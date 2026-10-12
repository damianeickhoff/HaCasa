// Edit mode (administrators): the strip of the home view or a room shows every card of that page with a hide/restore
// (or remove, for cards added by hand) button, a grip to drag it into place and an add tile at the end. Hidden cards come
// back dimmed with a banner so they can be restored. Also the "Kaart toevoegen" popup: an entity, one of the panel's own
// cards (or a new group / graph, configured right there), or a template card from the library with its fields filled in.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { domain, num, unavailable } from "./util.js";
import { cardFor, homeCards, substEntity } from "./cards.js";
import { GRAPH_HOURS } from "./graph.js";

export const canEdit = p => !!p.hass?.user?.is_admin;
/** entity domains that have a card */
export const ADD_DOMAINS = ["light", "switch", "input_boolean", "fan", "lock", "cover", "climate", "media_player", "vacuum", "humidifier", "camera", "binary_sensor", "sensor"];
const DOM_ICON = { light: "mdi:lightbulb-outline", switch: "mdi:power-socket-eu", input_boolean: "mdi:toggle-switch-outline", media_player: "mdi:speaker", cover: "mdi:window-shutter", climate: "mdi:thermostat", fan: "mdi:fan", lock: "mdi:lock-outline", vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", camera: "mdi:cctv", binary_sensor: "mdi:radiobox-marked", sensor: "mdi:gauge" };
const FILTERS = [["", "Alles", null], ["light", "Lampen", ["light"]], ["switch", "Schakelaars", ["switch", "input_boolean"]], ["sensor", "Sensoren", ["sensor", "binary_sensor"]], ["media", "Media", ["media_player"]], ["other", "Overig", ["fan", "lock", "cover", "climate", "vacuum", "humidifier", "camera"]]];
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
  let dragging = false, moved = false, timer = null;
  const start = () => { dragging = true; p.editDrag = key; try { shield.setPointerCapture(ev.pointerId); } catch {} };
  if (touch) timer = setTimeout(() => { if (!moved) start(); }, 300);
  const move = e => {
    if (!dragging) { if (Math.abs(e.clientX - x0) > 6 || Math.abs(e.clientY - y0) > 6) { moved = true; clearTimeout(timer); if (!touch) start(); } if (!dragging) return; }
    e.preventDefault();
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
export function addPopup(p, pop) {
  const key = pop.key, isHome = key === "home", room = isHome ? null : p.rooms.find(r => r.id === key), where = isHome ? t("Startpagina") : (room?.name || key);
  const upd = patch => p.openPopup({ ...pop, ...patch });
  const step = pop.step || 1, kind = pop.kind || "entity";
  const stepLabels = [t("Soort"), t("Kiezen"), kind === "entity" ? t("Plaatsen") : t("Invullen")];
  const steps = html`<div class="steps">${stepLabels.map((l, i) => html`${i ? html`<i class="ln"></i>` : nothing}<span class=${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}><i>${i + 1 < step ? "✓" : i + 1}</i>${l}</span>`)}</div>`;
  const head = (big, sub) => html`<h2>${where}<span class="hb"><button data-close title=${t("Sluiten")}><ha-icon icon="mdi:close"></ha-icon></button></span></h2><div class="big">${big}</div><div class="sub">${sub}</div>${steps}`;
  /** the row of buttons stays in view (the lists above it can be long) */
  const foot = (...btns) => html`<div class="foot"><div class=${`modes n${btns.length}`}>${btns}</div></div>`;
  const backBtn = to => html`<button @click=${() => upd({ step: to, gd: undefined })}>${t("Terug")}</button>`, cancelBtn = html`<button data-close>${t("Annuleren")}</button>`;
  const f = (lbl, ctrl, sub) => html`<label class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</label>`;
  const have = new Set(p.pageCards(key).map(c => c.key));

  if (step === 1) return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Wat wil je hier tonen?"))}
    <div class="pages">
      <a class="wide" @click=${() => upd({ step: 2, kind: "entity" })}><ha-icon icon="mdi:power-plug-outline"></ha-icon><div>${t("Apparaat of entiteit")}<small>${t("lamp, schakelaar, sensor, mediaspeler… alles uit Home Assistant")}</small></div></a>
      <a @click=${() => upd({ step: 2, kind: "builtin" })}><ha-icon icon="mdi:view-grid-outline"></ha-icon><div>${t("HaCasa-kaart")}<small>${t("weer, agenda, scènes, een groep of grafiek …")}</small></div></a>
      <a @click=${() => upd({ step: 2, kind: "tpl" })}><ha-icon icon="mdi:code-braces"></ha-icon><div>${t("Template")}<small>${t("uit je eigen bibliotheek")}</small></div></a>
    </div>${foot(cancelBtn)}</div>`;

  if (kind === "builtin" && step === 2) {
    // the panel's own cards of every page that are not on this one yet; room-bound ones (scenes, presets) carry the room
    const items = [];
    if (!isHome) for (const c of homeCards(p, p.home)) if (isBuiltin(c.key) && !have.has(c.key)) items.push({ key: c.key, label: c.label, where: t("Startpagina") });
    for (const r of p.rooms) if (r.id !== key) for (const c of p.roomCards(r)) if (isBuiltin(c.key)) { const k = ["scenes", "presets"].includes(c.key) ? `room:${r.id}:${c.key}` : c.key; if (!have.has(k) && !items.some(i => i.key === k)) items.push({ key: k, label: c.label, where: r.name }); }
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Een kaart van het paneel zelf"))}
      <ul class="ents">
        <li class="tap" @click=${() => upd({ step: 3, kind: "group", gd: { style: "tiles", members: [] } })}><ha-icon icon="mdi:shape-outline"></ha-icon><div>${t("Nieuwe groep")}<small>${t("meerdere lampen, schakelaars of stekkers als één kaart")}</small></div><ha-icon icon="mdi:chevron-right"></ha-icon></li>
        <li class="tap" @click=${() => upd({ step: 3, kind: "graph", gd: { hours: 24 } })}><ha-icon icon="mdi:chart-line"></ha-icon><div>${t("Nieuwe grafiek")}<small>${t("verloop van een sensor")}</small></div><ha-icon icon="mdi:chevron-right"></ha-icon></li>
      </ul>
      ${items.length ? html`<div class="glbl">${t("Van andere pagina's")}<b>${items.length}</b></div><ul class="ents">${items.map(x => html`<li class="tap" @click=${() => addKey(p, key, x.key)}><ha-icon icon="mdi:view-grid-outline"></ha-icon><div>${x.label}<small>${x.where}</small></div><ha-icon icon="mdi:plus"></ha-icon></li>`)}</ul>` : nothing}
      ${foot(backBtn(1), cancelBtn)}</div>`;
  }
  if (kind === "group") {
    const gd = pop.gd || { style: "tiles", members: [] }, g = patch => upd({ gd: { ...gd, ...patch } }), cands = groupCandidates(p), ok = !!(gd.name && gd.members.length);
    return html`<div class="popup addp">${head(t("Nieuwe groep"), t("Eén kaart voor meerdere lampen, schakelaars of stekkers"))}
      <div class="form">
        ${f(t("Naam"), html`<input type="text" .value=${gd.name || ""} placeholder=${t("bv. Sfeerlampen")} @change=${e => g({ name: e.target.value || undefined })}>`)}
        ${f(t("Icoon"), html`<input type="text" .value=${gd.icon || ""} placeholder="mdi:shape-outline" @change=${e => g({ icon: e.target.value || undefined })}>`)}
        ${f(t("Stijl"), html`<div class="seg">${[["tiles", t("tegels (tikken schakelt)")], ["list", t("lijst")]].map(([v, l]) => html`<button class=${(gd.style || "tiles") === v ? "on" : ""} @click=${() => g({ style: v })}>${l}</button>`)}</div>`)}
        ${f(t("Onderdelen"), html`<div class="chips">${cands.map(c => html`<button class=${gd.members.includes(c.id) ? "on" : ""} @click=${() => g({ members: gd.members.includes(c.id) ? gd.members.filter(x => x !== c.id) : [...gd.members, c.id] })}>${c.name}</button>`)}</div>`, t("{n} gekozen", { n: gd.members.length }))}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addMade(p, key, "groups", gd)}>${t("Toevoegen en instellen")}</button>`, backBtn(2), cancelBtn)}</div>`;
  }
  if (kind === "graph") {
    const gd = pop.gd || { hours: 24 }, g = patch => upd({ gd: { ...gd, ...patch } }), ok = !!gd.entity;
    return html`<div class="popup addp">${head(t("Nieuwe grafiek"), t("De lijn van een sensor over de laatste uren of dagen"))}
      <div class="form">
        ${f(t("Sensor"), html`<input type="text" list="hcn-numeric" .value=${gd.entity || ""} placeholder="sensor.x" @change=${e => g({ entity: e.target.value || undefined })}><datalist id="hcn-numeric">${graphCandidates(p).map(x => html`<option value=${x}></option>`)}</datalist>`, t("elke numerieke sensor: temperatuur, vochtigheid, vermogen, …"))}
        ${f(t("Naam"), html`<input type="text" .value=${gd.name || ""} placeholder=${gd.entity ? (p.hass.states[gd.entity]?.attributes.friendly_name || "") : ""} @change=${e => g({ name: e.target.value || undefined })}>`, t("leeg = naam van de sensor"))}
        ${f(t("Periode"), html`<div class="seg">${GRAPH_HOURS.map(n => html`<button class=${(+gd.hours || 24) === n ? "on" : ""} @click=${() => g({ hours: n })}>${hoursLabel(n)}</button>`)}</div>`)}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addMade(p, key, "graphs", gd)}>${t("Toevoegen en instellen")}</button>`, backBtn(2), cancelBtn)}</div>`;
  }
  if (kind === "tpl" && step === 2) {
    const list = p.config.templates || [];
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Een templatekaart uit je bibliotheek"))}
      <ul class="ents">${list.map(tc => html`<li class="tap" @click=${() => upd({ step: 3, pick: tc.id, fields: {} })}><ha-icon icon=${tc.icon || "mdi:code-braces"}></ha-icon><div>${tc.name || t("Naamloos")}<small>${tc.state || ""}</small></div><ha-icon icon="mdi:chevron-right"></ha-icon></li>`)}</ul>
      ${!list.length ? html`<div class="sub" style="margin-top:16px">${t("Nog geen templatekaarten. Maak er een onder Instellingen → Templatekaarten.")}</div>` : nothing}
      ${foot(backBtn(1), cancelBtn)}</div>`;
  }
  if (kind === "tpl" && step === 3) {
    const tc = (p.config.templates || []).find(x => x.id === pop.pick); if (!tc) return nothing;
    const fields = pop.fields || {}, setF = (k, v) => upd({ fields: { ...fields, [k]: v } }), ask = TPL_ASK.filter(([k]) => (tc.ask || []).includes(k));
    const ok = ask.every(([k]) => fields[k]);
    return html`<div class="popup addp">${head(tc.name || t("Template"), t("Vul de velden van deze kaart in"))}
      <div class="form">
        ${f(t("Entiteit"), html`<input type="text" list="hcn-entities" .value=${fields.entity || ""} placeholder="sensor.x" @change=${e => setF("entity", e.target.value || undefined)}><datalist id="hcn-entities">${Object.keys(p.hass.states).map(x => html`<option value=${x}></option>`)}</datalist>`, t("voor $entity in de templates, details (vasthouden) en schakelen"))}
        ${ask.map(([k, l]) => f(t(l), html`<input type="text" .value=${fields[k] || ""} placeholder=${tc[k] || ""} @change=${e => setF(k, e.target.value || undefined)}>`, t("door de template gevraagd")))}
      </div>
      ${foot(html`<button class="on" ?disabled=${!ok} @click=${() => ok && addKey(p, key, `tpl:${tc.id}:${Date.now().toString(36)}`, { cardCfg: { fields } })}>${t("Toevoegen en instellen")}</button>`, backBtn(2), cancelBtn)}</div>`;
  }
  if (step === 2) {
    const q = (pop.q || "").toLowerCase().trim(), flt = FILTERS.find(x => x[0] === (pop.flt || ""))?.[2];
    const roomName = a => p.rooms.find(r => r.id === a)?.name || p.hass.areas?.[a]?.name || a;
    const all = Object.values(p.hass.states).filter(s => ADD_DOMAINS.includes(domain(s.entity_id)) && !p.hass.entities?.[s.entity_id]?.hidden && (!flt || flt.includes(domain(s.entity_id))))
      .map(s => { const a = areaOf(p, s.entity_id); return { s, id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, area: a, areaName: a ? roomName(a) : "", here: have.has(s.entity_id) || a === key }; })
      .filter(x => !q || x.name.toLowerCase().includes(q) || x.id.includes(q) || x.areaName.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, locale()));
    const groups = [[t("Zonder ruimte"), all.filter(x => !x.area)], [t("In een andere ruimte"), all.filter(x => x.area && x.area !== key)], [isHome ? t("Al op de startpagina") : t("Al in deze ruimte"), all.filter(x => x.area === key || (x.here && !x.area))]].filter(g => g[1].length);
    const row = x => html`<li class=${classMap({ tap: !x.here, dim: x.here })} @click=${() => { if (!x.here) upd({ step: 3, pick: x.id, other: x.area && x.area !== key && p.rooms.some(r => r.id === x.area) ? x.area : null, place: "hacasa" }); }}>
      <ha-icon icon=${x.s.attributes.icon || DOM_ICON[domain(x.id)]}></ha-icon><div>${x.name}${x.area && x.area !== key ? html`<span class="tag">${x.areaName}</span>` : nothing}<small>${x.id}</small></div><span class="val">${stateText(x.s)}</span></li>`;
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Kies een apparaat of entiteit"))}
      <div class="sinput"><ha-icon icon="mdi:magnify"></ha-icon><input type="search" .value=${pop.q || ""} placeholder=${t("Zoek op naam, id of ruimte")} autofocus @input=${e => upd({ q: e.target.value })}></div>
      <div class="chips">${FILTERS.map(([v, l]) => html`<button class=${(pop.flt || "") === v ? "on" : ""} @click=${() => upd({ flt: v })}>${t(l)}</button>`)}</div>
      ${groups.map(([lbl, list]) => html`<div class="glbl">${lbl}<b>${list.length}</b></div><ul class="ents">${list.slice(0, 30).map(row)}</ul>`)}
      ${!all.length ? html`<div class="sub" style="margin-top:16px">${t("Niets gevonden")}</div>` : nothing}
      ${foot(backBtn(1), cancelBtn)}</div>`;
  }
  const id = pop.pick, s = p.hass.states[id], e = { id, state: s, reg: p.hass.entities?.[id] || {} }, otherName = pop.other ? (p.rooms.find(r => r.id === pop.other)?.name || pop.other) : null;
  const preview = cardFor(p, e);
  return html`<div class="popup addp">${head(s?.attributes.friendly_name || id, t("Waar hoort de kaart?"))}
    <ul class="place">
      <li class=${pop.place === "hacasa" ? "on tap" : "tap"} @click=${() => upd({ place: "hacasa" })}><ha-icon icon=${pop.place === "hacasa" ? "mdi:radiobox-marked" : "mdi:radiobox-blank"}></ha-icon><div>${t("Alleen in HaCasa")}<small>${isHome ? t("De kaart komt op de startpagina; in Home Assistant verandert niets.") : otherName ? t("De kaart komt in {room}. In Home Assistant blijft de entiteit in {other}.", { room: where, other: otherName }) : t("De kaart komt in {room}; in Home Assistant verandert niets.", { room: where })}</small></div><span class="st">${t("aanbevolen")}</span></li>
      ${!isHome && canEdit(p) ? html`<li class=${pop.place === "ha" ? "on tap" : "tap"} @click=${() => upd({ place: "ha" })}><ha-icon icon=${pop.place === "ha" ? "mdi:radiobox-marked" : "mdi:radiobox-blank"}></ha-icon><div>${t("Ruimte in Home Assistant wijzigen")}<small>${t("Verplaatst de entiteit naar {room} — ook in andere dashboards, automatiseringen en spraakassistenten.", { room: where })}</small></div><span class="st adm">${t("beheerder")}</span></li>` : nothing}
    </ul>
    ${pop.other && pop.place !== "ha" ? html`<ul style="margin-top:4px"><li class="tap chk" @click=${() => upd({ hideOther: !pop.hideOther })}><ha-icon icon=${pop.hideOther ? "mdi:checkbox-marked-outline" : "mdi:checkbox-blank-outline"}></ha-icon><div>${t("Verbergen in {room}", { room: otherName })}<small>${t("anders staat hij in beide")}</small></div><span></span></li></ul>` : nothing}
    ${preview ? html`<div class="pvrow"><div class="pvc">${preview}</div><p class="cap">${t("Na het toevoegen open je meteen de kaartinstellingen voor naam, icoon en onderkant.")}</p></div>` : nothing}
    ${foot(html`<button class="on" @click=${() => addKey(p, key, id, { haArea: pop.place === "ha" && !isHome, hideIn: pop.hideOther && pop.place !== "ha" ? pop.other : null })}>${t("Toevoegen en instellen")}</button>`, backBtn(2), cancelBtn)}</div>`;
}
