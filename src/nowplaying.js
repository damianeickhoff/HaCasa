// Floating "now playing" bar (#168, mockup A + C), phones only: a big screen shows the media card itself.
// A: a small glass bar above the bottom bar with cover, title, artist and player, play/pause (the white main button),
// next, volume and a thin progress line. The volume button swaps the text for a volume slider for a few seconds.
// C: a tap on the text opens it into a sheet with a bigger cover, a seek bar, shuffle, previous, play/pause, next,
// mute and the volume. A swipe down hides the bar until the next track (or closes the sheet); a tap beside the sheet
// closes it. "Keep the last track" keeps the bar with the last title and cover after the player stops, also after a
// reload. Settings → Home page → Floating media player.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t } from "./i18n.js";
import { num, unavailable } from "./util.js";
import { mediaView, label } from "./cards.js";
import { liveTick } from "./cards2.js";
import { ghost } from "./motion.js";

const SEEK = 2, VOLUME_SET = 4, VOLUME_MUTE = 8, SHUFFLE = 32768;
const LAST = "hcn:np-last";   // the last track, kept for "Keep the last track"

/** a player as the rooms know it (with the players linked to it, a TV and its Chromecast), so the controls go to the
    one that actually plays, as on the media card; a player outside the rooms stands alone */
const asRoomPlayer = (p, id) => (p.rooms || []).flatMap(r => r.ents.media).find(m => m.id === id || m.linked?.includes(id))
  || (p.hass.states[id] ? { id, state: p.hass.states[id], linked: [] } : null);

/** the player to show: the one chosen in the settings, or the first one playing (rooms first, so linked players count) */
function pick(p) {
  const cfg = p.config.home?.nowPlaying || {};
  if (cfg.player) return asRoomPlayer(p, cfg.player);
  // stay with the player shown last while it is only paused, instead of jumping to another one that plays
  if (p._npLast) { const v = mediaView(p, p._npLast); if (v.playing || v.paused) return p._npLast; }
  const inRooms = (p.rooms || []).flatMap(r => r.ents.media);
  const playing = e => mediaView(p, e).playing;
  return inRooms.find(playing)
    || Object.values(p.hass.states).filter(s => s.entity_id.startsWith("media_player.") && s.state === "playing").map(s => ({ id: s.entity_id, state: s, linked: [] }))[0]
    || null;
}

/** position and duration in seconds, the position running on while it plays */
const timing = v => {
  const a = v.info?.attributes || {}, dur = num(a.media_duration), pos = num(a.media_position);
  if (!dur) return null;
  const run = v.playing && a.media_position_updated_at ? (Date.now() - new Date(a.media_position_updated_at)) / 1000 : 0;
  return { dur, pos: Math.min(dur, Math.max(0, (pos ?? 0) + run)) };
};
const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST) || "null"); } catch { return null; } };
const saveLast = x => { try { localStorage.setItem(LAST, JSON.stringify(x)); } catch {} };

/** a button that acts on a tap: on pointerup when the finger hardly moved, so a re-render between down and up, or a
    browser that holds back the click, can't swallow it; the click that follows is ignored */
const tapBtn = (cls, title, icon, go) => html`<button type="button" class=${cls} title=${title}
  @pointerdown=${ev => { ev.stopPropagation(); ev.currentTarget._d = { x: ev.clientX, y: ev.clientY }; }}
  @pointerup=${ev => { const d = ev.currentTarget._d; ev.currentTarget._d = null; if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 12) { ev.currentTarget._t = Date.now(); go(ev); } }}
  @click=${ev => { ev.stopPropagation(); if (Date.now() - (ev.currentTarget._t || 0) > 600) go(ev); }}><ha-icon icon=${icon}></ha-icon></button>`;

