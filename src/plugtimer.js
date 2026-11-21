// Plug timer ("switch off after N minutes", #150). It used to run in the browser, so closing the tab or reloading
// cancelled it and other devices never saw it. In order of preference it now runs:
//  1. on the plug itself, when the device has a countdown entity (Tuya, many Zigbee plugs: number.*countdown*).
//     It survives everything, even an HA restart, and every device shows the time left from that entity.
//  2. in Home Assistant, with the script below, once an admin has added it (Settings → General → Plug timers).
//     It survives closing the panel; HA aborts running scripts when it restarts.
//  3. in the browser, as before, when neither is there.
import { domain, isOn, num } from "./util.js";

export const TIMER_SCRIPT = "hacasa_nova_switch_timer";
export const timerScriptId = "script." + TIMER_SCRIPT;
/** one run per plug (mode parallel). A new run for the same plug, a cancel, or the switch going off by hand ends the
 *  earlier run without switching. Cancelling fires an event from the script itself, so any user can cancel, not only admins */
export const TIMER_SCRIPT_CONFIG = {
  alias: "HaCasa Nova: switch off later",
  description: "Used by the HaCasa Nova panel for plug timers. Turns entity_id off after the given minutes.",
  icon: "mdi:timer-outline",
  mode: "parallel",
  max: 50,
  fields: {
    entity_id: { name: "Entity", required: true, selector: { entity: { domain: ["switch", "input_boolean", "light", "fan"] } } },
    minutes: { name: "Minutes", selector: { number: { min: 1, max: 1440, unit_of_measurement: "min" } } },
    cancel: { name: "Cancel", selector: { boolean: {} } },
  },
  sequence: [
    { event: "hacasa_nova_timer", event_data: { entity_id: "{{ entity_id }}" } },
    { condition: "template", value_template: "{{ not (cancel | default(false)) }}" },
    {
      wait_for_trigger: [
        { trigger: "event", event_type: "hacasa_nova_timer", event_data: { entity_id: "{{ entity_id }}" } },
        { trigger: "template", value_template: "{{ is_state(entity_id, 'off') }}" },
      ],
      timeout: { minutes: "{{ minutes | int(0) }}" },
      continue_on_timeout: true,
    },
    { condition: "template", value_template: "{{ wait.trigger is none }}" },
    { action: "homeassistant.turn_off", target: { entity_id: "{{ entity_id }}" } },
  ],
};

/** the plug's own countdown entity on the same device, with its unit in seconds, or null */
export function countdownOf(p, a) {
  const sid = a.switch?.id, dev = p.hass.entities?.[sid]?.device_id || a.device; if (!dev) return null;
  for (const e of Object.values(p.hass.entities || {})) {
    if (e.device_id !== dev || domain(e.entity_id) !== "number" || e.disabled_by || e.hidden) continue;
    if (!/countdown/i.test(e.entity_id + " " + (e.translation_key || ""))) continue;
    const s = p.hass.states[e.entity_id]; if (!s) continue;
    const u = (s.attributes.unit_of_measurement || "s").toLowerCase(), unit = u.startsWith("h") ? 3600 : u.startsWith("min") ? 60 : 1;
    return { id: e.entity_id, unit, max: num(s.attributes.max) ?? Infinity, state: s };
  }
  return null;
}

/** minutes left and which run it is: from the plug's countdown (any device sees it) or what this browser started */
export function timerLeft(p, a) {
  const cd = countdownOf(p, a), own = p.plugTimers?.[a.id];
  if (cd) { const v = num(cd.state.state); if (v && v > 0) return { left: Math.max(1, Math.round(v * cd.unit / 60)), min: own?.min, where: "device" }; return null; }
  if (!own || !isOn(a.switch?.state)) return null;   // switched off by hand: nothing left to count down
  return { left: Math.max(0, Math.round((own.at - Date.now()) / 60000)), min: own.min, where: own.where };
}

const forget = (p, a) => { const n = { ...(p.plugTimers || {}) }; clearTimeout(n[a.id]?.h); delete n[a.id]; p.plugTimers = n; };

/** start (or, for the same minutes again, cancel) the timer for appliance a */
export async function setPlugTimer(p, a, min) {
  const sw = a.switch; if (!sw) return;
  const cur = timerLeft(p, a), cd = countdownOf(p, a), hasScript = !!p.hass.states[timerScriptId];
  if (cur && cur.min === min) {   // same chip again: cancel
    if (cd) await p.call("number", "set_value", { entity_id: cd.id, value: 0 });
    else if (cur.where === "ha" && hasScript) await p.call("script", "turn_on", { entity_id: timerScriptId, variables: { entity_id: sw.id, cancel: true } });
    forget(p, a); return;
  }
  forget(p, a);
  if (!isOn(sw.state)) await p.call(domain(sw.id), "turn_on", { entity_id: sw.id });
  const at = Date.now() + min * 60000;
  if (cd && min * 60 / cd.unit <= cd.max) {
    await p.call("number", "set_value", { entity_id: cd.id, value: Math.round(min * 60 / cd.unit) });
    p.plugTimers = { ...(p.plugTimers || {}), [a.id]: { min, at, where: "device" } };
  } else if (hasScript) {
    await p.call("script", "turn_on", { entity_id: timerScriptId, variables: { entity_id: sw.id, minutes: min } });
    p.plugTimers = { ...(p.plugTimers || {}), [a.id]: { min, at, where: "ha" } };
  } else {
    const h = setTimeout(() => { p.call(domain(sw.id), "turn_off", { entity_id: sw.id }); forget(p, a); }, min * 60000);
    p.plugTimers = { ...(p.plugTimers || {}), [a.id]: { min, at, where: "browser", h } };
  }
}

/** Settings: add the script (admins; it is saved in scripts.yaml like one made in the script editor) */
export async function installTimerScript(p) {
  await p.hass.callApi("POST", `config/script/config/${TIMER_SCRIPT}`, TIMER_SCRIPT_CONFIG);
}
