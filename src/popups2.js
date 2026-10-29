// Popups redone in 3.2: lights (a slider per lamp, per room), weather (rain in the next hours, the week as bars),
// energy (where the power comes from and goes), media (every player, grouping) and the agenda (calendar.js).
// `ui` carries the popup helpers from popups.js: wrap(title, big, sub, body, cls), li(...), modes(...), range(...).
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, tn, locale } from "./i18n.js";
import { domain, num, isOn, unavailable, relTime, sinceText, icon } from "./util.js";
import { name, deviceName } from "./model.js";
import { label, mediaView, condText, condIcon, condSvg, ico, cardCfg, lightCaps, dot } from "./cards.js";
import { liveTick } from "./cards2.js";
import { energyFlow } from "./cards2.js";
import { calendarBody, whenText } from "./calendar.js";
import { sky, wxIcon, feelsLike } from "./sky.js";

const hm = d => new Date(d).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
/** colour weather glyphs for the popup (the cards keep the thin-line icons) */

const fmt = (v, d = 1) => v == null ? "–" : v.toLocaleString(locale(), { maximumFractionDigits: d });
const stop = ev => ev.stopPropagation();

/* =========================================================== lights =========================================================== */
/** on for a while in a room whose motion sensor has been quiet just as long */
const forgotten = (r, e) => { const m = r.motion; if (!m || r.motionOn) return false; const quiet = Date.now() - new Date(m.last_changed), on = Date.now() - new Date(e.state?.last_changed); return quiet > 45 * 60000 && on > 45 * 60000; };
export function lightsPopup(p, ui) {
  const home = p.home, sliders = p.config.lightSliders !== false, rooms = p.rooms.filter(r => r.ents.lights.some(e => !cardCfg(p, e.id).hidden));
  const row = (r, e) => { const s = e.state, on = isOn(s), caps = lightCaps(s), pct = on ? Math.round((s.attributes.brightness || 255) / 2.55) : 0, lost = on && forgotten(r, e);
    return html`<li class=${classMap({ on, tap: true, lrow: true, sl: sliders && caps.dim })} @click=${() => p.call("light", "toggle", { entity_id: e.id })}>
      <img class="ico" src=${icon("lamp")} alt="">
      <div>${label(p, e)}<small>${on ? sinceText(s.last_changed) : t("Uit")}${lost ? html` · <b class="hint">${t("niemand in de kamer")}</b>` : nothing}</small>
        ${sliders && caps.dim ? html`<input type="range" class="ls" min="1" max="100" .value=${String(pct)} @click=${stop} @pointerdown=${stop} @change=${ev => p.call("light", "turn_on", { entity_id: e.id, brightness_pct: +ev.target.value })}>` : nothing}</div>
      <span class="st">${on ? (caps.dim ? `${pct}%` : t("Aan")) : t("Uit")}</span></li>`; };
  const roomBlock = r => { const ls = r.ents.lights.filter(e => !cardCfg(p, e.id).hidden), on = ls.filter(e => isOn(e.state)); if (!on.length) return nothing;
    return html`<div class="prow lr"><span>${r.name}<b>${on.length ? ` · ${tn(on.length, "{n} aan", "{n} aan")}` : ""}</b></span>${on.length ? html`<button class="lnk" @click=${() => p.call("light", "turn_off", { entity_id: on.map(e => e.id) })}>${t("uit")}</button>` : html`<button class="lnk" @click=${() => p.call("light", "turn_on", { entity_id: ls.map(e => e.id) })}>${t("aan")}</button>`}</div>
      <ul style="margin-top:6px">${on.map(e => row(r, e))}</ul>`; };
  const sorted = [...rooms].sort((a, b) => (b.ents.lights.some(e => isOn(e.state)) ? 1 : 0) - (a.ents.lights.some(e => isOn(e.state)) ? 1 : 0));
  return ui.wrap(t("Lampen"), home.lightsOn.length ? t("{n} aan", { n: home.lightsOn.length }) : t("Alles uit"), t("van {n} lampen", { n: home.lights.length }), html`
    ${ui.modes([{ label: t("Alles uit"), go: () => home.lightsOn.length && p.call("light", "turn_off", { entity_id: home.lightsOn.map(e => e.id) }) }, { label: sliders ? t("Sliders verbergen") : t("Sliders tonen"), on: sliders, go: () => p.saveUser({ lightSliders: sliders ? false : undefined }) }], "n2")}
    ${home.lightsOn.length ? sorted.map(roomBlock) : html`<div class="sub" style="margin-top:16px">${t("Alle lampen zijn uit")}</div>`}`, "lights");
}

/* =========================================================== weather =========================================================== */
/** rain for the next two hours as 24 slices: Buienradar's precipitation_forecast sensors (minute level, 5 min a slice) or the
    hourly forecast (6 hours, 15 min a slice, interpolated), smoothed a little so the graph reads as a curve */
