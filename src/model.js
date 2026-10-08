// Turns the Home Assistant registries + states into the panel's room/home model.
// Rooms = areas. An entity belongs to an area directly or through its device.
import { slug, domain, num, isOn, unavailable, isDown, daysUntil } from "./util.js";
import { t, locale } from "./i18n.js";

const DOOR = ["door", "garage_door", "opening", "garage"];
const WINDOW = ["window"];
const MOTION = ["motion", "occupancy", "presence"];
const APPLIANCE_RE = /(was|wash|droger|dryer|vaatwas|dish|oven|koffie|coffee|magnetron|microwave|airfryer|stofzuig|pomp|pump|boiler|warmtepomp|heatpump)/i;
const ROOM_DOMAINS = ["light", "switch", "media_player", "cover", "climate", "fan", "lock", "vacuum", "humidifier", "input_boolean"];

/** All entities with their resolved area, skipping hidden/disabled ones. */
export function entitiesByArea(hass) {
  const out = new Map();
  for (const [id, e] of Object.entries(hass.entities || {})) {
    if (e.hidden || e.disabled) continue;
    const area = e.area_id || (e.device_id && hass.devices?.[e.device_id]?.area_id);
    if (!area) continue;
    if (!out.has(area)) out.set(area, []);
    out.get(area).push({ id, reg: e, state: hass.states[id] });
  }
  return out;
}

/* pickup date of a waste sensor as YYYY-MM-DD. Afvalwijzer reports state "Tomorrow, 08-10-2026" with Sort_date 20261008;
   others give an ISO date in the state or a date attribute */
