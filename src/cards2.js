// Cards added in 3.2: household (persons), security (alarm, doors, locks, cameras), to-do list, air quality per room,
// EV charging, timers, solar & battery and the garden (irrigation zones), each with its popup, plus the settings for
// the ones that need entities picked (Settings → More cards).
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, tn, locale } from "./i18n.js";
import { domain, num, isOn, unavailable, relTime, sinceText, slug, atHome } from "./util.js";
import { pressDir, ico, anyIco, cardCfg, label, dot, camStream, uico, customActions, hasActs, infoCls, ovr } from "./cards.js";
import { name } from "./model.js";
import { field, select, selectDoms, text, check } from "./settings.js";
import { keypad } from "./extras.js";

const Cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const fmt = (v, d = 1) => v == null ? "–" : v.toLocaleString(locale(), { maximumFractionDigits: d });
const st = (p, id) => id ? p.hass.states[id] || null : null;
const val = (p, id) => num(st(p, id)?.state);
const initial = s => (s.attributes.friendly_name || s.entity_id).trim().charAt(0).toUpperCase();

/* =========================================================== household =========================================================== */
/** where a person is: home, away (with since), or the zone they are in */
export const personWhere = s => atHome(s) ? t("Thuis") : s.state === "not_home" ? t("Weg") : Cap(s.state.replace(/_/g, " "));
/** Proximity (direction_of_travel + distance) or a travel-time sensor named after the person: "on the way · 12 km · 14 min" */
export function personTravel(p, s) {
  const keys = [...new Set([s.entity_id.split(".")[1], slug(s.attributes.friendly_name || "").replace(/-/g, "_"), s.attributes.id ? String(s.attributes.id).toLowerCase() : null, ...(s.attributes.device_trackers || []).map(id => id.split(".")[1])].filter(Boolean))];
  const S = Object.values(p.hass.states), find = re => S.find(x => domain(x.entity_id) === "sensor" && keys.some(kk => x.entity_id.includes(kk)) && re.test(x.entity_id));
  const dir = find(/direction_of_travel$/), dist = find(/_distance$/), eta = find(/(travel_time|time_to_home|_eta$|commute)/);
  if (!dir && !eta) return null;
  const towards = dir ? /towards|naar|approach/i.test(dir.state) : num(eta?.state) != null && num(eta.state) > 0;
  if (!towards) return null;
  const bits = [t("onderweg"), eta && num(eta.state) != null ? `${Math.round(num(eta.state))} min` : null, dist && num(dist.state) != null ? `${fmt(num(dist.state), dist.attributes.unit_of_measurement === "m" ? 0 : 1)} ${dist.attributes.unit_of_measurement || "km"}` : null].filter(Boolean);
  return bits.join(" · ");
}
export function peopleCard(p, h) {
  const list = h.persons, home = list.filter(atHome), away = list.filter(s => !atHome(s));
  const where = s => personTravel(p, s) || (s.state === "not_home" ? t("weg sinds {t}", { t: relTime(s.last_changed) }) : personWhere(s));
  const line = away.length ? away.slice(0, 2).map(s => `${s.attributes.friendly_name} · ${where(s)}`).join(" · ") : t("Iedereen is thuis");
  return html`<div class=${classMap({ card: true, people: true, on: home.length > 0 })} ${pressDir(p, { tap: () => p.openPopup({ type: "people" }) })}>
    <div class="i">${ico("mdi:account-group-outline", "people")}</div>
    <div class="c">${t("{n} van {m} thuis", { n: home.length, m: list.length })}</div>
    <div class="n">${t("Huishouden")}</div>
    <div class="s">${list.map(s => html`<span class=${atHome(s) ? "" : "away"} title=${`${s.attributes.friendly_name} · ${where(s)}`}>${s.attributes.entity_picture ? html`<img src=${s.attributes.entity_picture} alt="">` : initial(s)}</span>`)}</div>
    <div class="lbl"><span>${line}</span></div>
  </div>`;
}