function rainSoon(p, hourly) {
  const S = Object.values(p.hass.states), totals = new Map();
  for (const s of S) { const m = /precipitation_forecast_(average|total)_(\d+)m$/i.exec(s.entity_id), v = num(s.state); if (!m || v == null) continue; const n = +m[2]; if (!totals.has(n)) totals.set(n, m[1] === "total" ? v : v * n / 60); }
  const ns = [...totals.keys()].sort((a, b) => a - b);
  let raw = null, minutes = 0, minute = false;
  if (ns.length >= 3) { const seg = []; let pn = 0, pt = 0; for (const n of ns) { seg.push({ from: pn, to: n, mmh: Math.max(0, (totals.get(n) - pt) / (n - pn) * 60) }); pn = n; pt = totals.get(n); } minutes = Math.min(pn, 120); minute = true;
    raw = Array.from({ length: 24 }, (_, i) => { const m = (i + .5) * minutes / 24; return seg.find(x => m >= x.from && m < x.to)?.mmh ?? 0; }); }
  else { const next = (hourly || []).filter(f => new Date(f.datetime) > Date.now() - 36e5).slice(0, 6);
    if (!next.length || !next.some(f => f.precipitation != null)) return null;
    minutes = next.length * 60; const v = next.map(f => f.precipitation || 0);
    raw = Array.from({ length: 24 }, (_, i) => { const x = (i + .5) / 24 * v.length - .5, a = Math.max(0, Math.floor(x)), b = Math.min(v.length - 1, a + 1), f = Math.min(1, Math.max(0, x - a)); return v[a] * (1 - f) + v[b] * f; }); }
  const pts = raw.map((v, i) => (raw[i - 1] ?? v) * .25 + v * .5 + (raw[i + 1] ?? v) * .25);
  return { pts, minutes, minute };
}
const rainLine = r => { if (!r) return ""; const step = r.minutes / r.pts.length, wet = r.pts.map((v, i) => v >= 0.1 ? i : -1).filter(i => i >= 0); if (!wet.length) return r.minute ? t("Droog de komende 2 uur") : t("Droog de komende uren");
  let end = wet[0]; while (wet.includes(end + 1)) end++;
  const from = wet[0] * step, len = Math.round((end + 1 - wet[0]) * step);
  return from < (r.minute ? 10 : 30) ? t("Regen nu, nog ongeveer {m} min", { m: len }) : t("Regen vanaf {t}, ongeveer {m} min", { t: hm(Date.now() + from * 60000), m: len }); };