export function nowPlaying(p, phone) {
  const cfg = p.config.home?.nowPlaying || {};
  const off = () => { p.classList.remove("np"); p._npOpen = false; liveTick(p, "np", false); return nothing; };
  if (!cfg.on || !phone || p.settings || p.edit) return off();
  // the last track stays when the setting asks for it, until a player starts again (also after a reload)
  const last = cfg.keep ? p._npLast || (() => { const l = readLast(); return l && asRoomPlayer(p, l.id); })() : null;
  const e = pick(p) || last; if (!e) return off();
  const v = mediaView(p, e);
  if (unavailable(v.main) && !v.playing && !cfg.keep) return off();
  const live = v.playing || v.paused;
  if (!live && !cfg.keep) return off();
  // what the bar shows: the player's own title and cover, or, when it stopped, the last track it played
  const kept = !live ? readLast() : null, mine = kept?.id === e.id ? kept : null;
  const title = (live && v.title) || mine?.title || null, artist = (live ? v.artist : mine?.artist) || null, artUrl = (live ? v.art : mine?.art) || null;
  if (live) { p._npLast = e; if (v.title && cfg.keep) { const k = { id: e.id, title: v.title, artist: v.artist, art: v.art }; const old = readLast(); if (!old || old.id !== k.id || old.title !== k.title || old.art !== k.art) saveLast(k); } }
  const key = `${e.id}|${title || ""}`;
  if (p._npHidden && p._npHidden !== key) p._npHidden = null;   // a new track shows the bar again
  if (p._npHidden === key) return off();
  p.classList.add("np");
  liveTick(p, "np", v.playing);   // the progress moves once a second while playing
  const tm = live ? timing(v) : null, open = !!p._npOpen;
  const s = v.main, a = v.info?.attributes || {}, feat = s?.attributes?.supported_features || 0;
  const ctl = svc => () => p.call("media_player", svc, { entity_id: v.ctl });
  const own = (svc, data) => p.call("media_player", svc, { entity_id: e.id, ...data });
  const play = () => live ? p.call("media_player", "media_play_pause", { entity_id: v.ctl }) : own("media_play");   // a stopped player: play again
  const setOpen = on => { if (!on && p._npOpen) ghost(p, ".np-back,.npsheet", "np-out", 240); p._npOpen = on; p._npVol = 0; p.requestUpdate(); };
  // swipe down: closes the sheet, or hides the bar until the next track
  const swipe = ev => {
    if (ev.target.closest?.("input,button")) return;
    const y0 = ev.clientY, up = e2 => { removeEventListener("pointerup", up); if (e2.clientY - y0 > 40) { if (p._npOpen) setOpen(false); else { p._npHidden = key; p.requestUpdate(); } } };
    addEventListener("pointerup", up);
  };
  const nobnav = p.config.phoneNav === "top";   // no bottom bar: the bar sits at the bottom edge
  const art = artUrl ? html`<span class="np-art" style=${`background-image:url("${artUrl}")`}></span>` : html`<span class="np-art"><ha-icon icon="mdi:music-note-outline"></ha-icon></span>`;
  const sub = live ? [artist, a.media_album_name].filter(Boolean).join(" · ") : [artist, t("Gestopt")].filter(Boolean).join(" · ");
  const vol = Math.round((s?.attributes?.volume_level ?? 0) * 100), muted = !!s?.attributes?.is_volume_muted, canVol = !!(feat & VOLUME_SET) && s?.attributes?.volume_level != null;
  const volIcon = muted ? "mdi:volume-off" : vol < 34 ? "mdi:volume-low" : vol < 67 ? "mdi:volume-medium" : "mdi:volume-high";
  const slider = () => html`<input type="range" min="0" max="100" .value=${String(vol)} @pointerdown=${ev => ev.stopPropagation()}
    @input=${() => { p._npVol = Date.now(); }} @change=${ev => { p._npVol = Date.now(); own("volume_set", { volume_level: +ev.target.value / 100 }); }}>`;
  if (open) return html`<div class="np-back" @click=${() => setOpen(false)}></div>
    <div class=${classMap({ npsheet: true, nobnav })} @pointerdown=${swipe}>
      <div class="np-head">${art}<div class="np-txt"><b>${title || label(p, e)}</b>${sub ? html`<small>${sub}</small>` : nothing}</div>
        <span class="np-who"><ha-icon icon="mdi:speaker"></ha-icon>${label(p, e)}</span></div>
      ${tm ? html`<div class="np-seek"><span>${mmss(tm.pos)}</span>
        <input type="range" min="0" max=${Math.round(tm.dur)} .value=${String(Math.round(tm.pos))} ?disabled=${!(feat & SEEK)} @pointerdown=${ev => ev.stopPropagation()} @change=${ev => own("media_seek", { seek_position: +ev.target.value })}>
        <span>${mmss(tm.dur)}</span></div>` : nothing}
      <div class="np-row">
        ${feat & SHUFFLE ? tapBtn(classMap({ "np-btn": true, on: !!s.attributes.shuffle }), t("Willekeurig"), "mdi:shuffle-variant", () => own("shuffle_set", { shuffle: !s.attributes.shuffle })) : nothing}
        ${tapBtn("np-btn", t("Vorige"), "mdi:skip-previous", ctl("media_previous_track"))}
        ${tapBtn("np-btn main wide", t("Afspelen/pauze"), v.playing ? "mdi:pause" : "mdi:play", play)}
        ${tapBtn("np-btn", t("Volgende"), "mdi:skip-next", ctl("media_next_track"))}
        ${feat & VOLUME_MUTE ? tapBtn(classMap({ "np-btn": true, on: muted }), muted ? t("Geluid aan") : t("Dempen"), volIcon, () => own("volume_mute", { is_volume_muted: !muted })) : nothing}
      </div>
      ${canVol ? html`<div class="np-vol"><ha-icon icon="mdi:volume-low"></ha-icon>${slider()}<span>${vol}%</span></div>` : nothing}
    </div>`;
  // the volume button swaps the text for a slider; it goes back after a few seconds without touching it
  const volOn = canVol && p._npVol && Date.now() - p._npVol < 4000;
  if (volOn) { clearTimeout(p._npVolT); p._npVolT = setTimeout(() => p.requestUpdate(), 4100 - (Date.now() - p._npVol)); }
  return html`<div class=${classMap({ npbar: true, nobnav })} @pointerdown=${swipe}>
    ${volOn ? html`<div class="np-vbar"><ha-icon icon=${volIcon}></ha-icon>${slider()}<span>${vol}%</span></div>`
      : html`<button type="button" class="np-main" title=${t("Mediaspeler openen")}
      @pointerdown=${ev => { ev.currentTarget._d = { x: ev.clientX, y: ev.clientY }; }}
      @pointerup=${ev => { const d = ev.currentTarget._d; ev.currentTarget._d = null; if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 12) { ev.currentTarget._t = Date.now(); setOpen(true); } }}
      @click=${ev => { if (Date.now() - (ev.currentTarget._t || 0) > 600) setOpen(true); }}>
      ${art}<span class="np-txt"><b>${title || label(p, e)}</b><small>${[artist, label(p, e)].filter(Boolean).join(" · ")}</small></span>
    </button>`}
    ${tapBtn("np-btn main", t("Afspelen/pauze"), v.playing ? "mdi:pause" : "mdi:play", play)}
    ${tapBtn("np-btn", t("Volgende"), "mdi:skip-next", ctl("media_next_track"))}
    ${canVol ? tapBtn(classMap({ "np-btn": true, on: !!volOn }), t("Volume"), volIcon, () => { p._npVol = volOn ? 0 : Date.now(); p.requestUpdate(); }) : nothing}
    ${tm ? html`<i class="np-prog" style="width:${(tm.pos / tm.dur * 100).toFixed(1)}%"></i>` : nothing}
  </div>`;
}