/* =========================================================== security =========================================================== */
const ALARM_LBL = () => ({ disarmed: t("Uit"), armed_home: t("Thuis"), armed_away: t("Weg"), armed_night: t("Nacht"), armed_vacation: t("Vakantie"), arming: t("Inschakelen…"), pending: t("Wachten…"), triggered: t("ALARM") });
export function securityCard(p, h) {
  const alarm = h.alarm, armed = alarm && alarm.state !== "disarmed" && !unavailable(alarm), open = [...h.doorsOpen, ...h.windowsOpen];
  const locks = p.rooms.flatMap(r => r.ents.locks), unlocked = locks.filter(e => e.state?.state !== "locked"), cams = p.rooms.flatMap(r => r.ents.cameras);
  const parts = [alarm ? `${t("Alarm")} ${(ALARM_LBL()[alarm.state] || alarm.state).toLowerCase()}` : null, open.length ? `${name(p.hass, open[0])} ${t("open")}${open.length > 1 ? ` +${open.length - 1}` : ""}` : (h.doors.length || h.windows.length) ? t("alles dicht") : null, locks.length ? (unlocked.length ? `${label(p, unlocked[0])} ${t("niet op slot")}` : t("alles op slot")) : null].filter(Boolean);
  const chip = (svg, n, m, warn) => html`<span class=${classMap({ warn })}>${ico(null, svg)}${n}${m != null ? html`<small>/${m}</small>` : nothing}</span>`;
  return html`<div class=${classMap({ card: true, security: true, on: alarm?.state === "triggered", warn: open.length > 0 || unlocked.length > 0 })} ${pressDir(p, { tap: () => p.openPopup({ type: "security" }) })}>
    <div class="i">${ico("mdi:shield-home-outline", "shield")}</div>
    <div class="c">${alarm ? (ALARM_LBL()[alarm.state] || alarm.state) : open.length ? t("{n} open", { n: open.length }) : t("Veilig")}</div>
    <div class="n">${t("Beveiliging")}</div>
    <div class="s">${parts.join(" · ")}</div>
    <div class="lbl chips secc">${h.doors.length ? chip("door", h.doorsOpen.length, h.doors.length, h.doorsOpen.length > 0) : nothing}${h.windows.length ? chip("window", h.windowsOpen.length, h.windows.length, h.windowsOpen.length > 0) : nothing}${locks.length ? chip(unlocked.length ? "lock_open" : "lock", locks.length - unlocked.length, locks.length, unlocked.length > 0) : nothing}${cams.length ? chip("camera", cams.length, null, false) : nothing}</div>
  </div>`;
}
export function securityPopup(p, pop, wrap, li, modes) {
  const h = p.home, hass = p.hass, alarm = h.alarm, open = [...h.doorsOpen, ...h.windowsOpen], locks = p.rooms.flatMap(r => r.ents.locks.map(e => ({ ...e, room: r }))), cams = p.rooms.flatMap(r => r.ents.cameras.map(e => ({ ...e, room: r })));
  const needsCode = svc => !!alarm?.attributes.code_format && (svc === "alarm_disarm" || alarm.attributes.code_arm_required !== false);
  const call = svc => needsCode(svc) ? p.openPopup({ ...pop, pending: svc, code: "" }) : p.call("alarm_control_panel", svc, { entity_id: alarm.entity_id });
  const big = alarm ? (ALARM_LBL()[alarm.state] || alarm.state) : open.length ? t("{n} open", { n: open.length }) : t("Alles dicht");
  const sub = [open.length ? tn(open.length, "{n} deur of raam open", "{n} deuren of ramen open") : null, locks.length ? tn(locks.filter(e => e.state?.state !== "locked").length, "{n} slot open", "{n} sloten open") : null].filter(Boolean).join(" · ") || t("Deuren, ramen, sloten en camera's");
  return wrap(alarm ? `${t("Beveiliging")} · ${t("Alarm")}` : t("Beveiliging"), big, alarm?.attributes.changed_by ? t("Laatst gewijzigd door {by}, {t}", { by: alarm.attributes.changed_by, t: relTime(alarm.last_changed) }) + " · " + sub : sub, html`
    ${alarm && pop.pending ? keypad(p, pop) : alarm ? modes([{ label: t("Uit"), on: alarm.state === "disarmed", go: () => call("alarm_disarm") }, { label: t("Thuis"), on: alarm.state === "armed_home", go: () => call("alarm_arm_home") }, { label: t("Weg"), on: alarm.state === "armed_away", go: () => call("alarm_arm_away") }, { label: t("Nacht"), on: alarm.state === "armed_night", go: () => call("alarm_arm_night") }]) : nothing}
    ${open.length ? html`<div class="prow"><span>${t("Open")}</span><b>${open.length}</b></div><ul style="margin-top:8px">${open.map(e => li(h.doors.includes(e) ? "mdi:door-open" : "mdi:window-open-variant", name(hass, e), t("Open"), { on: true, sub: `${e.room.name} · ${relTime(e.state?.last_changed)}`, svg: h.doors.includes(e) ? "door" : "window_open", onclick: () => p.go(e.room) }))}</ul>` : nothing}
    ${locks.length ? html`<div class="prow"><span>${t("Sloten")}</span><b>${t("tik = vergrendelen / ontgrendelen")}</b></div><ul style="margin-top:8px">${locks.map(e => { const locked = e.state?.state === "locked"; return li(locked ? "mdi:lock" : "mdi:lock-open-variant", label(p, e), locked ? t("Op slot") : t("Open"), { on: !locked, sub: `${e.room.name} · ${relTime(e.state?.last_changed)}`, svg: locked ? "lock" : "lock_open", onclick: () => p.call("lock", locked ? "unlock" : "lock", { entity_id: e.id }) }); })}</ul>` : nothing}
    ${cams.length ? html`<div class="prow"><span>${t("Camera's")}</span><b>${cams.length}</b></div><div class="camgrid">${cams.map(e => html`<div class="camt" @click=${() => p.openPopup({ type: "camera", s: e.state })}>${e.state?.attributes.entity_picture ? html`<hcn-cam-snap .src=${e.state.attributes.entity_picture} .stream=${camStream(e.state)} .live=${false}></hcn-cam-snap>` : nothing}<b>${label(p, e)}</b></div>`)}</div>` : nothing}`);
}

/* =========================================================== to-do list =========================================================== */
/** the list to show: the chosen one, else a shopping list, else the first to-do entity */
export const todoEntity = p => { const want = cardCfg(p, "todo").entity; if (want && p.hass.states[want]) return want; const ids = Object.keys(p.hass.states).filter(id => domain(id) === "todo" && !p.hass.entities?.[id]?.hidden); return ids.find(id => /shopping|boodschap|einkauf/i.test(id)) || ids[0] || null; };
/** items of a list, fetched once and again whenever the entity updates (its state is the open count, last_updated moves on any change) */
export function todoItems(p, id) {
  const s = p.hass.states[id], cur = p.todo?.[id];
  if (!s) return null;
  if (cur && cur.ver === s.last_updated) return cur.items;
  if (!p._todoBusy?.has(id)) { (p._todoBusy ||= new Set()).add(id);
    p.hass.callWS({ type: "todo/item/list", entity_id: id }).then(r => { p.todo = { ...(p.todo || {}), [id]: { ver: s.last_updated, items: r?.items || [] } }; }).catch(() => { p.todo = { ...(p.todo || {}), [id]: { ver: s.last_updated, items: cur?.items || [] } }; }).finally(() => { p._todoBusy.delete(id); p.requestUpdate(); }); }
  return cur?.items ?? null;
}
const todoSet = (p, id, it, done) => p.call("todo", "update_item", { entity_id: id, item: it.uid || it.summary, status: done ? "completed" : "needs_action" });
export function todoCard(p, id) {
  const s = p.hass.states[id], items = todoItems(p, id), open = (items || []).filter(x => x.status !== "completed"), cfg = cardCfg(p, id);
  const chk = x => html`<div class=${classMap({ chk: true, done: x.status === "completed" })} @click=${ev => { ev.stopPropagation(); todoSet(p, id, x, x.status !== "completed"); }}><i>${x.status === "completed" ? "✓" : ""}</i><span>${x.summary}</span></div>`;
  return html`<div class=${classMap({ card: true, todo: true, on: open.length > 0, acts: hasActs(p, id), ...infoCls(cfg) })} ${pressDir(p, { tap: () => p.openPopup({ type: "todo", id }) })}>
    <div class="i">${uico(cfg.icon, "mdi:checkbox-marked-outline", "check")}</div>
    <div class="c">${ovr(p, id, "state") ?? (items ? (open.length ? tn(open.length, "{n} open", "{n} open") : t("Alles gedaan")) : "…")}</div>
    <div class="n">${cfg.name || s.attributes.friendly_name || t("Boodschappen")}</div>
    <div class="s tlist">${items ? (open.length ? open.slice(0, 3).map(chk) : html`<span class="muted">${t("Niets op de lijst")}</span>`) : html`<span class="muted">${t("Laden…")}</span>`}</div>
    <div class="lbl"><span>${open.length > 3 ? t("+{n} meer", { n: open.length - 3 }) + " · " : ""}${t("tik voor de hele lijst")}</span></div>${customActions(p, id)}
  </div>`;
}
export function todoPopup(p, pop, wrap, li, modes) {
  const id = pop.id, s = p.hass.states[id], items = todoItems(p, id) || [], open = items.filter(x => x.status !== "completed"), done = items.filter(x => x.status === "completed");
  const add = async ev => { const inp = ev.currentTarget.closest(".tadd").querySelector("input"), v = inp.value.trim(); if (!v) return; inp.value = ""; await p.call("todo", "add_item", { entity_id: id, item: v }); };
  return wrap(t("Lijst"), cardCfg(p, id).name || s?.attributes.friendly_name || t("Boodschappen"), open.length ? tn(open.length, "{n} open", "{n} open") + (done.length ? ` · ${tn(done.length, "{n} afgerond", "{n} afgerond")}` : "") : t("Niets op de lijst"), html`
    <div class="tadd"><input type="text" placeholder=${t("Toevoegen…")} @keydown=${ev => { if (ev.key === "Enter") add(ev); }}><button @click=${add}><ha-icon icon="mdi:plus"></ha-icon></button></div>
    <ul>${open.map(x => li("mdi:checkbox-blank-outline", x.summary, "", { onclick: () => todoSet(p, id, x, true), sub: x.due ? t("voor {d}", { d: new Date(x.due).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" }) }) : "" }))}
      ${done.map(x => li("mdi:checkbox-marked-outline", html`<s>${x.summary}</s>`, "", { on: true, onclick: () => todoSet(p, id, x, false) }))}</ul>
    ${done.length ? modes([{ label: t("Afgeronde wissen"), go: () => p.call("todo", "remove_completed_items", { entity_id: id }) }], "n2") : nothing}`);
}