function wasteDate(s) {
  const a = s.attributes || {}, sd = String(a.Sort_date ?? "");
  if (/^\d{8}$/.test(sd)) return `${sd.slice(0, 4)}-${sd.slice(4, 6)}-${sd.slice(6, 8)}`;
  for (const v of [a.Sorted_date, a.date, s.state]) {
    if (!v) continue;
    const m = String(v).match(/(\d{1,2})-(\d{1,2})-(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (!isNaN(new Date(v))) return String(v).slice(0, 10);
  }
  return null;
}
const isOpState = e => e.reg.translation_key === "operation_state" || /_operation_state$/.test(e.id);

function classify(list, config = {}, hass = {}) {
  const r = { lights: [], switches: [], strips: [], media: [], covers: [], climate: [], fans: [], locks: [], vacuums: [], humidifiers: [], scenes: [], cameras: [], appliances: [], power: [], opstate: [], doors: [], windows: [], motion: [], temp: [], hum: [], battery: [], other: [], all: list };
  for (const e of list) {
    const d = domain(e.id), dc = e.state?.attributes?.device_class, cat = e.reg.entity_category;
    if (cat === "diagnostic" || cat === "config") { if (dc === "battery") r.battery.push(e); continue; }
    if (d === "light") r.lights.push(e);
    else if (d === "switch" || d === "input_boolean") r.switches.push(e);
    else if (d === "fan") r.fans.push(e);
    else if (d === "lock") r.locks.push(e);
    else if (d === "vacuum") r.vacuums.push(e);
    else if (d === "humidifier") r.humidifiers.push(e);
    else if (d === "scene") r.scenes.push(e);
    else if (d === "camera") r.cameras.push(e);
    else if (d === "media_player") r.media.push(e);
    else if (d === "cover") r.covers.push(e);
    else if (d === "climate") r.climate.push(e);
    else if (d === "binary_sensor") {
      if (DOOR.includes(dc)) r.doors.push(e); else if (WINDOW.includes(dc)) r.windows.push(e);
      else if (MOTION.includes(dc)) r.motion.push(e); else r.other.push(e);
    } else if (d === "sensor") {
      if (dc === "temperature") r.temp.push(e); else if (dc === "humidity") r.hum.push(e);
      else if (dc === "battery") r.battery.push(e);
      else if (dc === "power" || e.state?.attributes?.unit_of_measurement === "W") r.power.push(e);
      else if (isOpState(e)) r.opstate.push(e);
    }
  }
  // appliance = a device with a power sensor and (a switch or an appliance-like name)
  for (const pw of r.power) {
    const dev = pw.reg.device_id; if (!dev) continue;
    const sw = r.switches.find(s => s.reg.device_id === dev);
    const dname = (pw.state?.attributes?.friendly_name || "") + " " + (sw?.state?.attributes?.friendly_name || "");
    if (!sw && !APPLIANCE_RE.test(dname)) continue;
    if (r.appliances.some(a => a.device === dev)) continue;
    const plain = !!config.cards?.[(sw || pw).id]?.noAppliance;          // appliance features off: still a plug card (watts), but no busy/done
    if (plain && !sw) continue;
    r.appliances.push({ id: "device:" + dev, device: dev, key: (sw || pw).id, power: pw, switch: sw || null, plain });
    if (sw) r.switches = r.switches.filter(s => s !== sw);
  }
  // a power sensor linked by hand in the card settings (sensor on another device, or none at all)
  for (const sw of [...r.switches]) {
    const pid = config.cards?.[sw.id]?.power, ps = pid && hass.states[pid]; if (!ps) continue;
    const dev = sw.reg.device_id || sw.id;
    if (r.appliances.some(a => a.key === sw.id)) continue;
    r.appliances.push({ id: "device:" + dev, device: sw.reg.device_id || null, key: sw.id, power: { id: pid, state: ps, reg: hass.entities?.[pid] || {} }, switch: sw, plain: !!config.cards?.[sw.id]?.noAppliance });
    r.switches = r.switches.filter(s => s !== sw);
  }
  // appliance = a device that reports its own program status (Home Connect, Miele, LG ThinQ …): an operation-state sensor
  for (const op of r.opstate) {
    const dev = op.reg.device_id; if (!dev) continue;
    const own = list.filter(e => e.reg.device_id === dev), pick = (tk, re) => own.find(e => e.reg.translation_key === tk || re.test(e.id)) || null;
    const sws = r.switches.filter(s => s.reg.device_id === dev), sw = sws.find(s => s.reg.translation_key === "power" || /_power$/.test(s.id)) || null;
    if (config.cards?.[(sw || op).id]?.noAppliance) continue;
    const more = { op, progress: pick("program_progress", /_program(me)?_progress$/), finish: pick("program_finish_time", /_program(me)?_finish_time$/), door: pick("door", /^sensor\..*_door$/),
      program: pick("active_program", /^select\..*_active_program(me)?$/), stop: pick("stop_program", /^button\..*_stop_program(me)?$/), extra: sws.filter(s => s !== sw),
      flags: r.other.filter(e => e.reg.device_id === dev) };              // e.g. "remote start": shown in the popup
    const prev = r.appliances.find(a => a.device === dev);
    if (prev) Object.assign(prev, more);                                   // a smart plug with power meter on the same device: keep both
    else r.appliances.push({ id: "device:" + dev, device: dev, key: (sw || op).id, power: null, switch: sw, ...more });
    r.switches = r.switches.filter(s => !sws.includes(s));                // power + extra switches live inside the appliance card
  }
  // a device with two or more switches (power strip) becomes one card
  const byDev = new Map();
  for (const e of r.switches) if (e.reg.device_id && domain(e.id) === "switch") { if (!byDev.has(e.reg.device_id)) byDev.set(e.reg.device_id, []); byDev.get(e.reg.device_id).push(e); }
  for (const [dev, sw] of byDev) if (sw.length >= 2) { r.strips.push({ id: "device:" + dev, device: dev, switches: sw }); r.switches = r.switches.filter(e => !sw.includes(e)); }
  // a binary sensor without a known type on a device that already has a card (thermostat, appliance, …) is a detail of that
  // device ("remote start", "overlay"), not a card of its own; it stays on the Sensoren page as r.details
  const owned = new Set([...r.lights, ...r.switches, ...r.media, ...r.covers, ...r.climate, ...r.fans, ...r.locks, ...r.vacuums, ...r.humidifiers, ...r.cameras].map(e => e.reg.device_id));
  for (const x of [...r.appliances, ...r.strips]) owned.add(x.device);
  r.details = r.other.filter(e => e.reg.device_id && owned.has(e.reg.device_id));
  r.other = r.other.filter(e => !r.details.includes(e));
  return r;
}

const avg = (list) => { const v = list.map(e => num(e.state?.state)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const latest = (list) => list.map(e => e.state).filter(Boolean).sort((a, b) => new Date(b.last_changed) - new Date(a.last_changed))[0];

/* One TV often shows up through several integrations (Android TV Remote, Bravia, Cast, Apple TV), each with its own
   media_player. Only some report a title and artwork (Cast, Apple TV), and those often have no area. Players whose device
   names match ("SONY KD-55X85L") become one card; `linked` lists the others, plus a player picked by hand (card setting `link`). */
const devKey = (hass, id) => { const d = hass.devices?.[hass.entities?.[id]?.device_id]; return (d?.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
function linkMedia(hass, media, config) {
  const all = Object.keys(hass.states).filter(id => id.startsWith("media_player.") && !hass.entities?.[id]?.hidden), out = [];
  for (const e of media) {
    const k = devKey(hass, e.id), same = k.length > 3 ? all.filter(id => id !== e.id && devKey(hass, id) === k) : [];
    const lead = out.find(x => x.linked.includes(e.id));
    if (lead) continue;                                                   // already folded into an earlier card of this room
    const manual = config.cards?.[e.id]?.link;
    out.push({ ...e, linked: [...new Set([...same, ...(manual && manual !== e.id ? [manual] : [])])] });
  }
  return out;
}

/** Rooms in navigation order. */
export function buildRooms(hass, config) {
  const byArea = entitiesByArea(hass);
  const areas = Object.values(hass.areas || {});
  let rooms = areas.map(a => {
    const ents = classify(byArea.get(a.area_id) || [], config, hass);
    ents.media = linkMedia(hass, ents.media, config);
    const s = slug(a.name), pg = config.pages?.[a.area_id] || {};
    return {
      id: a.area_id, name: pg.title || a.name, slug: s, floor: a.floor_id || null,
      image: pg.image || a.picture || (config.roomImage || "").replace("{slug}", s),
      // photo file named after the area name, or else after the area id (stays put when the area is renamed)
      images: pg.image || a.picture || !config.roomImage ? null : [...new Set([s, slug(a.area_id)])].map(x => config.roomImage.replace("{slug}", x)),
      ents,
      temp: avg(ents.temp), hum: avg(ents.hum),
      motion: latest(ents.motion),
      motionOn: ents.motion.filter(e => !config.home?.bannerSensors || config.home.bannerSensors.includes(e.id)).some(e => isOn(e.state)),
      lightsOn: ents.lights.filter(e => isOn(e.state)).length,
    };
  });
  const cfg = config.rooms;
  if (Array.isArray(cfg)) {
    rooms = cfg.map(c => {
      const key = typeof c === "string" ? c : c.area;
      const r = rooms.find(x => x.id === key || x.slug === key || x.name === key);
      if (r && typeof c === "object") { if (c.image) { r.image = c.image; r.images = null; } if (c.name) r.name = c.name; }
      return r;
    }).filter(Boolean);
  } else {
    const ex = new Set(config.excludeAreas || []);
    rooms = rooms.filter(r => !ex.has(r.id) && !ex.has(r.slug) && ROOM_DOMAINS.some(d => r.ents.all.some(e => domain(e.id) === d && !e.reg.entity_category)))
      .sort((a, b) => a.name.localeCompare(b.name, locale()));
    if (config.maxRooms) rooms = rooms.slice(0, config.maxRooms);
  }
  return rooms;
}

const pick = (hass, id, fallbackDomain) => {
  if (id && hass.states[id]) return hass.states[id];
  if (!fallbackDomain) return null;
  return Object.values(hass.states).find(s => domain(s.entity_id) === fallbackDomain) || null;
};

/** Everything the home view needs, aggregated across the rooms. */
export function buildHome(hass, config, rooms, notifications = []) {
  const h = config.home || {};
  const all = rooms.flatMap(r => r.ents.all.map(e => ({ ...e, room: r })));
  const lights = all.filter(e => domain(e.id) === "light" && !e.reg.entity_category);
  const doors = rooms.flatMap(r => r.ents.doors.map(e => ({ ...e, room: r })));
  const windows = rooms.flatMap(r => r.ents.windows.map(e => ({ ...e, room: r })));
  const persons = Object.values(hass.states).filter(s => domain(s.entity_id) === "person");

  const low = h.lowBattery ?? 20;
  const attention = [];
  for (const e of all) if (isDown(e) && !e.reg.entity_category && domain(e.id) !== "sensor" && domain(e.id) !== "binary_sensor")
    attention.push({ kind: "unavailable", id: e.id, name: e.state?.attributes?.friendly_name || e.reg.name || e.id, room: e.room, since: e.state?.last_changed, text: t("onbereikbaar"), icon: "mdi:lan-disconnect" });
  for (const r of rooms) for (const e of r.ents.battery) { const v = num(e.state?.state); if (v != null && v <= low)
    attention.push({ kind: "battery", id: e.id, name: (e.state?.attributes?.friendly_name || e.id).replace(/ batter(y|ij)/i, ""), room: r, value: v, text: t("batterij {n}%", { n: v }), icon: "mdi:battery-20" }); }
  for (const n of notifications) attention.push({ kind: "notification", id: n.notification_id, name: n.title || t("Melding"), text: (n.message || "").replace(/\s+/g, " ").slice(0, 80), icon: "mdi:bell-outline", since: n.created_at });
  for (const s of Object.values(hass.states)) if (domain(s.entity_id) === "update" && s.state === "on" && !(s.attributes.skipped_version && s.attributes.skipped_version === s.attributes.latest_version))
    attention.push({ kind: "update", id: s.entity_id, name: s.attributes.title || (s.attributes.friendly_name || s.entity_id).replace(/ update$/i, ""), text: t("update {v}", { v: s.attributes.latest_version || "" }).trim(), icon: "mdi:update", since: s.last_changed });
  for (const s of Object.values(hass.states)) if (domain(s.entity_id) === "automation" && s.state === "unavailable")
    attention.push({ kind: "automation", id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, text: t("automatisering mislukt"), icon: "mdi:robot-dead-outline", since: s.last_changed });

  const waste = (h.waste || []).map(w => { const s = hass.states[w.entity]; if (!s) return null;
    const date = wasteDate(s), d = date ? daysUntil(date) : (num(s.attributes?.Days_until) ?? null);
    return { label: w.label || s.attributes.friendly_name, state: s.state, date, days: d, entity: w.entity }; })
    .filter(Boolean).sort((a, b) => (a.days ?? 99) - (b.days ?? 99));

  const scenes = h.scenes ? h.scenes.map(id => hass.states[id]).filter(Boolean)
    : Object.values(hass.states).filter(s => domain(s.entity_id) === "scene").slice(0, 4);

  const temps = rooms.map(r => r.temp).filter(x => x != null), hums = rooms.map(r => r.hum).filter(x => x != null);
  const en = h.energy || {};
  const calendars = h.calendars || Object.values(hass.states).filter(s => domain(s.entity_id) === "calendar").map(s => s.entity_id);
  return {
    calendars, appliances: (h.appliances || []).filter(a => a.power), sun: hass.states["sun.sun"] || null,
    persons, home: persons.filter(p => p.state === "home").length,
    alarm: pick(hass, h.alarm, "alarm_control_panel"),
    climate: pick(hass, h.climate, "climate"),
    weather: pick(hass, h.weather, "weather"),
    temp: h.temperature ? num(hass.states[h.temperature]?.state) : (temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null),
    hum: h.humidity ? num(hass.states[h.humidity]?.state) : (hums.length ? hums.reduce((a, b) => a + b, 0) / hums.length : null),
    lights, lightsOn: lights.filter(e => isOn(e.state)),
    doors, doorsOpen: doors.filter(e => isOn(e.state)),
    windows, windowsOpen: windows.filter(e => isOn(e.state)),
    motion: rooms.filter(r => r.motionOn),
    attention, waste, scenes,
    energy: { power: hass.states[en.power], today: hass.states[en.today], returned: hass.states[en.returned], gas: hass.states[en.gas] },
  };
}

export const deviceName = (hass, id) => { const d = hass.devices?.[id]; return d ? (d.name_by_user || d.name || id) : id; };
export const name = (hass, e) => (e.state?.attributes?.friendly_name) || e.reg?.name || hass.states[e.id]?.attributes?.friendly_name || e.id;
