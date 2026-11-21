import { TAG, SUFFIX } from "./util.js";
import { t } from "./i18n.js";
// Lovelace card wrapper: lets the panel live in a dashboard (panel view) instead of panel_custom.
// Install the bundle as a dashboard resource, add a dashboard with one card:  type: custom:hacasa-nova-card
// Routing inside the card uses the URL hash (#/<room>), so the dashboard URL itself never changes.
// Optional: a `config:` object in the card config is used like config.json (users can still override it in the panel settings).
const HINT = () => t("HaCasa Nova werkt het best als enige kaart in een weergave van het type Paneel. Wijzig het type van deze weergave in de dashboard-editor.");
class HacasaNovaCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._ensure();
    this._el.cardConfig = this._config.config && Object.keys(this._config.config).length ? this._config.config : null;
    this._el.applyConfig?.();
  }
  set hass(h) {
    this._hass = h; if (this._el) this._el.hass = h;
    this._syncHint();
  }
  /** the panel picks the language on its first update, so the hint text is set again once that has run */
  _syncHint() { if (this._hint && this.hasAttribute("masonry")) this._el.updateComplete?.then(() => { this._hint.textContent = HINT(); }); }
  get hass() { return this._hass; }
  /** HA sets this: "panel" in a panel view, "grid" in a sections view, nothing in a masonry view (#148) */
  set layout(v) { this._layout = v; if (v) this.setAttribute("layout", v); else this.removeAttribute("layout"); }
  get layout() { return this._layout; }
  connectedCallback() {
    // a masonry view gives the card a narrow column and no height, which the panel can't work in: say so on the card
    let masonry = false;
    for (let n = this; n && !masonry; n = n.parentElement || n.getRootNode()?.host) masonry = n.localName === "hui-masonry-view";
    this.toggleAttribute("masonry", masonry);
    this._syncHint();
  }
  _ensure() {
    if (this._el) return;
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    // Panel view: the whole screen below HA's header. The view above this card is padded by HA's header height plus the
    // top safe area (hui-root #view); kiosk-mode hides the header and sets --kiosk-header-height: 0px on #view, so prefer
    // that when it is there. Sections view: the grid cell HA sizes from getGridOptions().
    style.textContent = `:host{display:block;position:relative;--hc-top:calc(var(--kiosk-header-height, var(--header-height, 56px)) + var(--safe-area-inset-top, 0px));height:calc(100vh - var(--hc-top));height:calc(100dvh - var(--hc-top));overflow:hidden}
      :host([layout="grid"]){height:100%;min-height:400px;border-radius:var(--ha-card-border-radius, 12px)}
      :host([masonry]){height:min(800px, calc(100dvh - var(--hc-top) - 16px));border-radius:var(--ha-card-border-radius, 12px)}
      ${TAG}{display:block;height:100%}
      .hint{display:none;position:absolute;left:12px;right:12px;bottom:12px;z-index:10;padding:10px 14px;border-radius:10px;background:rgba(20,20,22,.88);color:#fff;font:500 13px/1.4 system-ui,sans-serif}
      :host([masonry]) .hint{display:block}`;
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = HINT();
    this._hint = hint;
    const el = document.createElement(TAG);
    el.hashMode = true;
    el.classList.add("in-card");
    el.panel = { url_path: location.pathname.split("/")[1] || "hacasa" };
    if (this._hass) el.hass = this._hass;
    root.append(style, el, hint);
    this._el = el;
  }
  getCardSize() { return 20; }
  /** sections view: full width and a tall default that can be resized (#148) */
  getGridOptions() { return { columns: "full", rows: 12, min_columns: 6, min_rows: 6 }; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement(TAG + "-card-editor"); }
}

/** the card has nothing to set in the dashboard editor: everything is in the panel's own settings */
class HacasaNovaCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(h) { this._hass = h; }
  connectedCallback() { this._render(); }
  _render() {
    if (this._done) return; this._done = true;
    const p = document.createElement("p");
    p.style.cssText = "margin:0;line-height:1.5";
    p.textContent = t("Alle instellingen staan in HaCasa Nova zelf: open het paneel en kies Instellingen. Gebruik voor de beste weergave een weergave van het type Paneel met alleen deze kaart.");
    this.append(p);
  }
}
if (!customElements.get(TAG + "-card-editor")) customElements.define(TAG + "-card-editor", HacasaNovaCardEditor);
if (!customElements.get(TAG + "-card")) customElements.define(TAG + "-card", HacasaNovaCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === TAG + "-card")) window.customCards.push({ type: TAG + "-card", name: "HaCasa Nova" + (SUFFIX ? " (dev)" : ""), description: "The HaCasa Nova home panel inside a dashboard. Use it as the only card in a view of type panel.", preview: false });