/* =========================================================== air quality =========================================================== */
export const AIR_CLASSES = ["carbon_dioxide", "volatile_organic_compounds", "volatile_organic_compounds_parts", "pm25", "pm10", "pm1", "aqi", "nitrogen_dioxide", "ozone"];
const AIR = { carbon_dioxide: { l: "CO₂", good: 800, mid: 1200 }, volatile_organic_compounds: { l: "VOC", good: 300, mid: 1000 }, volatile_organic_compounds_parts: { l: "VOC", good: 220, mid: 660 }, pm25: { l: "PM2.5", good: 12, mid: 35 }, pm10: { l: "PM10", good: 25, mid: 50 }, pm1: { l: "PM1", good: 10, mid: 25 }, aqi: { l: "AQI", good: 50, mid: 100 }, nitrogen_dioxide: { l: "NO₂", good: 40, mid: 100 }, ozone: { l: "O₃", good: 60, mid: 120 } };
/** 0 good · 1 so-so · 2 bad */
const airRate = (dc, v) => v == null ? 0 : dc === "humidity" ? (v >= 30 && v <= 60 ? 0 : v >= 25 && v <= 70 ? 1 : 2) : v <= AIR[dc].good ? 0 : v <= AIR[dc].mid ? 1 : 2;
const RATE = () => [t("Goed"), t("Matig"), t("Slecht")];
/** the readings of a room: the air sensors plus its humidity, each with a rating */
export function airReadings(p, r) {
  const out = r.ents.air.map(e => { const dc = e.state?.attributes.device_class, v = num(e.state?.state); return { e, dc, l: AIR[dc]?.l || dc, v, unit: e.state?.attributes.unit_of_measurement || "", rate: unavailable(e.state) ? 0 : airRate(dc, v), un: unavailable(e.state) }; });
  if (r.hum != null) out.push({ e: r.ents.hum[0], dc: "humidity", l: t("Vocht"), v: r.hum, unit: "%", rate: airRate("humidity", r.hum), un: false });
  const order = ["carbon_dioxide", "pm25", "volatile_organic_compounds", "volatile_organic_compounds_parts", "aqi", "pm10", "pm1", "nitrogen_dioxide", "ozone", "humidity"];
  return out.sort((a, b) => order.indexOf(a.dc) - order.indexOf(b.dc));
}
const airAdvice = rd => { const co2 = rd.find(x => x.dc === "carbon_dioxide"), worst = [...rd].sort((a, b) => b.rate - a.rate)[0];
  if (co2 && co2.rate === 2) return t("CO₂ is hoog: zet een raam open"); if (co2 && co2.rate === 1) return t("CO₂ loopt op, even luchten helpt");
  if (worst?.rate === 2) return t("{what} is hoog", { what: worst.l }); if (worst?.rate === 1) return t("{what} is aan de hoge kant", { what: worst.l }); return t("Frisse lucht"); };
export function airCard(p, r) {
  const rd = airReadings(p, r), rate = Math.max(0, ...rd.map(x => x.rate)), key = "air", cfg = cardCfg(p, key);
  return html`<div class=${classMap({ card: true, air: true, bad: rate === 2, ...infoCls(cfg) })} ${pressDir(p, { tap: () => p.openPopup({ type: "air", roomId: r.id }) })}>
    <div class="i">${uico(cfg.icon, "mdi:air-filter", "air_purifier")}</div>
    <div class="c"><em class=${`rt r${rate}`}>${RATE()[rate]}</em></div>
    <div class="n">${cfg.name || t("Luchtkwaliteit")}</div>
    <div class="s">${airAdvice(rd)}</div>
    <div class="lbl gauges">${rd.slice(0, 4).map(x => html`<div class=${`r${x.rate}`}><b>${x.un ? "–" : fmt(x.v, x.v != null && x.v < 10 ? 1 : 0)}</b><small>${x.l}</small></div>`)}</div>
  </div>`;
}
export function airPopup(p, pop, wrap, li) {
  const r = p.rooms.find(x => x.id === pop.roomId); if (!r) return nothing;
  const rd = airReadings(p, r), rate = Math.max(0, ...rd.map(x => x.rate));
  return wrap(r.name, RATE()[rate], airAdvice(rd), html`<ul>${rd.map(x => li(x.dc === "carbon_dioxide" ? "mdi:molecule-co2" : x.dc === "humidity" ? "mdi:water-percent" : x.dc?.startsWith("pm") ? "mdi:blur" : "mdi:air-filter", x.l, x.un ? t("Onbereikbaar") : `${fmt(x.v, x.v != null && x.v < 10 ? 1 : 0)} ${x.unit}`, { on: x.rate > 0, sub: `${RATE()[x.rate]} · ${name(p.hass, x.e)}`, onclick: () => p.moreInfo(x.e.id) }))}</ul>
    <div class="sub" style="margin-top:14px">${t("Goed tot {co2} ppm CO₂, {pm} µg/m³ fijnstof en 30–60% vocht.", { co2: AIR.carbon_dioxide.good, pm: AIR.pm25.good })}</div>`);
}

