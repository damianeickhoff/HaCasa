// Graph card: one numeric sensor as a smooth line over the last hours (config.graphs, settings section "Grafieken").
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { num, unavailable } from "./util.js";
import { fetchNumeric } from "./extras3.js";
import { pressDir, pressFor, cardCfg, icoFor, infoCls, ovr, dot, ua } from "./cards.js";

export const GRAPH_HOURS = [3, 6, 12, 24, 48, 168];
const DC_ICON = { temperature: "mdi:thermometer", humidity: "mdi:water-percent", power: "mdi:lightning-bolt-outline", energy: "mdi:lightning-bolt-outline", illuminance: "mdi:brightness-6", pressure: "mdi:gauge", battery: "mdi:battery", carbon_dioxide: "mdi:molecule-co2", pm25: "mdi:blur", signal_strength: "mdi:wifi" };
const UNIT_SVG = { "°C": "thermometer", "°F": "thermometer", "%": "water", W: "lightning", kW: "lightning", kWh: "electric", Wh: "electric", "m³": "gas", lx: "sun" };
const DC_SVG = { temperature: "thermometer", humidity: "water", power: "lightning", energy: "electric", gas: "gas", illuminance: "sun", signal_strength: "access_point", data_rate: "chart", data_size: "chart" };

/** fetch and bucket the history of one sensor: `n` points spread over the last `hours`, gaps carry the previous value */
export async function loadGraph(p, g) {
  const key = g.id, cur = p.graphHist?.[key];
  if (cur && Date.now() - cur.at < 5 * 60000 && cur.hours === g.hours) return;
  if (p._graphBusy?.has(key)) return; (p._graphBusy ||= new Set()).add(key);
  const hours = +g.hours || 24, rows = (await fetchNumeric(p.hass, [g.entity], hours))[g.entity] || [];
  const now = Date.now(), start = now - hours * 3600000, n = Math.min(96, Math.max(24, hours * 4)), step = (now - start) / n;
  const sums = Array(n).fill(0), cnt = Array(n).fill(0);
  for (const r of rows) { const i = Math.min(n - 1, Math.max(0, Math.floor((r.t - start) / step))); sums[i] += r.v; cnt[i]++; }
  const pts = []; let last = null;
  for (let i = 0; i < n; i++) { if (cnt[i]) last = sums[i] / cnt[i]; if (last != null) pts.push(last); }
  const s = p.hass.states[g.entity], live = num(s?.state); if (live != null) { if (pts.length) pts[pts.length - 1] = live; else pts.push(live); }
  const avg = rows.length ? rows.reduce((a, r) => a + r.v, 0) / rows.length : live;
  p.graphHist = { ...(p.graphHist || {}), [key]: { at: Date.now(), hours, pts, avg, min: pts.length ? Math.min(...pts) : null, max: pts.length ? Math.max(...pts) : null } };
  p._graphBusy.delete(key);
}

