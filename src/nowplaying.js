// Floating "now playing" bar (#168, mockup A + D): one media player in a small glass bar. On phones it floats above
// the bottom bar, on desktop and tablet it sits top-right under the navigation. Cover, title, artist and player,
// play/pause (the white main button) and next, and a thin progress line. A tap on the text opens the media popup;
// on a phone a swipe down hides it until the next track. Settings → Home page → Floating media player.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t } from "./i18n.js";
import { num, unavailable } from "./util.js";
import { mediaView, label } from "./cards.js";
import { liveTick } from "./cards2.js";

/** the player to show: the one chosen in the settings, or the first one playing (rooms first, so linked players count) */
function pick(p) {
  const cfg = p.config.home?.nowPlaying || {};
  if (cfg.player) { const s = p.hass.states[cfg.player]; return s ? { id: cfg.player, state: s, linked: [] } : null; }
  // stay with the player shown last while it is only paused, instead of jumping to another one that plays
  if (p._npLast) { const v = mediaView(p, p._npLast); if (v.playing || v.paused) return p._npLast; }
  const inRooms = (p.rooms || []).flatMap(r => r.ents.media);
  const playing = e => mediaView(p, e).playing;
  return inRooms.find(playing)
    || Object.values(p.hass.states).filter(s => s.entity_id.startsWith("media_player.") && s.state === "playing").map(s => ({ id: s.entity_id, state: s, linked: [] }))[0]
    || null;
}

const progress = v => {
  const a = v.info?.attributes || {}, dur = num(a.media_duration), pos = num(a.media_position);
  if (!dur) return null;
  const run = v.playing && a.media_position_updated_at ? (Date.now() - new Date(a.media_position_updated_at)) / 1000 : 0;
  return Math.min(100, Math.max(0, ((pos ?? 0) + run) / dur * 100));
};

export function nowPlaying(p, phone) {
  const cfg = p.config.home?.nowPlaying || {};
  const off = () => { p.classList.remove("np"); liveTick(p, "np", false); return nothing; };
  if (!cfg.on || (!phone && cfg.noDesktop) || p.settings || p.edit) return off();
  // the last track stays when the setting asks for it, until a player starts again
  const e = pick(p) || (cfg.keep && p._npLast ? p._npLast : null); if (!e) return off();
  const v = mediaView(p, e);
  if (unavailable(v.main) && !v.playing) return off();
  if (!v.playing && !v.paused && !cfg.keep) return off();
  const key = `${e.id}|${v.title || ""}`;
  if (p._npHidden && p._npHidden !== key) p._npHidden = null;   // a new track shows the bar again
  if (p._npHidden === key) return off();
  if (v.playing || v.paused) p._npLast = e;
  p.classList.add("np");
  liveTick(p, "np", v.playing);   // the progress line moves once a second while playing
  const prog = progress(v);
  const act = (svc, ev) => { ev.stopPropagation(); p.call("media_player", svc, { entity_id: v.ctl }); };
  const swipe = ev => {
    if (!phone) return;
    const y0 = ev.clientY, up = e2 => { removeEventListener("pointerup", up); if (e2.clientY - y0 > 40) { p._npHidden = key; p.requestUpdate(); } };
    addEventListener("pointerup", up);
  };
  const nobnav = phone && p.config.phoneNav === "top";   // no bottom bar: the bar sits at the bottom edge
  return html`<div class=${classMap({ npbar: true, phone, nobnav })} @pointerdown=${swipe}>
    <button class="np-main" @click=${() => p.openPopup({ type: "media", e })} title=${t("Mediaspeler openen")}>
      <span class="np-art" style=${v.art ? `background-image:url("${v.art}")` : ""}>${v.art ? nothing : html`<ha-icon icon="mdi:music-note-outline"></ha-icon>`}</span>
      <span class="np-txt"><b>${v.title || label(p, e)}</b><small>${[v.artist, label(p, e)].filter(Boolean).join(" · ")}</small></span>
    </button>
    <button class="np-btn main" @click=${ev => act("media_play_pause", ev)} title=${t("Afspelen/pauze")}><ha-icon icon=${v.playing ? "mdi:pause" : "mdi:play"}></ha-icon></button>
    <button class="np-btn" @click=${ev => act("media_next_track", ev)} title=${t("Volgende")}><ha-icon icon="mdi:skip-next"></ha-icon></button>
    ${prog != null ? html`<i class="np-prog" style="width:${prog.toFixed(1)}%"></i>` : nothing}
  </div>`;
}

export const nowPlayingStyles = `
  .npbar{position:fixed;z-index:40;display:flex;align-items:center;gap:8px;height:64px;padding:8px;box-sizing:border-box;border-radius:8px;
    background:rgba(60,60,60,.45);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border:1px solid var(--line);
    overflow:hidden;animation:upT .4s var(--ease) both;touch-action:pan-x}
  .npbar:not(.phone){top:calc(96px + var(--safe-area-inset-top, 0px));right:var(--pad);width:360px}
  .npbar.phone{left:var(--pad);right:var(--pad);bottom:calc(74px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  .npbar.phone.nobnav{bottom:calc(10px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  :host(.in-card) .npbar{position:absolute}
  .npbar .np-main{all:unset;flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;height:100%}
  .npbar .np-art{width:48px;height:48px;border-radius:6px;flex:none;display:grid;place-items:center;background:rgba(255,255,255,.12) center / cover no-repeat}
  .npbar .np-art ha-icon{--mdc-icon-size:22px;color:var(--fg-2)}
  .npbar .np-txt{min-width:0;display:flex;flex-direction:column;gap:2px}
  .npbar .np-txt b{font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .npbar .np-txt small{font-size:12px;color:var(--fg-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .npbar .np-btn{flex:none;width:40px;height:40px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.1);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
  .npbar .np-btn.main{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .npbar .np-btn ha-icon{--mdc-icon-size:20px}
  .npbar .np-prog{position:absolute;left:0;bottom:0;height:2px;background:rgba(255,255,255,.85);transition:width 1s linear}
  @media (max-width:900px){
    :host(.np) .strip,:host(.np) .page{padding-bottom:calc(90px + 74px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  }
`;