/* =========================================================== EV charging =========================================================== */
const evCfg = p => cardCfg(p, "ev");
export const evReady = p => !!st(p, evCfg(p).battery);
/** charging: a binary sensor that is on, a sensor saying charging, or more than 100 W going in */
function evState(p) {
  const c = evCfg(p), soc = val(p, c.battery), rng = val(p, c.range), pw = val(p, c.power), chS = st(p, c.charging), plug = st(p, c.plug);
  const powerW = pw != null ? (st(p, c.power)?.attributes.unit_of_measurement === "kW" ? pw * 1000 : pw) : null;
  const charging = chS ? (isOn(chS) || /charg|laden|laadt/i.test(chS.state) && !/not|niet|disconnect|complete|done|klaar/i.test(chS.state)) : powerW != null ? powerW > 100 : false;
  const plugged = plug ? isOn(plug) || plug.state === "connected" : charging;
  const fin = st(p, c.finish); const finAt = fin && !unavailable(fin) && !isNaN(new Date(fin.state)) && new Date(fin.state) > Date.now() ? new Date(fin.state) : null;
  const sw = st(p, c.switch);
  return { soc, rng, powerW, charging, plugged, finAt, sw, name: c.name || (st(p, c.battery)?.attributes.friendly_name || "").replace(/ battery| accu| batterij/i, "") || t("Auto") };
}
export function evCard(p) {
  const e = evState(p), c = evCfg(p), key = "ev", cfg = cardCfg(p, key);
  const line = e.charging ? [t("Laadt"), e.powerW != null ? `${fmt(e.powerW / 1000, 1)} kW` : null, e.finAt ? t("klaar om {t}", { t: e.finAt.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) }) : null].filter(Boolean).join(" · ") : e.plugged ? t("Aangesloten, laadt niet") : t("Niet aangesloten");
  const sw = e.sw ? html`<div class="ctl row" @click=${ev => ev.stopPropagation()}><button class=${classMap({ on: isOn(e.sw) })} @click=${() => p.call(domain(c.switch) === "input_boolean" ? "input_boolean" : "switch", "toggle", { entity_id: c.switch })}><ha-icon icon=${isOn(e.sw) ? "mdi:stop" : "mdi:ev-station"}></ha-icon>${isOn(e.sw) ? t("Stop") : t("Laden")}</button></div>` : nothing;
  return html`<div class=${classMap({ card: true, ev: true, on: e.charging, appl: !!e.sw, ...infoCls(cfg) })} style=${`--soc:${Math.max(0, Math.min(100, e.soc ?? 0))}`} ${pressDir(p, { tap: () => p.openPopup({ type: "ev" }) })}>
    <div class="i">${uico(cfg.icon, "mdi:car-electric-outline", "ev_charger")}</div>
    <div class="c">${ovr(p, key, "state") ?? (e.charging ? t("Laadt") : e.plugged ? t("Aangesloten") : t("Auto"))}</div>
    <div class="ring"><b>${e.soc != null ? Math.round(e.soc) : "–"}<small>%</small></b></div>
    <div class="s big">${e.soc != null ? Math.round(e.soc) : "–"}<small>%</small>${e.rng != null ? html`<em>${fmt(e.rng, 0)} ${st(p, c.range)?.attributes.unit_of_measurement || "km"}</em>` : nothing}</div>
    <div class="n">${cfg.name || e.name}</div>
    <div class="meta">${ovr(p, key, "label") ?? line}</div>
    ${sw}
  </div>`;
}
export function evPopup(p, wrap, li, modes) {
  const e = evState(p), c = evCfg(p), hm = d => d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  const row = (id, mdi, lbl, v, sub) => st(p, id) ? li(mdi, lbl, v, { sub, onclick: () => p.moreInfo(id) }) : nothing;
  return wrap(t("Auto"), e.name, [e.soc != null ? `${Math.round(e.soc)}%` : null, e.rng != null ? `${fmt(e.rng, 0)} ${st(p, c.range)?.attributes.unit_of_measurement || "km"}` : null, e.charging ? t("laadt") : e.plugged ? t("aangesloten") : t("niet aangesloten")].filter(Boolean).join(" · "), html`
    ${e.sw ? modes([{ label: isOn(e.sw) ? t("Stop met laden") : t("Start laden"), on: isOn(e.sw), go: () => p.call(domain(c.switch) === "input_boolean" ? "input_boolean" : "switch", "toggle", { entity_id: c.switch }) }], "n2") : nothing}
    <div class="evbar"><i style=${`width:${Math.max(0, Math.min(100, e.soc ?? 0))}%`}></i></div>
    <ul>${row(c.battery, "mdi:battery-charging-70", t("Accu"), `${Math.round(e.soc ?? 0)}%`, relTime(st(p, c.battery)?.last_updated))}${row(c.range, "mdi:map-marker-distance", t("Bereik"), `${fmt(e.rng, 0)} ${st(p, c.range)?.attributes.unit_of_measurement || "km"}`)}${row(c.power, "mdi:flash-outline", t("Laadvermogen"), e.powerW != null ? `${fmt(e.powerW / 1000, 1)} kW` : "–")}${e.finAt ? li("mdi:clock-end", t("Klaar om"), hm(e.finAt)) : nothing}${row(c.charging, "mdi:ev-station", t("Laden"), e.charging ? t("Ja") : t("Nee"))}${row(c.plug, "mdi:power-plug-outline", t("Aangesloten"), e.plugged ? t("Ja") : t("Nee"))}</ul>`);
}

