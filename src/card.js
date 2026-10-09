import { TAG, SUFFIX } from "./util.js";
// Lovelace card wrapper: lets the panel live in a dashboard (panel view) instead of panel_custom.
// Install the bundle as a dashboard resource, add a dashboard with one card:  type: custom:hacasa-nova-card
// Routing inside the card uses the URL hash (#/<room>), so the dashboard URL itself never changes.
// Optional: a `config:` object in the card config is used like config.json (users can still override it in the panel settings).
class HacasaNovaCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._ensure();
    this._el.cardConfig = this._config.config && Object.keys(this._config.config).length ? this._config.config : null;
    this._el.applyConfig?.();
  }
  set hass(h) { this._hass = h; if (this._el) this._el.hass = h; }
  get hass() { return this._hass; }
  _ensure() {
    if (this._el) return;
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `:host{display:block;position:relative;height:calc(100vh - var(--header-height, 56px));height:calc(100dvh - var(--header-height, 56px));overflow:hidden}
      ${TAG}{display:block;height:100%}`;
    const el = document.createElement(TAG);
    el.hashMode = true;
    el.classList.add("in-card");
    el.panel = { url_path: location.pathname.split("/")[1] || "hacasa" };
    if (this._hass) el.hass = this._hass;
    root.append(style, el);
    this._el = el;
  }
  getCardSize() { return 20; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return undefined; }
}
if (!customElements.get(TAG + "-card")) customElements.define(TAG + "-card", HacasaNovaCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === TAG + "-card")) window.customCards.push({ type: TAG + "-card", name: "HaCasa Nova" + (SUFFIX ? " (dev)" : ""), description: "The HaCasa Nova home panel inside a dashboard. Use it as the only card in a view of type panel.", preview: false });