export function weatherPopup(p, pop, ui) {
  const home = p.home, w = home.weather, a = w.attributes, fc = pop.forecast || [], dfc = (pop.dailyForecast || []).slice(0, 7);
  const hourly = fc.filter(f => f.datetime && (new Date(f.datetime) - Date.now()) < 36e5 * 30 && new Date(f.datetime) > Date.now() - 36e5).slice(0, 8);
  const rain = rainSoon(p, fc), rmax = rain ? Math.max(1, ...rain.pts) : 1;
  const wxi = c => wxIcon(c, 26);
  const prob = f => f.precipitation_probability != null ? `${Math.round(f.precipitation_probability)}%` : f.precipitation ? `${f.precipitation} mm` : "";
  const todayKey = new Date().toDateString();
  const lo = Math.min(...dfc.map(f => num(f.templow) ?? num(f.temperature) ?? 0)), hi = Math.max(...dfc.map(f => num(f.temperature) ?? 0)), span = Math.max(1, hi - lo);
  const bearing = b => typeof b === "number" ? [t("N"), t("NO"), t("O"), t("ZO"), t("Z"), t("ZW"), t("W"), t("NW")][Math.round(b / 45) % 8] : b;
  const sun = home.sun, feels = feelsLike(a);
  const kpis = [
    feels != null ? { v: Math.round(feels) + "°", u: "", n: t("Voelt als") } : null,
    a.wind_speed != null ? { v: Math.round(a.wind_speed), u: `${a.wind_speed_unit || t("km/u")}${a.wind_bearing != null ? " " + bearing(a.wind_bearing) : ""}`, n: t("Wind") } : null,
    a.humidity != null ? { v: Math.round(a.humidity), u: "%", n: t("Vocht") } : null,
    a.pressure != null ? { v: Math.round(a.pressure), u: a.pressure_unit || "hPa", n: t("Luchtdruk") } : null,
    a.uv_index != null ? { v: a.uv_index, u: "", n: t("UV-index") } : null,
    sun ? { v: hm(sun.attributes.next_rising), u: "", n: t("Zonsopkomst") } : null,
    sun ? { v: hm(sun.attributes.next_setting), u: "", n: t("Zonsondergang") } : null,
    a.visibility != null ? { v: a.visibility, u: a.visibility_unit || "km", n: t("Zicht") } : null,
  ].filter(Boolean).slice(0, 6);
  const head = html`<div class="wxhd"><div><b>${Math.round(num(a.temperature) ?? 0)}°${dot()}${condText(w.state)}</b><span>${[feels != null ? t("Voelt als {v}", { v: Math.round(feels) + "°" }) : null, rainLine(rain) || null].filter(Boolean).map((x, i) => html`${i ? dot() : nothing}${x}`)}${pop.loading && !feels ? t("Laden…") : nothing}</span></div></div>`;
  return ui.wrap(t("Weer"), html`<div class="skybg">${sky(p, w.state, "popup")}</div>${head}`, "", html`
    ${rain ? html`<div class="prow" style="margin-top:4px"><span>${rain.minute ? t("Komende 2 uur") : t("Komende uren")}</span><b>mm/h</b></div>
      <div class="rain">${rain.pts.map((v, i) => { const at = hm(Date.now() + (i + .5) * rain.minutes / rain.pts.length * 60000); return html`<i class=${pop.rainSel === i ? "sel" : ""} style=${`height:${Math.max(4, v / rmax * 100)}%`} data-tip=${`${at} · ${fmt(v)} mm/h`} @click=${() => p.openPopup({ ...pop, rainSel: pop.rainSel === i ? undefined : i })}></i>`; })}</div>
      <div class="bars-x">${[0, .25, .5, .75, 1].map(f => html`<span>${f ? hm(Date.now() + f * rain.minutes * 60000) : t("nu")}</span>`)}</div>` : nothing}
    ${hourly.length ? html`<div class="prow"><span>${t("Per uur")}</span><b>${hourly.some(f => f.precipitation_probability != null) ? t("kans op neerslag") : ""}</b></div>
      <div class="fc hours h8">${hourly.map((f, i) => html`<div class=${i === 0 ? "now" : ""}>${new Date(f.datetime).toLocaleTimeString(locale(), { hour: "2-digit" })}${wxi(f.condition)}<b>${Math.round(f.temperature)}°</b>${prob(f) ? html`<em>${prob(f)}</em>` : nothing}</div>`)}</div>` : nothing}
    ${dfc.length ? html`<div class="prow"><span>${t("Deze week")}</span><b>${Math.round(lo)}° … ${Math.round(hi)}°</b></div>
      <div class="wk">${dfc.map(f => { const d = new Date(f.datetime), isT = d.toDateString() === todayKey, l = num(f.templow), h = num(f.temperature);
        return html`<div class=${classMap({ wd: true, today: isT })}><span>${isT ? t("Vandaag") : d.toLocaleDateString(locale(), { weekday: "short" }).replace(".", "")}</span>${wxIcon(f.condition, 22)}<span class="lo">${l != null ? Math.round(l) + "°" : ""}</span><div class="range"><i style=${`left:${((l ?? h) - lo) / span * 100}%;width:${Math.max(4, ((h ?? l) - (l ?? h)) / span * 100)}%`}></i></div><span class="hi">${h != null ? Math.round(h) + "°" : ""}</span><em>${prob(f)}</em></div>`; })}</div>` : nothing}
    ${!hourly.length && !dfc.length ? html`<div class="sub">${pop.loading ? t("Laden…") : t("Geen verwachting beschikbaar")}</div>` : nothing}
    ${kpis.length ? html`<div class="wkpi">${kpis.map(k => html`<div><b>${k.v}<small>${k.u}</small></b><span>${k.n}</span></div>`)}</div>` : nothing}`, "wxsky");
}

