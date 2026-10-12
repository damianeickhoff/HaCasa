// Edit mode (administrators): the strip of the home view or a room shows every card of that page with a hide/restore
// (or remove, for cards added by hand) button, a grip to drag it into place and an add tile at the end. Hidden cards come
// back dimmed with a banner so they can be restored. Also the "Kaart toevoegen" popup: an entity, one of the panel's own
// cards, a template card from the library (with its fields filled in), or a new group / graph in the settings.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { domain, num, unavailable } from "./util.js";
import { cardFor, homeCards, templateOf, substInputs } from "./cards.js";

export const canEdit = p => !!p.hass?.user?.is_admin;
/** entity domains that have a card */
export const ADD_DOMAINS = ["light", "switch", "input_boolean", "fan", "lock", "cover", "climate", "media_player", "vacuum", "humidifier", "camera", "binary_sensor", "sensor"];
const DOM_ICON = { light: "mdi:lightbulb-outline", switch: "mdi:power-socket-eu", input_boolean: "mdi:toggle-switch-outline", media_player: "mdi:speaker", cover: "mdi:window-shutter", climate: "mdi:thermostat", fan: "mdi:fan", lock: "mdi:lock-outline", vacuum: "mdi:robot-vacuum", humidifier: "mdi:air-humidifier", camera: "mdi:cctv", binary_sensor: "mdi:radiobox-marked", sensor: "mdi:gauge" };
const FILTERS = [["", "Alles", null], ["light", "Lampen", ["light"]], ["switch", "Schakelaars", ["switch", "input_boolean"]], ["sensor", "Sensoren", ["sensor", "binary_sensor"]], ["media", "Media", ["media_player"]], ["other", "Overig", ["fan", "lock", "cover", "climate", "vacuum", "humidifier", "camera"]]];
/** keys of cards the panel makes itself (not an entity, device or template instance) */
export const isBuiltin = key => !key.includes(".") && !key.startsWith("device:") && !key.startsWith("tpl:");

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
  return html`${all.map(c => { const userHid = hid.has(c.key), cond = !userHid && p.condHiddenCard(c.key), own = added.has(c.key);
    return html`<div class=${classMap({ ecard: true, hid: userHid || cond, lift: p.editDrag === c.key })} data-key=${c.key}>
      ${c.tpl}
      <div class="shield" @pointerdown=${ev => editDown(p, c.key, ev)}></div>
      ${userHid ? html`<button class="x eye" title=${t("Tonen")} @click=${() => p.setHidden(key, c.key, false)}><ha-icon icon="mdi:eye-outline"></ha-icon></button>`
        : cond ? html`<button class="x" title=${t("Kaart instellen")} @click=${() => p.openCardForm(c.key)}><ha-icon icon="mdi:tune"></ha-icon></button>`
        : own ? html`<button class="x" title=${t("Verwijderen")} @click=${() => p.removeAdded(key, c.key)}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>`
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
/** a new group / graph: put a prefilled item in the settings draft and open that tab */
function newInSettings(p, kind, key) {
  const d = p.draft || JSON.parse(JSON.stringify(p.config)), room = key === "home" ? "home" : key, id = kind.slice(0, 1) + Date.now().toString(36);
  const item = kind === "groups" ? { id, room, members: [] } : { id, room, hours: 24 };
  p.draft = { ...d, [kind]: [...(d[kind] || []), item] };
  p.stab = kind === "groups" ? "groepen" : "grafieken";
  p.stopEdit(); p.popup = null; p.goPath("__settings__");
}
/** add `key` to the page, then open its card settings */
async function addKey(p, pageKey, key, { cardCfg = null, hideIn = null, haArea = false } = {}) {
  if (haArea) await p.hass.callWS({ type: "config/entity_registry/update", entity_id: key, area_id: pageKey });
  else { const pc = p.pageCfg(pageKey); await p.savePage(pageKey, { ...pc, add: [...new Set([...(pc.add || []), key])] }); }
  if (hideIn) { const pc = p.pageCfg(hideIn); await p.savePage(hideIn, { ...pc, hidden: [...new Set([...(pc.hidden || []), key])] }); }
  if (cardCfg) await p.saveCardSettings(key, cardCfg);
  setTimeout(() => p.openCardForm(key), haArea ? 800 : 50);              // a registry change arrives through hass first
}
export function addPopup(p, pop) {
  const key = pop.key, isHome = key === "home", room = isHome ? null : p.rooms.find(r => r.id === key), where = isHome ? t("Startpagina") : (room?.name || key);
  const upd = patch => p.openPopup({ ...pop, ...patch });
  const step = pop.step || 1, kind = pop.kind || "entity";
  const steps = html`<div class="steps">${[[1, t("Soort")], [2, t("Kiezen")], [3, kind === "tpl" ? t("Invullen") : t("Plaatsen")]].map(([n, l]) => html`${n > 1 ? html`<i class="ln"></i>` : nothing}<span class=${n === step ? "on" : n < step ? "done" : ""}><i>${n < step ? "✓" : n}</i>${l}</span>`)}</div>`;
  const head = (big, sub) => html`<h2>${where}<span class="hb"><button data-close title=${t("Sluiten")}><ha-icon icon="mdi:close"></ha-icon></button></span></h2><div class="big">${big}</div><div class="sub">${sub}</div>${steps}`;
  const back = (to) => html`<div class="modes n2" style="margin-top:18px"><button @click=${() => upd({ step: to })}>${t("Terug")}</button><button data-close>${t("Annuleren")}</button></div>`;
  if (step === 1) return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Wat wil je hier tonen?"))}
    <div class="pages">
      <a class="wide" @click=${() => upd({ step: 2, kind: "entity" })}><ha-icon icon="mdi:power-plug-outline"></ha-icon><div>${t("Apparaat of entiteit")}<small>${t("lamp, schakelaar, sensor, mediaspeler… alles uit Home Assistant")}</small></div></a>
      <a @click=${() => upd({ step: 2, kind: "builtin" })}><ha-icon icon="mdi:view-grid-outline"></ha-icon><div>${t("HaCasa-kaart")}<small>${t("weer, agenda, scènes, groepen …")}</small></div></a>
      <a @click=${() => upd({ step: 2, kind: "tpl" })}><ha-icon icon="mdi:code-braces"></ha-icon><div>${t("Template")}<small>${t("uit je eigen bibliotheek")}</small></div></a>
      <a @click=${() => newInSettings(p, "groups", key)}><ha-icon icon="mdi:shape-outline"></ha-icon><div>${t("Groep")}<small>${t("meerdere als één kaart")}</small></div></a>
      <a @click=${() => newInSettings(p, "graphs", key)}><ha-icon icon="mdi:chart-line"></ha-icon><div>${t("Grafiek")}<small>${t("verloop van een sensor")}</small></div></a>
    </div></div>`;
  const have = new Set(p.pageCards(key).map(c => c.key));
  if (step === 2 && kind === "builtin") {
    // the panel's own cards of every page that are not on this one yet; room-bound ones (scenes, presets) carry the room
    const items = [];
    if (!isHome) for (const c of homeCards(p, p.home)) if (isBuiltin(c.key) && !have.has(c.key)) items.push({ key: c.key, label: c.label, where: t("Startpagina") });
    for (const r of p.rooms) if (r.id !== key) for (const c of p.roomCards(r)) if (isBuiltin(c.key)) { const k = ["scenes", "presets"].includes(c.key) ? `room:${r.id}:${c.key}` : c.key; if (!have.has(k) && !items.some(i => i.key === k)) items.push({ key: k, label: c.label, where: r.name }); }
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Een kaart van het paneel zelf"))}
      <ul class="ents">${items.map(x => html`<li class="tap" @click=${() => addKey(p, key, x.key)}><ha-icon icon="mdi:view-grid-outline"></ha-icon><div>${x.label}<small>${x.where}</small></div><ha-icon icon="mdi:plus"></ha-icon></li>`)}</ul>
      ${!items.length ? html`<div class="sub" style="margin-top:16px">${t("Alle kaarten staan al op deze pagina.")}</div>` : nothing}${back(1)}</div>`;
  }
  if (step === 2 && kind === "tpl") {
    const list = p.config.templates || [];
    return html`<div class="popup addp">${head(t("Kaart toevoegen"), t("Een templatekaart uit je bibliotheek"))}
      <ul class="ents">${list.map(tc => html`<li class="tap" @click=${() => tc.inputs?.length ? upd({ step: 3, pick: tc.id, inputs: Object.fromEntries(tc.inputs.filter(f => f.default != null).map(f => [f.key, f.default])) }) : addKey(p, key, `tpl:${tc.id}:${Date.now().toString(36)}`)}><ha-icon icon=${tc.icon || "mdi:code-braces"}></ha-icon><div>${tc.name || t("Naamloos")}<small>${tc.inputs?.length ? t("{n} invulvelden", { n: tc.inputs.length }) : (tc.state || "")}</small></div><ha-icon icon="mdi:plus"></ha-icon></li>`)}</ul>
      ${!list.length ? html`<div class="sub" style="margin-top:16px">${t("Nog geen templatekaarten. Maak er een onder Instellingen → Templatekaarten.")}</div>` : nothing}${back(1)}</div>`;
  }
  if (step === 3 && kind === "tpl") {
    const tc = (p.config.templates || []).find(x => x.id === pop.pick); if (!tc) return nothing;
    const inputs = pop.inputs || {}, setIn = (k, v) => upd({ inputs: { ...inputs, [k]: v } });
    return html`<div class="popup addp">${head(tc.name || t("Template"), t("Vul de velden van deze kaart in"))}
      <div class="form">${(tc.inputs || []).map(f => html`<label class="f"><span>${f.label || f.key}${f.default != null ? html`<small>${t("standaard")}: ${f.default}</small>` : nothing}</span>
        ${f.type === "number" ? html`<input type="number" .value=${inputs[f.key] ?? ""} @change=${e => setIn(f.key, e.target.value === "" ? undefined : +e.target.value)}>`
        : html`<input type="text" list=${f.type === "entity" ? "hcn-entities" : nothing} .value=${inputs[f.key] ?? ""} placeholder=${f.type === "entity" ? "sensor.x" : ""} @change=${e => setIn(f.key, e.target.value || undefined)}>`}</label>`)}
        <datalist id="hcn-entities">${Object.keys(p.hass.states).map(x => html`<option value=${x}></option>`)}</datalist></div>
      <div class="sub" style="margin-top:12px">${t("Tekst")}: <code>${substInputs(tc.state || "", tc, inputs)}</code></div>
      <div class="modes n2" style="margin-top:18px"><button class="on" @click=${() => addKey(p, key, `tpl:${tc.id}:${Date.now().toString(36)}`, { cardCfg: { inputs } })}>${t("Toevoegen en instellen")}</button><button @click=${() => upd({ step: 2 })}>${t("Terug")}</button></div></div>`;
  }
  if (step === 2) {
    const q = (pop.q || "").toLowerCase().trim(), flt = FILTERS.find(f => f[0] === (pop.flt || ""))?.[2];
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
      ${!all.length ? html`<div class="sub" style="margin-top:16px">${t("Niets gevonden")}</div>` : nothing}${back(1)}</div>`;
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
    <div class="modes n2" style="margin-top:18px"><button class="on" @click=${() => addKey(p, key, id, { haArea: pop.place === "ha" && !isHome, hideIn: pop.hideOther && pop.place !== "ha" ? pop.other : null })}>${t("Toevoegen en instellen")}</button><button @click=${() => upd({ step: 2 })}>${t("Terug")}</button></div></div>`;
}
