// Full-page views opened from the t("Meer") menu. They use the same cards as the room pages,
// laid out in a grid with small uppercase section titles. `ha` = the real HA page (button top-right).
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { domain, num, isOn, unavailable, isDown, relTime } from "./util.js";

import { pressDir, label, cardCfg, camStream, ico, energyOf } from "./cards.js";
import { spark } from "./extras3.js";
import { name, deviceName } from "./model.js";
import { pendingUpdates, installUpdate } from "./features.js";
import { pickNet, netCard, etaText } from "./extras3.js";

export const PAGES = {
  automatiseringen: { label: t("Automatiseringen"), sub: t("aan, uit en fouten"), icon: "mdi:robot-outline", ha: "/config/automation/dashboard" },
  sensoren: { label: t("Sensoren"), sub: t("batterijen, updates, per ruimte"), icon: "mdi:radar", ha: "/config/entities" },
  energie: { label: t("Energie"), sub: t("verbruik en opwek"), icon: "mdi:lightning-bolt-outline", ha: "/energy" },
  cameras: { label: t("Camera's"), sub: t("live beeld"), icon: "mdi:cctv", ha: null },
  systeem: { label: "Systeem", sub: "server, updates, netwerk", icon: "mdi:server-outline", ha: "/config/system" },
};

const sec = (title, cards, meta = "") => cards.length ? html`<section class="sec"><h3>${title}${meta ? html`<b>${meta}</b>` : nothing}</h3><div class="cgrid">${cards}</div></section>` : nothing;
/** a plain card: name, state, optional label and icon */
const card = (p, { n, s, lbl = "", icon, on = false, dim = false, tap = null, hold = null, cls = "" }) => html`
  <div class=${classMap({ card: true, [cls]: !!cls, on, unavailable: dim })} ${pressDir(p, { tap, hold })}>
    <div class="n">${n}</div><div class="s">${s}</div>${lbl ? html`<div class="lbl">${lbl}</div>` : nothing}
    ${icon ? html`<div class="i">${ico(icon)}</div>` : nothing}
  </div>`;

export function renderPage(p, key) {
  const def = PAGES[key];
  const page = { automatiseringen: automations, sensoren: sensors, energie: energy, cameras: cameras, systeem: system }[key](p);
  return html`<section class="page">
    <header class="phead">
      <div><div class="peb">${t("Meer")}<i class="dt"></i>${page.sub}</div><h1>${t(def.label)}</h1>${page.head || nothing}</div>
      <div class="ptools">${page.tools || nothing}${def.ha ? html`<a class="pill hab" @click=${() => p.goPath(def.ha)}><ha-icon icon="mdi:open-in-new"></ha-icon><span>${t("Openen in Home Assistant")}</span></a>` : nothing}</div>
    </header>
    ${page.body}
  </section>`;
}

/* ---------- shared pieces for the overview pages: KPI tiles, blocks with rows, filter pills ---------- */
const kpi = ({ icon, svg, em = "", v, unit = "", n = "", on = false, bar = null, spark: sp = null, tap = null }) => html`<div class=${classMap({ kpi: true, on })} @click=${tap}>
  <div class="top">${ico(icon, svg)}${em ? html`<em>${em}</em>` : nothing}</div><div class="v">${v}${unit ? html`<small>${unit}</small>` : nothing}</div><div class="n">${n}</div>
  ${bar != null ? html`<div class="bar"><i style="--v:${Math.max(0, Math.min(100, bar))}%"></i></div>` : nothing}${sp && sp.length > 1 ? html`<div class="spk">${spark(sp, 70, 26)}</div>` : nothing}</div>`;
const srow = ({ icon, svg, name: n, sub = "", tr = nothing, val = null, unit = "", pill = null, toggle = null, on = false, dim = false, err = false, tap = null }) => html`<div class=${classMap({ srow: true, on, dim, err })} @click=${tap}>
  ${ico(icon, svg)}<div class="nm">${n}${sub ? html`<small>${sub}</small>` : nothing}</div>${tr}
  ${toggle ? html`<span class="tog" @click=${ev => { ev.stopPropagation(); toggle(); }}></span>` : pill != null ? html`<span class="st">${pill}</span>` : html`<div class=${classMap({ val: true, dim })}>${val}${unit ? html`<small>${unit}</small>` : nothing}</div>`}</div>`;
const sblock = (title, rows, meta = "") => rows.length ? html`<div class="sblk"><h3>${title}${meta ? html`<b>${meta}</b>` : nothing}</h3>${rows}</div>` : nothing;
const pillbar = (list, cur, set) => html`<div class="ppills">${list.map(([k, l, icon, svg, n]) => html`<button class=${classMap({ on: cur === k })} @click=${() => set(k)}>${ico(icon, svg)}${n != null ? `${n} ${l}` : l}</button>`)}</div>`;
const hbars = (rows, max, cls = "") => html`<div class="hbars">${rows.map(r => html`<i class=${classMap({ now: r.t.getHours() === new Date().getHours(), [cls]: !!cls })} style="height:${Math.max(3, (r.v || 0) / (max || 1) * 100)}%" title="${r.t.getHours()}:00 · ${(r.v || 0).toFixed(2)}"></i>`)}</div>`;
const fmt = (v, d = 1) => v == null ? "–" : v.toLocaleString(locale(), { maximumFractionDigits: d });