/* =========================================================== timers =========================================================== */
export const timerList = p => Object.values(p.hass.states).filter(s => domain(s.entity_id) === "timer" && !p.hass.entities?.[s.entity_id]?.hidden).sort((a, b) => (a.state === "active" ? 0 : 1) - (b.state === "active" ? 0 : 1) || (a.attributes.friendly_name || "").localeCompare(b.attributes.friendly_name || ""));
const timerLeft = s => { if (s.state === "active" && s.attributes.finishes_at) return Math.max(0, Math.round((new Date(s.attributes.finishes_at) - Date.now()) / 1000)); if (s.state === "paused" && s.attributes.remaining) return hms(s.attributes.remaining); return null; };
const hms = str => { const m = /^(\d+):(\d+):(\d+)/.exec(str || ""); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null; };
const mmss = sec => sec == null ? "" : sec >= 3600 ? `${Math.floor(sec / 3600)}:${String(Math.floor(sec % 3600 / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const dur = min => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`;
const timerStart = (p, id, min) => p.call("timer", "start", { entity_id: id, duration: dur(min) });
/** a one-second re-render while something counts (timers, a playing track); each caller holds its own key */
export function liveTick(p, key, on) {
  const set = p._live || (p._live = new Set()); if (on) set.add(key); else set.delete(key);
  if (set.size && !p._liveT) p._liveT = setInterval(() => { if (!p.isConnected) { clearInterval(p._liveT); p._liveT = null; return; } p.requestUpdate(); }, 1000);
  if (!set.size && p._liveT) { clearInterval(p._liveT); p._liveT = null; }
}
export function timersCard(p) {
  const list = timerList(p), active = list.filter(s => s.state === "active"), key = "timers", cfg = cardCfg(p, key);
  const first = active[0] || list[0];
  liveTick(p, "timers", active.length > 0);
  return html`<div class=${classMap({ card: true, timers: true, on: active.length > 0, ...infoCls(cfg) })} ${pressDir(p, { tap: () => p.openPopup({ type: "timers" }) })}>
    <div class="i">${uico(cfg.icon, "mdi:timer-outline", "timer")}</div>
    <div class="c">${ovr(p, key, "state") ?? (active.length ? tn(active.length, "{n} loopt", "{n} lopen") : t("Geen actief"))}</div>
    <div class="n">${cfg.name || t("Timers")}</div>
    <div class="s trows">${list.slice(0, 3).map(s => html`<div class=${classMap({ on: s.state === "active" })}><span>${s.attributes.friendly_name || s.entity_id}</span><b>${s.state === "active" ? mmss(timerLeft(s)) : s.state === "paused" ? `${mmss(timerLeft(s))} ⏸` : t("klaar")}</b></div>`)}${!list.length ? html`<div><span>${t("Geen timers in Home Assistant")}</span></div>` : nothing}</div>
    ${first ? html`<div class="lbl chips" @click=${ev => ev.stopPropagation()}>${first.state === "active" ? [5, 15, 60].map(m => html`<button @click=${() => p.call("timer", "change", { entity_id: first.entity_id, duration: dur(m) })}>+${m}</button>`) : [5, 15, 60].map(m => html`<button @click=${() => timerStart(p, first.entity_id, m)}>${m}</button>`)}<span>${first.state === "active" ? t("min erbij") : t("min · {n}", { n: first.attributes.friendly_name || "" })}</span></div>` : nothing}
  </div>`;
}
export function timersPopup(p, wrap, li, modes) {
  const list = timerList(p), active = list.filter(s => s.state === "active");
  liveTick(p, "timers", active.length > 0);
  const row = s => { const left = timerLeft(s), nm = s.attributes.friendly_name || s.entity_id;
    return html`<div class=${classMap({ trow: true, on: s.state === "active" })}>
      <div class="tn">${nm}<small>${s.state === "active" ? t("klaar om {t}", { t: new Date(s.attributes.finishes_at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) }) : s.state === "paused" ? t("gepauzeerd") : t("staat stil")}${s.attributes.duration ? ` · ${s.attributes.duration}` : ""}</small></div>
      <b class="tv">${left != null ? mmss(left) : "–"}</b>
      <div class="tb">${s.state === "active" ? html`<button @click=${() => p.call("timer", "pause", { entity_id: s.entity_id })}><ha-icon icon="mdi:pause"></ha-icon></button><button @click=${() => p.call("timer", "change", { entity_id: s.entity_id, duration: dur(5) })}>+5</button><button @click=${() => p.call("timer", "cancel", { entity_id: s.entity_id })}><ha-icon icon="mdi:close"></ha-icon></button>`
        : s.state === "paused" ? html`<button class="on" @click=${() => p.call("timer", "start", { entity_id: s.entity_id })}><ha-icon icon="mdi:play"></ha-icon></button><button @click=${() => p.call("timer", "cancel", { entity_id: s.entity_id })}><ha-icon icon="mdi:close"></ha-icon></button>`
        : [5, 15, 30, 60].map(m => html`<button @click=${() => timerStart(p, s.entity_id, m)}>${m}</button>`)}</div>
    </div>`; };
  return wrap(t("Timers"), active.length ? tn(active.length, "{n} loopt", "{n} lopen") : t("Geen timer actief"), list.length ? t("tik op een getal om te starten (minuten)") : t("Maak een timer-helper aan in Home Assistant"), html`<div class="trows2">${list.map(row)}</div>`);
}

/* =========================================================== solar & battery =========================================================== */
const enCfg = p => p.config.home?.energy || {};
export const solarReady = p => !!st(p, enCfg(p).solar);
/** power sensors in W (kW sensors are scaled) */
const watts = (p, id) => { const s = st(p, id), v = num(s?.state); return v == null ? null : s.attributes.unit_of_measurement === "kW" ? v * 1000 : v; };
/** what flows where: solar, house, grid (positive = import), battery (positive = charging) */
export function energyFlow(p) {
  const en = enCfg(p), solar = watts(p, en.solar), batt = watts(p, en.batteryPower), soc = val(p, en.battery), pw = watts(p, en.power);
  if (pw == null && solar == null) return null;
  const battIn = en.batteryInverted ? -(batt ?? 0) : (batt ?? 0);
  // "power" is the grid meter (default) or the house total; the other follows from solar and battery
  let grid, house;
  if (en.powerIs === "house") { house = pw; grid = pw != null ? pw - (solar ?? 0) + battIn : null; } else { grid = pw; house = pw != null ? pw + (solar ?? 0) - battIn : solar != null ? solar - battIn : null; }
  const own = house > 0 ? Math.max(0, Math.min(1, ((solar ?? 0) + Math.max(0, -battIn) - Math.max(0, -(grid ?? 0))) / house)) : null;
  return { solar, grid, house, batt: batt == null ? null : battIn, soc, own };
}
export function solarCard(p) {
  const en = enCfg(p), f = energyFlow(p), key = "solar", cfg = cardCfg(p, key), today = val(p, en.solarToday), eh = p.energyHist || {};
  if (en.solarToday && (!eh.at || Date.now() - eh.at > 10 * 60000)) p.loadEnergyToday();
  const rows = eh.sol || [], max = Math.max(...rows.map(r => r.v || 0), 0.001);
  const meta = [today != null ? t("Vandaag {n} kWh", { n: fmt(today) }) : null, f?.soc != null ? t("accu {n}%", { n: Math.round(f.soc) }) : null, f?.grid != null && f.grid < -20 ? t("{w} W naar het net", { w: fmt(-f.grid, 0) }) : null].filter(Boolean);
  return html`<div class=${classMap({ card: true, plug: true, solar: true, on: (f?.solar ?? 0) > 20, ...infoCls(cfg) })} ${pressDir(p, { tap: () => p.openPopup({ type: "energy" }) })}>
    <div class="i">${uico(cfg.icon, "mdi:solar-power-variant-outline", "solar")}</div>
    <div class="c">${ovr(p, key, "state") ?? (f?.own != null ? t("{n}% eigen stroom", { n: Math.round(f.own * 100) }) : t("Zon"))}</div>
    <div class="s big">${f?.solar != null ? fmt(f.solar, 0) : "–"}<small>W</small></div>
    <div class="n">${cfg.name || t("Zon")}</div>
    <div class="meta">${ovr(p, key, "label") ?? meta.map((x, i) => html`${i ? dot() : nothing}${x}`)}</div>
    ${rows.length ? html`<div class="lbl bars">${rows.map(r => html`<i class=${classMap({ on: r.v > 0.01, sun: true })} style="height:${Math.max(9, (r.v || 0) / max * 100)}%"></i>`)}</div>` : f?.soc != null ? html`<div class="lbl"><span>${t("Accu {n}%", { n: Math.round(f.soc) })}${f.batt ? html`${dot()}${f.batt > 0 ? t("laadt") : t("ontlaadt")} ${fmt(Math.abs(f.batt), 0)} W` : nothing}</span></div>` : nothing}
  </div>`;
}