export const nowPlayingStyles = `
  .npbar,.npsheet{position:fixed;z-index:42;left:var(--pad);right:var(--pad);box-sizing:border-box;border-radius:8px;
    background:rgba(60,60,60,.45);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border:1px solid var(--line);
    bottom:calc(74px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  .npbar.nobnav,.npsheet.nobnav{bottom:calc(10px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  .npbar{display:flex;align-items:center;gap:8px;height:64px;padding:8px;overflow:hidden;animation:upT .4s var(--ease) both;touch-action:pan-x}
  :host(.in-card) .npbar,:host(.in-card) .npsheet,:host(.in-card) .np-back{position:absolute}
  .npbar .np-main{all:unset;flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;height:100%}
  .npbar .np-vbar{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:0 4px;font-size:12px;color:var(--fg-2);font-variant-numeric:tabular-nums;animation:fadeIn .2s ease both}
  .npbar .np-vbar ha-icon{--mdc-icon-size:18px;color:#fff;flex:none}
  .npbar .np-vbar input{flex:1;min-width:0;accent-color:#fff;margin:0}
  .np-art{width:48px;height:48px;border-radius:6px;flex:none;display:grid;place-items:center;background:rgba(255,255,255,.12) center / cover no-repeat}
  .np-art ha-icon{--mdc-icon-size:22px;color:var(--fg-2)}
  .np-txt{min-width:0;display:flex;flex-direction:column;gap:2px}
  .np-txt b{font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .np-txt small{font-size:12px;color:var(--fg-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .np-btn{flex:none;width:40px;height:40px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .np-btn:active{background:rgba(255,255,255,.22)}
  .np-btn.main{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .np-btn.main:active{background:#fff}
  .np-btn.on{background:rgba(255,255,255,.28)}
  .np-btn ha-icon{--mdc-icon-size:20px;pointer-events:none}
  .npbar .np-prog{position:absolute;left:0;bottom:0;height:2px;background:rgba(255,255,255,.85);transition:width 1s linear}
  /* C: the sheet after a tap, the page blurred behind it */
  .np-back{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.25);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:fadeIn .25s ease both}
  .npsheet{padding:16px;display:flex;flex-direction:column;gap:14px;animation:npUp .32s var(--ease) both;touch-action:none}
  @keyframes npUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
  @keyframes npDown{to{transform:translateY(32px);opacity:0}}
  .ghost.np-out{position:fixed;inset:0;z-index:42;pointer-events:none}
  .ghost.np-out .np-back{animation:fadeOut .24s ease both}
  .ghost.np-out .npsheet{animation:npDown .24s var(--ease) both}
  .npsheet .np-head{display:flex;align-items:flex-start;gap:14px}
  .npsheet .np-art{width:72px;height:72px}
  .npsheet .np-txt{flex:1;padding-top:2px}
  .npsheet .np-txt b{font-size:17px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .npsheet .np-txt small{font-size:13px}
  .npsheet .np-who{flex:none;max-width:35%;display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--fg-2);padding-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .npsheet .np-who ha-icon{--mdc-icon-size:14px;flex:none}
  .npsheet .np-seek,.npsheet .np-vol{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--fg-2);font-variant-numeric:tabular-nums}
  .npsheet .np-vol ha-icon{--mdc-icon-size:16px}
  .npsheet input[type=range]{flex:1;min-width:0;accent-color:#fff;height:20px;margin:0}
  .npsheet .np-row{display:flex;gap:8px}
  .npsheet .np-row .np-btn{flex:1;width:auto;height:46px}
  .npsheet .np-row .np-btn.wide{flex:1.6}
  @media (max-width:900px){
    :host(.np) .strip,:host(.np) .page{padding-bottom:calc(90px + 74px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  }
`;