/* =========================================================== energy =========================================================== */
export function energyPopup(p, pop, ui) {
  const hass = p.hass, en = p.home.energy, cfg = p.config.home?.energy || {}, price = num(cfg.price), f = energyFlow(p);
  if ((en.today || cfg.solarToday) && pop.hourly === undefined) p.loadHourly(pop);
  const r = (s, u) => s ? `${fmt(num(s.state))} ${u}` : "–", today = num(en.today?.state), solarToday = num(hass.states[cfg.solarToday]?.state);
  const node = (v, lbl, cls = "") => html`<div class=${`node ${cls}`}><b>${v != null ? `${fmt(Math.abs(v), 0)} W` : "–"}</b><small>${lbl}</small></div>`;
  const arrow = (txt, sub) => html`<div class="arrow"><span>${txt}</span><i></i>${sub ? html`<span>${sub}</span>` : nothing}</div>`;
  const flow = f && f.solar != null ? html`<div class="flow">
      ${node(f.solar, t("Zon"))}${arrow(f.house != null ? `→ ${fmt(Math.max(0, Math.min(f.solar, f.house)), 0)} W` : "", f.grid != null && f.grid < 0 ? t("{w} W naar het net", { w: fmt(-f.grid, 0) }) : "")}${node(f.house, t("Huis"), "main")}
      ${f.soc != null || f.batt != null ? html`<div class="node bat"><b>${f.soc != null ? `${Math.round(f.soc)}%` : "–"}</b><small>${t("Accu")}${f.batt ? ` · ${f.batt > 0 ? t("laadt") : t("ontlaadt")} ${fmt(Math.abs(f.batt), 0)} W` : ""}</small></div>` : html`<div></div>`}
      ${arrow(f.grid != null ? (f.grid >= 0 ? `← ${fmt(f.grid, 0)} W` : `→ ${fmt(-f.grid, 0)} W`) : "", price && f.grid > 0 ? `€ ${fmt(f.grid / 1000 * price, 2)} / ${t("uur")}` : "")}${node(f.grid, f.grid != null && f.grid < 0 ? t("Net (levert)") : t("Net"))}
    </div>` : nothing;
  const big = f?.house != null ? `${fmt(f.house, 0)} W` : r(en.power, "W");
  const sub = f && f.solar != null ? [f.own != null ? t("{n}% eigen stroom", { n: Math.round(f.own * 100) }) : null, f.batt ? (f.batt > 0 ? t("accu laadt") : t("accu ontlaadt")) : null, f.grid != null ? (f.grid >= 0 ? t("net {w} W", { w: fmt(f.grid, 0) }) : t("{w} W terug", { w: fmt(-f.grid, 0) })) : null].filter(Boolean).join(" · ") : t("Nu");
  // today per hour: use, with the solar part laid over it
  const rows = pop.hourly === undefined ? null : pop.hourly, sol = pop.solarHourly || [], max = Math.max(...(rows || []).map(x => x.v), ...sol.map(x => x.v), 0.001), nowH = new Date().getHours();
  const solAt = tm => sol.find(x => x.t.getHours() === tm.getHours())?.v || 0;
  const bars = rows ? (rows.length ? html`<div class="ebars">${rows.map(x => html`<i class=${classMap({ now: x.t.getHours() === nowH })} style=${`height:${Math.max(3, x.v / max * 100)}%`} title=${`${x.t.getHours()}:00 · ${x.v.toFixed(2)} kWh`}><b style=${`height:${Math.min(100, solAt(x.t) / Math.max(x.v, 0.001) * 100)}%`}></b></i>`)}</div><div class="bars-x"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>` : html`<div class="sub">${t("Nog geen gegevens voor vandaag")}</div>`) : html`<div class="sub">${t("Laden…")}</div>`;
  // the biggest consumers right now: W sensors, with the switch of the plug they belong to
  const skip = new Set([en.power?.entity_id, cfg.solar, cfg.batteryPower].filter(Boolean));
  const appl = p.rooms.flatMap(rm => rm.ents.appliances.filter(a => a.power).map(a => ({ a, rm })));
  const watts = Object.values(hass.states).filter(s => domain(s.entity_id) === "sensor" && ["W", "kW"].includes(s.attributes.unit_of_measurement) && num(s.state) != null && !skip.has(s.entity_id) && !hass.entities?.[s.entity_id]?.hidden)
    .map(s => ({ s, w: s.attributes.unit_of_measurement === "kW" ? num(s.state) * 1000 : num(s.state) })).filter(x => x.w > 1).sort((a, b) => b.w - a.w).slice(0, 5)
    .map(x => { const m = appl.find(y => y.a.power.id === x.s.entity_id); const rm = m?.rm || p.rooms.find(r => r.ents.all.some(e => e.id === x.s.entity_id)); const sw = m?.a.switch;
      const idle = rm?.motion && !rm.motionOn && Date.now() - new Date(rm.motion.last_changed) > 45 * 60000;
      return { ...x, rm, sw, nm: m ? (cardCfg(p, m.a.id).name || deviceName(hass, m.a.device)) : (x.s.attributes.friendly_name || x.s.entity_id).replace(/ (power|vermogen)$/i, ""), idle }; });
  return ui.wrap(t("Energie"), big, sub, html`${flow}
    ${en.today || cfg.solarToday ? html`<div class="prow"><span>${t("Vandaag")}</span><b>${[today != null ? `${fmt(today)} kWh ${t("verbruikt")}` : null, solarToday != null ? `${fmt(solarToday)} kWh ${t("zon")}` : null, price && today != null ? `€ ${fmt(today * price, 2)}` : null].filter(Boolean).join(" · ")}</b></div>${bars}` : nothing}
    ${watts.length ? html`<div class="prow"><span>${t("Grootverbruikers nu")}</span><b>${t("tik = details, de knop schakelt")}</b></div>
      <ul style="margin-top:8px">${watts.map(x => html`<li class=${classMap({ on: x.sw ? isOn(x.sw.state) : false, tap: true })} @click=${() => p.moreInfo(x.s.entity_id)}>${ico(x.s.attributes.icon || "mdi:power-plug-outline", x.s.attributes.icon ? null : "plug")}<div>${x.nm}<small>${[x.rm?.name, x.idle ? html`<b class="hint">${t("niemand in de kamer")}</b>` : null].filter(Boolean).map((y, i) => html`${i ? " · " : ""}${y}`)}</small></div><span class="st">${fmt(x.w, 0)} W${x.sw ? html`<button class="sw" title=${isOn(x.sw.state) ? t("Uitzetten") : t("Aanzetten")} @click=${ev => { stop(ev); p.call("switch", "toggle", { entity_id: x.sw.id }); }}><ha-icon icon="mdi:power"></ha-icon></button>` : nothing}</span></li>`)}</ul>` : nothing}
    <ul>${en.returned ? ui.li("mdi:transmission-tower-export", t("Teruggeleverd"), r(en.returned, "kWh")) : nothing}${en.gas ? ui.li("mdi:fire", t("Gas"), r(en.gas, "m³")) : nothing}</ul>`);
}