/* =========================================================== garden / irrigation =========================================================== */
const gardenCfg = p => cardCfg(p, "garden");
export const gardenReady = p => (gardenCfg(p).zones || []).some(id => st(p, id));
const zoneOn = s => isOn(s) || s?.state === "open";
const zoneToggle = (p, id) => { const s = st(p, id); const d = domain(id); if (d === "valve") return p.call("valve", zoneOn(s) ? "close_valve" : "open_valve", { entity_id: id }); return p.call(d === "input_boolean" ? "input_boolean" : "switch", "toggle", { entity_id: id }); };
export function gardenCard(p) {
  const c = gardenCfg(p), zones = (c.zones || []).map(id => st(p, id)).filter(Boolean), on = zones.filter(zoneOn), key = "garden", cfg = cardCfg(p, key);
  const next = st(p, c.next), rain = val(p, c.rain), nextTxt = next && !unavailable(next) ? (next.attributes.device_class === "timestamp" && !isNaN(new Date(next.state)) ? relTime(next.state).replace(/^(\d)/, t("over") + " $1") : next.state) : null;
  const zname = s => (cardCfg(p, s.entity_id).name || s.attributes.friendly_name || s.entity_id).replace(/\b(sproei|irrigat|zone)\w*/gi, "").trim() || s.attributes.friendly_name;
  const line = [on.length ? t("Bezig: {z}", { z: on.map(zname).join(", ") }) : null, nextTxt ? t("Volgende {t}", { t: nextTxt }) : null, rain != null ? t("{n} mm regen vandaag", { n: fmt(rain) }) : null].filter(Boolean);
  return html`<div class=${classMap({ card: true, garden: true, on: on.length > 0, ...infoCls(cfg) })} ${pressDir(p, { tap: () => p.openPopup({ type: "garden" }) })}>
    <div class="i">${uico(cfg.icon, "mdi:sprinkler-variant", "plant")}</div>
    <div class="c">${ovr(p, key, "state") ?? (on.length ? tn(on.length, "{n} zone aan", "{n} zones aan") : t("Uit"))}</div>
    <div class="n">${cfg.name || t("Tuin")}</div>
    <div class="s">${ovr(p, key, "label") ?? (line.length ? line.map((x, i) => html`${i ? dot() : nothing}${x}`) : t("Sproeien per zone"))}</div>
    <div class="lbl chips" @click=${ev => ev.stopPropagation()}>${zones.slice(0, 4).map(s => html`<button class=${classMap({ on: zoneOn(s) })} @click=${() => zoneToggle(p, s.entity_id)}>${zname(s)}</button>`)}</div>
  </div>`;
}
export function gardenPopup(p, wrap, li, modes) {
  const c = gardenCfg(p), zones = (c.zones || []).map(id => st(p, id)).filter(Boolean), on = zones.filter(zoneOn), next = st(p, c.next), rain = st(p, c.rain);
  return wrap(t("Tuin"), on.length ? tn(on.length, "{n} zone aan", "{n} zones aan") : t("Uit"), t("tik op een zone om te starten of stoppen"), html`
    ${on.length ? modes([{ label: t("Alles uit"), go: () => on.forEach(s => zoneToggle(p, s.entity_id)) }], "n2") : nothing}
    <ul>${zones.map(s => li(zoneOn(s) ? "mdi:water" : "mdi:water-outline", cardCfg(p, s.entity_id).name || s.attributes.friendly_name, zoneOn(s) ? t("Aan") : t("Uit"), { on: zoneOn(s), sub: sinceText(s.last_changed), onclick: () => zoneToggle(p, s.entity_id) }))}
      ${next ? li("mdi:calendar-clock", t("Volgende beurt"), next.attributes.device_class === "timestamp" && !isNaN(new Date(next.state)) ? new Date(next.state).toLocaleString(locale(), { weekday: "short", hour: "2-digit", minute: "2-digit" }) : next.state, { onclick: () => p.moreInfo(next.entity_id) }) : nothing}
      ${rain ? li("mdi:weather-rainy", t("Regen vandaag"), `${rain.state} ${rain.attributes.unit_of_measurement || "mm"}`, { onclick: () => p.moreInfo(rain.entity_id) }) : nothing}</ul>`);
}

