// HaCasa Nova: a Home Assistant custom panel (panel_custom) that builds a home view and one
// page per area, straight from the area/device/entity registries.
import { t, locale, setLang } from "./i18n.js";
import { LitElement, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { keyed } from "lit/directives/keyed.js";
import { styles } from "./styles.js";
import { buildRooms, buildHome, name } from "./model.js";
import { lightCard, switchCard, mediaCard, coverCard, climateCard, sensorCard, stripCard, fanCard, lockCard, vacuumCard, humidifierCard, roomScenesCard, roomCameraCard, applianceCard, templateCard, homeCards, condText, condIcon, condSvg, wasteSentence, ico, wxExpect, groupCard } from "./cards.js";
import { renderPopup } from "./popups.js";
import { renderSettings, loadUserConfig, saveUserConfig, mergeConfig } from "./settings.js";
import { renderPage, PAGES } from "./pages.js";
import { subscribeNotifications, hourlyToday, idleScreen } from "./extras.js";
import { fetchEvents, fetchHistory, nextEvent, applianceState, applianceEnd } from "./extras2.js";
import { isHidden, pressDir, label, cardCfg, APPLIANCE_ACTIVE, applianceIcon } from "./cards.js";
import { quickRow, watchTriggers, presetCard, selfUpdate } from "./features.js";
import { searchBar } from "./search.js";
import { fetchNumeric, batteryEta, modeList } from "./extras3.js";
import { deviceName } from "./model.js";
import { BASE, TAG, icon, slug, isOn, unavailable, comfort, humidityText, greeting, clock, relTime, navigate, num, sinceText } from "./util.js";

/** numbers with their unit (6,8 kWh · 50% · 12 min · 14:02) rendered white inside a notice */
const emph = text => { const parts = String(text ?? "").split(/(\d+(?:[.,:]\d+)?(?:\s?(?:%|kWh|W|kW|°C?|min|uur|u|×))?)/g); return parts.map((x, i) => i % 2 ? html`<b>${x}</b>` : x); };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** "Thuis." -> Thuis + an accent dot; any other title stays as it is */
const brandTitle = s => html`<span class="bt">${s}</span>`;

const eventWhenShort = ev => ev.allDay ? t("hele dag") : ev.start.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
const BUILD = Math.floor(Date.now() / 3600000).toString(36);   // changes every hour: replaced photos show up after a reload
const FONT = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap";
const DEFAULT_CONFIG = { rooms: "auto", roomImage: "/local/images/rooms/{slug}.jpg", homeImage: "/local/images/rooms/home.jpg", maxRooms: 9, home: {}, more: [] };

class HacasaNova extends LitElement {
  static styles = styles;
  static properties = {
    hass: { attribute: false }, narrow: { type: Boolean }, route: { attribute: false }, panel: { attribute: false },
    config: { state: true }, popup: { state: true }, drawer: { state: true }, tick: { state: true }, now: { state: true },
    draft: { state: true }, saved: { state: true }, ghLatest: { state: true }, stab: { state: true }, attFilter: { state: true }, search: { state: true }, sysInfo: { state: true }, netHist: { state: true }, battEta: { state: true }, notifications: { state: true }, idle: { state: true }, toast: { state: true }, events: { state: true }, templates: { state: true }, navFloor: { state: true }, searchOpen: { state: true }, wx: { state: true }, stripScrolled: { state: true }, lightHist: { state: true }, plugHist: { state: true }, plugTimers: { state: true }, sensFilter: { state: true }, sensGroup: { state: true }, pageFilter: { state: true }, pageGroup: { state: true }, energyHist: { state: true },
  };

  constructor() {
    super();
    this.config = DEFAULT_CONFIG; this.popup = null; this.search = ""; this.drawer = false; this.tick = 0; this.now = clock(); this.notifications = []; this.idle = false;
    this._drag = 0;
    if (!document.querySelector(`link[href="${FONT}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT; document.head.appendChild(l); }
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadConfig();
    this._clock = setInterval(() => { this.now = clock(); }, 15000);
    this._ticker = setInterval(() => { this.tick++; }, 4000);
    this._onKey = e => { if (e.key === "Escape") { this.popup = null; this.search = ""; this.searchOpen = false; } };
    addEventListener("keydown", this._onKey);
    // inside a Lovelace card the dashboard owns the URL path, so rooms are routed through the hash
    if (this.hashMode) { this._onHash = () => { this.route = { path: location.hash.replace(/^#/, "") || "/", prefix: "" }; }; addEventListener("hashchange", this._onHash); this._onHash(); }
    // idle screen: any input resets the timer
    this._activity = () => { this._lastActivity = Date.now(); if (this.idle) this.wake(); };
    for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) addEventListener(ev, this._activity, { passive: true });
    this._lastActivity = Date.now();
    this._onResize = () => { clearTimeout(this._rsT); this._rsT = setTimeout(() => this.requestUpdate(), 150); }; addEventListener("resize", this._onResize);
    this._idleT = setInterval(() => { const m = +(this.config.idleMinutes ?? 0); if (m > 0 && !this.idle && Date.now() - this._lastActivity > m * 60000) this.idle = true; }, 5000);
    // swipe between rooms (touch only, outside the card strip)
    this._swipeDown = e => { if (e.pointerType !== "touch" || e.composedPath().some(el => el.classList && (el.classList.contains("strip") || el.classList.contains("overlay") || el.classList.contains("page") || el.classList.contains("settings") || el.classList.contains("nav")))) { this._sw = null; return; } this._sw = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    this._swipeUp = e => { if (!this._sw) return; const dx = e.clientX - this._sw.x, dy = e.clientY - this._sw.y, dt = Date.now() - this._sw.t; this._sw = null; if (dt < 600 && Math.abs(dx) > 70 && Math.abs(dy) < 50) this.swipe(dx < 0 ? 1 : -1); };
    this.addEventListener("pointerdown", this._swipeDown); this.addEventListener("pointerup", this._swipeUp);
    // floor dropdown: a tap anywhere else closes it
    this.addEventListener("pointerdown", e => { if (this.navFloor != null && !this.drawer && !e.composedPath().some(el => el.classList?.contains("fl"))) this.navFloor = null; });
  }
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this._clock); clearInterval(this._ticker); clearInterval(this._idleT); removeEventListener("keydown", this._onKey); removeEventListener("resize", this._onResize); if (this._onHash) removeEventListener("hashchange", this._onHash); for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) removeEventListener(ev, this._activity); this._unsubNotif?.(); }
  wake() { this.idle = false; this._lastActivity = Date.now(); }
  /** go to the previous/next room in nav order (home is before the first room) */
  swipe(dir) { const order = [null, ...this.rooms]; const i = order.findIndex(r => (r?.id || null) === (this.room?.id || null)); const n = order[i + dir]; if (n !== undefined) this.go(n); }
  async loadEvents() { this._eventsAt = Date.now(); this.events = await fetchEvents(this.hass, this.home?.calendars || []); }
  async loadHistory(pop) { this.popup = { ...pop, history: null }; const rows = await fetchHistory(this.hass, pop.e.id); if (this.popup?.type === "sensor" && this.popup.e?.id === pop.e.id) this.popup = { ...this.popup, history: rows, loaded: true }; }
  showIdle() { this.idle = true; }
  async loadHourly(pop) { const id = this.config.home?.energy?.today; this.popup = { ...pop, hourly: null }; const rows = await hourlyToday(this.hass, id); if (this.popup?.type === "energy") this.popup = { ...this.popup, hourly: rows }; }

  async loadConfig() {
    try {
      const res = await fetch(new URL("../config.json?" + Date.now(), BASE), { cache: "no-store" });
      if (res.ok) this.fileConfig = await res.json();
    } catch (e) { console.warn("[hacasa-nova] config.json not loaded, using defaults", e); }
    this.applyConfig();
  }
  /** user settings; a config.json next to the panel is imported into them once (so updates never overwrite anything) */
  async loadUser() {
    let u = await loadUserConfig(this.hass);
    if (this.fileConfig && Object.keys(this.fileConfig).length && !u?.importedAt) {
      u = { ...mergeConfig(this.fileConfig, u || {}), importedAt: new Date().toISOString(), setupDone: true };
      try { await saveUserConfig(this.hass, u); console.info("[hacasa-nova] config.json imported into the user settings"); } catch (e) { console.warn("[hacasa-nova] could not store the imported config.json", e); }
    }
    this.userConfig = u; this.applyConfig();
  }
  applyConfig() { this.config = mergeConfig(DEFAULT_CONFIG, this.cardConfig, this.userConfig); this.subscribeTemplates(); }
  /** settings as a downloadable JSON file (the old config.json role) */
  exportSettings() {
    const blob = new Blob([JSON.stringify(this.userConfig || {}, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hacasa-nova-settings.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /** merge a JSON file (export or an old config.json) into the settings */
  importSettings(file) {
    const rd = new FileReader();
    rd.onload = async () => { try { const data = JSON.parse(rd.result); if (!data || typeof data !== "object") throw 0; const u = { ...mergeConfig(this.userConfig || {}, data), setupDone: true }; await saveUserConfig(this.hass, u); this.userConfig = u; this.applyConfig(); this.draft = JSON.parse(JSON.stringify(this.config)); this.showToast(t("Instellingen geïmporteerd")); } catch { this.showToast(t("Geen geldig instellingenbestand")); } };
    rd.readAsText(file);
  }
  /** one render_template subscription per template card field; re-subscribed when the config changes */
  subscribeTemplates() {
    const cards = (this.config.templates || []).map((x, i) => ({ ...x, id: x.id || "tpl" + i }));
    this.config.templates = cards;
    const lines = Object.entries(this.config.pages || {}).flatMap(([k, pc]) => (pc.lines || []).map((l, i) => ({ id: `line:${k}:${i}`, state: l.text })));
    const overrides = Object.entries(this.config.cards || {}).filter(([, c]) => c.tplState || c.tplSub || c.tplFoot).map(([id, c]) => ({ id: "card:" + id, state: c.tplState, label: c.tplSub, foot: c.tplFoot }));
    const list = [...cards, ...lines, ...overrides];
    const key = JSON.stringify(list.map(x => [x.id, x.state, x.label, x.foot]));
    if (key === this._tplKey || !this.hass?.connection?.subscribeMessage) return;
    this._tplKey = key; (this._tplUnsubs || []).forEach(u => { try { u.then ? u.then(f => f(), () => {}) : u(); } catch {} }); this._tplUnsubs = [];
    this.templates = {};
    for (const x of list) for (const field of ["state", "label", "foot"]) {
      if (!x[field]) continue;
      try {
        const u = this.hass.connection.subscribeMessage(msg => { this.templates = { ...this.templates, [x.id]: { ...(this.templates[x.id] || {}), [field]: msg.result, error: msg.error ? true : undefined } }; }, { type: "render_template", template: x[field], report_errors: true });
        // render_template is refused for non-admin users: show the card as an error instead of an unhandled rejection
        u?.catch?.(() => { this.templates = { ...this.templates, [x.id]: { error: true } }; });
        this._tplUnsubs.push(u);
      } catch (e) { this.templates = { ...this.templates, [x.id]: { error: true } }; }
    }
  }
  get settingsPath() { return `${this.basePath()}/instellingen`; }
  async saveSettings() { await saveUserConfig(this.hass, this.draft); this.userConfig = this.draft; this.applyConfig(); this.saved = true; setTimeout(() => this.saved = false, 2500); }
  /** back to the defaults (a config.json next to the panel is imported again on the next load) */
  async resetSettings() { await saveUserConfig(this.hass, null); this.userConfig = null; this.applyConfig(); this.draft = mergeConfig(DEFAULT_CONFIG, this.cardConfig); }

  /* ---------- derived model ---------- */
  willUpdate() {
    if (!this.hass) return;
    setLang(this.config.language || (String(this.hass.language || this.hass.locale?.language || "en").startsWith("nl") ? "nl" : "en"));
    if (!this._userLoaded) { this._userLoaded = true; this.loadUser(); this._unsubNotif = subscribeNotifications(this.hass, list => { this.notifications = list; }); this.subscribeTemplates(); }
    this.rooms = buildRooms(this.hass, this.config);
    this.home = buildHome(this.hass, this.config, this.rooms, this.notifications);
    watchTriggers(this);
    if (!this._wizardShown && this.userConfig !== undefined && !this.userConfig?.setupDone && !this.cardConfig) { this._wizardShown = true; this.popup = { type: "wizard", step: 0 }; }
    if (!this._hinted && this.userConfig !== undefined && this.userConfig?.setupDone && !this.userConfig?.hintSeen) { this._hinted = true; this.showToast(t("Tik op een kaart om te schakelen, houd vast voor details. Via ⋯ in de popup stel je dit per kaart in."), 9000, "info"); this.saveUser({ hintSeen: true }); }
    if (this.home.calendars.length && (!this._eventsAt || Date.now() - this._eventsAt > 10 * 60000)) this.loadEvents();
    if (this.home.weather && (!this._wxAt || Date.now() - this._wxAt > 30 * 60000 || this._wxId !== this.home.weather.entity_id)) this.loadWx();
    const seg = (this.route?.path || "/").split("/").filter(Boolean)[0];
    this.settings = seg === "instellingen";
    this.page = PAGES[seg] ? seg : null;
    // a draft made before the user settings arrived (settings opened by reload) is rebuilt once they do, so Save never writes defaults over them
    if (this.settings && (!this.draft || (this._draftEarly && this.userConfig !== undefined))) { this.draft = JSON.parse(JSON.stringify(this.config)); this._draftEarly = this.userConfig === undefined; }
    if (!this.settings) this.draft = null;
    this.room = seg && !this.settings && !this.page ? this.rooms.find(r => r.slug === seg || r.id === seg) : null;
    const bg = this.settings || this.page ? "" : this.bgUrl(this.room);   // Meer pages: plain background, no photo
    if (bg !== this._bg) { if (this._bg && this._bgCache?.get(this._bg) !== false) { this._prevBg = this._bg; clearTimeout(this._bgT); this._bgT = setTimeout(() => { this._prevBg = null; this.requestUpdate(); }, 500); } this._bg = bg; }
    if (this.popup?.type === "weather" && !this.popup.forecast && !this.popup.loading) this.loadForecast();
  }

  updated(changed) {
    const key = this.settings ? "settings" : this.page || (this.room ? this.room.id : "home");
    if (key !== this._viewKey) { this._viewKey = key; requestAnimationFrame(() => { this.style.transform = "translateZ(0)"; requestAnimationFrame(() => { this.style.transform = ""; }); }); }
  }

  /* ---------- actions ---------- */
  /** service call with visible feedback: errors from HA (wrong alarm code, unavailable device, …) show as a toast */
  async call(domain, service, data) {
    try { return await this.hass.callService(domain, service, data); }
    catch (e) { const msg = e?.message || e?.error?.message || (typeof e === "string" ? e : t("Opdracht mislukt")); console.warn("[hacasa-nova] service failed", domain, service, data, e); this.showToast(msg); throw e; }
  }
  showToast(msg, ms = 4000, cls = "") { this.toast = msg; this.toastCls = cls; clearTimeout(this._toastT); this._toastT = setTimeout(() => { this.toast = null; }, ms); }
  openPopup(pop) { this.popup = pop; }
  /** navigate inside the panel: hash in card mode, history otherwise */
  nav(path) { if (this.hashMode) location.hash = "#" + (path || "/"); else navigate(path); }
  go(room) { this.drawer = false; this.nav(`${this.basePath()}/${room ? room.slug : ""}`); this.scrollStrip(0); }
  goPath(path) {
    this.popup = null; this.drawer = false;
    const m = /^__(\w+)__$/.exec(path || "");
    if (m) this.nav(`${this.basePath()}/${m[1] === "settings" ? "instellingen" : m[1]}`); else navigate(path);
  }
  /** make this panel the page HA opens first (per browser; HA stores it in localStorage) */
  get isDefault() { return this.hass?.userData?.default_panel === this.basePath().slice(1); }
  async setDefault(on) {
    const value = { ...(this.hass.userData || {}), default_panel: on ? this.basePath().slice(1) : undefined };
    await this.hass.callWS({ type: "frontend/set_user_data", key: "core", value });
    this.hass = { ...this.hass, userData: value };   // HA pushes the same update; this just makes the button respond at once
  }
  /** open Home Assistant's sidebar (useful when the user has it set to always hidden) */
  toggleSidebar() { this.drawer = false; this.popup = null; this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })); }
  /** open Home Assistant's own more-info dialog for an entity */
  moreInfo(entityId) { this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } })); }
  async saveCardSettings(id, cfg) {
    const cards = { ...(this.userConfig?.cards || {}) };
    if (cfg && Object.keys(cfg).some(k => cfg[k] !== undefined)) cards[id] = cfg; else delete cards[id];
    this.userConfig = { ...(this.userConfig || {}), cards };
    await saveUserConfig(this.hass, this.userConfig); this.applyConfig(); this.popup = null;
  }
  /** merge a patch into the per-user settings and save it */
  async saveUser(patch) { this.userConfig = { ...(this.userConfig || {}), ...patch }; await saveUserConfig(this.hass, this.userConfig); this.applyConfig(); }
  /** wizard result -> user settings (null = skipped: only remember that it ran) */
  async finishWizard(d) {
    const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    const patch = d ? { ...clean({ language: d.language, title: d.title, roomImage: d.roomImage, homeImage: d.homeImage }), rooms: d.rooms?.length ? d.rooms : undefined, home: { ...(this.userConfig?.home || {}), ...clean({ weather: d.home.weather, climate: d.home.climate, alarm: d.home.alarm }), energy: { ...(this.userConfig?.home?.energy || {}), ...clean(d.home.energy || {}) } }, setupDone: true } : { setupDone: true };
    await this.saveUser(patch); this.popup = null; if (d) this.showToast(t("Het panel is ingesteld"));
  }
  async savePreset(r, pr) {
    const all = { ...(this.userConfig?.presets || {}) }, list = all[r.id] || [];
    all[r.id] = list.some(x => x.id === pr.id) ? list.map(x => x.id === pr.id ? pr : x) : [...list, pr];
    await this.saveUser({ presets: all }); this.popup = { type: "presets", roomId: r.id };
  }
  async deletePreset(r, id) {
    const all = { ...(this.userConfig?.presets || {}) }; all[r.id] = (all[r.id] || []).filter(x => x.id !== id); if (!all[r.id].length) delete all[r.id];
    await this.saveUser({ presets: all }); this.popup = { type: "presets", roomId: r.id, manage: true };
  }
  visible(list) { return list.filter(e => !isHidden(this, e.id)); }
  get homeImage() { return this.config.pages?.home?.image || this.config.homeImage || ""; }
  /* ---------- per-page config: title, image, card order/visibility, ticker lines ---------- */
  pageCfg(key) { return this.config.pages?.[key] || {}; }
  /** cards in the configured order: keys listed in `order` first, the rest in their default position */
  orderCards(list, order = []) { const pos = k => { const i = order.indexOf(k); return i < 0 ? order.length + list.findIndex(c => c.key === k) : i; }; return [...list].sort((a, b) => pos(a.key) - pos(b.key)); }
  applyPage(key, list) { const pc = this.pageCfg(key), hid = new Set(pc.hidden || []); return this.orderCards(list, pc.order).filter(c => !hid.has(c.key)); }
  tickerOn(key, items) {
    const pc = this.pageCfg(key), tk = pc.ticker || {};
    const custom = (pc.lines || []).map((l, i) => ({ k: "custom", icon: l.icon || "mdi:text", text: this.templates?.[`line:${key}:${i}`]?.state })).filter(x => x.text && String(x.text).trim());
    return [...custom, ...items.filter(it => tk[it.k] !== false)];
  }
  /** appliance features on/off for a plug; the popup stays open on the matching card form */
  async setApplianceMode(key, on) {
    const cards = { ...(this.userConfig?.cards || {}) }, c = { ...(cards[key] || {}) };
    if (on) delete c.noAppliance; else c.noAppliance = true;
    if (Object.keys(c).length) cards[key] = c; else delete cards[key];
    await this.saveUser({ cards });
    this.rooms = buildRooms(this.hass, this.config);
    const a = this.rooms.flatMap(r => r.ents.appliances).find(x => x.key === key);
    this.popup = a ? { type: "appliance", a, form: true } : key.startsWith("switch.") ? { type: "switch", e: { id: key, state: this.hass.states[key] }, form: true } : null;
  }
  /** every card a page can show (before hiding/ordering), for the page popup */
  pageCards(key) { return key === "home" ? homeCards(this, this.home) : this.roomCards(this.rooms.find(r => r.id === key)); }
  async savePage(key, cfg) {
    const pages = { ...(this.userConfig?.pages || {}) };
    if (cfg && Object.keys(cfg).some(k => cfg[k] !== undefined && !(Array.isArray(cfg[k]) && !cfg[k].length) && !(typeof cfg[k] === "object" && !Array.isArray(cfg[k]) && cfg[k] && !Object.keys(cfg[k]).length))) pages[key] = cfg; else delete pages[key];
    await this.saveUser({ pages }); if (this.draft) this.draft = { ...this.draft, pages: this.config.pages }; this.popup = null;
  }
  basePath() { if (this.hashMode) return ""; return "/" + (this.route?.prefix || this.panel?.url_path || location.pathname.split("/")[1]).replace(/^\/+|\/+$/g, ""); }
  stripDragged() { return this._drag > 6; }
  /** true while the image is assumed to load; flips to false (and re-renders) when it 404s */
  bgOk(url) { if (!url) return false; const c = this._bgCache || (this._bgCache = new Map()); if (c.has(url)) return c.get(url); c.set(url, true); const im = new Image(); im.onerror = () => { c.set(url, false); this.requestUpdate(); }; im.src = url; return true; }
  /** photo for a room (or home): the first candidate path that loads, trying .jpg/.jpeg/.png/.webp for each */
  bgUrl(room) {
    const ver = u => u + (u.includes("?") ? "" : "?v=" + BUILD);
    const base = room ? room.images || [room.image] : [this.homeImage];
    const all = base.filter(Boolean).flatMap(u => {
      const m = u.match(/^(.*)\.(jpe?g|png|webp)$/i);
      return m ? [u, ...["jpg", "jpeg", "png", "webp"].filter(x => x !== m[2].toLowerCase()).map(x => `${m[1]}.${x}`)] : [u];
    }).map(ver);
    return all.find(u => this.bgOk(u)) || all[0] || "";
  }
  /** bound attribute values are set verbatim, so real quotes (no HTML entity) */
  bgStyle(url, seed) { if (this.bgOk(url)) return `--bg:url("${url}")`; let h = 0; for (const ch of seed || "home") h = (h * 31 + ch.charCodeAt(0)) % 360; return `--hue:${h}`; }
  scrollStrip(x) { const s = this.renderRoot.querySelector(".strip"); if (s) s.scrollLeft = x; }

  async loadNetHist(ids) { this._netKey = ids.join(); this._netAt = Date.now(); this.netHist = { ...(this.netHist || {}), ...(await fetchNumeric(this.hass, ids, 1)) }; }
  async loadBatteryEta(ids) { this._battKey = ids.join(); this.battEta = await batteryEta(this.hass, ids); }
  /** motion events of the camera's room (and doorbell triggers) for the camera popup */
  async loadCamEvents(pop, ids) {
    this.popup = { ...pop, events: null };
    const all = (await Promise.all(ids.map(id => fetchHistory(this.hass, id)))).flatMap(r => r || []).filter(r => r.s === "on").sort((a, b) => b.t - a.t);
    if (this.popup?.type === "camera" && this.popup.s?.entity_id === pop.s.entity_id) this.popup = { ...this.popup, events: all };
  }
  /** host and core info through the Supervisor API (only on supervised installs; otherwise stays empty) */
  async loadSystem() {
    this.sysInfo = null; const out = {};
    const get = async endpoint => { try { const r = await this.hass.callWS({ type: "supervisor/api", endpoint, method: "get" }); return r?.data ?? r ?? null; } catch { return null; } };
    out.host = await get("/host/info"); out.core = await get("/core/info");
    this.sysInfo = out;
  }
  /** hourly + daily forecast for the weather block next to the greeting */
  async loadWx() {
    const w = this.home.weather; if (!w) return;
    this._wxAt = Date.now(); this._wxId = w.entity_id;
    const get = async type => { try { const r = await this.hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type }, target: { entity_id: w.entity_id }, return_response: true }); return r?.response?.[w.entity_id]?.forecast || []; } catch { return []; } };
    const [hourly, daily] = await Promise.all([get("hourly"), get("daily")]);
    this.wx = { hourly, daily: daily.length ? daily : w.attributes.forecast || [] };
  }
  async loadForecast() {
    const w = this.home.weather; if (!w) return;
    this.popup = { ...this.popup, loading: true };
    try {
      const r = await this.hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "hourly" }, target: { entity_id: w.entity_id }, return_response: true });
      const hourly = r?.response?.[w.entity_id]?.forecast || [];
      let daily = [];
      try { const d = await this.hass.callWS({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: w.entity_id }, return_response: true }); daily = d?.response?.[w.entity_id]?.forecast || []; } catch {}
      this.popup = { type: "weather", forecast: hourly, dailyForecast: daily };
    } catch (e) { this.popup = { type: "weather", forecast: [], dailyForecast: w.attributes.forecast || [] }; }
  }

  /* ---------- strip: wheel + mouse drag ---------- */
  _stripScroll(e) { const on = e.currentTarget.scrollLeft > 4; if (on !== !!this.stripScrolled) this.stripScrolled = on; }
  stripFades() { return html`<div class=${classMap({ sfade: true, l: true, on: !!this.stripScrolled })}></div><div class="sfade r"></div>`; }
  /** energy page: today's use and return per hour, power peak and a 3 h sparkline */
  async loadEnergyToday() {
    const en = this.home.energy; this.energyHist = { ...(this.energyHist || {}), at: Date.now() };
    const [use, sun, pw] = await Promise.all([en.today ? hourlyToday(this.hass, en.today.entity_id) : null, en.returned ? hourlyToday(this.hass, en.returned.entity_id) : null, en.power ? fetchNumeric(this.hass, [en.power.entity_id], 24) : null]);
    const rows = pw?.[en.power?.entity_id] || [], peak = rows.length ? rows.reduce((a, b) => b.v > a.v ? b : a) : null;
    if (en.power) this.netHist = { ...(this.netHist || {}), [en.power.entity_id]: rows.filter(r => r.t > Date.now() - 3 * 3600000) };
    this.energyHist = { at: Date.now(), use: use || [], sun: sun || [], peak: peak ? { v: peak.v, t: new Date(peak.t).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) } : null };
  }
  /** plug with a meter: 3 h of power for the sparkline, today's kWh per hour from the recorder */
  async loadPlug(id, powerId, energyId) {
    if (this._plugBusy?.has(id)) return; (this._plugBusy ||= new Set()).add(id);
    const [hist, rows] = await Promise.all([fetchNumeric(this.hass, [powerId], 3), energyId ? hourlyToday(this.hass, energyId) : null]);
    const sp = (hist[powerId] || []), peak = sp.length ? sp.reduce((a, b) => b.v > a.v ? b : a) : null;
    const today = rows ? rows.reduce((n, r) => n + (r.v || 0), 0) : null, maxH = rows ? Math.max(...rows.map(r => r.v || 0), 0.001) : 1;
    this.plugHist = { ...(this.plugHist || {}), [id]: { at: Date.now(), spark: sp, peak: peak ? { v: Math.round(peak.v), t: peak.t } : null, rows, today, maxH } };
    this._plugBusy.delete(id);
  }
  /** off-timer on a plug (on-timer when it is off): runs while the panel is open */
  setPlugTimer(a, min) {
    const cur = this.plugTimers?.[a.id]; if (cur) clearTimeout(cur.h);
    if (cur?.min === min) { const n = { ...this.plugTimers }; delete n[a.id]; this.plugTimers = n; return; }
    const sw = a.switch; if (!sw) return;
    const off = isOn(sw.state); if (!off) this.call("switch", "turn_on", { entity_id: sw.id });
    const h = setTimeout(() => { this.call("switch", "turn_off", { entity_id: sw.id }); const n = { ...this.plugTimers }; delete n[a.id]; this.plugTimers = n; }, min * 60000);
    this.plugTimers = { ...(this.plugTimers || {}), [a.id]: { min, at: Date.now() + min * 60000, off: true, h } };
  }
  /** 24-hour on/off history of a light for the "today" card bottom: minutes on per clock hour, total and switch count */
  async loadLightHist(id) {
    const cur = this.lightHist?.[id]; if (cur && Date.now() - cur.at < 10 * 60000) return; if (this._lhBusy?.has(id)) return;
    (this._lhBusy ||= new Set()).add(id);
    const rows = (await fetchHistory(this.hass, id, 24)) || [];
    rows.sort((a, b) => a.t - b.t);
    const now = Date.now(), start = now - 24 * 3600000, bars = Array(24).fill(0); let onMin = 0, count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].s !== "on") continue;
      if (i && rows[i - 1].s !== "on") count++; else if (!i && rows[i].t > start) count++;
      const a = Math.max(start, rows[i].t.getTime()), b = Math.min(now, rows[i + 1] ? rows[i + 1].t.getTime() : now);
      for (let x = a; x < b; x += 60000) { bars[new Date(x).getHours()] += 1; onMin++; }
    }
    this.lightHist = { ...(this.lightHist || {}), [id]: { at: Date.now(), bars: bars.map(m => m / 60), onMin, count } };
    this._lhBusy.delete(id);
  }
  _stripDown(e) { if (e.pointerType !== "mouse") return; const st = e.currentTarget; this._down = { x: e.clientX, s: st.scrollLeft, st }; this._drag = 0; st.classList.add("drag");
    const move = ev => { if (!this._down) return; const dx = ev.clientX - this._down.x; this._drag = Math.max(this._drag, Math.abs(dx)); this._down.st.scrollLeft = this._down.s - dx; };
    const up = () => { const st = this._down?.st; this._down = null; removeEventListener("pointermove", move); removeEventListener("pointerup", up); setTimeout(() => this._drag = 0, 50); if (st) this._glide(st, st.scrollLeft, true); };
    addEventListener("pointermove", move); addEventListener("pointerup", up); }
  /** wheel scrolls the row sideways with an eased glide instead of jumping per notch */
  _stripWheel(e) {
    if (innerWidth <= 900 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault(); const st = e.currentTarget; this._wheelDir = Math.sign(e.deltaY);
    this._glide(st, (this._glideTo ?? st.scrollLeft) + e.deltaY * 1.2, false);
    clearTimeout(this._wheelIdle); this._wheelIdle = setTimeout(() => this._glide(st, this._glideTo, true), 160);   // wheel stopped: settle on a card
  }
  /** smooth-scroll to x (CSS snapping is off meanwhile, so it never jumps); snap=true settles on a card start: the next one in the wheel direction, else the nearest */
  _glide(st, x, snap) {
    const max = st.scrollWidth - st.clientWidth, pad = parseFloat(getComputedStyle(st).paddingLeft) || 0;
    if (snap) {
      const starts = [...new Set([...[...st.children].map(c => c.offsetLeft - pad).filter(v => v >= 0 && v < max), max])], from = st.scrollLeft, dir = this._wheelDir || 0; this._wheelDir = 0;
      const ahead = dir > 0 ? starts.filter(v => v > from + 2) : dir < 0 ? starts.filter(v => v < from - 2).reverse() : [];
      if (ahead.length && Math.abs(x - from) < Math.abs(ahead[0] - from)) x = ahead[0];   // a small nudge still moves one card in that direction
      else if (starts.length) x = starts.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
    }
    this._glideTo = Math.max(0, Math.min(max, x)); st.classList.add("drag");
    // the browser animates the scroll itself (no frame loop to throttle); CSS snapping stays off until it has settled
    st.scrollTo({ left: this._glideTo, behavior: "smooth" });
    clearTimeout(this._glideEnd);
    this._glideEnd = setTimeout(() => { this._glideTo = null; if (!this._down) st.classList.remove("drag"); }, 450);
  }

  /* ---------- render ---------- */
  render() {
    if (!this.hass) return nothing;
    const room = this.room, h = this.home;
    const isPage = this.settings || this.page;
    const bg = isPage ? "" : this.bgUrl(room);
    const alarm = h.alarm, armed = alarm && alarm.state !== "disarmed" && !unavailable(alarm);
    const alarmLbl = alarm ? ({ disarmed: t("Uit"), armed_home: t("Thuis"), armed_away: t("Weg"), armed_night: t("Nacht"), armed_vacation: t("Vakantie"), arming: t("Inschakelen"), pending: t("Wachten"), triggered: t("Alarm"), unavailable: "?" }[alarm.state] || alarm.state) : null;
    const alarmCls = alarm ? ({ disarmed: "off", armed_home: "home", arming: "arming", pending: "arming", triggered: "triggered", unavailable: "off" }[alarm.state] || "armed") : "";
    return html`
      ${this._prevBg ? html`<div class="bg out" style="--bg:url(&quot;${this._prevBg}&quot;)"></div>` : nothing}
      ${keyed(bg || "plain", isPage ? html`<div class="bg plain"></div>` : html`<div class=${classMap({ bg: true, grad: !this.bgOk(bg) })} style=${this.bgStyle(bg, room?.slug)}></div>`)}
      <nav class=${classMap({ nav: true, open: this.drawer, srch: !!this.searchOpen })}>
        <a class="logo" @click=${() => this.go(null)}><span class="mark"><img class="ico logo" src=${icon("hacasa")} alt="HaCasa"></span>${brandTitle(this.config.title || t("Thuis") + ".")}</a>
        ${this.renderLinks(room, isPage)}
        ${h.persons.length ? html`<div class="people pill" title=${t("Wie is thuis")} @click=${() => this.openPopup({ type: "people" })}><ha-icon icon="mdi:account-group-outline"></ha-icon><span class="pc">${h.home}<small>/${h.persons.length}</small></span></div>` : nothing}
        ${alarm ? html`<div class=${classMap({ alarm: true, pill: true, armed, [alarmCls]: true })} @click=${() => this.openPopup({ type: "alarm" })}><ha-icon icon=${alarm.state === "triggered" ? "mdi:shield-alert" : alarm.state === "arming" || alarm.state === "pending" ? "mdi:shield-sync" : armed ? "mdi:shield-home" : "mdi:shield-home-outline"}></ha-icon><span class="al">${alarmLbl}</span><i></i></div>` : html`<span></span>`}
        <div class="time"><b>${this.now}</b></div>
        <button class=${classMap({ sbtn: true, on: !!this.searchOpen })} title=${t("Zoeken")} @click=${() => { this.searchOpen = !this.searchOpen; if (!this.searchOpen) this.search = ""; }}><img src=${icon(this.searchOpen ? "close" : "search")} alt=""></button>
        <button class="menu" @click=${() => { this.drawer = !this.drawer; this.navFloor = this.drawer ? this.floorOf(room) : null; }}><img src=${icon(this.drawer ? "close" : "menu")} alt="menu"></button>
        ${matchMedia("(max-width:900px)").matches ? searchBar(this) : nothing}
      </nav>
      ${keyed(this.settings ? "settings" : this.page || (room ? room.id : "home"), this.settings ? renderSettings(this) : this.page ? renderPage(this, this.page) : room ? this.renderRoom(room) : this.renderHome(h))}
      ${this.hass.connected === false ? html`<div class="offline"><ha-icon icon="mdi:lan-disconnect"></ha-icon>${t("Geen verbinding met Home Assistant")}</div>` : nothing}
      ${this.toast ? html`<div class=${classMap({ toast: true, info: this.toastCls === "info" })}>${this.toast}</div>` : nothing}
      ${this.idle ? idleScreen(this) : nothing}
      ${this.popup ? html`<div class="overlay" @click=${e => { if ((e.target.classList.contains("overlay") && this.popup?.type !== "wizard") || e.target.hasAttribute("data-close")) this.popup = null; }}>${renderPopup(this, this.popup)}</div>` : nothing}
    `;
  }

  /** notification-row lines for appliances that are busy, waiting, need attention or just finished ("Vaatwasser: Bezig · 11% · klaar om 19:47") */
  applianceItems(list) {
    return list.filter(a => !isHidden(this, a.id) && !a.plain).map(a => {
      const cfg = cardCfg(this, a.id), st = applianceState(this.hass, a, cfg.threshold ?? 5), n = cfg.name || deviceName(this.hass, a.device);
      if (!APPLIANCE_ACTIVE.includes(st.st)) return null;
      return { k: "appliances", icon: st.st === "alert" ? "mdi:alert-circle-outline" : cfg.icon || applianceIcon(n), title: n, text: [st.label, applianceEnd(st)].filter(Boolean).join(", ") };
    }).filter(Boolean);
  }

  /** rooms grouped by HA floor (floor registry, lowest level first); rooms without a floor go last under "Overig" */
  get floorGroups() {
    const floors = Object.values(this.hass.floors || {}).sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
    const groups = floors.map(f => ({ id: f.floor_id, name: f.name, rooms: this.rooms.filter(r => r.floor === f.floor_id) })).filter(g => g.rooms.length);
    const rest = this.rooms.filter(r => !groups.some(g => g.rooms.includes(r)));
    return rest.length ? [...groups, { id: "_none", name: t("Overig"), rooms: rest }] : groups;
  }
  floorOf(room) { return room ? (this.floorGroups.find(g => g.rooms.includes(room))?.id ?? null) : null; }
  /** navigation: one pill per room, or (config.navMode "floors") one per floor with a room dropdown — hover on desktop, tap on touch/mobile */
  renderLinks(room, isPage) {
    if (this.searchOpen && !this.drawer && !matchMedia("(max-width:900px)").matches) return html`<div class="links pill srch">${searchBar(this)}</div>`;
    const more = html`<a class=${classMap({ more: true, active: !!isPage })} @click=${() => this.openPopup({ type: "more" })}>${t("Meer")}</a><span class="sep"></span><a class=${classMap({ search: true, active: !!this.searchOpen })} title=${t("Zoeken")} @click=${() => { this.searchOpen = !this.searchOpen; if (!this.searchOpen) this.search = ""; }}><img class="ico" src=${icon("search")} alt=""></a>`;
    const groups = this.config.navMode === "floors" ? this.floorGroups : [];
    if (groups.length < 2) return html`<div class="links pill">
      ${this.rooms.map(r => html`<a class=${classMap({ active: room?.id === r.id })} @click=${() => this.go(r)}>${r.name}</a>`)}${more}</div>`;
    const all = this.drawer && this.config.navExpand;   // mobile menu: every floor open, headers are just headings
    return html`<div class=${classMap({ links: true, pill: true, floors: true, expanded: all })}>
      ${groups.map(g => { const here = g.rooms.includes(room);
        return html`<div class=${classMap({ fl: true, open: all || this.navFloor === g.id })} @mouseleave=${() => { if (!this.drawer && this.navFloor === g.id) this.navFloor = null; }}>
          <a class=${classMap({ active: here })} @click=${() => { if (!all) this.navFloor = this.navFloor === g.id ? null : g.id; }}>${g.name}${here ? html`<small>${room.name}</small>` : nothing}${all ? nothing : html`<ha-icon icon="mdi:chevron-down"></ha-icon>`}</a>
          <div class="dd">${g.rooms.map(r => html`<a class=${classMap({ active: room?.id === r.id })} @click=${() => { this.navFloor = null; this.go(r); }}>${r.name}</a>`)}</div>
        </div>`; })}${more}</div>`;
  }

  renderTitle(temp, title, sub, items, extra = nothing, pageKey = "home", aside = nothing, hum = null) {
    const i = items.length ? this.tick % items.length : 0;
    const date = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
    const eyebrow = [date, temp != null ? t("{t}° binnen", { t: temp.toFixed(1) }) : "", hum != null ? t("{h}% luchtvochtigheid", { h: Math.round(hum) }) : ""].filter(Boolean);
    return html`<section class=${classMap({ title: true, aside: aside !== nothing })} ${pressDir(this, { tap: () => {}, hold: () => this.openPopup({ type: "page", key: pageKey }) })}>
      <div class="tl">
        <div class="temp">${eyebrow.map((x, k) => html`${k ? html`<i class="dt"></i>` : nothing}<span>${x}</span>`)}</div>
        <h1>${title}</h1>
        ${sub ? html`<div class="sub">${sub}</div>` : nothing}
        ${items.length ? html`<div class="ticker">
          ${items.map((it, k) => { const body = html`${ico(it.icon)}${it.title ? html`<b class="tt">${it.title}</b><i class="dt"></i>` : nothing}<span>${emph(it.text)}</span>`;
            return html`<div class=${k === i ? "show" : ""}>${it.tap ? html`<button class="tk" @click=${e => { e.stopPropagation(); it.tap(); }}>${body}</button>` : body}</div>`; })}
        </div>` : nothing}
        ${extra}
      </div>
      ${aside}
    </section>`;
  }

  /** one line under the greeting: what needs attention (or "all quiet"), then today's energy use */
  /** status pills under the greeting: lights, doors & windows, attention; each opens its popup */
  renderPills(h) {
    const pills = [];
    if (h.lights.length) pills.push({ icon: "mdi:lightbulb-outline", svg: "lamp", on: h.lightsOn.length > 0, text: h.lightsOn.length ? t("{n} aan", { n: h.lightsOn.length }) : t("Lampen uit"), pop: "lights" });
    const open = h.doorsOpen.length + h.windowsOpen.length;
    if (h.doors.length || h.windows.length) pills.push({ icon: "mdi:door", svg: "door", on: open > 0, text: open ? t("{n} open", { n: open }) : t("Alles dicht"), pop: "doors" });
    if (h.attention.length) pills.push({ icon: "mdi:alert-circle-outline", svg: "sparkles", on: true, text: `${h.attention.length} ${h.attention.length === 1 ? t("melding") : t("meldingen")}`, pop: "attention" });
    if (!pills.length) return nothing;
    return html`<div class="pills">${pills.map(x => html`<button class=${classMap({ on: x.on })} @click=${ev => { ev.stopPropagation(); this.openPopup({ type: x.pop }); }}>${ico(x.icon, x.svg)}${x.text}</button>`)}</div>`;
  }
  /** weather block next to the greeting: temperature, condition, high/low, wind and the next hours */
  renderWx(w) {
    if (!w) return nothing;
    const a = w.attributes, fx = this.wx || {}, now = Date.now();
    const hours = (fx.hourly || []).filter(f => new Date(f.datetime).getTime() > now - 30 * 60000).slice(0, 4);
    const today = (fx.daily || [])[0] || {};
    const hi = num(today.temperature), lo = num(today.templow);
    const line = [hi != null && lo != null ? `H ${Math.round(hi)}° · L ${Math.round(lo)}°` : "", a.wind_speed != null ? t("Wind {n}", { n: `${Math.round(a.wind_speed)} ${a.wind_speed_unit || t("km/u")}` }) : ""].filter(Boolean).join(" · ");
    return html`<div class=${classMap({ wx: true, wxm: !!this.config.home?.wxMobile })} @click=${ev => { ev.stopPropagation(); this.openPopup({ type: "weather" }); }}>
      <div class="big">${ico(condIcon(w.state), condSvg(w.state))}<div class="t">${Math.round(num(a.temperature) ?? 0)}<sup>°</sup></div></div>
      <div class="cnd">${condText(w.state)}${wxExpect(this) ? html`<i class="dt"></i>${wxExpect(this)}` : nothing}</div>
      ${line ? html`<div class="hl">${line}</div>` : nothing}
      ${hours.length ? html`<div class="hours">${hours.map(f => html`<div>${t("{h}u", { h: new Date(f.datetime).getHours() })}${ico(condIcon(f.condition), condSvg(f.condition))}<b>${Math.round(num(f.temperature) ?? 0)}°</b></div>`)}</div>` : nothing}
    </div>`;
  }

  renderHome(h) {
    const items = [];
    if (h.energy.today) items.push({ k: "energy", icon: "mdi:flash-outline", title: t("Energie"), text: t("Vandaag {n} kWh verbruikt", { n: (+h.energy.today.state).toFixed(1) }) + (h.energy.returned ? ", " + t("{n} kWh teruggeleverd", { n: (+h.energy.returned.state).toFixed(1) }) : "") });
    if (h.waste[0]) items.push({ k: "waste", icon: "mdi:trash-can-outline", title: h.waste[0].label, text: cap(wasteSentence(h.waste[0]).replace(h.waste[0].label, "").replace(/^[:\s]+/, "")) });
    const ev = nextEvent(this.events || []); if (ev) items.push({ k: "agenda", icon: "mdi:calendar-blank-outline", title: ev.summary, text: eventWhenShort(ev) });
    for (const n of this.notifications.slice(0, 2)) items.push({ k: "notifications", icon: "mdi:bell-outline", title: n.title || t("Melding"), text: (n.message || "").replace(/\s+/g, " ").slice(0, 70) });
    if (h.attention.length) items.push({ k: "attention", icon: "mdi:alert-circle-outline", title: `${h.attention.length} ${h.attention.length === 1 ? t("melding") : t("meldingen")}`, text: `${h.attention[0].name} ${h.attention[0].text}` });
    if (h.doorsOpen.length) items.push({ k: "doors", icon: "mdi:door-open", title: h.doorsOpen.map(e => name(this.hass, e)).join(", "), text: h.doorsOpen.length === 1 ? t("Staat open") : t("Staan open") });
    for (const m of modeList(this).filter(m => m.on)) items.push({ k: "modes", icon: m.icon || "mdi:account-switch-outline", title: m.label, text: t("Actief") });
    items.push(...this.applianceItems(this.rooms.flatMap(r => r.ents.appliances)));
    const su = selfUpdate(this);   // a newer HaCasa Nova: first in the row, tap = what's new (+ install via HACS)
    if (su) items.unshift({ k: "update", icon: "mdi:arrow-up-circle-outline", title: t("HaCasa Nova {v}", { v: String(su.to).replace(/^v/, "") }), text: t("update beschikbaar · tik voor wat er nieuw is"), tap: su.open });
    const cards = this.applyPage("home", homeCards(this, h)).map(c => c.tpl);
    return html`
      ${this.renderTitle(h.temp, t(this.pageCfg("home").title || this.config.home?.greeting || "") || greeting(), "", this.tickerOn("home", items), html`${this.renderPills(h)}${quickRow(this)}`, "home", this.renderWx(h.weather), h.hum)}
      <div class="strip" @pointerdown=${this._stripDown} @wheel=${this._stripWheel} @scroll=${this._stripScroll}>${cards}</div>${this.stripFades()}
      ${!cards.length ? html`<div class="empty">${t("Geen kaarten: wijs entiteiten toe aan ruimtes in Home Assistant.")}</div>` : nothing}
      <div class=${classMap({ banner: true, show: h.motion.length > 0 })}><img class="ico" src=${icon("motion")} alt="">${t("Beweging in {rooms}", { rooms: h.motion.map(r => r.name.toLowerCase()).join(", ") })}</div>`;
  }

  /** every card of a room as { key, label, tpl } (key = entity/device id or a fixed name) */
  roomCards(r) {
    const e = r.ents, v = l => this.visible(l), nm = x => label(this, x), dn = x => cardCfg(this, x.id).name || deviceName(this.hass, x.device);
    const list = [];
    const add = (arr, lbl, tpl) => arr.forEach(x => list.push({ key: x.id, label: lbl(x), tpl: tpl(x) }));
    add(v(e.lights), nm, x => lightCard(this, x));
    add(v(e.climate), nm, x => climateCard(this, x.state, name(this.hass, x)));
    add(v(e.media), nm, x => mediaCard(this, x));
    add(v(e.covers), nm, x => coverCard(this, x));
    add(v(e.strips), dn, x => stripCard(this, x));
    add(v(e.fans), nm, x => fanCard(this, x));
    add(v(e.locks), nm, x => lockCard(this, x));
    add(v(e.vacuums), nm, x => vacuumCard(this, x));
    add(v(e.humidifiers), nm, x => humidifierCard(this, x));
    add(v(e.appliances), dn, x => applianceCard(this, x));
    (this.config.templates || []).filter(tc => tc.room === r.id || tc.room === r.slug).forEach((tc, i) => list.push({ key: tc.id, label: tc.name || t("Template"), tpl: templateCard(this, tc, i) }));
    (this.config.groups || []).filter(g => (g.room === r.id || g.room === r.slug) && g.members?.length).forEach(g => list.push({ key: "group:" + g.id, label: g.name || t("Groep"), tpl: groupCard(this, g) }));
    if (v(e.scenes).length) list.push({ key: "scenes", label: t("Scènes"), tpl: roomScenesCard(this, v(e.scenes)) });
    if (e.lights.length && !this.config.noPresets) list.push({ key: "presets", label: t("Lichtscènes"), tpl: presetCard(this, r) });
    add(v(e.cameras), nm, x => roomCameraCard(this, x));
    add(v(e.switches), nm, x => switchCard(this, x));
    add(v(e.doors), nm, x => sensorCard(this, x, "door"));
    add(v(e.windows), nm, x => sensorCard(this, x, "window"));
    add(v(e.motion), nm, x => sensorCard(this, x, "motion"));
    add(v(e.other), nm, x => sensorCard(this, x, "binary"));
    return list;
  }

  renderRoom(r) {
    const e = r.ents;
    const items = [];
    for (const d of [...e.doors, ...e.windows].filter(x => isOn(x.state))) items.push({ k: "doors", icon: "mdi:door-open", title: name(this.hass, d), text: t("Staat open") });
    for (const m of e.media.filter(x => x.state?.state === "playing")) items.push({ k: "media", icon: "mdi:play", title: name(this.hass, m), text: t("Speelt {title}", { title: m.state.attributes.media_title || m.state.attributes.app_name || "" }) });
    items.push(...this.applianceItems(e.appliances));
    for (const b of e.battery.filter(x => +x.state?.state <= (this.config.home?.lowBattery ?? 20))) items.push({ k: "battery", icon: "mdi:battery-20", title: name(this.hass, b), text: t("Batterij {n}%", { n: b.state.state }) });
    if (e.lights.length) items.push({ k: "lights", icon: "mdi:lightbulb-outline", title: t("Lampen"), text: r.lightsOn ? t("{n} van {m} aan", { n: r.lightsOn, m: e.lights.length }) : t("Alles uit") });
    if (r.motion) items.push({ k: "motion", icon: "mdi:motion-sensor", title: t("Beweging"), text: r.motionOn ? t("Nu") : relTime(r.motion.last_changed) });
    const cards = this.applyPage(r.id, this.roomCards(r)).map(c => c.tpl);
    return html`
      ${this.renderTitle(r.temp, r.name, "", this.tickerOn(r.id, items), nothing, r.id, nothing, r.hum)}
      <div class="strip" @pointerdown=${this._stripDown} @wheel=${this._stripWheel} @scroll=${this._stripScroll}>${cards}</div>${this.stripFades()}
      ${!cards.length ? html`<div class="empty">${t("Geen apparaten in deze ruimte.")}</div>` : nothing}
      <div class=${classMap({ banner: true, show: r.motionOn })}><img class="ico" src=${icon("motion")} alt="">${t("Beweging in de {room}", { room: r.name.toLowerCase() })}</div>`;
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HacasaNova);
import "./card.js";
import "./iconset.js";
