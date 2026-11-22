// Components ("layouts" in Hugo terms): small renderers that turn a block of YAML into markup. A data page
// (pages/<key>.yaml) is a list of blocks; a room layout (rooms/<key>.yaml) is a list of cards. Which components exist:
//   - the built-in ones below (kpis, kpi, list, cards, card, heading, text, section, hourly, page),
//   - every file in src/components/ (bundled by build.mjs as "hcn:components"),
//   - modules listed under `components:` in site.yaml, loaded at runtime (no rebuild).
// A component is { name, render(props, ctx), popup?(pop, ctx, wrap), kind? }. `kind` says how consecutive blocks are
// laid out: "block" (glass blocks with rows, in columns), "card" (cards in a grid), anything else full width.
import { html, svg, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { domain, num, isOn, unavailable, relTime, slug, VERSION } from "./util.js";
import { ico, anyIco, addedCard, pressDir } from "./cards.js";
import { kpi, srow, sblock, card, sec, pillbar, hbars, fmt, builtinPage, renderParts } from "./pages.js";
import { spark, fetchNumeric } from "./extras3.js";
import { hourlyToday } from "./extras.js";
import { hash } from "./data.js";
import BUNDLED from "hcn:components";

const REG = new Map();
const plain = v => v && typeof v === "object" && !Array.isArray(v);

/** add (or replace) a component; `src` is where it came from, for error messages */
export function registerComponent(def, src = "bundle") {
  if (!def || typeof def.name !== "string" || typeof def.render !== "function") throw new Error(`${src}: un componente ha bisogno di { name, render(props, ctx) }`);
  REG.set(def.name, { ...def, src });
}
export const getComponent = name => REG.get(name);
export const componentNames = () => [...REG.keys()].sort();

/* ---------- values: $energy.* / $home.* references, [[entity]] placeholders, Jinja templates ---------- */
/** "$energy.power" → the entity chosen under Settings → Energy; "$home.weather" → config.home.weather */
export const ref = (p, s) => typeof s !== "string" ? s : s.replace(/\$(energy|home)\.([A-Za-z_][\w]*)/g, (m, g, k) => (g === "energy" ? p.config.home?.energy?.[k] : p.config.home?.[k]) ?? m);
const isJinja = s => typeof s === "string" && /\{\{|\{%/.test(s);
export const templateId = (p, s) => "data:" + hash(ref(p, s));

const fmtState = (s, dec) => { if (!s) return "–"; const v = num(s.state); if (v != null && /^-?[\d.]+$/.test(String(s.state).trim())) return fmt(v, dec ?? (Math.abs(v) >= 100 ? 0 : 1)); return s.state === "on" ? t("Aan") : s.state === "off" ? t("Uit") : s.state; };
/** a state or attribute for "[[ sensor.x ]]", "[[ sensor.x | 0 ]]" (decimals) or "[[ sensor.x.attribute ]]" */
function placeholder(p, expr) {
  const [path, dec] = expr.split("|").map(x => x.trim()), parts = ref(p, path).split(".");
  const s = p.hass.states[parts.slice(0, 2).join(".")];
  if (!s) return "?";
  if (parts.length > 2) { const v = s.attributes?.[parts.slice(2).join(".")]; return v == null ? "–" : num(v) != null && dec ? fmt(num(v), +dec) : String(v); }
  return fmtState(s, dec !== undefined ? +dec : undefined);
}
/**
 * Text of a YAML field: Jinja ({{ … }}) is rendered by Home Assistant (admins only, like template cards),
 * [[ entity ]] is filled in here and works for every user. With an entity in scope also $state, $name, $changed.
 */
export function text(p, s, e = null) {
  if (s == null || typeof s !== "string") return s;
  if (isJinja(s)) { const r = p.templates?.[templateId(p, s)]; return r?.error ? "⚠ " + (r.msg || "template") : r?.state ?? "…"; }
  let out = ref(p, s).replace(/\[\[([^\]]+)\]\]/g, (m, x) => placeholder(p, x));
  if (e) out = out.replace(/\$state\b/g, fmtState(e)).replace(/\$name\b/g, e.attributes?.friendly_name || e.entity_id).replace(/\$changed\b/g, relTime(e.last_changed));
  return out;
}
/** Jinja strings of the data, for the panel's render_template subscriptions */
export const dataTemplates = (p, strings) => strings.map(s => ({ id: templateId(p, s), state: ref(p, s) }));

/** an entity by id, "$energy.x" reference or friendly name (case-insensitive), optionally limited to some domains */
export function find(p, key, doms = null) {
  if (!key) return null;
  const k = ref(p, String(key)), st = p.hass.states, ok = s => !doms || doms.includes(domain(s.entity_id));
  if (st[k] && ok(st[k])) return st[k];
  const n = k.toLowerCase();
  return Object.values(st).find(s => ok(s) && (s.attributes.friendly_name || "").toLowerCase() === n) || null;
}

/* ---------- conditions and actions ---------- */
/** visible: "{{ jinja }}" | { entity, state, state_not, above, below } | [ list: all must hold ] */
export function check(p, c, e = null) {
  if (c == null) return true;
  if (typeof c === "boolean") return c;
  if (Array.isArray(c)) return c.every(x => check(p, x, e));
  if (typeof c === "string") { const v = String(text(p, c, e)).trim().toLowerCase(); return !["", "false", "0", "off", "no", "none", "…", "unknown", "unavailable"].includes(v); }
  if (plain(c)) {
    const s = c.entity ? find(p, c.entity) : e; if (!s) return false;
    const v = c.attribute ? s.attributes?.[c.attribute] : s.state, n = num(v);
    if (c.state != null && ![].concat(c.state).map(String).includes(String(v))) return false;
    if (c.state_not != null && [].concat(c.state_not).map(String).includes(String(v))) return false;
    if (c.above != null && !(n != null && n > +c.above)) return false;
    if (c.below != null && !(n != null && n < +c.below)) return false;
    return true;
  }
  return true;
}
/** tap / hold: "more-info" | "toggle" | "none" | { navigate: path } | { page: key } | { service: "domain.svc", data, target } | { popup: component, …props } | { url } */
export function action(p, spec, s = null) {
  if (spec == null || spec === "none") return null;
  const id = s?.entity_id;
  if (spec === "more-info") return id ? () => p.moreInfo(id) : null;
  if (spec === "toggle") return id ? () => p.call("homeassistant", "toggle", { entity_id: id }) : null;
  if (typeof spec === "string") return () => p.goPath(spec);
  if (!plain(spec)) return null;
  if (spec.navigate) return () => p.goPath(spec.navigate);
  if (spec.page) return () => p.goPath(`__${spec.page}__`);
  if (spec.url) return () => window.open(spec.url, spec.target || "_blank");
  if (spec.service) {
    const [d, sv] = String(spec.service).split("."), ent = spec.entity ? ref(p, spec.entity) : !spec.data && !spec.target ? id : null;
    return () => p.call(d, sv, { ...(spec.target || {}), ...(spec.data || {}), ...(ent ? { entity_id: ent } : {}) });
  }
  if (spec.popup) { const { popup, ...props } = spec; return () => p.openPopup({ type: "cmp:" + popup, props }); }
  return null;
}

/* ---------- dynamic lists: query over every entity ---------- */
const areaOf = (p, id) => { const e = p.hass.entities?.[id]; return e?.area_id || (e?.device_id && p.hass.devices?.[e.device_id]?.area_id) || null; };
/** { domain, unit, device_class, area, match (regex on id + name), state, min, max, exclude, sort: value | -value | name, limit } */
export function query(p, q = {}) {
  const doms = [].concat(q.domain || []), excl = new Set([].concat(q.exclude || []).map(x => ref(p, x)));
  const area = q.area ? (p.rooms.find(r => r.id === q.area || r.slug === slug(q.area) || r.name === q.area)?.id || q.area) : null;
  const re = q.match ? new RegExp(q.match, "i") : null;
  let list = Object.values(p.hass.states).filter(s => {
    const id = s.entity_id, a = s.attributes || {};
    if (doms.length && !doms.includes(domain(id))) return false;
    if (excl.has(id) || p.hass.entities?.[id]?.hidden) return false;
    if (q.unit && a.unit_of_measurement !== q.unit) return false;
    if (q.device_class && ![].concat(q.device_class).includes(a.device_class)) return false;
    if (area && areaOf(p, id) !== area) return false;
    if (re && !re.test(id + " " + (a.friendly_name || ""))) return false;
    if (q.state != null && ![].concat(q.state).map(String).includes(s.state)) return false;
    const n = num(s.state);
    if (q.min != null && !(n != null && n >= +q.min)) return false;
    if (q.max != null && !(n != null && n <= +q.max)) return false;
    return true;
  });
  const by = q.sort || "name", nm = s => s.attributes.friendly_name || s.entity_id;
  list.sort(by === "name" ? (a, b) => nm(a).localeCompare(nm(b), locale()) : by === "value" ? (a, b) => (num(a.state) ?? 0) - (num(b.state) ?? 0) : (a, b) => (num(b.state) ?? 0) - (num(a.state) ?? 0));
  if (q.limit) list = list.slice(0, +q.limit);
  return list;
}
/** items: [entity id | { entity, …props }] plus the result of `query`, as [{ s, props }] */
const itemsOf = (p, props) => {
  const own = (Array.isArray(props.items) ? props.items : Array.isArray(props.entities) ? props.entities : []).map(x => typeof x === "string" ? { entity: x } : x).filter(plain);
  const q = props.query ? query(p, props.query).map(s => ({ ...(props.row || {}), entity: s.entity_id })) : [];
  return [...own, ...q].map(x => ({ s: x.entity ? find(p, x.entity) : null, props: x }));
};

/* ---------- history caches (sparklines, hourly bars) ---------- */
function cached(p, bag, k, ttl, load) {
  const c = (p[bag] ||= {}), x = c[k];
  if ((!x || Date.now() - x.at > ttl) && !x?.busy) { c[k] = { ...(x || { at: 0 }), busy: true }; load().then(v => { c[k] = { at: Date.now(), v }; p.requestUpdate(); }, () => { c[k] = { at: Date.now(), v: x?.v }; }); }
  return x?.v;
}
const histOf = (p, id, hours) => cached(p, "_dHist", id + "|" + hours, 60000, async () => (await fetchNumeric(p.hass, [id], hours))[id] || []);
const hourlyOf = (p, id) => cached(p, "_dHourly", id, 10 * 60000, () => hourlyToday(p.hass, id));

/* ---------- small pieces components can reuse ---------- */
export const errBox = (title, msg) => html`<div class="derr"><b>${title}</b><pre>${msg}</pre></div>`;
const errCard = (title, msg) => html`<div class="card derrc"><div class="n">${title}</div><div class="s">${msg}</div></div>`;
/** a row with − value + for an input_number / number */
export function numberRow(p, s, { icon = "mdi:tune-variant", name = null, sub = null } = {}) {
  const step = +s.attributes.step || 1, u = s.attributes.unit_of_measurement || "", d = domain(s.entity_id);
  const set = v => p.call(d, "set_value", { entity_id: s.entity_id, value: Math.min(+(s.attributes.max ?? Infinity), Math.max(+(s.attributes.min ?? -Infinity), v)) });
  return html`<div class="srow nrow">${anyIco(icon)}<div class="nm">${name ?? s.attributes.friendly_name}<small>${sub ?? relTime(s.last_changed)}</small></div>
    <div class="step"><button @click=${() => set((num(s.state) ?? 0) - step)}>−</button><b>${fmt(num(s.state), step < 1 ? 1 : 0)}${u ? html`<small>${u}</small>` : nothing}</b><button @click=${() => set((num(s.state) ?? 0) + step)}>+</button></div></div>`;
}
/** a row with a drop-down for an input_select / select; options that are entity ids show that entity's name */
export function selectRow(p, s, { icon = "mdi:form-select", name = null, sub = null } = {}) {
  const lab = o => p.hass.states[o]?.attributes?.friendly_name || o;
  return html`<div class="srow lsel">${anyIco(icon)}<div class="nm">${name ?? s.attributes.friendly_name}<small>${sub ?? relTime(s.last_changed)}</small></div>
    <select @change=${e => p.call(domain(s.entity_id), "select_option", { entity_id: s.entity_id, option: e.target.value })}>
      ${(s.attributes.options || []).map(o => html`<option value=${o} ?selected=${o === s.state}>${lab(o)}</option>`)}
    </select></div>`;
}
const TOGGLE = ["switch", "input_boolean", "light", "fan", "automation", "siren", "humidifier"];
/** one row of a `list`: control auto | toggle | number | select | value | none */
function row(p, s, o) {
  const icon = o.icon || s?.attributes?.icon || "mdi:checkbox-blank-circle-outline", nm = text(p, o.name, s) ?? (s?.attributes?.friendly_name || o.entity), sub = text(p, o.sub, s);
  if (!s) return srow({ icon: "mdi:help-circle-outline", raw: true, name: nm || "?", sub: `entità non trovata: ${o.entity}`, dim: true });
  const d = domain(s.entity_id), ctl = o.control || (TOGGLE.includes(d) ? "toggle" : ["input_number", "number"].includes(d) ? "number" : ["input_select", "select"].includes(d) ? "select" : "value");
  if (ctl === "number") return numberRow(p, s, { icon, name: nm, sub });
  if (ctl === "select") return selectRow(p, s, { icon, name: nm, sub });
  const tap = action(p, o.tap ?? "more-info", s), dim = unavailable(s);
  if (ctl === "toggle") return srow({ icon, raw: true, name: nm, sub: sub ?? relTime(s.last_changed), toggle: dim ? null : () => p.call("homeassistant", "toggle", { entity_id: s.entity_id }), on: isOn(s), dim, tap });
  const v = (o.prefix || "") + (o.value != null ? text(p, o.value, s) : o.attribute ? s.attributes[o.attribute] : o.scale != null ? fmt(scaled(p, num(s.state), o), o.decimals ?? 2) : fmtState(s, o.decimals));
  const unit = o.unit ?? (o.value != null || o.attribute ? "" : s.attributes.unit_of_measurement || "");
  return srow({ icon, raw: true, name: nm, sub: sub ?? "", val: ctl === "none" ? "" : v, unit, on: o.highlight ? check(p, plain(o.highlight) ? { entity: s.entity_id, ...o.highlight } : o.highlight, s) : false, dim, tap });
}
/** value × scale (a number or a reference such as $energy.price): kWh → € without a template */
const scaled = (p, n, o) => n == null || o.scale == null ? n : (f => f == null ? null : n * f)(num(ref(p, String(o.scale))));
/** a KPI tile from YAML props */
function kpiOf(p, o) {
  const s = o.entity ? find(p, o.entity) : null;
  const raw = o.value != null ? text(p, o.value, s) : s ? (o.attribute ? s.attributes[o.attribute] : s.state) : null;
  const n = scaled(p, num(raw), o), v = raw == null || (o.scale != null && n == null) ? "–" : (o.prefix || "") + (o.value == null && n != null ? fmt(n, o.decimals ?? (Math.abs(n) >= 100 ? 0 : 1)) : raw);
  const unit = o.unit ?? (o.value != null || o.attribute ? "" : s?.attributes?.unit_of_measurement || "");
  const bar = o.bar == null ? null : o.bar === true ? n : plain(o.bar) ? (n != null ? n / (+o.bar.max || 100) * 100 : null) : num(text(p, String(o.bar), s));
  const on = o.highlight == null ? false : o.highlight === true ? true : check(p, plain(o.highlight) && !o.highlight.entity && s ? { ...o.highlight, entity: s.entity_id } : o.highlight, s);
  return kpi({ icon: o.icon || s?.attributes?.icon || "mdi:gauge", em: text(p, o.label, s) || "", v, unit, n: text(p, o.name, s) ?? (s?.attributes?.friendly_name || ""),
    on, bar, spark: o.history && s ? histOf(p, s.entity_id, +o.history) : null, tap: action(p, o.tap ?? (s ? "more-info" : null), s) });
}

/* ---------- the built-in components ---------- */
const BUILTIN = [
  { name: "kpis", render: (o, c) => html`<div class="kpis">${itemsOf(c.p, o).map(({ props }) => kpiOf(c.p, props))}</div>` },
  { name: "kpi", render: (o, c) => html`<div class="kpis">${kpiOf(c.p, o)}</div>` },
  { name: "list", kind: "block", render: (o, c) => { const rows = itemsOf(c.p, o).map(({ s, props }) => row(c.p, s, props)); if (!rows.length && o.empty) rows.push(srow({ icon: "mdi:check", raw: true, name: text(c.p, o.empty), dim: true })); return sblock(text(c.p, o.title) || "", rows, o.meta === "count" ? String(rows.length) : text(c.p, o.meta) || ""); } },
  { name: "cards", render: (o, c) => sec(text(c.p, o.title) || "", (Array.isArray(o.items) ? o.items : Array.isArray(o.entities) ? o.entities : []).concat(o.query ? query(c.p, o.query).map(s => s.entity_id) : []).map(x => stripEntry(c.p, x, null, []).tpl), text(c.p, o.meta) || "") },
  { name: "card", kind: "card", render: (o, c) => { const s = o.entity ? find(c.p, o.entity) : null; return card(c.p, { n: text(c.p, o.name, s) ?? s?.attributes?.friendly_name ?? "", s: o.value != null ? text(c.p, o.value, s) : s ? `${fmtState(s, o.decimals)}${s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : ""}` : "", lbl: text(c.p, o.label, s) || "", icon: o.icon || s?.attributes?.icon, on: o.highlight != null ? check(c.p, o.highlight, s) : isOn(s), dim: !!s && unavailable(s), tap: action(c.p, o.tap ?? (s ? "more-info" : null), s), hold: action(c.p, o.hold ?? null, s) }); } },
  { name: "heading", render: (o, c) => html`<div class="dhead"><div class="peb">${text(c.p, o.text ?? o.title)}</div>${o.sub ? html`<div class="dsub">${text(c.p, o.sub)}</div>` : nothing}</div>` },
  { name: "text", render: (o, c) => html`<div class="dtext">${String(text(c.p, o.text) ?? "").split(/\n{2,}/).map(par => html`<p>${par}</p>`)}</div>` },
  { name: "section", render: (o, c) => html`<section class="dsec">${o.title ? html`<div class="dhead"><div class="peb">${text(c.p, o.title)}</div></div>` : nothing}${renderBlocks(c.p, o.blocks || [])}</section>` },
  { name: "pills", render: (o, c) => html`<div class="ppills">${(o.items || []).map(x => { const s = x.entity ? find(c.p, x.entity) : null, tap = action(c.p, x.tap ?? (s ? "toggle" : null), s); return html`<button class=${classMap({ on: x.highlight != null ? check(c.p, x.highlight, s) : isOn(s) })} @click=${() => tap?.()}>${anyIco(x.icon || s?.attributes?.icon || "mdi:circle-small")}${text(c.p, x.name, s) ?? s?.attributes?.friendly_name ?? ""}</button>`; })}</div>` },
  { name: "hourly", render: (o, c) => {
    const series = (o.entities || []).map(x => typeof x === "string" ? { entity: x } : x).map(x => ({ ...x, id: ref(c.p, x.entity) })).filter(x => x.id);
    const rows = series.map(x => hourlyOf(c.p, x.id) || []), max = Math.max(0.001, ...rows.flat().map(r => r.v || 0));
    return html`<div class="chart"><h3>${text(c.p, o.title) || t("Per uur")}<b>${text(c.p, o.meta) || ""}</b></h3>
      <div class="hbwrap">${rows.map((r, i) => r.length ? hbars(r, max, i ? "sun" : "") : nothing)}</div>
      <div class="bx"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
      <div class="legend">${series.map((x, i) => html`<span><i style="background:${i ? "rgba(255,220,130,.75)" : "rgba(255,255,255,.3)"}"></i>${text(c.p, x.label) || c.p.hass.states[x.id]?.attributes?.friendly_name || x.id}</span>`)}</div></div>`;
  } },
  // a built-in page, whole or in parts. parts: automatiseringen [kpis, list] · sensoren [attention, list] · energie [kpis, chart, consumers, devices]
  // · systeem [kpis, hints, ha, host, offline] · cameras [cameras]; on top of those "filters" and "tools" (the pills and switches of its header)
  { name: "page", render: (o, c) => {
    const pg = builtinPage(c.p, o.page); if (!pg) throw new Error(`pagina integrata "${o.page}" sconosciuta (automatiseringen, sensoren, energie, cameras, systeem)`);
    const extra = [{ name: "filters", tpl: pg.head ? html`<div class="dfilt">${pg.head}</div>` : nothing }, { name: "tools", tpl: pg.tools ? html`<div class="dfilt">${pg.tools}</div>` : nothing }];
    return renderParts([...pg.parts, ...extra], o.parts || pg.parts.map(x => x.name));
  } },
];
for (const d of BUILTIN) registerComponent(d, "integrato");
for (const d of BUNDLED) try { registerComponent(d, "src/components"); } catch (e) { console.error("[leics-dashboard]", e.message); }

/* ---------- rendering ---------- */
/** what components get: the panel, lit and the helpers above */
export function ctxFor(p) {
  return {
    p, hass: p.hass, html, svg, nothing, classMap, t, fmt, num, domain, isOn, unavailable, relTime, version: VERSION,
    state: id => find(p, id), find: (k, doms) => find(p, k, doms), query: q => query(p, q), text: (s, e) => text(p, s, e), check: (c, e) => check(p, c, e), action: (sp, s) => action(p, sp, s),
    call: (d, s, data) => p.call(d, s, data), more: id => p.moreInfo(id), go: path => p.goPath(path), popup: (name, props) => p.openPopup({ type: "cmp:" + name, props }),
    history: (id, hours = 1) => histOf(p, id, hours), hourly: id => hourlyOf(p, id), blocks: list => renderBlocks(p, list),
    ui: { kpi, row: srow, block: sblock, card: o => card(p, o), section: sec, pills: pillbar, hbars, spark, ico, anyIco, numberRow: (s, o) => numberRow(p, s, o), selectRow: (s, o) => selectRow(p, s, o), entityRow: (s, o = {}) => row(p, s, o), entityCard: id => stripEntry(p, id, null, []).tpl, error: errBox, press: o => pressDir(p, o) },
  };
}
function renderOne(p, b) {
  const type = typeof b === "string" ? b : b?.type, props = typeof b === "string" ? {} : b || {};
  const comp = REG.get(type);
  if (!comp) return { kind: "wide", tpl: errBox(`componente "${type ?? "?"}" sconosciuto`, `disponibili: ${componentNames().join(", ")}`) };
  if (props.visible != null && !check(p, props.visible)) return null;
  try { return { kind: comp.kind || "wide", tpl: comp.render(props, ctxFor(p)) }; }
  catch (e) { console.error(`[leics-dashboard] componente ${type}`, e); return { kind: "wide", tpl: errBox(`${type} (${comp.src})`, e.message) }; }
}
/** a list of blocks; consecutive "block" components share one column layout, consecutive "card" ones one grid */
export function renderBlocks(p, blocks) {
  if (!Array.isArray(blocks)) return errBox("blocks", "deve essere una lista (ogni voce inizia con  - type: …)");
  const out = [];
  for (const b of blocks) {
    const r = renderOne(p, b); if (!r) continue;
    const last = out[out.length - 1];
    if ((r.kind === "block" || r.kind === "card") && last?.kind === r.kind) last.items.push(r.tpl); else out.push({ kind: r.kind, items: [r.tpl] });
  }
  return out.map(g => g.kind === "block" ? html`<div class="sblks">${g.items}</div>` : g.kind === "card" ? html`<div class="cgrid dcg">${g.items}</div>` : g.items);
}

/** header and body of a page defined in pages/<key>.yaml */
export function dataPage(p, key, def) {
  const d = def.data || {};
  if (d.__error) return { sub: "errore", body: errBox(d.__file || `pages/${key}.yaml`, d.__error) };
  return { sub: text(p, d.sub) || "", head: d.head ? renderBlocks(p, d.head) : nothing, body: renderBlocks(p, d.blocks || []) };
}
/** popup of a component (type "cmp:<name>", opened with ctx.popup(name, props) or tap: { popup: name }) */
export function componentPopup(p, pop, wrap) {
  const name = pop.type.slice(4), comp = REG.get(name);
  if (!comp?.popup) return wrap(t("Fout"), name, "", errBox(name, comp ? "questo componente non ha un popup" : "componente sconosciuto"));
  try { return comp.popup(pop, ctxFor(p), wrap); } catch (e) { console.error(`[leics-dashboard] popup ${name}`, e); return wrap(t("Fout"), name, "", errBox(name, e.message)); }
}

/* ---------- room / home layouts (rooms/<key>.yaml) ---------- */
/** the layout of the home view ("home") or a room (by area id, slug or name) */
export function layoutFor(p, key) {
  const L = p.data?.rooms; if (!L) return null;
  if (L[key]) return L[key];
  const r = p.rooms?.find(x => x.id === key);
  return r ? L[r.slug] || L[r.name] || Object.entries(L).find(([k]) => slug(k) === r.slug)?.[1] || null : null;
}
/** one card of a layout: a card the page has by itself (entity id, alias such as the switch of an appliance, a panel card
    key like "weather"), any entity, a card of another room ("room:<area>:<key>"), or a component ({ type: …, … }) */
function stripEntry(p, c, pageKey, all, i = 0) {
  if (plain(c) && c.type) {
    const comp = REG.get(c.type);
    if (!comp) return { key: `data:${i}`, tpl: errCard(`componente "${c.type}" sconosciuto`, "vedi l'elenco nella console (LEICS.components())") };
    if (c.visible != null && !check(p, c.visible)) return null;
    try { return { key: `data:${i}:${c.type}`, label: c.type, tpl: comp.render(c, ctxFor(p)) }; } catch (e) { console.error(`[leics-dashboard] componente ${c.type}`, e); return { key: `data:${i}`, tpl: errCard(c.type, e.message) }; }
  }
  const k = ref(p, typeof c === "string" ? c : c?.entity || c?.key);
  if (!k) return { key: `data:${i}`, tpl: errCard("?", "voce senza entity / key / type") };
  if (plain(c) && c.visible != null && !check(p, c.visible, p.hass.states[k])) return null;
  const own = all.find(x => x.key === k || x.alias?.includes(k));
  if (own) return own;
  const s = p.hass.states[k], a = addedCard(p, k, pageKey ?? undefined);
  return a ? { key: k, label: a.label, tpl: a.tpl } : { key: k, tpl: errCard(k, s ? "nessuna scheda per questo tipo di entità" : "non trovato") };
}
/** the cards of a page with a layout. mode: only (default, exactly the list) | append (automatic cards first) | prepend */
export function layoutCards(p, key, lay, all, auto) {
  if (lay.__error) return [{ key: "data:error", tpl: errCard(lay.__file || `rooms/${key}.yaml`, lay.__error) }];
  const list = (Array.isArray(lay.cards) ? lay.cards : []).map((c, i) => stripEntry(p, c, key, all, i)).filter(Boolean);
  const mode = lay.mode || "only";
  if (mode === "only") return list;
  const used = new Set(list.map(x => x.key)), hide = new Set([].concat(lay.hide || []).map(x => ref(p, x)));
  const base = auto().filter(x => !used.has(x.key) && !hide.has(x.key) && !(x.alias || []).some(a => hide.has(a)));
  return mode === "prepend" ? [...list, ...base] : [...base, ...list];
}

/* ---------- runtime API for components loaded from the data folder (they cannot import lit themselves) ---------- */
window.LEICS = Object.assign(window.LEICS || {}, { version: VERSION, html, svg, nothing, classMap, register: d => registerComponent(d, "runtime"), components: componentNames });

export const blockStyles = `
  .dhead{margin-top:26px}
  .dhead + .kpis,.dhead + .sblks,.dhead + .chart,.dhead + .cgrid{margin-top:10px}
  .dsub{font-size:13px;color:var(--fg-3);margin-top:4px}
  .dtext{margin-top:18px;max-width:72ch;font-size:15px;line-height:1.5;color:var(--fg-2)}
  .dtext p + p{margin-top:10px}
  .dsec{margin-top:8px}
  .cgrid.dcg{margin-top:22px}
  .dfilt{margin-top:14px}
  .derr{margin-top:18px;border-radius:var(--r);border:1px solid rgba(242,122,92,.6);background:rgba(242,122,92,.16);padding:14px 18px;font-size:13px}
  .derr b{display:block;font-weight:700;margin-bottom:6px}
  .derr pre{margin:0;white-space:pre-wrap;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg-2)}
  .card.derrc{background:rgba(242,122,92,.18);border-color:rgba(242,122,92,.6)}
  .card.derrc .s{font-size:12px;white-space:normal}
`;
