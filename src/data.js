// Content layer, on the model of Hugo: the JS components decide HOW something looks (src/blocks.js, src/components/,
// runtime modules), YAML files in a data folder decide WHAT each page shows. Nothing is compiled: the panel reads the
// files at runtime, so changing a page means editing a YAML file and reloading the browser (or waiting `reload` seconds).
//
// Default folder: /local/leics/ (= /config/www/leics/ in Home Assistant). Change it with `data:` in panel_custom's
// `config:` or in the card config. Without a site.yaml the panel works exactly as before.
//
//   leics/
//     site.yaml            settings, menu, which pages / room layouts / components to load
//     pages/<key>.yaml     a page of the More menu: title, icon, blocks
//     rooms/<key>.yaml     the cards of the home view (key "home") or a room (area id, slug or name)
//     components/*.js      your own components, loaded without rebuilding the bundle
//
// Home Assistant serves /local without a directory listing, so site.yaml says which files exist.
import yaml from "js-yaml";
import { registerComponent } from "./blocks.js";

export const DEFAULT_DATA = "/local/leics/";

/** small stable string hash (FNV-1a), for change detection and template ids */
export const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

async function fetchText(url) {
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + "_=" + Date.now(), { cache: "no-store", credentials: "same-origin" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
const parse = (text, file) => yaml.load(text, { filename: file }) ?? {};
const plain = v => v && typeof v === "object" && !Array.isArray(v);

/** "pages: [a, b]" (files pages/a.yaml, …) or "pages: { a: {inline}, b: other.yaml }" → [[key, inline | file]] */
function entries(v, dir) {
  if (Array.isArray(v)) return v.map(x => typeof x === "string" ? [x, `${dir}/${x}.yaml`] : plain(x) && x.key ? [x.key, x] : null).filter(Boolean);
  if (plain(v)) return Object.entries(v).map(([k, x]) => [k, typeof x === "string" ? x : x ?? `${dir}/${k}.yaml`]);
  return [];
}

/**
 * Reads the data folder. Returns null when there is no site.yaml (data layer off), otherwise
 * { base, site, settings, pages: {key: def}, rooms: {key: def}, components: [names], errors: [{file, msg}], sig }.
 * `prevSig`: when nothing changed since that signature, returns { same: true } and loads no modules again.
 */
export async function loadData(base, prevSig) {
  const baseUrl = new URL(base.endsWith("/") ? base : base + "/", location.origin);
  const errors = [], raw = [];
  const read = async file => {
    try { const txt = await fetchText(new URL(file, baseUrl).href); if (txt != null) raw.push(file + "\n" + txt); return txt; }
    catch (e) { errors.push({ file, msg: e.message }); return null; }
  };
  const load = async (file, required = true) => {
    const txt = await read(file);
    if (txt == null) { if (required && !errors.some(x => x.file === file)) errors.push({ file, msg: "file non trovato" }); return null; }
    try { return parse(txt, file); } catch (e) { errors.push({ file, msg: e.reason || e.message, line: e.mark ? e.mark.line + 1 : undefined }); return { __error: e.message }; }
  };

  const site = await load("site.yaml", false);
  if (site == null) return errors.length ? { base: baseUrl.href, site: {}, settings: {}, pages: {}, rooms: {}, components: [], errors, sig: "err:" + errors.map(e => e.msg).join() } : null;
  if (site.__error) return { base: baseUrl.href, site: {}, settings: {}, pages: {}, rooms: {}, components: [], errors, sig: hash(raw.join("\n")) };

  const pages = {}, rooms = {};
  /** a page or layout: inline, or read from its file (__file says which, for messages) */
  const def = async v => {
    if (typeof v !== "string") return plain(v) ? v : { __error: "deve essere un oggetto (chiave: valore)", __file: "site.yaml" };
    const d = await load(v);
    return d?.__error ? { __error: d.__error, __file: v } : plain(d) ? { ...d, __file: v } : { __error: d ? "il file deve contenere chiavi (title:, blocks:, cards: …)" : "file non trovato", __file: v };
  };
  await Promise.all([
    ...entries(site.pages, "pages").map(async ([k, v]) => { pages[k] = await def(v); }),
    ...entries(site.rooms, "rooms").map(async ([k, v]) => { rooms[k] = await def(v); }),
  ]);

  // component modules: their text is read first so a changed file gets a new URL (browsers cache modules by URL)
  const mods = (Array.isArray(site.components) ? site.components : []).filter(x => typeof x === "string");
  const texts = await Promise.all(mods.map(read));
  const sig = hash(raw.join("\n"));
  if (prevSig && sig === prevSig) return { same: true, sig };

  const components = [];
  for (let i = 0; i < mods.length; i++) {
    if (texts[i] == null) { if (!errors.some(x => x.file === mods[i])) errors.push({ file: mods[i], msg: "file non trovato" }); continue; }
    try {
      const m = await import(/* @vite-ignore */ new URL(mods[i], baseUrl).href + "?v=" + hash(texts[i]));
      const defs = [m.default, ...(Array.isArray(m.components) ? m.components : [])].flat().filter(Boolean);
      for (const d of defs) { registerComponent(d, mods[i]); components.push(d.name); }
    } catch (e) { errors.push({ file: mods[i], msg: e.message }); }
  }

  // card settings written next to a card in a room layout ({ entity: light.x, name: …, icon: … }) go to settings.cards
  const settings = plain(site.settings) ? { ...site.settings } : {};
  const cards = { ...(settings.cards || {}) };
  for (const lay of Object.values(rooms)) for (const c of (Array.isArray(lay?.cards) ? lay.cards : [])) {
    if (!plain(c) || c.type) continue;
    const key = c.entity || c.key; if (!key) continue;
    const { entity, key: _k, ...rest } = c;
    if (Object.keys(rest).length) cards[key] = { ...(cards[key] || {}), ...rest };
  }
  if (Object.keys(cards).length) settings.cards = cards;

  for (const e of errors) console.error(`[leics-dashboard] ${e.file}${e.line ? ":" + e.line : ""}: ${e.msg}`);
  return { base: baseUrl.href, site, settings, pages, rooms, components, errors, sig };
}

/** every string in the data that is a Home Assistant template ({{ … }} / {% … %}) */
export function templateStrings(data) {
  const out = new Set();
  const walk = v => { if (typeof v === "string") { if (/\{\{|\{%/.test(v)) out.add(v); } else if (Array.isArray(v)) v.forEach(walk); else if (plain(v)) Object.values(v).forEach(walk); };
  if (data) { walk(data.pages); walk(data.rooms); }
  return [...out];
}
