// Distacco carichi: three tiles (thresholds, power sensor per load, switch per load) that open a popup to manage them.
// It used to live in src/pages.js with the helper names in a LOADS constant; the names are now props in the YAML:
//
//   - type: distacco-carichi
//     house: Potenza Casa                      # input_select / select with the house power sensor
//     limit: Potenza Massima Immediato         # input_number shown as the threshold on the first tile
//     numbers:                                 # input_number rows in the "Impostazione carichi" popup
//       - { name: Potenza Massima Ritardo, icon: mdi:chart-bell-curve }
//     power: "Potenza - Carico {n}"            # input_select per slot: which power sensor
//     switches: "Switch - Carico {n}"          # input_select per slot: which switch
//     slots: 10
//
// Helpers are found by friendly name or entity id. Every prop is optional: the defaults are the old LOADS values.
const DEFAULTS = {
  title: "Consumi",
  house: "Potenza Casa",
  limit: "Potenza Massima Immediato",
  numbers: [
    { name: "Potenza Massima Ritardo", icon: "mdi:chart-bell-curve" }, { name: "Ritardo Tra Distacchi", icon: "mdi:timer-sand" },
    { name: "Potenza Massima Immediato", icon: "mdi:chart-bell-curve" }, { name: "Minuti dopo si riattivano i carichi", icon: "mdi:timer-sand" },
    { name: "Secondi tra i distacchi", icon: "mdi:timer-sand" }, { name: "Minuti tra riattivazioni", icon: "mdi:timer-sand" },
  ],
  power: "Potenza - Carico {n}",
  switches: "Switch - Carico {n}",
  slots: 10,
};
const SEL = ["input_select", "select"];

/** the helpers, looked up by name: used by the tiles and by the popup */
function loads(props, c) {
  const o = { ...DEFAULTS, ...props };
  const nums = (o.numbers || []).map(x => typeof x === "string" ? { name: x } : Array.isArray(x) ? { name: x[0], icon: x[1] } : x)
    .map(x => ({ s: c.find(x.name, ["input_number", "number"]), icon: x.icon || "mdi:tune-variant" })).filter(x => x.s);
  const slots = pattern => Array.from({ length: +o.slots || 0 }, (_, k) => ({ n: k + 1, s: c.find(String(pattern).replace("{n}", k + 1), SEL) }))
    .filter(x => x.s).map(x => ({ ...x, c: c.hass.states[x.s.state] || null }));
  return { o, house: c.find(o.house, SEL), limit: c.find(o.limit, ["input_number", "number"]), nums, power: slots(o.power), sw: slots(o.switches) };
}

export default {
  name: "distacco-carichi",
  render(props, c) {
    const { html, ui, fmt, num, isOn } = c, d = loads(props, c), open = part => () => c.popup("distacco-carichi", { ...props, part });
    return html`<div class="kpis">
      ${ui.kpi({ icon: "mdi:tune-variant", em: "Impostazioni", v: d.limit ? fmt(num(d.limit.state), 0) : "–", unit: d.limit?.attributes.unit_of_measurement || "W", n: "soglia", tap: open("setup") })}
      ${ui.kpi({ icon: "mdi:flash-triangle-outline", em: "Potenza", v: String(d.power.filter(x => x.c).length), unit: `/ ${d.o.slots}`, n: "sensori", tap: open("power") })}
      ${ui.kpi({ icon: "mdi:toggle-switch-outline", em: "Interruttori", v: String(d.sw.filter(x => x.c).length), unit: `/ ${d.o.slots}`, n: `${d.sw.filter(x => isOn(x.c)).length} accesi`, tap: open("sw") })}
    </div>`;
  },
  popup(pop, c, wrap) {
    const { html, ui, fmt, num, isOn } = c, props = pop.props || {}, d = loads(props, c);
    const W = s => s && num(s.state) != null ? fmt(num(s.state), 0) + " W" : "–";
    const T = { setup: ["Impostazione carichi", "Soglie, ritardi e potenza della casa"], power: ["Sensori potenza carichi", "Il sensore di potenza di ogni carico"], sw: ["Interruttori carichi", "L'interruttore che viene staccato per ogni carico"] }[props.part] || ["Distacco carichi", ""];
    const rows = props.part === "power" ? d.power.map(x => ui.selectRow(x.s, { icon: `mdi:numeric-${x.n}-circle`, sub: x.c ? W(x.c) : "non scelto" }))
      : props.part === "sw" ? d.sw.map(x => ui.selectRow(x.s, { icon: `mdi:numeric-${x.n}-circle`, sub: x.c ? (isOn(x.c) ? "acceso" : "spento") : "non scelto" }))
      : [d.house ? ui.selectRow(d.house, { icon: "mdi:flash", sub: "sensore di potenza della casa" }) : null, ...d.nums.map(x => ui.numberRow(x.s, { icon: x.icon }))].filter(Boolean);
    return wrap(d.o.title, T[0], T[1], html`<div class="sblk" style="margin-top:14px">${rows.length ? rows
      : html`<div class="srow"><div class="nm">Nessun helper trovato<small>controlla i nomi nel blocco distacco-carichi del file YAML</small></div></div>`}</div>`);
  },
};
