// Componente caricato a runtime da site.yaml → components: (nessuna build, basta ricaricare il browser).
// Un modulo esporta { name, render(props, ctx) } (o una lista in `export const components = [...]`).
// ctx dà lit (html, nothing, classMap), i dati (state, find, query, text, check, action, history),
// le azioni (call, more, go, popup) e i pezzi grafici del pannello (ui.kpi, ui.row, ui.block, ui.card, ui.numberRow …).
// kind: "block" = va in colonna con le altre liste; "card" = in griglia con le schede; altrimenti a tutta larghezza.
//
//   - type: barre
//     title: Umidità
//     entities: [sensor.umidita_bagno]          # e/o query: { device_class: humidity }
//     max: 100
export default {
  name: "barre",
  kind: "block",
  render(props, { html, ui, find, query, text, more, num, fmt }) {
    const list = [...(props.entities || []).map(id => find(id)), ...(props.query ? query(props.query) : [])].filter(Boolean);
    const max = +props.max || 100;
    const rows = list.map(s => {
      const v = num(s.state) ?? 0, w = Math.max(0, Math.min(100, v / max * 100));
      return html`<div class="srow barra" @click=${() => more(s.entity_id)}>
        <ha-icon icon=${s.attributes.icon || "mdi:water-percent"}></ha-icon>
        <div class="nm">${s.attributes.friendly_name || s.entity_id}<span class="bb"><i style="width:${w}%"></i></span></div>
        <div class="val">${fmt(v, 0)}<small>${s.attributes.unit_of_measurement || ""}</small></div>
      </div>`;
    });
    // gli stili possono stare nel template: il pannello vive in uno shadow DOM e questo <style> resta lì dentro
    return html`<style>
        .srow.barra{grid-template-columns:26px 1fr max-content}
        .srow.barra .bb{display:block;height:5px;margin-top:6px;border-radius:3px;background:rgba(255,255,255,.14);overflow:hidden}
        .srow.barra .bb i{display:block;height:100%;background:#fff;border-radius:3px}
      </style>${ui.block(text(props.title) || "", rows, String(rows.length))}`;
  },
};