/** smooth line with a soft fill; the viewBox is stretched, so the stroke keeps its width via vector-effect */
const W = 300, H = 40;
function line(pts) {
  if (!pts || pts.length < 2) return svg`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${H - 2}" y2="${H - 2}" stroke="rgba(255,255,255,.3)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1, pad = 3;
  const xy = pts.map((v, i) => [i / (pts.length - 1) * W, H - pad - (v - lo) / span * (H - 2 * pad)]);
  let d = `M${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) { const [x0, y0] = xy[i - 1], [x1, y1] = xy[i], cx = ((x0 + x1) / 2).toFixed(1); d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
  return svg`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="gfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${W},${H} L0,${H} Z" fill="url(#gfade)"/><path d=${d} fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/** on/off history of a binary sensor as a stepped line in the graph band (uses lightHist, 96 quarter-hour steps) */
export function stepGraph(p, id) {
  const h = p.lightHist?.[id]; if (!h) { p.loadLightHist(id); return html`<div class="gl"></div>`; }
  const st = h.steps || [], n = st.length, pad = 3;
  if (!n) return html`<div class="gl"></div>`;
  const y = v => (H - pad - v * (H - 2 * pad)).toFixed(1);
  let d = `M0,${y(st[0])}`;
  for (let i = 1; i < n; i++) { const x = (i / n * W).toFixed(1); d += ` L${x},${y(st[i - 1])} L${x},${y(st[i])}`; }
  d += ` L${W},${y(st[n - 1])}`;
  return html`<div class="gl">${svg`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" fill="rgba(255,255,255,.14)"/><path d=${d} fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`}<i class="now" style=${`left:100%;top:${(y(st[n - 1]) / H * 100).toFixed(1)}%`}></i></div>`;
}

export const fmtVal = (v, unit) => v == null ? "–" : `${(Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString(locale())}${unit === "°C" || unit === "°F" ? "°" : unit === "%" ? " %" : unit ? " " + unit : ""}`;

export function graphCard(p, g) {
  const id = "graph:" + g.id, cfg = cardCfg(p, id), s = p.hass.states[g.entity], un = unavailable(s), unit = s?.attributes?.unit_of_measurement || "", dc = s?.attributes?.device_class;
  const hours = +g.hours || 24, h = p.graphHist?.[g.id];
  if (s && (!h || Date.now() - h.at > 5 * 60000 || h.hours !== hours)) loadGraph(p, { ...g, hours });
  const pts = h?.pts || [], last = pts.length ? pts[pts.length - 1] : null, lo = h?.min, hi = h?.max, span = (hi - lo) || 1;
  const dotStyle = pts.length > 1 ? `left:100%;top:${(100 - (3 + (last - lo) / span * (H - 6)) / H * 100).toFixed(1)}%` : "display:none";
  const per = hours === 24 ? t("Afgelopen 24 uur") : hours % 24 === 0 ? t("Afgelopen {n} dagen", { n: hours / 24 }) : t("Afgelopen {n} uur", { n: hours });
  return html`<div class=${classMap({ card: true, graph: true, unavailable: un, ...infoCls(cfg) })} ${pressDir(p, pressFor(p, id, null, () => p.moreInfo(g.entity)))}>
    ${un ? ua() : nothing}
    <div class="i">${icoFor(p, id, DC_ICON[dc] || s?.attributes?.icon || "mdi:chart-line", DC_SVG[dc] || UNIT_SVG[unit] || (s?.attributes?.icon ? null : "chart"))}</div>
    <div class="c">${ovr(p, id, "state") ?? (un ? t("Onbereikbaar") : fmtVal(num(s.state), unit))}</div>
    <div class="gl">${line(pts)}<i class="now" style=${dotStyle}></i></div>
    <div class="n">${cfg.name || g.name || s?.attributes?.friendly_name || g.entity}</div>
    <div class="s">${ovr(p, id, "label") ?? (h ? html`${t("Gemiddeld")} <b>${fmtVal(h.avg, unit)}</b>${dot()}${fmtVal(lo, unit)} – ${fmtVal(hi, unit)}` : "…")}</div>
    <div class="lbl"><span>${ovr(p, id, "foot") ?? per}</span></div>
  </div>`;
}

export const graphStyles = `
  /* ===== graph card: the line fills the band under the icon, text block stays where every card has it ===== */
  .card.graph .gl{position:absolute;left:var(--cp);right:var(--cp);top:calc(var(--cp) + 36px + 6px);height:36px;pointer-events:none}
  .card.graph .gl svg{display:block;width:100%;height:100%;overflow:visible}
  .card.graph .gl .now{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
  .card.graph .n{margin-top:58px}
  .card.graph.unavailable .gl{display:none}
  @media (max-width:900px){
    .card.graph .gl{top:calc(var(--cp) + 26px + 4px);height:22px}
    .card.graph .gl .now{width:6px;height:6px;margin:-3px 0 0 -3px}
    .card.graph .n{margin-top:32px}
    .card.graph .s{display:none}   /* phones: the 132px card has no room for the average line under the chart */
  }
`;