/* =========================================================== media =========================================================== */
const GROUPING = 524288, SEEK = 4096;
export function mediaPopup(p, pop, ui) {
  const hass = p.hass, v = mediaView(p, pop.e), s = v.main, vol = Math.round((s.attributes.volume_level ?? 0) * 100), on = v.playing;
  const call = (svc, data = {}) => p.call("media_player", svc, { entity_id: pop.e.id, ...data }), ctl = svc => p.call("media_player", svc, { entity_id: v.ctl });
  const a = v.info?.attributes || {}, dur = num(a.media_duration), pos0 = num(a.media_position), pos = pos0 != null && dur ? Math.min(dur, pos0 + (on && a.media_position_updated_at ? (Date.now() - new Date(a.media_position_updated_at)) / 1000 : 0)) : null;
  const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  liveTick(p, "media", on && dur > 0);
  const music = a.media_content_type === "music" || !!a.media_artist;
  const sub = [a.media_artist, a.media_album_name, v.app?.name || (a.app_name && !/^(launcher|home)$/i.test(a.app_name) ? a.app_name : null) || (!music ? s.attributes.source : null)].filter(Boolean).join(" · ");
  // every player in the house (one per card, like the room pages; a TV seen through several integrations counts once), the one we came from first
  const linkedAll = new Set(p.rooms.flatMap(r => r.ents.media.flatMap(e => e.linked || [])));
  const players = p.rooms.flatMap(r => r.ents.media.map(e => ({ ...e, room: r }))).filter(e => !cardCfg(p, e.id).hidden && (e.id === pop.e.id || !linkedAll.has(e.id)));
  if (!players.some(e => e.id === pop.e.id)) players.unshift({ ...pop.e, room: p.room });
  players.sort((x, y) => (x.id === pop.e.id ? 0 : 1) - (y.id === pop.e.id ? 0 : 1));
  const canGroup = e => (hass.states[e.id]?.attributes.supported_features & GROUPING) > 0;
  const members = s.attributes.group_members || [], inGroup = e => members.includes(e.id) && e.id !== pop.e.id;
  const join = e => inGroup(e) ? p.call("media_player", "unjoin", { entity_id: e.id }) : p.call("media_player", "join", { entity_id: pop.e.id, group_members: [...members.filter(id => id !== pop.e.id), e.id] });
  const others = players.filter(e => e.id !== pop.e.id && canGroup(e) && !unavailable(hass.states[e.id]));
  const playing = players.map(e => hass.states[e.id]).filter(x => x && ["playing", "paused"].includes(x.state));
  const prow = e => { const ps = hass.states[e.id]; if (!ps) return nothing; const pv = mediaView(p, e), un = unavailable(ps), vl = ps.attributes.volume_level, me = e.id === pop.e.id;
    const psub = un ? t("Onbereikbaar") : pv.title ? `${pv.title}${pv.artist ? " · " + pv.artist : ""}` : pv.app && !pv.off ? pv.app.name : pv.off ? t("Uit") : ps.state === "playing" ? t("Speelt af") : ps.state === "paused" ? t("Gepauzeerd") : t("Inactief");
    return html`<li class=${classMap({ on: pv.playing, mrow: true, me })} @click=${() => { if (!me) p.openPopup({ type: "media", e }); }}>
      ${ico(pv.artist ? "mdi:music-note-outline" : "mdi:television-play", pv.artist ? "music" : "tv")}
      <div>${label(p, e)}${me ? html` <em>${t("deze")}</em>` : nothing}${inGroup(e) ? html` <em>${t("gekoppeld")}</em>` : nothing}<small>${e.room?.name ? e.room.name + " · " : ""}${psub}</small>
        ${vl != null && !un ? html`<input type="range" class="ls" min="0" max="100" .value=${String(Math.round(vl * 100))} @click=${stop} @pointerdown=${stop} @change=${ev => p.call("media_player", "volume_set", { entity_id: e.id, volume_level: +ev.target.value / 100 })}>` : nothing}</div>
      <span class="st">${!me && canGroup(pop.e) && canGroup(e) && !un ? html`<button class=${classMap({ sw: true, on: inGroup(e) })} title=${inGroup(e) ? t("Loskoppelen") : t("Koppelen aan deze speler")} @click=${ev => { stop(ev); join(e); }}><ha-icon icon=${inGroup(e) ? "mdi:link-variant" : "mdi:link-variant-plus"}></ha-icon></button>` : nothing}${!me && !un ? (pv.off ? html`<button class="sw" title=${t("Aan")} @click=${ev => { stop(ev); p.call("media_player", "turn_on", { entity_id: e.id }); }}><ha-icon icon="mdi:power"></ha-icon></button>` : html`<button class=${classMap({ sw: true, on: ps.state === "playing" })} title=${ps.state === "playing" ? t("Pauze") : t("Speel")} @click=${ev => { stop(ev); p.call("media_player", "media_play_pause", { entity_id: pv.ctl }); }}><ha-icon icon=${ps.state === "playing" ? "mdi:pause" : "mdi:play"}></ha-icon></button>`) : nothing}</span></li>`; };
  const ib = (mdi, title, go, cls = "") => html`<button class=${cls} title=${title} @click=${go}><ha-icon icon=${mdi}></ha-icon></button>`;
  return ui.wrap(`${t("Media")} · ${label(p, pop.e)}`, "", "", html`
    ${v.title && !v.off ? html`<div class="mhead">${v.art ? html`<div class="mart sq" style=${`background-image:url("${v.art}")`}></div>` : nothing}<div class="mi">
      <b>${v.title}</b>${sub ? html`<small>${sub}</small>` : nothing}
      ${dur && pos != null ? html`<div class="seek" @click=${ev => { if (!(s.attributes.supported_features & SEEK)) return; const r = ev.currentTarget.getBoundingClientRect(); call("media_seek", { seek_position: Math.round((ev.clientX - r.left) / r.width * dur) }); }}><i style=${`width:${pos / dur * 100}%`}></i></div><div class="bars-x"><span>${mmss(pos)}</span><span>${mmss(dur)}</span></div>` : nothing}</div></div>` : nothing}
    <div class="modes icons">${ib("mdi:skip-previous", t("Vorige"), () => ctl("media_previous_track"))}${ib(on ? "mdi:pause" : "mdi:play", on ? t("Pauze") : t("Speel"), () => ctl("media_play_pause"), on ? "on" : "")}${ib("mdi:skip-next", t("Volgende"), () => ctl("media_next_track"))}${ib("mdi:power", v.off ? t("Aan") : t("Uit"), () => call(v.off ? "turn_on" : "turn_off"))}</div>
    ${s.attributes.volume_level != null ? ui.range(t("Volume"), vol, x => call("volume_set", { volume_level: x / 100 })) : nothing}
    ${s.attributes.source_list && !music && s.attributes.source_list.length <= 12 ? html`<div class="chips" style="margin-top:14px">${s.attributes.source_list.map(src => html`<button class=${src === s.attributes.source ? "on" : ""} @click=${() => call("select_source", { source: src })}>${src}</button>`)}</div>` : nothing}
    ${players.length > 1 ? html`<div class="prow"><span>${t("Spelers")}</span><b>${[playing.length ? tn(playing.length, "{n} speelt", "{n} spelen") : null, members.length > 1 ? t("groep van {n}", { n: members.length }) : null].filter(Boolean).join(" · ")}</b></div>
      <ul style="margin-top:8px">${players.map(prow)}</ul>
      ${ui.modes([...(others.length && canGroup(pop.e) ? [{ label: members.length > 1 ? t("Groep opheffen") : t("Overal"), on: members.length > 1, go: () => members.length > 1 ? p.call("media_player", "unjoin", { entity_id: members.filter(id => id !== pop.e.id) }) : p.call("media_player", "join", { entity_id: pop.e.id, group_members: others.map(e => e.id) }) }] : []), ...(playing.length ? [{ label: t("Stop alles"), go: () => p.call("media_player", "media_stop", { entity_id: playing.map(x => x.entity_id) }) }] : [])], "n2")}` : nothing}
    ${v.info && v.info !== s ? html`<ul>${ui.li("mdi:link-variant", t("Info van"), v.info.attributes.friendly_name || v.info.entity_id, { sub: t("gekoppelde speler"), onclick: () => p.moreInfo(v.info.entity_id) })}</ul>` : nothing}`, "media");
}

