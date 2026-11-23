// Suggestion lists for <datalist> inputs (entities, numeric sensors, actions). Card forms re-render on every change, and
// a home has thousands of entities, so each list is built once per hass.states / hass.services object and kept as the
// same array while its contents stay the same; options() then skips the <option> rendering entirely (#198, P5).
import { html } from "lit";
import { guard } from "lit/directives/guard.js";
import { domain, num } from "./util.js";

const cache = new Map();   // name -> { src, list }
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function stable(name, src, build) {
  const c = cache.get(name);
  if (c && c.src === src) return c.list;
  const next = build();
  const list = c && same(c.list, next) ? c.list : next;
  cache.set(name, { src, list });
  return list;
}
/** every entity id */
export const entityIds = hass => stable("entities", hass.states, () => Object.keys(hass.states));
/** sensors with a numeric state, sorted (graph cards) */
export const numericIds = hass => stable("numeric", hass.states, () => Object.values(hass.states).filter(s => domain(s.entity_id) === "sensor" && num(s.state) != null).map(s => s.entity_id).sort());
/** every action as domain.service, sorted */
export const serviceNames = hass => stable("services", hass.services, () => Object.entries(hass.services || {}).flatMap(([d, s]) => Object.keys(s).map(k => `${d}.${k}`)).sort());
/** the <option>s for a list from above; not re-rendered while the list is the same array */
export const options = list => guard([list], () => list.map(x => html`<option value=${x}></option>`));
