// Numeric history + sparklines (network card), battery ETA, modes (guest/vacation) and the camera motion timeline.
import { html, nothing, svg } from "lit";
import { t } from "./i18n.js";
import { domain, num, isOn } from "./util.js";
import { pressDir, ico } from "./cards.js";

/* ---------- numeric history (last hours) ---------- */
export async function fetchNumeric(hass, ids, hours = 1) {
  const start = new Date(Date.now() - hours * 3600000);
  try {
    const r = await hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
    const out = {};
    for (const id of ids) out[id] = (r?.[id] || []).map(x => ({ t: (x.lu || x.lc) * 1000, v: num(x.s) })).filter(x => x.v != null);
    return out;
  } catch (e) { console.warn("[hacasa-nova] history failed", e); return {}; }
}
/** tiny area sparkline; rows = [{t, v}] */
export const spark = (rows, w = 160, h = 30) => {
  if (!rows || rows.length < 2) return svg`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" y1="${h - 1}" x2="${w}" y2="${h - 1}" stroke="rgba(255,255,255,.3)" stroke-width="1"/></svg>`;
  const t0 = rows[0].t, t1 = rows[rows.length - 1].t || t0 + 1, max = Math.max(...rows.map(r => r.v), 0.0001);
  const pts = rows.map(r => `${((r.t - t0) / (t1 - t0 || 1) * w).toFixed(1)},${(h - 2 - r.v / max * (h - 4)).toFixed(1)}`);
  return svg`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="0,${h} ${pts.join(" ")} ${w},${h}" fill="rgba(255,255,255,.15)"/><polyline points=${pts.join(" ")} fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
};

/* ---------- network card: download + upload with sparklines (system page) ---------- */
export const pickNet = net => ({ inS: net.find(s => /(_in_|_in$|download|rx|received|ontvangen)/i.test(s.entity_id + " " + (s.attributes.friendly_name || ""))) || null, outS: net.find(s => /(_out_|_out$|upload|tx|sent|verzonden)/i.test(s.entity_id + " " + (s.attributes.friendly_name || ""))) || null });
export function netCard(p, inS, outS) {
  const ids = [inS, outS].filter(Boolean).map(s => s.entity_id);
  if (ids.length && (p._netKey !== ids.join() || !p._netAt || Date.now() - p._netAt > 60000)) p.loadNetHist(ids);
  const hist = p.netHist || {};
  const val = s => s ? `${s.state} ${s.attributes.unit_of_measurement || ""}` : "–";
  return html`<div class="card net" ${pressDir(p, { tap: () => p.moreInfo((inS || outS).entity_id) })}>
    <div class="lines">${sparkLines([inS && hist[inS.entity_id], outS && hist[outS.entity_id]])}</div>
    <div class="n">${t("Netwerk")}</div>
    <div class="s">↓ ${val(inS)} · ↑ ${val(outS)}</div>
    <div class="lbl">${t("laatste uur")}</div>
    <div class="i">${ico("mdi:swap-vertical")}</div>
  </div>`;
}
/** several series as thin lines over the whole card, each scaled to its own maximum */
const sparkLines = (series, w = 320, h = 200) => svg`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${series.map((rows, i) => {
  if (!rows || rows.length < 2) return nothing;
  const t0 = rows[0].t, t1 = rows[rows.length - 1].t || t0 + 1, max = Math.max(...rows.map(r => r.v), 0.0001);
  const pts = rows.map(r => `${((r.t - t0) / (t1 - t0 || 1) * w).toFixed(1)},${(h - 8 - r.v / max * (h * .55)).toFixed(1)}`).join(" ");
  return svg`<polyline points=${pts} fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity=${i ? .35 : .7} stroke-linejoin="round" stroke-linecap="round" stroke-dasharray=${i ? "4 4" : "none"}/>`;
})}</svg>`;

/* ---------- battery ETA from daily statistics ---------- */
export async function batteryEta(hass, ids, days = 30) {
  const start = new Date(Date.now() - days * 86400000);
  try {
    const r = await hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), statistic_ids: ids, period: "day", types: ["mean"] });
    const out = {};
    for (const id of ids) {
      const rows = (r?.[id] || []).map(x => ({ d: new Date(x.start).getTime() / 86400000, v: num(x.mean) })).filter(x => x.v != null);
      if (rows.length < 3) continue;
      const n = rows.length, mx = rows.reduce((a, x) => a + x.d, 0) / n, my = rows.reduce((a, x) => a + x.v, 0) / n;
      const slope = rows.reduce((a, x) => a + (x.d - mx) * (x.v - my), 0) / (rows.reduce((a, x) => a + (x.d - mx) ** 2, 0) || 1);   // % per day
      const cur = rows[n - 1].v;
      out[id] = slope < -0.03 ? { days: Math.round(cur / -slope), slope } : { days: null, slope };
    }
    return out;
  } catch (e) { console.warn("[hacasa-nova] statistics failed", e); return {}; }
}
export const etaText = eta => !eta ? "" : eta.days == null ? t("Stabiel") : eta.days > 365 ? t("> 1 jaar") : eta.days <= 1 ? t("Bijna leeg") : t("Nog ~{n} dagen", { n: eta.days });

/* ---------- modes (guest, vacation, …): a boolean entity per mode, automations in HA do the work ---------- */
export const modeList = p => (p.config.modes || []).filter(m => m.entity && p.hass.states[m.entity]).map(m => ({ ...m, s: p.hass.states[m.entity], on: isOn(p.hass.states[m.entity]) }));
export const toggleMode = (p, m) => p.call(domain(m.entity) === "input_boolean" ? "input_boolean" : "homeassistant", "toggle", { entity_id: m.entity });

export const extra3Styles = `
  .card.net{isolation:isolate}
  .card.net .lines{position:absolute;inset:0;z-index:-1;pointer-events:none}
  .card.net .lines svg{width:100%;height:100%;display:block}
`;