/* =========================================================== agenda =========================================================== */
export function agendaPopup(p, pop, ui) {
  const evs = p.events || [], now = new Date(), next = evs.find(ev => ev.end > now), week = evs.filter(ev => ev.end > now && ev.start < new Date(now.getTime() + 7 * 86400000));
  return ui.wrap(t("Agenda"), next ? next.summary : t("Niets gepland"), next ? `${whenText(next)} · ${tn(week.length, "{n} afspraak deze week", "{n} afspraken deze week")}` : t("Komende week"), calendarBody(p, pop), "wide cal");
}

export const popup2Styles = `
  /* lights: a room header with its own on/off, rows with a slider */
  .popup .prow.lr{margin-top:16px}
  .popup .prow.lr span b{font-weight:600;color:var(--fg-3)}
  .popup .lnk{border:0;background:none;color:var(--fg-2);font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;padding:4px 6px}
  .popup li.lrow{align-items:start}
  .popup li.lrow>img.ico{margin-top:2px}
  .popup li .hint{color:#ffb8a6;font-weight:600}
  .popup li input.ls{grid-column:auto;width:100%;height:6px;margin:10px 0 2px;background:rgba(255,255,255,.25)}
  .popup li.on input.ls{background:rgba(255,255,255,.35)}
  .popup li input.ls::-webkit-slider-thumb{width:16px;height:16px}
  .popup li input.ls::-moz-range-thumb{width:16px;height:16px}
  .popup li .st .sw{margin-left:10px;width:30px;height:30px;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:inline-grid;place-items:center;vertical-align:middle}
  .popup li .st .sw.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .popup li .st .sw ha-icon{--mdc-icon-size:15px}
  .popup li.on .st .sw{background:rgba(0,0,0,.25);border-color:transparent}
  .popup li.on .st .sw.on{background:#fff;color:#1d1d1f}
  /* weather: rain bars, eight hours, a day per row with its temperature range, small tiles */
  .popup .rain{display:flex;align-items:flex-end;gap:2px;height:44px;margin-top:10px;padding:0 1px}
  .popup .rain i{flex:1;border-radius:2px 2px 0 0;background:#7db8ff;opacity:.85}
  .popup .wxhd{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:14px}
  .popup .wxhd b{display:block;font-size:36px;font-weight:700;letter-spacing:-.8px;line-height:1.1}
  .popup .wxhd{letter-spacing:0}
  .popup .wxhd b .dt{margin:0 10px;vertical-align:6px;width:5px;height:5px}
  .popup .wxhd span{display:block;font-size:14px;font-weight:500;letter-spacing:0;line-height:1.5;color:var(--fg-2);margin-top:8px}
  .popup .wxhd span .dt{margin:0 8px;vertical-align:3px}
  .popup .wxhd>.wxe{font-size:56px;line-height:1;flex:none}
  .popup .wxe{font-style:normal;display:inline-block}
  .popup .fc div .wxe{display:block;font-size:22px;line-height:1;margin:6px auto}
  .popup .wd .wxe{font-size:18px;line-height:1;text-align:center}
  .popup .fc.hours.h8 div em{color:#9cc7ff;opacity:1}
  .popup .rain{overflow:visible;margin-top:34px}
  .popup .rain i{cursor:pointer;position:relative}
  .popup .rain i:hover,.popup .rain i.sel{background:#fff}
  .popup .rain i::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%) translateY(4px);padding:5px 9px;border-radius:6px;background:#fff;color:#1d1d1f;font-size:11px;font-weight:700;letter-spacing:0;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .12s,transform .12s;z-index:2}
  .popup .rain i::before{content:"";position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);border:5px solid transparent;border-top-color:#fff;border-bottom:0;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2}
  .popup .rain i:hover::after,.popup .rain i.sel::after,.popup .rain i:hover::before,.popup .rain i.sel::before{opacity:1;transform:translateX(-50%)}
  .popup .rain i:first-child::after{left:0;transform:none}
  .popup .rain i:last-child::after{left:auto;right:0;transform:none}
  .popup .seek{position:relative;overflow:visible}
  .popup .seek i{position:relative}
  .popup .seek i::after{content:"";position:absolute;right:-6px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
  .popup .modes.icons button{padding:11px 0}
  .popup .modes.icons button ha-icon{--mdc-icon-size:22px;display:block;margin:0 auto}
  .popup.lights{max-width:min(760px,calc(100vw - 32px));width:min(760px,calc(100vw - 32px))}
  .popup .fc.hours.h8{grid-template-columns:repeat(8,1fr);margin-top:8px}
  .popup .fc.hours.h8 div{padding:8px 0}
  .popup .fc.hours.h8 div.now{background:rgba(255,255,255,.2)}
  .popup .fc div img.ico{width:24px;height:24px;display:block;margin:5px auto}
  .popup .wk{display:flex;flex-direction:column;gap:3px;margin-top:8px}
  .popup .wd{display:grid;grid-template-columns:62px 24px 36px 1fr 36px 44px;align-items:center;gap:8px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:var(--r-sm);background:rgba(255,255,255,.06)}
  .popup .wd.today{background:rgba(255,255,255,.16)}
  .popup .wd img.ico{width:22px;height:22px}
  .popup .wd .lo,.popup .wd .hi{text-align:right;font-weight:700}
  .popup .wd .lo{color:var(--fg-3)}
  .popup .wd .range{height:5px;border-radius:3px;background:rgba(255,255,255,.12);position:relative}
  .popup .wd .range i{position:absolute;top:0;height:100%;border-radius:3px;background:linear-gradient(90deg,#7db8ff,#f2b63a)}
  .popup .wd em{font-style:normal;font-size:10px;color:#9cc7ff;text-align:right}
  .popup .wkpi{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:14px}
  .popup .wkpi div{padding:10px 12px;border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid var(--line)}
  .popup .wkpi b{display:block;font-size:18px;font-weight:700;letter-spacing:-.3px;white-space:nowrap}
  .popup .wkpi b small{font-size:11px;font-weight:600;color:var(--fg-3);margin-left:4px;letter-spacing:0}
  .popup .wkpi span{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--fg-3);font-weight:700}
  /* energy: the flow block and bars with the solar share */
  .popup .flow{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:6px 8px;margin-top:16px;align-items:center}
  .popup .node{border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid var(--line);padding:12px 8px;text-align:center;min-width:0}
  .popup .node b{display:block;font-size:19px;font-weight:700;letter-spacing:-.4px;white-space:nowrap}
  .popup .node small{display:block;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup .node.main{background:rgba(255,255,255,.2);border-color:var(--line-on)}
  .popup .node.bat small{white-space:normal;line-height:1.3}
  .popup .arrow{font-size:11px;color:var(--fg-2);text-align:center;font-weight:600;min-width:0}
  .popup .arrow span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup .arrow i{display:block;height:2px;background:linear-gradient(90deg,rgba(255,255,255,.1),#fff,rgba(255,255,255,.1));margin:4px 0;border-radius:1px}
  .popup .ebars{display:flex;align-items:flex-end;gap:3px;height:70px;margin-top:14px;padding:0 2px}
  .popup .ebars i{flex:1;position:relative;border-radius:3px 3px 0 0;background:rgba(255,255,255,.3);min-height:3px;overflow:hidden}
  .popup .ebars i.now{background:rgba(255,255,255,.55)}
  .popup .ebars i b{position:absolute;left:0;right:0;bottom:0;background:var(--accent);opacity:.9}
  /* media: artwork square with the title, a seek bar, players with a volume each */
  .popup .mhead{display:flex;gap:16px;align-items:center;margin-top:14px}
  .popup .mart.sq{width:88px;height:88px;flex:none;margin:0}
  .popup .mi{flex:1;min-width:0}
  .popup .mi b{display:block;font-size:26px;font-weight:700;letter-spacing:-.5px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup.media .big,.popup.media .sub{display:none}
  .popup.media .mhead{margin-top:18px}
  .popup .mi small{display:block;font-size:13px;color:var(--fg-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup .seek{height:5px;border-radius:3px;background:rgba(255,255,255,.2);margin-top:12px;cursor:pointer}
  .popup .seek i{display:block;height:100%;background:#fff;border-radius:3px}
  .popup li.mrow{align-items:start}
  .popup li.mrow em{font-style:normal;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.18);vertical-align:2px}
  .popup li.mrow .st .sw{margin-left:4px}
  .popup.cal{max-width:min(1040px,calc(100vw - 32px));width:min(1040px,calc(100vw - 32px))}
  @media (max-width:900px){
    .popup .wkpi{grid-template-columns:1fr 1fr}
    .popup .wd{grid-template-columns:52px 22px 30px 1fr 30px 36px;gap:6px;font-size:11px}
    .popup .fc.hours.h8{grid-template-columns:repeat(4,1fr)}
    .popup .fc.hours.h8 div:nth-child(n+5){display:none}
    .popup .flow{grid-template-columns:1fr 1fr 1fr;gap:4px}
    .popup .node b{font-size:15px}
    .popup .mart.sq{width:64px;height:64px}
    .popup.cal,.popup.lights{width:calc(100% - 32px);max-width:none}
    .popup .wxhd b{font-size:28px}
    .popup .wxhd>.wxe{font-size:44px}
  }
`;
