// Living room photos: a room's background photo comes alive with the real state. A second photo of the same view with
// the lights on (Page settings → Photo with lights on; e.g. taken in the evening, or made from the first with an image
// generator) fades in over the normal one while a light burns in the room (on the home page: anywhere at home).
// On top, small effects tied to one entity each, at a spot of the photo (in percent, so they sit right at any screen
// size): a glow for a running appliance, a flickering screen for a TV, sound waves for a speaker, a warm lamp, a
// motion ring. The spots are set by tapping the photo in the page settings.
// Both layers live inside the .bg element, so they follow its slow Ken Burns drift; the effects are an SVG with the
// photo's own size as viewBox and "slice", which is exactly what background-size: cover does.
import { html, svg, nothing } from "lit";
import { t } from "./i18n.js";
import { cardCfg } from "./cards.js";

export const FX_KINDS = { glow: "Gloed (apparaat)", screen: "Scherm", waves: "Geluidsgolven", lamp: "Lamp", ring: "Bewegingsring" };
const OFF = new Set(["off", "idle", "standby", "closed", "not_home", "finished", "ready", "stopped", "inactive", "docked", "unavailable", "unknown", "none", "", "0"]);
/** the kind an entity gets when none is chosen */
export const fxDefault = id => ({ media_player: "waves", binary_sensor: "ring", light: "lamp", remote: "screen" })[(id || "").split(".")[0]] || "glow";
/** "62.5,40" → [62.5, 40] (percent of the photo) */
export const spot = s => { const m = /^\s*(\d+(?:\.\d+)?)\s*[,;\s]\s*(\d+(?:\.\d+)?)\s*$/.exec(s || ""); return m ? [+m[1], +m[2]] : null; };

/** is this entity doing what its effect shows? */
export function fxActive(p, id, kind) {
  const s = p.hass.states[id]; if (!s) return false;
  const st = String(s.state).toLowerCase(), d = id.split(".")[0];
  if (d === "media_player") return kind === "waves" ? st === "playing" : !OFF.has(st);
  const n = Number(st);
  if (st !== "" && !isNaN(n) && d !== "binary_sensor") return n > (cardCfg(p, id).threshold ?? 5);   // a power sensor: running above its threshold
  return !OFF.has(st);
}

// natural sizes of the photos, for the effects' viewBox (loaded once per address)
const dims = new Map();
function photoSize(p, url) {
  if (!url) return null;
  if (dims.has(url)) return dims.get(url);
  dims.set(url, null); const im = new Image();
  im.onload = () => { dims.set(url, { w: im.naturalWidth, h: im.naturalHeight }); p.requestUpdate(); };
  im.src = url; return null;
}

/** one effect at the origin, sized for a photo 2000 px wide (the group around it scales to the real photo) */
function effect(kind) {
  if (kind === "waves") return [0, 1, 2].map(i => svg`<path class="lwave" style=${`animation-delay:${i * .9}s`} d=${`M${-i * 2} -22 q-10 22 0 44`} stroke="#fff" stroke-opacity=".75" stroke-width="2.4" fill="none" stroke-linecap="round"></path>`);
  if (kind === "ring") return svg`<circle r="3" fill="#5dcaa5"></circle>${[0, 1.5].map(dl => svg`<circle class="lring" style=${`animation-delay:${dl}s`} r="18" fill="none" stroke="#5dcaa5" stroke-width="2"></circle>`)}`;
  if (kind === "screen") return svg`<ellipse class="lscreen" rx="64" ry="40" fill="url(#hclfs)"></ellipse>`;
  if (kind === "lamp") return svg`<circle class="lscr" r="90" fill="url(#hclfw)"></circle><circle r="4" fill="#fff6e0"></circle>`;
  return svg`<circle class="lglow" r="52" fill="url(#hclfg)"></circle>`;
}

