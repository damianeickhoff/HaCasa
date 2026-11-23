// WashData (ha_washdata, https://github.com/3dg1luk43/ha_washdata), contributed by coasting24 (#192).
// WashData learns the cycles of a washer, dryer or dishwasher from a smart plug's power and reports them on its own
// device. HaCasa shows that device as an appliance card: its "washer_state" sensor plays the part of Home Connect's
// operation state, and the program, progress, time left, phase, maintenance and WashData's own buttons are added.
// Everything WashData-specific lives in this file; the core only asks `a.wd` and calls the functions below.
import { html, nothing } from "lit";
import { t, locale } from "../i18n.js";
import { num, relTime, unavailable } from "../util.js";

/** an entity of the WashData integration */
export const isWashData = e => e?.reg?.platform === "ha_washdata";
/** WashData's state sensor, which stands in for an operation state */
export const isWashDataState = e => isWashData(e) && e.reg.translation_key === "washer_state";

/** the appliance's parts, found by WashData's translation keys among the device's entities */
export function washDataParts(op, own) {
  const tk = k => own.find(e => e.reg.translation_key === k) || null;
  return { op, wd: true, program: tk("washer_program"), progress: tk("cycle_progress"), remain: tk("time_remaining"), phase: tk("current_phase"),
    stop: tk("force_end_cycle"), pause: tk("pause_cycle"), resume: tk("resume_cycle"), unload: tk("mark_unloaded"), maint: tk("maintenance_due"), extra: [], flags: [] };
}

/* WashData states: off, idle, starting, running, paused, user_paused, ending, finished, anti_wrinkle, delay_wait,
   interrupted, force_stopped, clean (dishwasher done, not unloaded yet), unknown. It reports the minutes left (not a
   finish time): the end is counted from when that value was last updated, so it does not creep along with every render */
export function washDataState(hass, a, os, op, base) {
  const rs = a.remain ? hass.states[a.remain.id] : null, rem = rs ? num(rs.state) : null;
  const end = rem != null && rem > 0 ? new Date(new Date(rs.last_updated).getTime() + rem * 60000) : null, b = { ...base, end: end && end > Date.now() ? end : null };
  const pct = b.progress, done = lbl => ({ ...b, st: "done", label: lbl, doneAt: new Date(os.last_changed) });
  switch (op) {
    case "off": return { ...b, st: "off", label: t("Uit") };
    case "idle": return { ...b, st: "idle", label: t("Standby") };
    case "starting": return { ...b, st: "running", label: t("Start…") };
    case "running": return { ...b, st: "running", label: pct != null ? t("Bezig · {n}%", { n: Math.round(pct) }) : t("Bezig…") };
    case "ending": return { ...b, st: "running", label: t("Bijna klaar") };
    case "paused": case "user_paused": return { ...b, st: "waiting", label: t("Gepauzeerd") };
    case "delay_wait": return { ...b, st: "waiting", label: t("Start uitgesteld") };
    case "finished": return done(t("Klaar · {t}", { t: relTime(os.last_changed) }));
    case "anti_wrinkle": return done(t("Kreukbescherming"));
    case "clean": return done(t("Schoon, nog uitruimen"));
    case "interrupted": return { ...b, st: "alert", label: t("Onderbroken") };
    case "force_stopped": return { ...b, st: "idle", label: t("Afgebroken") };
  }
  return unavailable(os) ? { ...b, st: "unknown", label: t("Offline") } : { ...b, st: "idle", label: hass.formatEntityState?.(os) ?? os.state };
}

/** while off or idle WashData's program sensor says "off", with 0 % and 0 W: all noise on the card's bottom line */
export const washDataQuiet = (a, st, prog) => ({ quiet: ["off", "idle", "unknown"].includes(st.st), noProg: /^(off|none|unknown)$/i.test(prog?.state || "") });

/** the popup's buttons: WashData's own, each only while it applies (it marks the others unavailable). Ending a cycle asks first */
export function washDataButtons(p, a, st, title) {
  const hass = p.hass, ok = e => e && hass.states[e.id] && hass.states[e.id].state !== "unavailable", press = e => () => p.call("button", "press", { entity_id: e.id });
  return [
    ...(ok(a.pause) && st.st === "running" ? [{ label: t("Pauzeren"), go: press(a.pause) }] : []),
    ...(ok(a.resume) ? [{ label: t("Hervatten"), on: true, go: press(a.resume) }] : []),
    ...(ok(a.unload) ? [{ label: t("Uitgeruimd"), go: press(a.unload) }] : []),
    ...(ok(a.stop) && ["running", "waiting"].includes(st.st) ? [{ label: t("Cyclus beëindigen"), go: () => p.openPopup({ type: "confirm", title, big: t("Cyclus beëindigen?"), sub: t("WashData sluit de opname nu af; het apparaat zelf blijft gewoon draaien."), okLabel: t("Beëindigen"), ok: press(a.stop) }) }] : []),
  ];
}

/** extra popup rows: the phase, the expected use of this run, the maintenance that is due */
export function washDataRows(p, a, st, li) {
  const hass = p.hass, ph = a.phase && hass.states[a.phase.id], pr = a.progress && hass.states[a.progress.id]?.attributes || {}, mt = a.maint && hass.states[a.maint.id];
  const due = mt?.state === "on" ? (mt.attributes.due_tasks || []).map(x => x.name).filter(Boolean) : [];
  const kwh = num(pr.projected_energy_kwh), cost = num(pr.projected_cost);
  return html`${ph && !unavailable(ph) && ph.state !== "unknown" ? li("mdi:water-sync", t("Fase"), ph.state, { onclick: () => p.moreInfo(a.phase.id) }) : nothing}
    ${kwh != null && ["running", "waiting"].includes(st.st) ? li("mdi:lightning-bolt-outline", t("Verwacht verbruik"), `${kwh.toLocaleString(locale(), { maximumFractionDigits: 2 })} kWh${cost != null ? ` · € ${cost.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}`) : nothing}
    ${due.length ? li("mdi:wrench-clock", t("Onderhoud nodig"), due.join(", "), { on: true, onclick: () => p.moreInfo(a.maint.id) }) : nothing}`;
}
