// Agenda, appliances, history timeline and weather animation.
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { num, relTime, isOn, unavailable } from "./util.js";

/* ---------- agenda (calendar.get_events with response) ---------- */
export async function fetchEvents(hass, calendars, days = 2) {
  if (!calendars?.length) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 86400000);
  try {
    const r = await hass.callWS({ type: "call_service", domain: "calendar", service: "get_events", service_data: { start_date_time: start.toISOString(), end_date_time: end.toISOString() }, target: { entity_id: calendars }, return_response: true });
    const out = [];
    for (const [cal, v] of Object.entries(r?.response || {})) for (const ev of v.events || []) out.push({ ...ev, cal, start: new Date(ev.start), end: new Date(ev.end), allDay: !ev.start.includes("T") });
    return out.sort((a, b) => a.start - b.start);
  } catch (e) { console.warn("[hacasa-nova] calendar.get_events failed", e); return []; }
}
export const eventWhen = ev => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = ev.start >= today && ev.start < new Date(today.getTime() + 86400000) ? t("Vandaag") : ev.start < new Date(today.getTime() + 2 * 86400000) ? t("Morgen") : ev.start.toLocaleDateString(locale(), { weekday: "long" });
  return ev.allDay ? `${day} · ${t("hele dag")}` : `${day} · ${ev.start.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}`;
};
export const nextEvent = events => events.find(ev => ev.end > new Date()) || null;

/* ---------- appliances ----------
   a plug with a power sensor: "running" while power > threshold; "done" after a run until the plug is used again or `doneMinutes` pass.
   a device with an operation-state sensor (Home Connect …): the state comes straight from the appliance. */
const memo = new Map(); // power sensor id -> { running: bool, doneAt: Date|null }
const hm = d => d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
/** `a` is a model appliance ({ power, switch, op, progress, finish }); `thr` the power threshold in W */
export function applianceState(hass, a, thr = 5) {
  return a.op ? opState(hass, a) : powerState(hass, { power: a.power.id, entity: a.switch?.id, threshold: thr });
}
function powerState(hass, a) {
  const pw = num(hass.states[a.power]?.state), thr = a.threshold ?? 5, sw = a.entity ? hass.states[a.entity] : null;
  if (pw == null) return { st: "unknown", label: t("Geen meting"), power: null };
  const m = memo.get(a.power) || { running: false, doneAt: null };
  const on = pw > thr;
  if (on) { m.running = true; m.doneAt = null; }
  else if (m.running) { m.running = false; m.doneAt = new Date(); }
  memo.set(a.power, m);
  if (sw && sw.state === "off") return { st: "off", label: t("Uit"), power: pw };
  if (on) return { st: "running", label: t("Bezig · {w} W", { w: Math.round(pw) }), power: pw };
  if (m.doneAt && (Date.now() - m.doneAt) < (a.doneMinutes ?? 120) * 60000) return { st: "done", label: t("Klaar · {t}", { t: relTime(m.doneAt.toISOString()) }), power: pw, doneAt: m.doneAt };
  return { st: "idle", label: t("Standby"), power: pw };
}
/* Home Connect operation states: inactive, ready, delayedstart, run, pause, actionrequired, finished, error, aborting
   (older versions report "BSH.Common.EnumType.OperationState.Run") */
function opState(hass, a) {
  const os = hass.states[a.op.id], sw = a.switch ? hass.states[a.switch.id] : null, power = a.power ? num(hass.states[a.power.id]?.state) : null;
  const op = String(os?.state ?? "").split(".").pop().toLowerCase();
  const pct = a.progress ? num(hass.states[a.progress.id]?.state) : null;
  const fin = a.finish && !unavailable(hass.states[a.finish.id]) ? new Date(hass.states[a.finish.id].state) : null, end = fin && !isNaN(fin) && fin > Date.now() ? fin : null;
  const base = { power, progress: pct, end };
  if (sw?.state === "off" || op === "inactive" || op === "off") return { ...base, st: "off", label: t("Uit") };
  switch (op) {
    case "run": return { ...base, st: "running", label: pct != null ? t("Bezig · {n}%", { n: Math.round(pct) }) : t("Bezig…") };
    case "aborting": return { ...base, st: "running", label: t("Wordt gestopt…") };
    case "delayedstart": return { ...base, st: "waiting", label: t("Start uitgesteld") };
    case "pause": return { ...base, st: "waiting", label: t("Gepauzeerd") };
    case "actionrequired": return { ...base, st: "alert", label: t("Actie nodig") };
    case "error": return { ...base, st: "alert", label: t("Storing") };
    case "finished": return { ...base, st: "done", label: t("Klaar · {t}", { t: relTime(os.last_changed) }), doneAt: new Date(os.last_changed) };
    case "ready": return { ...base, st: "idle", label: t("Aan") };
  }
  return unavailable(os) ? { ...base, st: "unknown", label: t("Offline") } : { ...base, st: "idle", label: hass.formatEntityState?.(os) ?? os.state };
}
/** "klaar om 19:47" while a program runs, for the card's bottom line */
export const applianceEnd = st => st.end ? t("klaar om {t}", { t: hm(st.end) }) : "";

/* ---------- history timeline for a binary sensor ---------- */
export async function fetchHistory(hass, entityId, hours = 24) {
  const start = new Date(Date.now() - hours * 3600000);
  try {
    const r = await hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: [entityId], minimal_response: true, no_attributes: true });
    return (r?.[entityId] || []).map(x => ({ s: x.s, t: new Date((x.lu || x.lc) * 1000) })).reverse();
  } catch (e) { console.warn("[hacasa-nova] history failed", e); return null; }
}
export const timeline = (rows, kind) => {
  if (rows == null) return html`<div class="sub">${t("Geen geschiedenis beschikbaar")}</div>`;
  const ons = rows.filter(r => r.s === "on").slice(0, 20);
  if (!ons.length) return html`<div class="sub">${t("Niets gebeurd in de laatste 24 uur")}</div>`;
  const word = kind === "motion" ? t("Beweging") : t("Open");
  return html`<ul class="tl">${ons.map(r => html`<li><span>${r.t.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</span><b>${word}</b><small>${relTime(r.t.toISOString())}</small></li>`)}</ul>`;
};

export const extra2Styles = `
  .tl{list-style:none;margin-top:16px;display:flex;flex-direction:column;gap:3px;max-height:40vh;overflow:auto;scrollbar-width:none}
  .tl li{display:grid;grid-template-columns:52px 1fr max-content;gap:10px;align-items:center;padding:9px 12px;border-radius:var(--r-sm);background:rgba(255,255,255,.07);font-size:13px}
  .tl li span{font-weight:700}
  .tl li small{opacity:.6;font-size:11px}
`;
