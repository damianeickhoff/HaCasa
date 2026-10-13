// Status pills under the greeting / notification row. Per page (`pages[key].pills`): an ordered list of the built-in
// pills (lights, doors & windows, attention: home page only) and the user's own pills (icon, text or Jinja, entity, tap
// action, highlight). Every pill can be hidden, edited, dragged into place and shown on a condition (same as cards).
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t } from "./i18n.js";
import { isOn, unavailable } from "./util.js";
import { ico, uico, anyIco, condHiddenBy } from "./cards.js";
import { dragRows } from "./drag.js";
import { condFields } from "./settings.js";
import { iconInput } from "./iconpicker.js";

export const BUILTIN_PILLS = { lights: { name: "Lampen", icon: "mdi:lightbulb-outline" }, doors: { name: "Deuren & ramen", icon: "mdi:door" }, attention: { name: "Aandacht", icon: "mdi:alert-circle-outline" } };
const isTpl = s => /\{[{%]/.test(s || "");
const tplKey = (key, x) => `pill:${key}:${x.id}`;

/** the page's pills in order; built-ins that are missing from a saved list (new in a later version) are added at the end */
export function pillList(p, key, pc = p.pageCfg(key)) {
  const builtins = key === "home" ? Object.keys(BUILTIN_PILLS) : [];
  const saved = (pc.pills || []).filter(x => x && (!BUILTIN_PILLS[x.id] || builtins.includes(x.id)));
  return [...saved, ...builtins.filter(id => !saved.some(x => x.id === id)).map(id => ({ id }))];
}
/** render_template subscriptions for pill texts and conditions (panel.subscribeTemplates) */
export const pillTemplates = config => Object.entries(config.pages || {}).flatMap(([k, pc]) => (pc.pills || []).filter(x => x && (isTpl(x.text) || x.tplVisible))
  .map(x => ({ id: tplKey(k, x), state: isTpl(x.text) ? x.text : undefined, visible: x.tplVisible })));

/** what a built-in pill shows right now (null = nothing to show, e.g. no lights in the house) */
function builtinState(id, h) {
  if (!h) return null;
  if (id === "lights") return h.lights.length ? { svg: "lamp", on: h.lightsOn.length > 0, text: h.lightsOn.length ? t("{n} aan", { n: h.lightsOn.length }) : t("Lampen uit"), pop: "lights" } : null;
  if (id === "doors") { const open = h.doorsOpen.length + h.windowsOpen.length; return h.doors.length || h.windows.length ? { svg: "door", on: open > 0, text: open ? t("{n} open", { n: open }) : t("Alles dicht"), pop: "doors" } : null; }
  if (id === "attention") return h.attention.length ? { svg: "sparkles", on: true, text: `${h.attention.length} ${h.attention.length === 1 ? t("melding") : t("meldingen")}`, pop: "attention" } : null;
  return null;
}
const stateText = (p, s) => s ? (unavailable(s) ? t("Onbereikbaar") : String(p.hass.formatEntityState?.(s) ?? s.state)) : "";

/** one pill as {icon, on, text, tap} or null when it has nothing to show; `preview` keeps template texts visible before they render */
function resolve(p, key, x, h, preview) {
  const tap = (x.tap === "nav" && x.path) ? () => p.goPath(x.path) : x.tap === "none" ? null : undefined;
  if (BUILTIN_PILLS[x.id]) {
    const b = builtinState(x.id, h); if (!b) return null;
    if (x.onlyActive && !b.on) return preview ? { ...b, icon: uico(x.icon, BUILTIN_PILLS[x.id].icon, b.svg), cond: true } : null;
    return { on: b.on, text: b.text, icon: uico(x.icon, BUILTIN_PILLS[x.id].icon, b.svg), tap: tap === undefined ? () => p.openPopup({ type: b.pop }) : tap };
  }
  const s = x.entity ? p.hass.states[x.entity] : null;
  const rendered = p.templates?.[tplKey(key, x)]?.state;
  const text = isTpl(x.text) ? (rendered != null && String(rendered).trim() !== "" ? String(rendered) : preview ? x.text : "") : (x.text || stateText(p, s));
  if (!String(text).trim()) return preview ? { text: t("Nieuwe pil"), icon: anyIco(x.icon || "mdi:information-outline"), cond: true } : null;
  const on = x.active === "always" ? true : x.active === "never" ? false : !!s && isOn(s);
  const def = x.entity ? () => p.moreInfo(x.entity) : null;
  return { on, text, icon: anyIco(x.icon || "mdi:information-outline"),
    tap: tap !== undefined ? tap : x.tap === "toggle" && x.entity ? () => p.call("homeassistant", "toggle", { entity_id: x.entity }) : def };
}

/** the pill row of a page; `list` overrides the saved list (the editor's draft), `preview` also shows condition-hidden pills, dimmed */
export function renderPills(p, key, h, { list, preview = false } = {}) {
  const out = [];
  for (const x of list || pillList(p, key)) {
    if (x.hidden) continue;
    const cond = condHiddenBy(p, x, tplKey(key, x));
    if (cond && !preview) continue;
    const r = resolve(p, key, x, h, preview); if (!r) continue;
    out.push({ ...r, cond: cond || r.cond });
  }
  if (!out.length) return preview ? html`<div class="pills"><span class="none">${t("Geen pillen zichtbaar")}</span></div>` : nothing;
  return html`<div class="pills">${out.map(x => html`<button class=${classMap({ on: !!x.on, cond: !!x.cond, tap: !!x.tap })} @click=${ev => { ev.stopPropagation(); if (!preview) x.tap?.(); }}>${x.icon}<span>${x.text}</span></button>`)}</div>`;
}

/* ---------- editor (page settings popup) ---------- */
const condSummary = x => x.visEntity ? `${x.visEntity} ${x.visOp === "ne" ? "≠" : x.visOp === "gt" ? ">" : x.visOp === "lt" ? "<" : "="} ${x.visValue ?? ""}` : x.tplVisible ? t("voorwaarde (Jinja)") : "";

/** the "Statuspillen" block: live preview, the list (grip, hide, edit, delete) and the inline editor of the open pill (pop.pill) */
export function pillEditor(p, pop, key, d, upd) {
  const list = pillList(p, key, d), set = next => upd({ pills: next });
  const patch = (id, ch) => { const next = list.map(x => { if (x.id !== id) return x; const y = { ...x, ...ch }; for (const k of Object.keys(y)) if (y[k] === undefined) delete y[k]; return y; }); set(next); };
  const open = list.find(x => x.id === pop.pill);
  const h = key === "home" ? p.home : null;
  const drag = (ev, id) => dragRows(ev, id, order => p.openPopup({ ...pop, draft: { ...d, pills: order.map(k => list.find(x => x.id === k)) }, drag: id }),
    order => p.openPopup({ ...pop, draft: { ...d, pills: order.map(k => list.find(x => x.id === k)) }, drag: undefined }));
  const add = () => { const id = "p" + Date.now().toString(36); p.openPopup({ ...pop, draft: { ...d, pills: [...list, { id, icon: "mdi:information-outline", text: "" }] }, pill: id }); };
  const row = (lbl, ctrl, sub) => html`<div class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</div>`;
  const seg = (x, k, opts, def = "") => html`<div class="seg">${opts.map(([v, l]) => html`<button class=${(x[k] ?? def) === v ? "on" : ""} @click=${() => patch(x.id, { [k]: v === def ? undefined : v })}>${l}${v === def ? html`<sup>${t("std")}</sup>` : nothing}</button>`)}</div>`;
  const inp = (x, k, ph) => html`<input type="text" .value=${x[k] || ""} placeholder=${ph} @change=${e => patch(x.id, { [k]: e.target.value || undefined })}>`;
  const title = x => BUILTIN_PILLS[x.id] ? t(BUILTIN_PILLS[x.id].name) : (x.text && !isTpl(x.text) ? x.text : x.entity ? (p.hass.states[x.entity]?.attributes.friendly_name || x.entity) : isTpl(x.text) ? t("Eigen pil (Jinja)") : t("Nieuwe pil"));
  const sub = x => [BUILTIN_PILLS[x.id] ? t("automatisch") : isTpl(x.text) ? x.text : x.entity || "", x.onlyActive && t("alleen als er iets aan of open is"), condSummary(x) && t("als {c}", { c: condSummary(x) })].filter(Boolean).join(" · ");
  const editor = x => { const b = !!BUILTIN_PILLS[x.id], mode = pop.pillVis || (x.tplVisible ? "tpl" : "simple");
    return html`<li class="ped"><div class="form">
      ${row(t("Icoon"), iconInput(p, x.icon, v => patch(x.id, { icon: v }), b ? BUILTIN_PILLS[x.id].icon : "mdi:information-outline"), b ? t("leeg = het standaardicoon") : "")}
      ${b ? row(t("Tonen"), seg(x, "onlyActive", [[undefined, t("altijd")], [true, t("alleen als er iets aan of open is")]], undefined))
        : html`${row(t("Tekst"), inp(x, "text", t("bv. Wasmachine {{ states('sensor.wasmachine') }}")), t("vaste tekst of Jinja; leeg = de staat van de entiteit"))}
          ${row(t("Entiteit"), html`<input type="text" list="hcn-pill-entities" .value=${x.entity || ""} placeholder="switch.x" @change=${e => patch(x.id, { entity: e.target.value || undefined })}>`, t("optioneel: voor de tekst, tikken en oplichten"))}
          ${row(t("Oplichten"), seg(x, "active", [["", t("als de entiteit aan is")], ["always", t("altijd")], ["never", t("nooit")]]))}`}
      ${row(t("Tikken"), seg(x, "tap", b ? [["", t("details openen")], ["nav", t("naar pagina")], ["none", t("niets")]] : [["", x.entity ? t("Home Assistant-dialoog") : t("niets")], ...(x.entity ? [["toggle", t("schakelen")]] : []), ["nav", t("naar pagina")], ...(x.entity ? [["none", t("niets")]] : [])]))}
      ${x.tap === "nav" ? row(t("Pagina"), inp(x, "path", "/hacasa/keuken"), t("een pad in Home Assistant, bv. /hacasa/keuken of /config")) : nothing}
      <div class="sh" style="margin-top:12px">${t("Zichtbaar")}</div>
      ${condFields(x, ch => patch(x.id, ch), mode, (v, ch) => p.openPopup({ ...pop, pillVis: v, draft: { ...d, pills: list.map(y => y.id === x.id ? { ...y, ...ch } : y) } }), row, t("leeg = altijd zichtbaar"), "hcn-pill-entities")}
      <div class="modes n2" style="margin-top:10px"><button class="on" @click=${() => p.openPopup({ ...pop, pill: undefined, pillVis: undefined, draft: d })}>${t("Klaar")}</button>
        ${b ? html`<button @click=${() => p.openPopup({ ...pop, pill: undefined, pillVis: undefined, draft: { ...d, pills: list.map(y => y.id === x.id ? { id: x.id, hidden: x.hidden } : y) } })}>${t("Herstel")}</button>`
          : html`<button @click=${() => p.openPopup({ ...pop, pill: undefined, pillVis: undefined, draft: { ...d, pills: list.filter(y => y.id !== x.id) } })}>${t("Verwijderen")}</button>`}</div>
    </div></li>`; };
  return html`
    <div class="prow" style="margin-top:18px"><span>${t("Statuspillen")}</span><b>${t("sleep om te ordenen · tik om te wijzigen")}</b></div>
    <div class="pillpv">${renderPills(p, key, h, { list, preview: true })}</div>
    <ul class="plist" data-drag>${list.map(x => html`<li data-k=${x.id} class=${classMap({ off: !!x.hidden, drag: pop.drag === x.id, open: open === x })}>
        <span class="grip" @pointerdown=${ev => drag(ev, x.id)}><ha-icon icon="mdi:drag"></ha-icon></span>
        <div class="pt" @click=${() => p.openPopup({ ...pop, pill: open === x ? undefined : x.id, pillVis: undefined, draft: d })}>${anyIco(x.icon || (BUILTIN_PILLS[x.id]?.icon) || "mdi:information-outline")}<div>${title(x)}<small>${sub(x)}</small></div></div>
        <span class="btns"><button title=${x.hidden ? t("Tonen") : t("Verbergen")} @click=${() => patch(x.id, { hidden: x.hidden ? undefined : true })}><ha-icon icon=${x.hidden ? "mdi:eye-off-outline" : "mdi:eye-outline"}></ha-icon></button>
          <button title=${t("Bewerken")} @click=${() => p.openPopup({ ...pop, pill: open === x ? undefined : x.id, pillVis: undefined, draft: d })}><ha-icon icon="mdi:pencil-outline"></ha-icon></button></span>
      </li>${open === x ? editor(x) : nothing}`)}
      ${!list.length ? html`<li><div>${t("Nog geen pillen op deze pagina")}</div></li>` : nothing}</ul>
    <button class="addbtn" @click=${add}>+ ${t("Pil toevoegen")}</button>
    <datalist id="hcn-pill-entities">${Object.keys(p.hass.states).map(x => html`<option value=${x}></option>`)}</datalist>`;
}