/* =========================================================== card settings of the panel's own cards =========================================================== */
const zoneLike = s => /sproei|irrig|beregen|water|tuin|garden|zone|kraan|valve|sprinkler|lawn|gazon|border|pot/i.test(s.entity_id + " " + (s.attributes.friendly_name || ""));
/** the fields the Car, Garden and List cards need, drawn inside the card settings form (saved as cards[key]) */
export function panelCardFields(p, key, draft, upd, row) {
  const hass = p.hass, W = s => ["W", "kW"].includes(s.attributes.unit_of_measurement), PCT = s => s.attributes.unit_of_measurement === "%";
  const set = (k2, v) => upd({ [k2]: v || undefined });
  if (key === "todo") return row(t("Lijst"), select(hass, "todo", draft.entity, v => set("entity", v), { empty: t("automatisch (boodschappenlijst)") }), t("elke to-do-entiteit, ook de boodschappenlijst van Home Assistant"));
  if (key === "ev") return html`
    ${row(t("Accu"), select(hass, "sensor", draft.battery, v => set("battery", v), { empty: t("kies"), filter: PCT }), t("de kaart verschijnt zodra de accu is gekozen"))}
    ${row(t("Bereik"), select(hass, "sensor", draft.range, v => set("range", v), { empty: t("geen"), filter: s => /km|mi/.test(s.attributes.unit_of_measurement || "") }))}
    ${row(t("Laadvermogen"), select(hass, "sensor", draft.power, v => set("power", v), { empty: t("geen"), filter: W }), "W / kW")}
    ${row(t("Laadt"), selectDoms(hass, ["binary_sensor", "sensor"], draft.charging, v => set("charging", v), t("afleiden uit het vermogen")), t("binary sensor of een status-sensor"))}
    ${row(t("Aangesloten"), select(hass, "binary_sensor", draft.plug, v => set("plug", v), { empty: t("geen") }))}
    ${row(t("Klaar om"), select(hass, "sensor", draft.finish, v => set("finish", v), { empty: t("geen"), filter: s => s.attributes.device_class === "timestamp" }), t("tijdstip waarop de accu vol is"))}
    ${row(t("Laden aan/uit"), selectDoms(hass, ["switch", "input_boolean"], draft.switch, v => set("switch", v), t("geen")), t("knop op de kaart"))}`;
  if (key === "garden") {
    const all = Object.values(hass.states).filter(s => ["switch", "valve", "input_boolean"].includes(domain(s.entity_id))).sort((x, y) => (x.attributes.friendly_name || "").localeCompare(y.attributes.friendly_name || ""));
    const zones = draft.zones || [], showAll = !!p._zonesAll, cands = all.filter(s => showAll || zoneLike(s) || zones.includes(s.entity_id));
    return html`
      ${row(t("Zones"), html`<div class="chips">${cands.map(s => { const on = zones.includes(s.entity_id); return html`<button class=${on ? "on" : ""} title=${s.entity_id} @click=${() => set("zones", on ? zones.filter(x => x !== s.entity_id) : [...zones, s.entity_id])}>${s.attributes.friendly_name || s.entity_id}</button>`; })}${cands.length < all.length ? html`<button class="more" @click=${() => { p._zonesAll = true; p.requestUpdate(); }}>${t("alle schakelaars…")}</button>` : nothing}${!cands.length ? html`<small>${t("Geen schakelaars of kranen gevonden")}</small>` : nothing}</div>`, t("de schakelaars of kranen van de sproeiers; {n} gekozen", { n: zones.length }))}
      ${row(t("Volgende beurt"), select(hass, "sensor", draft.next, v => set("next", v), { empty: t("geen") }), t("tijdstip of tekst"))}
      ${row(t("Regen vandaag"), select(hass, "sensor", draft.rain, v => set("rain", v), { empty: t("geen"), filter: s => /mm/.test(s.attributes.unit_of_measurement || "") }))}`;
  }
  return nothing;
}
/** solar and battery sensors, under Settings → Energy */
export function solarSettings(p, d, setEnergy, field) {
  const hass = p.hass, en = d.home?.energy || {}, W = s => ["W", "kW"].includes(s.attributes.unit_of_measurement), PCT = s => s.attributes.unit_of_measurement === "%";
  return html`
    ${field(t("Zonvermogen nu"), select(hass, "sensor", en.solar, v => setEnergy("solar", v), { empty: t("geen"), filter: W }), t("zonnekaart op de startpagina en de stroomverdeling in de energie-popup"))}
    ${field(t("Zon vandaag"), select(hass, "sensor", en.solarToday, v => setEnergy("solarToday", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "kWh" }), "kWh")}
    ${field(t("Thuisaccu"), select(hass, "sensor", en.battery, v => setEnergy("battery", v), { empty: t("geen"), filter: PCT }), "%")}
    ${field(t("Accuvermogen"), select(hass, "sensor", en.batteryPower, v => setEnergy("batteryPower", v), { empty: t("geen"), filter: W }), t("positief = laden"))}
    ${field(t("Accu omgekeerd"), check(!!en.batteryInverted, v => setEnergy("batteryInverted", v || undefined)), t("als de sensor positief is bij ontladen"))}
    ${field(t("Vermogen-sensor meet"), html`<div class="seg">${[["grid", t("het net (slimme meter)")], ["house", t("het hele huis")]].map(([v, l]) => html`<button class=${(en.powerIs || "grid") === v ? "on" : ""} @click=${() => setEnergy("powerIs", v === "grid" ? undefined : v)}>${l}</button>`)}</div>`, t("de sensor Vermogen nu hierboven"))}`;
}