/* ---------- automations: errors first, then a block per area with a toggle per row ---------- */
function automations(p) {
  const st = p.hass.states, filter = p.pageFilter?.automatiseringen || "all", group = p.pageGroup?.automatiseringen || "room";
  const all = Object.values(st).filter(s => domain(s.entity_id) === "automation").sort((a, b) => (a.attributes.friendly_name || "").localeCompare(b.attributes.friendly_name || "", "nl"));
  const errors = all.filter(unavailable), on = all.filter(s => s.state === "on"), off = all.filter(s => s.state === "off" && !unavailable(s));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ran = all.filter(s => s.attributes.last_triggered && new Date(s.attributes.last_triggered) >= today);
  const last = [...all].filter(s => s.attributes.last_triggered).sort((a, b) => new Date(b.attributes.last_triggered) - new Date(a.attributes.last_triggered))[0];
  const areaOf = s => { const e = p.hass.entities?.[s.entity_id]; const a = e?.area_id || (e?.device_id && p.hass.devices?.[e.device_id]?.area_id); return a ? (p.rooms.find(r => r.id === a)?.name || p.hass.areas?.[a]?.name || a) : null; };
  const row = s => srow({ icon: s.attributes.icon || "mdi:robot-outline", svg: s.attributes.icon ? null : "robot", name: s.attributes.friendly_name || s.entity_id,
    sub: unavailable(s) ? t("fout · tik = details") : s.attributes.last_triggered ? t("laatst {t}", { t: relTime(s.attributes.last_triggered) }) + (new Date(s.attributes.last_triggered) >= today ? ` · ${t("vandaag")}` : "") : t("nog nooit gestart"),
    pill: unavailable(s) ? t("Fout") : null, toggle: unavailable(s) ? null : () => p.call("automation", "toggle", { entity_id: s.entity_id }), on: s.state === "on", err: unavailable(s), tap: () => p.moreInfo(s.entity_id) });
  const list = filter === "errors" ? errors : filter === "today" ? ran : filter === "off" ? off : all;
  const groups = new Map(); for (const s of list) { const k = group === "room" ? (areaOf(s) || t("Zonder ruimte")) : (s.attributes.friendly_name || "?").charAt(0).toUpperCase(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
  const keys = [...groups.keys()].sort((a, b) => a === t("Zonder ruimte") ? 1 : b === t("Zonder ruimte") ? -1 : a.localeCompare(b, "nl"));
  const kpis = [
    errors.length ? kpi({ icon: "mdi:alert-circle-outline", svg: "smoke", em: t("Fout"), v: errors[0].attributes.friendly_name || errors[0].entity_id, n: errors.length > 1 ? t("+{n} meer", { n: errors.length - 1 }) : t("tik voor details"), on: true, tap: () => p.moreInfo(errors[0].entity_id) }) : null,
    last ? kpi({ icon: "mdi:timer-outline", svg: "timer", em: t("Laatst"), v: relTime(last.attributes.last_triggered), n: last.attributes.friendly_name || last.entity_id, tap: () => p.moreInfo(last.entity_id) }) : null,
    kpi({ icon: "mdi:robot-outline", svg: "robot", em: t("Vandaag"), v: ran.length, unit: "×", n: ran[0] ? t("o.a. {n}", { n: ran[0].attributes.friendly_name || ran[0].entity_id }) : t("nog niets gestart"), tap: () => { p.pageFilter = { ...(p.pageFilter || {}), automatiseringen: "today" }; } }),
    kpi({ icon: "mdi:power", svg: "power_off", em: t("Uit"), v: off.length, n: off.slice(0, 2).map(s => s.attributes.friendly_name).join(", ") || t("alles staat aan"), tap: () => { p.pageFilter = { ...(p.pageFilter || {}), automatiseringen: "off" }; } }),
  ].filter(Boolean);
  return { sub: `${t("{n} automatiseringen · {on} aan", { n: all.length, on: on.length })}${errors.length ? ` · ${t("{n} met fouten", { n: errors.length })}` : ""}`,
    head: pillbar([["all", t("Alles"), "mdi:robot-outline", "robot", null], ["errors", t("met fout"), "mdi:alert-circle-outline", "smoke", errors.length], ["today", t("vandaag gestart"), "mdi:timer-outline", "timer", ran.length], ["off", t("uit"), "mdi:power", "power_off", off.length]], filter, k => { p.pageFilter = { ...(p.pageFilter || {}), automatiseringen: k }; }),
    tools: html`<div class="seg pseg"><button class=${group === "room" ? "on" : ""} @click=${() => { p.pageGroup = { ...(p.pageGroup || {}), automatiseringen: "room" }; }}>${t("Per ruimte")}</button><button class=${group === "az" ? "on" : ""} @click=${() => { p.pageGroup = { ...(p.pageGroup || {}), automatiseringen: "az" }; }}>A–Z</button></div>`,
    body: html`<div class="kpis">${kpis}</div><div class="sblks">${keys.map(k => sblock(k, groups.get(k).map(row), t("{n} automatiseringen", { n: groups.get(k).length })))}</div>` };
}

/* ---------- energy: tiles, an hourly chart of use and solar, consumers now and per device today ---------- */
function energy(p) {
  const en = p.home.energy, st = p.hass.states, price = num(p.config.home?.energy?.price);
  const val = s => s && num(s.state) != null ? num(s.state) : null;
  const eh = p.energyHist || {}; if (en.today && (!eh.at || Date.now() - eh.at > 10 * 60000)) p.loadEnergyToday();
  const use = eh.use || [], sun = eh.sun || [], max = Math.max(...use.map(r => r.v || 0), ...sun.map(r => r.v || 0), 0.001);
  const watts = Object.values(st).filter(s => domain(s.entity_id) === "sensor" && s.attributes.unit_of_measurement === "W" && num(s.state) != null && s.entity_id !== en.power?.entity_id).sort((a, b) => num(b.state) - num(a.state));
  const nowH = p.netHist?.[en.power?.entity_id];
  const kpis = [
    kpi({ icon: "mdi:flash-outline", svg: "electric", em: t("Nu"), v: en.power ? fmt(val(en.power), 0) : "–", unit: "W", n: eh.peak ? t("piek vandaag {w} W om {t}", { w: fmt(eh.peak.v, 0), t: eh.peak.t }) : "", on: !!en.power, spark: nowH, tap: en.power ? () => p.moreInfo(en.power.entity_id) : null }),
    kpi({ icon: "mdi:home-import-outline", svg: "home", em: t("Verbruik"), v: fmt(val(en.today)), unit: "kWh", n: t("vandaag"), bar: eh.total ? Math.min(100, val(en.today) / Math.max(eh.total, 1) * 100) : null, tap: en.today ? () => p.moreInfo(en.today.entity_id) : null }),
    kpi({ icon: "mdi:solar-power-variant-outline", svg: "solar", em: t("Zon"), v: fmt(val(en.returned)), unit: "kWh", n: t("teruggeleverd"), tap: en.returned ? () => p.moreInfo(en.returned.entity_id) : null }),
    kpi({ icon: "mdi:fire", svg: "gas", em: t("Gas"), v: fmt(val(en.gas)), unit: "m³", n: t("vandaag"), tap: en.gas ? () => p.moreInfo(en.gas.entity_id) : null }),
    price && val(en.today) != null ? kpi({ icon: "mdi:counter", svg: "counter", em: t("Kosten"), v: "€ " + fmt(val(en.today) * price, 2), n: t("vandaag · € {p} / kWh", { p: fmt(price, 2) }) }) : null,
  ].filter(Boolean);
  const plugs = p.rooms.flatMap(r => r.ents.appliances.filter(a => a.power && !a.op)).map(a => { const h = p.plugHist?.[a.id]; if (!h) p.loadPlug(a.id, a.power.id, energyOf(p, a.device)?.entity_id); return { a, h }; }).filter(x => x.h?.today != null).sort((x, y) => y.h.today - x.h.today);
  return { sub: en.power ? t("{v} nu · {k} vandaag", { v: `${fmt(val(en.power), 0)} W`, k: `${fmt(val(en.today))} kWh` }) : t("Kies de energiesensoren bij Panel instellingen"),
    body: html`
      <div class="kpis">${kpis}</div>
      ${use.length ? html`<div class="chart"><h3>${t("Per uur")}<b>${t("verbruik en opwek")}</b></h3>
        <div class="hbwrap">${hbars(use, max)}${sun.length ? hbars(sun, max, "sun") : nothing}</div>
        <div class="bx"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
        <div class="legend"><span><i style="background:rgba(255,255,255,.3)"></i>${t("verbruik")}</span>${sun.length ? html`<span><i style="background:rgba(255,220,130,.75)"></i>${t("zon")}</span>` : nothing}<span><i style="background:#fff"></i>${t("nu")}</span></div></div>` : nothing}
      <div class="sblks">
        ${sblock(t("Grootverbruikers nu"), watts.slice(0, 10).map(s => srow({ icon: s.attributes.icon || "mdi:power-plug-outline", svg: s.attributes.icon ? null : "plug", name: s.attributes.friendly_name || s.entity_id, val: fmt(num(s.state), 0), unit: "W", on: num(s.state) > 100, tap: () => p.moreInfo(s.entity_id) })), `${watts.length}`)}
        ${sblock(t("Vandaag per apparaat"), plugs.map(({ a, h }) => srow({ icon: cardCfg(p, a.id).icon || "mdi:power-plug-outline", svg: cardCfg(p, a.id).icon ? null : "plug", name: cardCfg(p, a.id).name || deviceName(p.hass, a.device), sub: h.peak ? t("piek {w} W", { w: h.peak.v }) : "", tr: h.rows ? html`<div class="tr">${h.rows.filter((_, i) => i % 3 === 0).map(r => html`<i class=${classMap({ on: r.v > 0.01 })} style="height:${Math.max(10, r.v / (h.maxH || 1) * 100)}%"></i>`)}</div>` : nothing, val: fmt(h.today), unit: "kWh", tap: () => p.openPopup({ type: "appliance", a }) })), t("kWh"))}
      </div>` };
}

/* ---------- system: processor, memory, disk, network tiles; Home Assistant, host and offline blocks ---------- */
function system(p) {
  const st = p.hass.states, hc = p.hass.config || {}, more = id => () => p.moreInfo(id);
  const S = Object.values(st).filter(s => domain(s.entity_id) === "sensor" && !unavailable(s));
  const pick = re => S.filter(s => re.test(s.entity_id) || re.test(s.attributes.friendly_name || ""));
  const pct = s => s.attributes.unit_of_measurement === "%", val = s => `${s.state}${s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : ""}`;
  const cpu = pick(/processor_use|cpu_percent|processor|cpu/i).filter(pct), temp = pick(/processor_temp|cpu_temp/i), load = pick(/load_1m|load_5m/i);
  const mem = pick(/memory_use_percent|memory_percent/i).filter(pct), memU = pick(/memory_use$|memory_used/i).filter(s => !pct(s)), swap = pick(/swap_use_percent|swap_percent/i);
  const disk = pick(/disk_use_percent|disk_percent/i).filter(pct), diskU = pick(/disk_use$|disk_used/i).filter(s => !pct(s)), diskF = pick(/disk_free/i);
  const net = S.filter(s => s.attributes.device_class === "data_rate" || /throughput|network_in|network_out|download|upload|packets/i.test(s.entity_id));
  const { inS, outS } = pickNet(net); const ids = [inS, outS].filter(Boolean).map(s => s.entity_id); if (ids.length && (p._netKey !== ids.join() || Date.now() - (p._netAt || 0) > 60000)) p.loadNetHist(ids);
  const boot = st["sensor.last_boot"] || st["sensor.uptime"] || S.find(s => /last_boot|uptime/i.test(s.entity_id));
  const autos = Object.values(st).filter(s => domain(s.entity_id) === "automation");
  if (p.sysInfo === undefined) p.loadSystem();
  const info = p.sysInfo || {}, host = info.host?.hostname ? info.host : null, core = info.core?.version ? info.core : null;
  const updates = pendingUpdates(p.hass), offline = p.rooms.flatMap(r => r.ents.all.filter(e => isDown(e) && !e.reg.entity_category).map(e => ({ e, r })));
  const kpis = [
    cpu[0] ? kpi({ icon: "mdi:chip", svg: "chip", em: t("Processor"), v: Math.round(num(cpu[0].state)), unit: "%", n: [temp[0] && `${Math.round(num(temp[0].state))} °C`, load[0] && `load ${num(load[0].state)}`].filter(Boolean).join(" · "), on: num(cpu[0].state) > 85, bar: num(cpu[0].state), tap: more(cpu[0].entity_id) }) : null,
    mem[0] ? kpi({ icon: "mdi:memory", svg: "chip", em: t("Geheugen"), v: Math.round(num(mem[0].state)), unit: "%", n: [memU[0] && val(memU[0]), swap[0] && `swap ${Math.round(num(swap[0].state))}%`].filter(Boolean).join(" · "), on: num(mem[0].state) > 85, bar: num(mem[0].state), tap: more(mem[0].entity_id) }) : null,
    disk[0] ? kpi({ icon: "mdi:harddisk", svg: "harddisk", em: t("Schijf"), v: Math.round(num(disk[0].state)), unit: "%", n: [diskU[0] && val(diskU[0]), diskF[0] && `${t("vrij")} ${val(diskF[0])}`].filter(Boolean).join(" · "), on: num(disk[0].state) > 85, bar: num(disk[0].state), tap: more(disk[0].entity_id) }) : host?.disk_total ? kpi({ icon: "mdi:harddisk", svg: "harddisk", em: t("Schijf"), v: `${Math.round(host.disk_used)} / ${Math.round(host.disk_total)}`, unit: "GB", bar: host.disk_used / host.disk_total * 100, tap: () => p.goPath("/config/storage") }) : null,
    inS || outS ? kpi({ icon: "mdi:swap-vertical", svg: "swap", em: t("Netwerk"), v: val(inS || outS), n: [inS && `↓ ${val(inS)}`, outS && `↑ ${val(outS)}`].filter(Boolean).join(" · "), spark: p.netHist?.[(inS || outS).entity_id], tap: more((inS || outS).entity_id) }) : null,
  ].filter(Boolean);
  const ha = [
    srow({ icon: "mdi:home-assistant", svg: "home", name: `Home Assistant ${hc.version || core?.version || "?"}`, sub: core?.update_available ? t("Kernupdate beschikbaar") : (hc.location_name || ""), pill: core?.update_available ? t("Update") : "OK", on: !!core?.update_available, tap: () => p.goPath("/config/info") }),
    boot ? srow({ icon: "mdi:timer-outline", svg: "timer", name: t("Draait sinds"), sub: new Date(boot.state).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), val: relTime(boot.state), tap: more(boot.entity_id) }) : null,
    srow({ icon: "mdi:shape-outline", svg: "shapes", name: t("Entiteiten"), sub: `${Object.keys(p.hass.devices || {}).length} ${t("apparaten")} · ${Object.keys(p.hass.areas || {}).length} ${t("ruimtes")}`, val: fmt(Object.keys(st).length, 0), tap: () => p.goPath("/config/entities") }),
    srow({ icon: "mdi:robot-outline", svg: "robot", name: t("Automatiseringen"), sub: autos.filter(unavailable).length ? t("{n} met fouten", { n: autos.filter(unavailable).length }) : t("Aan"), val: `${autos.filter(a => a.state === "on").length} / ${autos.length}`, tap: () => p.goPath("__automatiseringen__") }),
  ].filter(Boolean);
  const hostRows = [
    host ? srow({ icon: "mdi:server", svg: "server", name: host.hostname || t("Host"), sub: [host.operating_system, host.kernel].filter(Boolean).join(" · "), pill: "OK", tap: () => p.goPath("/config/hardware") }) : null,
    ...updates.map(u => srow({ icon: u.kind === t("Firmware") ? "mdi:chip" : "mdi:update", svg: "update", name: u.title, sub: `${u.busy ? t("Bezig…") : `${u.from || "?"} → ${u.to || "?"}`}${u.canInstall ? " · " + t("tik = installeren") : ""}`, pill: t("Update"), on: true, tap: () => installUpdate(p, u) })),
  ].filter(Boolean);
  return { sub: t("{n} sensoren · {u} updates", { n: new Set([...cpu, ...mem, ...disk, ...net].map(s => s.entity_id)).size, u: updates.length }),
    body: html`
      <div class="kpis">${kpis}</div>
      ${!kpis.length ? html`<div class="hint" style="margin-top:20px;opacity:.75;font-size:13px">${t("Geen systeemsensoren gevonden. Voeg de integratie System Monitor toe voor processor, geheugen, schijf en netwerk.")}</div>` : nothing}
      <div class="sblks">
        ${sblock("Home Assistant", ha, hc.version || "")}
        ${sblock(t("Host"), hostRows, `${updates.length} ${t("updates")}`)}
        ${sblock(t("Onbereikbaar"), offline.map(({ e, r }) => srow({ icon: "mdi:lan-disconnect", svg: "network_off", name: name(p.hass, e), sub: `${r.name} · ${t("sinds {t}", { t: relTime(e.state?.last_changed) })}`, pill: t("Offline"), dim: true, tap: more(e.id) })), `${offline.length}`)}
      </div>` };
}

/* ---------- sensors: attention first, then one block per room (or per kind) with a row per sensor ---------- */
function sensors(p) {
  const low = p.config.home?.lowBattery ?? 20, filter = p.sensFilter || "all", group = p.sensGroup || "room";
  const batteries = p.rooms.flatMap(r => r.ents.battery.map(e => ({ e, r, v: num(e.state?.state) }))).filter(x => x.v != null).sort((a, b) => a.v - b.v);
  const offline = p.rooms.flatMap(r => r.ents.all.filter(e => isDown(e) && !e.reg.entity_category).map(e => ({ e, r })));
  const updates = pendingUpdates(p.hass);
  const battIds = batteries.map(b => b.e.id); if (battIds.length && p._battKey !== battIds.join()) p.loadBatteryEta(battIds);
  const eta = p.battEta || {}, more = id => () => p.moreInfo(id);
  const trend = e => { const h = p.lightHist?.[e.id]; if (!h) { p.loadLightHist(e.id); return html`<div class="tr"></div>`; } const g = Array.from({ length: 8 }, (_, i) => (h.bars[(new Date().getHours() + 1 + i * 3) % 24] + h.bars[(new Date().getHours() + 2 + i * 3) % 24] + h.bars[(new Date().getHours() + 3 + i * 3) % 24]) / 3); return html`<div class="tr">${g.map(v => html`<i class=${classMap({ on: v > 0 })} style="height:${Math.max(10, v * 100)}%"></i>`)}</div>`; };
  const row = ({ icon, svg, name: n, sub = "", tr = nothing, val = null, unit = "", pill = null, on = false, dim = false, tap = null }) => html`<div class=${classMap({ srow: true, on, dim })} @click=${tap}>
    ${ico(icon, svg)}<div class="nm">${n}${sub ? html`<small>${sub}</small>` : nothing}</div>${tr}
    ${pill != null ? html`<span class="st">${pill}</span>` : html`<div class=${classMap({ val: true, dim })}>${val}${unit ? html`<small>${unit}</small>` : nothing}</div>`}</div>`;
  const R = {
    temp: (e, r, withRoom) => row({ icon: "mdi:thermometer", svg: "thermometer", name: label(p, e), sub: withRoom ? r.name : "", val: num(e.state?.state)?.toFixed(1) ?? "?", unit: "°", tap: more(e.id) }),
    hum: (e, r, withRoom) => row({ icon: "mdi:water-outline", svg: "water", name: label(p, e), sub: withRoom ? r.name : "", val: Math.round(num(e.state?.state) ?? 0), unit: "%", tap: more(e.id) }),
    door: (e, r, withRoom, kind) => row({ icon: kind === "window" ? "mdi:window-closed-variant" : "mdi:door", svg: kind === "window" ? "window" : "door", name: label(p, e), sub: `${withRoom ? r.name + " · " : ""}${isOn(e.state) ? t("open sinds {t}", { t: relTime(e.state?.last_changed) }) : t("dicht sinds {t}", { t: relTime(e.state?.last_changed) })}`, tr: trend(e), pill: unavailable(e.state) ? t("Offline") : isOn(e.state) ? t("Open") : t("Dicht"), on: isOn(e.state), dim: unavailable(e.state), tap: more(e.id) }),
    motion: (e, r, withRoom) => row({ icon: "mdi:motion-sensor", svg: "motion", name: label(p, e), sub: `${withRoom ? r.name + " · " : ""}${isOn(e.state) ? t("beweging nu") : t("laatst {t}", { t: relTime(e.state?.last_changed) })}${p.lightHist?.[e.id] ? ` · ${p.lightHist[e.id].count}× ${t("vandaag")}` : ""}`, tr: trend(e), pill: isOn(e.state) ? t("Nu") : t("Rustig"), on: isOn(e.state), dim: unavailable(e.state), tap: more(e.id) }),
    other: (e, r, withRoom) => row({ icon: "mdi:checkbox-blank-circle-outline", svg: "sensor", name: label(p, e), sub: `${withRoom ? r.name + " · " : ""}${e.state?.attributes?.device_class || ""}`, pill: isOn(e.state) ? t("Aan") : t("Uit"), on: isOn(e.state), dim: unavailable(e.state), tap: more(e.id) }),
    batt: (e, r, v, withRoom) => row({ icon: v <= low ? "mdi:battery-20" : v <= 50 ? "mdi:battery-50" : "mdi:battery", svg: "battery", name: name(p.hass, e).replace(/ batter(y|ij)/i, ""), sub: `${withRoom ? r.name + " · " : ""}${etaText(eta[e.id]) || t("Batterij")}`, val: v, unit: "%", dim: v <= low, tap: more(e.id) }),
  };
  const roomRows = (r, withRoom = false) => [...r.ents.temp.map(e => R.temp(e, r, withRoom)), ...r.ents.hum.map(e => R.hum(e, r, withRoom)), ...r.ents.doors.map(e => R.door(e, r, withRoom, "door")), ...r.ents.windows.map(e => R.door(e, r, withRoom, "window")), ...r.ents.motion.map(e => R.motion(e, r, withRoom)), ...[...r.ents.other, ...r.ents.details].map(e => R.other(e, r, withRoom)), ...r.ents.battery.filter(e => num(e.state?.state) != null).map(e => R.batt(e, r, num(e.state.state), withRoom))];
  const block = (title, rows, meta = "") => rows.length ? html`<div class="sblk"><h3>${title}${meta ? html`<b>${meta}</b>` : nothing}</h3>${rows}</div>` : nothing;
  const total = p.rooms.reduce((n, r) => n + roomRows(r).length, 0), lowB = batteries.filter(b => b.v <= low);
  const attention = [
    ...(filter === "all" || filter === "update" ? updates.map(u => row({ icon: u.kind === t("Firmware") ? "mdi:chip" : "mdi:update", svg: "update", name: u.title, sub: `${u.busy ? t("Bezig…") : `${u.from || "?"} → ${u.to || "?"}`}${u.canInstall ? " · " + t("tik = installeren") : ""}`, pill: t("Update"), on: true, tap: () => installUpdate(p, u) })) : []),
    ...(filter === "all" || filter === "battery" ? (filter === "battery" ? batteries : lowB).map(({ e, r, v }) => R.batt(e, r, v, true)) : []),
    ...(filter === "all" || filter === "offline" ? offline.map(({ e, r }) => row({ icon: "mdi:lan-disconnect", svg: "network_off", name: name(p.hass, e), sub: `${r.name} · ${t("sinds {t}", { t: relTime(e.state?.last_changed) })}`, pill: t("Offline"), dim: true, tap: more(e.id) })) : []),
  ];
  const kinds = [[t("Klimaat"), r => [...r.ents.temp.map(e => R.temp(e, r, true)), ...r.ents.hum.map(e => R.hum(e, r, true))]], [t("Deuren & ramen"), r => [...r.ents.doors.map(e => R.door(e, r, true, "door")), ...r.ents.windows.map(e => R.door(e, r, true, "window"))]], [t("Beweging"), r => r.ents.motion.map(e => R.motion(e, r, true))], [t("Overig"), r => [...r.ents.other, ...r.ents.details].map(e => R.other(e, r, true))], [t("Batterijen"), r => r.ents.battery.filter(e => num(e.state?.state) != null).map(e => R.batt(e, r, num(e.state.state), true))]];
  const pills = [["all", t("Alles"), "mdi:radar", "radar", null], ["battery", t("batterijen"), "mdi:battery", "battery", lowB.length], ["offline", t("onbereikbaar"), "mdi:lan-disconnect", "network_off", offline.length], ["update", t("updates"), "mdi:update", "update", updates.length]];
  return { sub: t("{n} sensoren in {r} ruimtes · {b} batterijen laag · {o} onbereikbaar", { n: total, r: p.rooms.length, b: lowB.length, o: offline.length }) + (updates.length ? ` · ${t("{n} updates", { n: updates.length })}` : ""),
    head: html`<div class="ppills">${pills.map(([k, l, icon, svg, n]) => html`<button class=${classMap({ on: filter === k })} @click=${() => { p.sensFilter = k; }}>${ico(icon, svg)}${n != null ? `${n} ${l}` : l}</button>`)}</div>`,
    tools: html`<div class="seg pseg"><button class=${group === "room" ? "on" : ""} @click=${() => { p.sensGroup = "room"; }}>${t("Per ruimte")}</button><button class=${group === "kind" ? "on" : ""} @click=${() => { p.sensGroup = "kind"; }}>${t("Per soort")}</button></div>`,
    body: html`
      <div class="sblks">
        ${block(t("Aandacht"), attention, `${attention.length}`)}
        ${filter === "all" ? (group === "room" ? p.rooms.map(r => block(r.name, roomRows(r), t("{n} sensoren", { n: roomRows(r).length }))) : kinds.map(([title, f]) => block(title, p.rooms.flatMap(f)))) : nothing}
      </div>` };
}

/* ---------- cameras: live snapshots as cards, tap for the stream ---------- */
function cameras(p) {
  const cams = Object.values(p.hass.states).filter(s => domain(s.entity_id) === "camera");
  const c = s => {
    const pic = s.attributes.entity_picture || null; // <hcn-cam-snap> refreshes every 10 s without flicker
    const roomName = p.rooms.find(r => r.ents.all.some(e => e.id === s.entity_id))?.name || "";
    return html`<div class=${classMap({ card: true, cam: true, unavailable: unavailable(s) })}
        ${pressDir(p, { tap: () => p.openPopup({ type: "camera", s }), hold: () => p.moreInfo(s.entity_id) })}>
      ${pic ? html`<hcn-cam-snap .src=${pic} .stream=${camStream(s)} .live=${!!cardCfg(p, s.entity_id).live}></hcn-cam-snap>` : nothing}
      <div class="n">${s.attributes.friendly_name || s.entity_id}</div>
      <div class="s">${unavailable(s) ? t("Onbereikbaar") : s.state === "recording" ? t("Neemt op") : s.state === "streaming" ? t("Live") : roomName || t("Inactief")}</div>
      ${!pic ? html`<div class="i">${ico("mdi:cctv")}</div>` : nothing}
    </div>`;
  };
  return { sub: cams.length ? t("{n} camera's · tik voor live beeld", { n: cams.length }) : t("Geen camera's gevonden"), body: sec(t("Camera's"), cams.map(c)) };
}

export const pageStyles = `
  .page{position:absolute;inset:calc(158px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 0 0 0;overflow:auto;padding:0 var(--pad) 60px;scrollbar-width:thin}
  .phead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:6px}
  .phead h1{font-size:48px;font-weight:600;letter-spacing:-2.4px;line-height:1;margin-top:8px}
  .peb{font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);display:flex;align-items:center}
  .peb .dt{margin:0 7px}
  .ptools{display:flex;align-items:center;gap:8px;flex:none;margin-top:4px}
  .ppills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .ppills button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--fg-2);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  .ppills button.on{background:rgba(255,255,255,.18);color:#fff}
  .ppills button img.ico,.ppills button ha-icon{width:17px;height:17px;--mdc-icon-size:17px}
  .seg.pseg{height:46px;padding:4px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid var(--line);display:inline-flex}
  .seg.pseg button{height:100%;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--fg-3);font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .seg.pseg button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .sblks{columns:400px;column-gap:6px;margin-top:26px}
  .sblk{border-radius:var(--r);background:rgba(255,255,255,.08);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset;padding:6px 0;backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);break-inside:avoid;margin-bottom:6px}
  .sblk h3{display:flex;justify-content:space-between;align-items:center;padding:12px 20px 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2)}
  .sblk h3 b{font-weight:600;letter-spacing:0;text-transform:none;color:var(--fg-3)}
  .srow{display:grid;grid-template-columns:26px 1fr 70px max-content;gap:14px;align-items:center;padding:10px 20px;border-top:1px solid rgba(255,255,255,.08);font-size:14px;font-weight:600;cursor:pointer}
  .srow:hover{background:rgba(255,255,255,.05)}
  .srow img.ico,.srow ha-icon{width:22px;height:22px;--mdc-icon-size:22px}
  .srow .nm{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .srow .nm small{display:block;font-size:11px;font-weight:500;color:var(--fg-3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .srow .tr{display:flex;align-items:flex-end;gap:2px;height:18px}
  .srow .tr i{flex:1;background:rgba(255,255,255,.25);border-radius:1px;min-height:2px}
  .srow .tr i.on{background:#fff}
  .srow .val{font-size:15px;font-weight:700;letter-spacing:-.3px;min-width:64px;text-align:right}
  .srow .val small{font-size:11px;font-weight:600;color:var(--fg-3);margin-left:3px}
  .srow .val.dim{color:var(--fg-3)}
  .srow .st{display:inline-flex;align-items:center;justify-content:center;height:22px;padding:1px 8px 0 10px;line-height:1;border-radius:999px;background:rgba(255,255,255,.12);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2)}
  .srow.on .st{background:rgba(255,255,255,.9);color:#1d1d1f}
  .srow.dim{color:var(--fg-3)}
  .srow.err .st{background:rgba(242,122,92,.6);color:#fff}
  .srow .tog{width:38px;height:22px;border-radius:999px;background:rgba(255,255,255,.18);position:relative;justify-self:end;cursor:pointer;flex:none;transition:background .2s}
  .srow .tog::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;opacity:.6;transition:left .2s,opacity .2s}
  .srow.on .tog{background:rgba(255,255,255,.9)} .srow.on .tog::after{left:19px;opacity:1;background:#1d1d1f}
  /* KPI tiles above the blocks */
  .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin-top:22px}
  .kpi{position:relative;height:124px;border-radius:var(--r);background:rgba(255,255,255,.08);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset;padding:16px 18px;display:grid;grid-template-rows:max-content 1fr max-content;overflow:hidden;cursor:pointer;backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2)}
  .kpi.on{background:rgba(255,255,255,.26);border-color:var(--line-on)}
  .kpi .top{display:flex;justify-content:space-between;align-items:center}
  .kpi .top img.ico,.kpi .top ha-icon{width:26px;height:26px;--mdc-icon-size:26px;margin-left:-2px}
  .kpi .top em{font-style:normal;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-2)}
  .kpi .v{align-self:end;font-size:26px;font-weight:600;letter-spacing:-1.2px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kpi .v small{font-size:13px;font-weight:600;letter-spacing:0;color:var(--fg-3);margin-left:4px}
  .kpi .n{font-size:13px;font-weight:600;color:var(--fg-2);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:76px}
  .kpi .spk{position:absolute;right:16px;bottom:14px;width:70px;height:26px;pointer-events:none}
  .kpi .spk svg{width:100%;height:100%}
  .kpi .bar{position:absolute;left:18px;right:18px;bottom:12px;height:4px;border-radius:2px;background:rgba(255,255,255,.14)}
  .kpi .bar i{display:block;height:100%;border-radius:2px;background:#fff;width:var(--v)}
  .kpi:has(.bar) .n{padding-right:0;margin-bottom:10px}
  /* hourly chart (energy) */
  .chart{border-radius:var(--r);background:rgba(255,255,255,.08);border:1px solid var(--line);padding:18px 20px;margin-top:22px;backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2)}
  .chart h3{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);display:flex;justify-content:space-between}
  .chart h3 b{font-weight:600;letter-spacing:0;text-transform:none;color:var(--fg-3)}
  .hbwrap{position:relative;height:90px;margin-top:16px}
  .hbars{position:absolute;inset:0;display:flex;align-items:flex-end;gap:4px}
  .hbars i{flex:1;border-radius:3px 3px 0 0;background:rgba(255,255,255,.3);min-height:3px}
  .hbars i.now{background:#fff}
  .hbars i.sun{background:rgba(255,220,130,.75);min-height:0}
  .bx{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;color:var(--fg-3);margin-top:6px}
  .legend{display:flex;gap:16px;margin-top:10px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3)}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}
  .hab{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;flex:none;margin-top:4px}
  .hab ha-icon{--mdc-icon-size:17px}
  .sec{margin-top:26px}
  .sec h3{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;margin:0 0 10px 2px;display:flex;justify-content:space-between}
  .sec h3 b{font-weight:600;letter-spacing:0;text-transform:none;opacity:.7}
  .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--card-gap)}
  .cgrid .card{width:auto;height:150px}
  .cgrid .card.kpi .s{font-size:30px;font-weight:700;letter-spacing:-1px;opacity:1;margin-top:2px}
  .cgrid .card.cam{height:200px}
  .cgrid .card.cam hcn-cam-snap{z-index:-1}
  .cgrid .card.cam::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(20,20,20,.75),rgba(20,20,20,0) 60%);pointer-events:none}
  .cgrid .card.cam .n,.cgrid .card.cam .s,.cgrid .card.cam .i{position:relative}
  .popup .stream{display:block;width:100%;max-width:100%;border-radius:var(--r);margin-top:14px;background:rgba(0,0,0,.3);min-height:200px}
  @media (max-width:900px){
    .page{position:static;flex:1;min-height:0;overflow:auto;padding:calc(124px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) var(--pad) calc(60px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
    .phead{flex-direction:column;gap:10px;margin-bottom:0}
    .phead h1{font-size:34px;letter-spacing:-1.6px}
    .peb{font-size:11px;letter-spacing:1.4px}
    .ptools{margin-top:0}
    .sblks{columns:1;margin-top:18px}
    .kpis{grid-template-columns:1fr 1fr;margin-top:16px}
    .kpi{height:110px;padding:12px 14px}
    .kpi .v{font-size:22px}
    .chart{padding:14px}
    .srow{grid-template-columns:22px 1fr 50px max-content;gap:10px;padding:9px 14px;font-size:13px}
    .sblk h3{padding:10px 14px 6px}
    .hab{height:40px;padding:0 14px;font-size:11px;margin-top:2px}
    .sec{margin-top:20px}
    .cgrid{grid-template-columns:1fr 1fr;gap:6px}
    .cgrid .card{height:120px}
    .cgrid .card .n{font-size:14px}
    .cgrid .card .s{font-size:12px}
    .cgrid .card.kpi .s{font-size:22px}
    .cgrid .card.cam{grid-column:1/-1;height:180px}
  }
`;
