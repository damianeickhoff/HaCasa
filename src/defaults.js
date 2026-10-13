// Card defaults (settings tab "Kaartstandaarden"): a tile per kind of card with a live preview of one of the user's own
// cards; a tap opens the form for that kind with the preview updating as you choose. The preview renders with
// p._prevDef = {type, draft} (cardCfg then uses the draft and leaves per-card settings out). Changes go into the
// settings draft and are stored with the settings page's Opslaan.
import { html, nothing } from "lit";
import { t } from "./i18n.js";
import { isOn, unavailable } from "./util.js";
import { cardType, lightCaps } from "./cards.js";
import { pills } from "./settings.js";

export const DEFAULT_TYPES = [
  { type: "light", label: "Lampen", icon: "mdi:lightbulb-outline", ents: e => e.lights, bottoms: ["steps", "colors", "today"] },
  { type: "switch", label: "Schakelaars", icon: "mdi:toggle-switch-outline", ents: e => e.switches, bottoms: ["today"] },
  { type: "appliance", label: "Stekkers & apparaten", icon: "mdi:power-plug-outline", ents: e => e.appliances, bottoms: ["timer", "cost", "bars"] },
  { type: "binary_sensor", label: "Deuren, ramen, beweging", icon: "mdi:door", ents: e => [...e.doors, ...e.windows, ...e.motion, ...e.other], bottoms: ["today", "graph"] },
  { type: "climate", label: "Thermostaten", icon: "mdi:thermostat", ents: e => e.climate, bottoms: ["heating", "outside"] },
  { type: "media_player", label: "Media", icon: "mdi:speaker", ents: e => e.media, bottoms: [] },
  { type: "cover", label: "Rolluiken", icon: "mdi:window-shutter", ents: e => e.covers, bottoms: [] },
  { type: "fan", label: "Ventilatoren", icon: "mdi:fan", ents: e => e.fans, bottoms: [] },
  { type: "lock", label: "Sloten", icon: "mdi:lock-outline", ents: e => e.locks, bottoms: [] },
];
const BL = { steps: "helderheid-stappen", colors: "kleuren", today: "vandaag (uren)", graph: "grafiek (aan/uit-lijn)", timer: "timer", cost: "kosten", bars: "verbruik per uur", heating: "vandaag verwarmd", outside: "buitentemperatuur", none: "niets" };
const PRESS = { "": null, toggle: "schakelen", popup: "details openen", more: "Home Assistant-dialoog", none: "niets" };
const canToggle = type => ["light", "switch", "fan", "lock", "appliance"].includes(type);
const BATTERY = ["light", "switch", "binary_sensor", "lock", "cover", "fan"];

/** one of the user's cards of this kind to preview with: available and on (a dimmable light) where possible */
function sampleOf(p, def) {
  let best = null, score = -1;
  for (const r of p.rooms) for (const x of def.ents(r.ents) || []) {
    const s = x.state || p.hass.states[x.id];
    const sc = (s && !unavailable(s) ? 2 : 0) + (isOn(s) || x.on ? 1 : 0) + (def.type === "light" && s && lightCaps(s).dim ? 1 : 0) + (def.type === "binary_sensor" && r.ents.doors.includes(x) ? 1 : 0);
    if (sc > score) { score = sc; best = { room: r, key: x.id }; }
  }
  return best;
}
/** the sample card rendered with `draft` as the defaults of its kind */
export function previewCard(p, def, draft) {
  const smp = sampleOf(p, def); if (!smp) return null;
  p._prevDef = { type: def.type, draft: draft || {} };
  try { return p.roomCards(smp.room, true).find(c => c.key === smp.key && cardType(p, c.key) === def.type)?.tpl || null; } catch (e) { return null; } finally { p._prevDef = null; }
}
/** short line under a tile: what differs from the built-in behaviour */
const summary = c => [c.tap && `${t("tikken")}: ${t(PRESS[c.tap])}`, c.hold && `${t("vasthouden")}: ${t(PRESS[c.hold])}`, c.bottom && `${t("onderaan")}: ${t(BL[c.bottom])}`,
  (c.hideName || c.hideSub || c.hideState) && t("minder tekst"), c.showBattery && t("batterij")].filter(Boolean).join(" · ");

/** the tab content: a grid of tiles */
export function defaultsGrid(p, d) {
  const all = d.cardDefaults || {};
  return html`<div class="dgrid">${DEFAULT_TYPES.map(def => { const c = all[def.type] || {}, pv = previewCard(p, def, c), n = Object.keys(c).length;
    return html`<button class="dtile" @click=${() => p.openPopup({ type: "defaults", ctype: def.type })}>
      <div class="dpv">${pv ? html`<div class="dsc">${pv}</div>` : html`<div class="dnone"><ha-icon icon=${def.icon}></ha-icon><small>${t("geen kaarten van deze soort")}</small></div>`}</div>
      <div class="dl"><b>${t(def.label)}${n ? html`<i>${n}</i>` : nothing}</b><small>${summary(c) || t("standaard")}</small></div>
    </button>`; })}</div>`;
}