export const cards2Styles = `
  /* household: avatars in the middle, who is away at the bottom */
  .card.people{grid-template-areas:"i c" ". ." "s s" "n n" ". ." "l l"}
  .card.people .s{overflow:visible;margin:0 0 8px;grid-area:s;gap:8px}
  .card.people .n{grid-area:n}
  .card.people .s span{flex:none;width:38px;height:38px;font-size:14px}
  .card.people .s span.away{opacity:.45;filter:grayscale(1)}
  .card.people .lbl{text-transform:none;letter-spacing:0;font-size:12px;font-weight:500}
  /* security chips */
  .card .lbl.chips.secc{align-items:center}
  .card .lbl.chips.secc span{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);font-size:11px;font-weight:700;letter-spacing:0;line-height:1;color:var(--fg-2)}
  .card .lbl.chips.secc span img.ico{width:14px;height:14px;opacity:.85}
  .card .lbl.chips.secc span small{font-size:10px;opacity:.6;line-height:1;margin-left:-3px}
  .card .lbl.chips.secc span.warn{background:rgba(242,122,92,.35);color:#ffd9cf;border-color:transparent}
  .card.security.warn .c{color:#ffb8a6}
  .popup .camgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px}
  .popup .camt{position:relative;height:110px;border-radius:var(--r-sm);overflow:hidden;background:rgba(0,0,0,.3);cursor:pointer}
  .popup .camt hcn-cam-snap{position:absolute;inset:0}
  .popup .camt b{position:absolute;left:10px;bottom:8px;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.7)}
  /* to-do: check rows inside the card */
  .card.todo .tlist{white-space:normal;display:flex;flex-direction:column;gap:3px;margin-top:8px;overflow:hidden}
  .card.todo .chk{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:#fff;min-width:0;padding:2px 0;cursor:pointer}
  .card.todo .chk i{width:17px;height:17px;border-radius:5px;border:1.5px solid rgba(255,255,255,.5);display:grid;place-items:center;font-size:10px;font-style:normal;flex:none}
  .card.todo .chk.done{opacity:.45;text-decoration:line-through}
  .card.todo .chk.done i{background:#fff;color:#1d1d1f;border-color:#fff}
  .card.todo .chk span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card.todo .muted{color:var(--fg-3);font-weight:500}
  .popup .tadd{display:flex;gap:6px;margin-top:6px}
  .popup .tadd input{flex:1;border:0;border-radius:var(--r-sm);padding:12px 14px;background:rgba(0,0,0,.3);color:#fff;font:inherit;font-size:14px;outline:none}
  .popup .tadd button{width:46px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:grid;place-items:center}
  .popup li s{opacity:.6}
  /* air quality: rating in the corner, four gauges at the bottom */
  .card.air .c em{font-style:normal;padding:4px 9px;border-radius:999px;background:rgba(143,209,106,.25);color:#d8f3c7}
  .card.air .c em.r1{background:rgba(242,182,58,.3);color:#ffe3a6}
  .card.air .c em.r2{background:rgba(242,122,92,.35);color:#ffd9cf}
  .card.air .lbl.gauges{display:flex;gap:4px;height:auto;overflow:visible;text-transform:none;letter-spacing:0}
  .card.air .lbl.gauges div{flex:1;min-width:0;text-align:center;padding:5px 2px 4px;border-radius:var(--r-sm);background:rgba(255,255,255,.08);box-shadow:inset 0 -3px 0 #8fd16a}
  .card.air .lbl.gauges div.r1{box-shadow:inset 0 -3px 0 #f2b63a}
  .card.air .lbl.gauges div.r2{box-shadow:inset 0 -3px 0 #f27a5c}
  .card.air .lbl.gauges b{display:block;font-size:15px;font-weight:700;color:#fff;line-height:1.1}
  .card.air .lbl.gauges small{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3)}
  .card.air{padding-bottom:calc(var(--cp) + 8px)}
  .card.air .lbl.gauges{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp)}
  /* EV: a ring on the right with the charge */
  .card.ev{padding-right:calc(var(--cp) + 70px);grid-template-areas:"i c" ". ." "s s" "n n" "l l" ". .";grid-template-rows:max-content 1fr max-content max-content max-content 1fr}
  .card.ev .ring{position:absolute;right:var(--cp);top:50%;transform:translateY(-50%);width:62px;height:62px;border-radius:50%;background:conic-gradient(#fff calc(var(--soc) * 1%),rgba(255,255,255,.15) 0);display:grid;place-items:center}
  .card.ev .ring::before{content:"";position:absolute;inset:6px;border-radius:50%;background:rgba(40,44,50,.9)}
  .card.ev .ring b{position:relative;font-size:14px;font-weight:700;letter-spacing:-.3px}
  .card.ev .ring b small{font-size:9px;font-weight:600;opacity:.7}
  .card.ev .s.big em{font-style:normal;font-size:15px;font-weight:600;letter-spacing:0;color:var(--fg-2);margin-left:10px}
  .card.ev .meta{grid-area:l;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card.ev.on .ring{background:conic-gradient(#8fd16a calc(var(--soc) * 1%),rgba(255,255,255,.15) 0)}
  .card.ev .c{right:calc(var(--cp) + 70px)}
  .popup .form .chips button.more{opacity:.7;font-style:italic}
  .popup .evbar{height:8px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:14px}
  .popup .evbar i{display:block;height:100%;background:#fff;border-radius:4px}
  /* timers */
  .card.timers .trows{white-space:normal;display:flex;flex-direction:column;gap:4px;margin-top:8px;overflow:hidden}
  .card.timers .trows div{display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:600;color:var(--fg-2);min-width:0}
  .card.timers .trows div span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card.timers .trows div b{font-weight:700;color:#fff;font-variant-numeric:tabular-nums;flex:none}
  .card.timers .trows div:not(.on) b{color:var(--fg-3);font-weight:600}
  .card.timers .lbl.chips span{font-size:10px;letter-spacing:1px;color:var(--fg-3);margin-left:4px;overflow:hidden;text-overflow:ellipsis}
  .popup .trows2{display:flex;flex-direction:column;gap:4px;margin-top:14px}
  .popup .trow{display:grid;grid-template-columns:1fr max-content max-content;gap:12px;align-items:center;padding:12px 14px;border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:14px;font-weight:600}
  .popup .trow.on{background:rgba(255,255,255,.2);border-color:var(--line-on)}
  .popup .trow .tn small{display:block;font-size:11px;font-weight:500;opacity:.65;margin-top:2px}
  .popup .trow .tv{font-size:20px;font-weight:700;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
  .popup .trow .tb{display:flex;gap:4px}
  .popup .trow .tb button{min-width:36px;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer;display:grid;place-items:center}
  .popup .trow .tb button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .popup .trow .tb button ha-icon{--mdc-icon-size:16px}
  /* solar bars in the accent colour */
  .card.solar .lbl.bars i.sun{background:rgba(242,182,58,.35)}
  .card.solar .lbl.bars i.sun.on{background:var(--accent)}
  /* garden zone chips */
  .card.garden .lbl.chips button{max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @media (max-width:900px){
    .card.people .lbl{display:none}
    .card.people .s span{width:34px;height:34px;font-size:12px}
    .card.air .lbl.gauges b{font-size:12px}
    .card.air .lbl.gauges small{font-size:7px}
    .card.ev{padding-right:calc(var(--cp) + 52px)}
    .card.ev .ring{width:48px;height:48px}
    .card.ev .ring b{font-size:11px}
    .card.ev .c{right:calc(var(--cp) + 52px)}
    .card.ev .meta,.card.ev .s.big em{display:none}
    .card.timers .lbl.chips span{display:none}
    .card .lbl.chips.secc span{height:24px;padding:0 6px;font-size:10px;gap:3px}
    .card .lbl.chips.secc span small{display:none}
    .card .lbl.chips{gap:3px}
    .popup .camgrid{grid-template-columns:1fr}
    .popup .trow{grid-template-columns:1fr max-content;gap:8px 12px}
    .popup .trow .tb{grid-column:1/-1}
  }
`;