/** what goes inside the room's .bg: the lit photo and the effects */
export function liveLayer(p, room, baseUrl) {
  const pc = p.pageCfg(room ? room.id : "home") || {};
  const lit = room ? room.lightsOn > 0 : (p.home?.lightsOn?.length || 0) > 0;
  const fx = (pc.fx || []).map(f => ({ ...f, at: spot(f.at), kind: FX_KINDS[f.kind] ? f.kind : fxDefault(f.entity) })).filter(f => f.at && f.entity);
  if (!pc.imageLit && !fx.length) return nothing;
  const size = fx.length ? photoSize(p, baseUrl) : null, k = size ? size.w / 2000 * 1.7 : 1;   // the drawings are made for a 2000 px wide photo; 1.7 keeps them readable behind the cards
  const grad = (id, c, a) => svg`<radialGradient id=${id}><stop offset="0" stop-color=${c} stop-opacity=${a}></stop><stop offset="1" stop-color=${c} stop-opacity="0"></stop></radialGradient>`;
  return html`${pc.imageLit ? html`<div class="bglit" style=${`--bgl:url("${pc.imageLit}");opacity:${lit ? 1 : 0}`}></div>` : nothing}
    ${size ? html`<svg class="bgfx" viewBox=${`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>${grad("hclfg", "#8fd0ff", ".55")}${grad("hclfw", "#ffd59a", ".6")}${grad("hclfs", "#9fc4ff", ".5")}</defs>
      ${fx.map(f => svg`<g class="lfx" style=${`opacity:${fxActive(p, f.entity, f.kind) ? 1 : 0}`} transform=${`translate(${f.at[0] / 100 * size.w} ${f.at[1] / 100 * size.h}) scale(${k})`}>${effect(f.kind)}</g>`)}
    </svg>` : nothing}`;
}

/** page settings: the lit photo, and the effects with a tap-to-place preview of the photo */
export function liveEditor(p, pop, d, upd, baseUrl) {
  const fx = d.fx || [], setFx = list => upd({ fx: list.length ? list : undefined }), patch = (i, k, v) => setFx(fx.map((x, j) => j === i ? { ...x, [k]: v || undefined } : x));
  const hass = p.hass, label = id => { const r = hass.entities?.[id] || {}, area = hass.areas?.[r.area_id || hass.devices?.[r.device_id]?.area_id]?.name; return (hass.states[id]?.attributes.friendly_name || id) + (area ? ` · ${area}` : ""); };
  const picking = pop.fxPick;
  const place = ev => { if (picking == null) return; const b = ev.currentTarget.getBoundingClientRect(); const x = ((ev.clientX - b.left) / b.width * 100).toFixed(1), y = ((ev.clientY - b.top) / b.height * 100).toFixed(1);
    p.openPopup({ ...pop, draft: { ...d, fx: fx.map((f, j) => j === picking ? { ...f, at: `${x},${y}` } : f) }, fxPick: undefined }); };
  return html`
    <div class="form" style="margin-top:8px"><label class="f"><span>${t("Foto met licht aan")}<small>${t("dezelfde foto met de lampen aan; vervaagt erin zolang er in deze kamer licht brandt")}</small></span><input type="text" .value=${d.imageLit || ""} placeholder="/local/images/rooms/…-aan.jpg" @change=${e => upd({ imageLit: e.target.value || undefined })}></label></div>
    <div class="prow" style="margin-top:18px"><span>${t("Effecten")}</span><b>${t("{n} op de foto", { n: fx.length })}</b></div>
    <div class="form lfxed">
      ${baseUrl ? html`<div class=${picking != null ? "lfxprev pick" : "lfxprev"} @click=${place}><img src=${baseUrl} alt="">
        ${fx.map((f, i) => { const a = spot(f.at); return a ? html`<i class=${i === picking ? "on" : ""} style=${`left:${a[0]}%;top:${a[1]}%`}>${i + 1}</i>` : nothing; })}
        ${picking != null ? html`<span class="lfxhint">${t("tik op de plek voor effect {n}", { n: picking + 1 })}</span>` : nothing}</div>` : nothing}
      ${fx.map((x, i) => html`<div class="lfxrow"><b>${i + 1}</b>
        <input type="text" list="hcn-live-ents" .value=${x.entity || ""} placeholder=${t("entiteit")} @change=${e => patch(i, "entity", e.target.value.trim())}>
        <select @change=${e => patch(i, "kind", e.target.value)}>${Object.entries(FX_KINDS).map(([k, l]) => html`<option value=${k} ?selected=${(x.kind || fxDefault(x.entity)) === k}>${t(l)}</option>`)}</select>
        <button class=${i === picking ? "on" : ""} @click=${() => p.openPopup({ ...pop, draft: d, fxPick: i === picking ? undefined : i })}>${x.at ? t("Plek") + " ✓" : t("Plek kiezen")}</button>
        <button title=${t("Verwijderen")} @click=${() => setFx(fx.filter((_, j) => j !== i))}>×</button></div>`)}
      <button class="addline" @click=${() => { const n = [...fx, {}]; p.openPopup({ ...pop, draft: { ...d, fx: n }, fxPick: n.length - 1 }); }}>${t("+ effect")}</button>
      <datalist id="hcn-live-ents">${Object.keys(hass.states).filter(id => /^(media_player|binary_sensor|light|switch|sensor|remote|fan|vacuum|input_boolean|climate|humidifier)\./.test(id)).sort().map(id => html`<option value=${id}>${label(id)}</option>`)}</datalist>
    </div>`;
}

export const liveStyles = `
  .bg .bglit{position:absolute;inset:0;background:var(--bgl) center center / cover no-repeat;transition:opacity 1.4s cubic-bezier(.4,0,.2,1)}
  .bg .bgfx{position:absolute;inset:0;width:100%;height:100%;z-index:1}   /* above the dark wash (.bg::after), the lit photo stays under it */
  .bgfx .lfx{transition:opacity .8s}
  .bgfx .lwave{animation:lwave 2.8s ease-out infinite;opacity:0}
  @keyframes lwave{0%{opacity:0;transform:translateX(0)}25%{opacity:.6}100%{opacity:0;transform:translateX(-18px)}}
  .bgfx .lring{animation:lring 3s ease-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}
  @keyframes lring{0%{opacity:.85;transform:scale(.35)}100%{opacity:0;transform:scale(2.4)}}
  .bgfx .lglow{animation:lglow 2.4s ease-in-out infinite;mix-blend-mode:screen}
  @keyframes lglow{50%{opacity:.25}}
  .bgfx .lscreen{animation:lscreen 3.2s steps(7) infinite;mix-blend-mode:screen}
  @keyframes lscreen{0%{opacity:.9}20%{opacity:.6}35%{opacity:1}55%{opacity:.7}70%{opacity:.95}85%{opacity:.65}100%{opacity:.85}}
  .bgfx .lscr{mix-blend-mode:screen}
  .popup .lfxed{display:flex;flex-direction:column;gap:8px;margin-top:10px}
  .popup .lfxprev{position:relative;align-self:flex-start;max-width:100%;border-radius:14px;overflow:hidden;line-height:0}
  .popup .lfxprev img{display:block;max-width:100%;max-height:300px;width:auto;height:auto}
  .popup .lfxprev.pick{cursor:crosshair;outline:2px solid var(--accent, #f0a33a);outline-offset:-2px}
  .popup .lfxprev i{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.6);border:2px solid #fff;color:#fff;font:600 11px/18px -apple-system,system-ui,sans-serif;font-style:normal;text-align:center}
  .popup .lfxprev i.on{background:var(--accent, #f0a33a)}
  .popup .lfxhint{position:absolute;left:12px;bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.65);color:#fff;font-size:12px;line-height:1.3}
  .popup .lfxrow{display:grid;grid-template-columns:22px minmax(0,1.4fr) minmax(140px,1fr) max-content 36px;gap:8px;align-items:center}
  .popup .lfxed .addline{align-self:flex-start;border:0;border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;font-weight:700;padding:9px 12px;cursor:pointer}
  .popup .lfxrow>b{font-size:12px;opacity:.6;text-align:center}
  .popup .lfxrow button{height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
  .popup .lfxrow button.on{background:var(--accent, #f0a33a);color:#1d1d1f;border-color:transparent}
  @media (max-width:900px){.popup .lfxrow{grid-template-columns:22px 1fr 1fr;}.popup .lfxrow input{grid-column:2/4}}
  @media (prefers-reduced-motion:reduce){.bgfx .lwave,.bgfx .lring,.bgfx .lglow,.bgfx .lscreen{animation:none}}
`;