/** body of the "defaults" popup: live preview on the left, the choices on the right, Klaar / Herstel at the bottom */
export function defaultsForm(p, pop) {
  const def = DEFAULT_TYPES.find(x => x.type === pop.ctype); if (!def) return nothing;
  const type = def.type, cur = (p.draft?.cardDefaults || p.config.cardDefaults || {})[type] || {}, c = pop.draft || { ...cur };
  const upd = patch => { const next = { ...c, ...patch }; for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]; p.openPopup({ ...pop, draft: next }); };
  const row = (lbl, ctrl, sub) => html`<div class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</div>`;
  const pv = previewCard(p, def, c);
  const apply = next => { const all = { ...(p.draft?.cardDefaults || {}) }; if (next && Object.keys(next).length) all[type] = next; else delete all[type];
    if (p.draft) p.draft = { ...p.draft, cardDefaults: Object.keys(all).length ? all : undefined }; p.popup = null; };
  const tg = canToggle(type);
  return html`<div class="fwrap">
    <div class="pv">
      <div class="ey">${t("Voorbeeld")}<span>${t("live")}</span></div>
      <div class="pvc">${pv || html`<div class="sub">${t("Nog geen kaart van deze soort om te tonen")}</div>`}</div>
      <div class="tip">${t("Tikken")}: <b>${t(PRESS[c.tap || (tg ? "toggle" : "popup")])}</b> · ${t("Vasthouden")}: <b>${t(PRESS[c.hold || "popup"])}</b></div>
      <div class="tip">${t("Geldt voor elke kaart van deze soort, behalve wat je per kaart via ⋯ anders instelt.")}</div>
    </div>
    <div class="form">
      <div class="grp"><div class="sh">${t("Gedrag")}</div>
        ${row(t("Tikken"), pills([{ v: "", l: tg ? t("schakelen") : t("details openen") }, ...(tg ? [{ v: "popup", l: t("details openen") }] : []), { v: "more", l: t("Home Assistant-dialoog") }, { v: "none", l: t("niets") }], c.tap, "", v => upd({ tap: v })))}
        ${row(t("Vasthouden"), pills([{ v: "", l: t("details openen") }, { v: "more", l: t("Home Assistant-dialoog") }, { v: "none", l: t("niets") }], c.hold, "", v => upd({ hold: v })))}
      </div>
      <div class="grp"><div class="sh">${t("Weergave")}</div>
        ${def.bottoms.length ? row(t("Onderaan"), pills([{ v: "", l: t("automatisch") }, { v: "none", l: t("niets") }, ...def.bottoms.map(b => ({ v: b, l: t(BL[b]) }))], c.bottom, "", v => upd({ bottom: v })), t("wat de kaart onderaan toont")) : nothing}
        ${(type === "light" || type === "binary_sensor") && c.bottom === "today" ? row(t("Weergave"), pills([{ v: "", l: t("balkjes per uur") }, { v: "text", l: t("tekst") }], c.todayStyle, "", v => upd({ todayStyle: v }))) : nothing}
        ${row(t("Tonen"), html`<div class="chips">${[["hideName", t("Naam")], ["hideSub", t("Ondertitel")], ["hideState", t("Staat in de hoek")]].map(([k, l]) => html`<button class=${!c[k] ? "on" : ""} @click=${() => upd({ [k]: c[k] ? undefined : true })}>${l}</button>`)}${BATTERY.includes(type) ? html`<button class=${c.showBattery ? "on" : ""} @click=${() => upd({ showBattery: c.showBattery ? undefined : true })}>${t("Batterij")}</button>` : nothing}</div>`, BATTERY.includes(type) ? t("batterij: rechtsonder, als het apparaat er een heeft") : "")}
        ${type === "light" ? row(t("Kleur tonen"), html`<input type="checkbox" .checked=${!c.noColor} @change=${e => upd({ noColor: e.target.checked ? undefined : true })}>`, t("kaart kleurt mee met de lamp")) : nothing}
        ${type === "media_player" ? row(t("Albumhoes tonen"), html`<input type="checkbox" .checked=${!c.noArt} @change=${e => upd({ noArt: e.target.checked ? undefined : true })}>`, t("als achtergrond tijdens afspelen")) : nothing}
        ${type === "climate" ? row(t("Modus-knoppen"), html`<input type="checkbox" .checked=${!c.noMode} @change=${e => upd({ noMode: e.target.checked ? undefined : true })}>`, t("uit / verwarmen / auto op de kaart")) : nothing}
      </div>
    </div>
  </div>
  <div class="foot"><div class="modes n3">
    <button class="on" @click=${() => apply(c)}>${t("Klaar")}</button>
    <button @click=${() => p.openPopup({ ...pop, draft: {} })}>${t("Herstel")}</button>
    <button data-close>${t("Annuleren")}</button>
  </div></div>`;
}
