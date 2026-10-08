// <hcn-cam-snap>: a camera snapshot that refreshes without flicker.
// The old frame stays on screen while the next one downloads; the swap happens only
// after the new image has fully loaded (and decoded), with a short cross-fade.
// With `live` set it shows HA's MJPEG stream (`stream` URL) instead. Refreshing is paused while the tab is hidden. `src` is HA's entity_picture URL
// (its token may rotate; the newest value is used for the next fetch).
import { LitElement, html, css, nothing } from "lit";

const INTERVAL = 10000;

export class CamSnap extends LitElement {
  static properties = { src: { type: String }, stream: { type: String }, live: { type: Boolean }, interval: { type: Number }, _cur: { state: true }, _prev: { state: true }, _liveSrc: { state: true } };
  static styles = css`
    :host{display:block;position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.25)}
    img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
    img.old{animation:out .5s ease-out both}
    @keyframes out{to{opacity:0}}
  `;
  constructor() { super(); this.interval = INTERVAL; this.live = false; this._cur = null; this._prev = null; this._liveSrc = null; this._gen = 0; this._onVis = () => { if (document.hidden) this._stop(); else this._start(true); }; }
  connectedCallback() { super.connectedCallback(); document.addEventListener("visibilitychange", this._onVis); this._start(true); }
  disconnectedCallback() { super.disconnectedCallback(); document.removeEventListener("visibilitychange", this._onVis); this._stop(); this._gen++; }
  updated(ch) {
    if (ch.has("live")) { if (this.live) { this._stop(); this._liveSrc = this.stream || null; } else { this._liveSrc = null; this._start(true); } }
    else if (this.live && ch.has("stream") && !this._liveSrc) this._liveSrc = this.stream || null;
    else if (ch.has("src") && ch.get("src") !== undefined && !this._cur) this._load();
  }
  // the stream connection stays on its original URL (tokens rotate); reconnect with the newest one on error
  _liveErr() { clearTimeout(this._rt); this._rt = setTimeout(() => { if (this.live && this.isConnected && this.stream) this._liveSrc = `${this.stream}${this.stream.includes("?") ? "&" : "?"}r=${Date.now()}`; }, 3000); }

  _start(now) { this._stop(); if (this.live) return; if (now) this._load(); this._t = setInterval(() => this._load(), this.interval); }
  _stop() { clearInterval(this._t); this._t = null; }

  async _load() {
    if (!this.src || document.hidden) return;
    const gen = ++this._gen;
    const url = `${this.src}${this.src.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const img = new Image();
    img.src = url;
    try {
      await img.decode(); // resolves only when the bitmap is ready to paint
    } catch { return; } // keep showing the previous frame on error
    if (gen !== this._gen || !this.isConnected) return;
    this._prev = this._cur; this._cur = url;
    clearTimeout(this._pt); this._pt = setTimeout(() => { this._prev = null; }, 600);
  }

  render() {
    if (this.live) return this._liveSrc ? html`<img src=${this._liveSrc} alt="" @error=${() => this._liveErr()}>` : nothing;
    return html`${this._cur ? html`<img src=${this._cur} alt="">` : nothing}
      ${this._prev ? html`<img class="old" src=${this._prev} alt="">` : nothing}`;
  }
}
if (!customElements.get("hcn-cam-snap")) customElements.define("hcn-cam-snap", CamSnap);
