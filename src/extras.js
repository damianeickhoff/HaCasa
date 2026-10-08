// Notifications, energy statistics, alarm keypad and the idle screen.
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { num, relTime, clock } from "./util.js";
import { condText, condIcon } from "./cards.js";

/* ---------- persistent notifications (live subscription) ---------- */
export function subscribeNotifications(hass, cb) {
  if (!hass?.connection?.subscribeMessage) return () => {};
  return hass.connection.subscribeMessage(msg => cb(Object.values(msg?.notifications || msg || {})), { type: "persistent_notification/subscribe" });
}

/* ---------- hourly energy for today from the recorder ---------- */
export async function hourlyToday(hass, statisticId) {
  if (!statisticId) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  try {
    const r = await hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), statistic_ids: [statisticId], period: "hour", types: ["change", "sum"] });
    const rows = r?.[statisticId] || [];
    return rows.map(x => ({ t: new Date(x.start), v: x.change ?? 0 }));
  } catch (e) { console.warn("[hacasa-nova] statistics unavailable", e); return null; }
}
export const bars = (rows, unit = "kWh") => {
  if (!rows) return html`<div class="sub">${t("Geen geschiedenis beschikbaar")}</div>`;
  if (!rows.length) return html`<div class="sub">${t("Nog geen gegevens voor vandaag")}</div>`;
  const max = Math.max(...rows.map(r => r.v), 0.001), now = new Date().getHours();
  return html`<div class="bars">${rows.map(r => html`<i class=${r.t.getHours() === now ? "now" : ""} style="height:${Math.max(3, r.v / max * 100)}%" title="${r.t.getHours()}:00 · ${r.v.toFixed(2)} ${unit}"></i>`)}</div>
    <div class="bars-x"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
};

/* ---------- alarm keypad ---------- */
export function keypad(p, pop) {
  const code = pop.code || "";
  const press = k => p.openPopup({ ...pop, code: k === "⌫" ? code.slice(0, -1) : code + k });
  const ok = async () => { try { await p.call("alarm_control_panel", pop.pending, { entity_id: p.home.alarm.entity_id, code }); p.openPopup({ ...pop, pending: null, code: "" }); } catch { p.openPopup({ ...pop, code: "" }); } };
  const lbl = { alarm_disarm: t("Code om uit te schakelen"), alarm_arm_home: t("Code om thuis in te schakelen"), alarm_arm_away: t("Code om weg in te schakelen"), alarm_arm_night: t("Code om nacht in te schakelen") }[pop.pending];
  return html`<div class="keypad">
    <div class="kcode">${code ? "•".repeat(code.length) : html`<span>${lbl}</span>`}</div>
    <div class="kgrid">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map(k => html`<button class=${k === "OK" ? "on" : ""} @click=${() => k === "OK" ? ok() : press(k)}>${k}</button>`)}</div>
    <button class="klink" @click=${() => p.openPopup({ ...pop, pending: null, code: "" })}>${t("Annuleren")}</button>
  </div>`;
}

/* ---------- idle screen ---------- */
export function idleScreen(p) {
  const w = p.home?.weather, h = p.home;
  const date = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  return html`<div class="idle" @pointerdown=${() => p.wake()}>
    <div class="iclock">${clock()}</div>
    <div class="idate">${date}</div>
    ${w ? html`<div class="iwx"><ha-icon icon=${condIcon(w.state)}></ha-icon>${Math.round(num(w.attributes.temperature) ?? 0)}° · ${condText(w.state)}</div>` : nothing}
    <div class="iline">${[h?.temp != null ? t("{t}° binnen", { t: h.temp.toFixed(1) }) : "", h?.lightsOn?.length ? t("{n} lampen aan", { n: h.lightsOn.length }) : "", h?.doorsOpen?.length ? t("{n} deur open", { n: h.doorsOpen.length }) : "", h?.attention?.length ? t("{n} meldingen", { n: h.attention.length }) : ""].filter(Boolean).join(" · ")}</div>
  </div>`;
}

export const extraStyles = `
  .toast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:70;max-width:min(560px,calc(100vw - 32px));padding:14px 20px;border-radius:999px;background:rgba(242,122,92,.92);color:#fff;font-size:13px;font-weight:600;letter-spacing:.5px;box-shadow:0 10px 30px rgba(0,0,0,.35);animation:fadeIn .25s ease-out both}
  .bars{display:flex;align-items:flex-end;gap:3px;height:70px;margin-top:16px;padding:0 2px}
  .bars i{flex:1;border-radius:3px 3px 0 0;background:rgba(255,255,255,.35);min-height:3px}
  .bars i.now{background:#fff}
  .bars-x{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-top:4px;letter-spacing:1px}
  .keypad{margin-top:18px}
  .kcode{height:44px;display:flex;align-items:center;justify-content:center;font-size:26px;letter-spacing:8px;border-radius:var(--r-sm);background:rgba(0,0,0,.25)}
  .kcode span{font-size:13px;letter-spacing:0;opacity:.7}
  .kgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
  .kgrid button{height:56px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:20px;font-weight:600;cursor:pointer}
  .kgrid button.on{background:rgba(255,255,255,.4)}
  .klink{display:block;margin:12px auto 0;border:0;background:transparent;color:#fff;opacity:.7;font:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .idle{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;animation:fadeIn 1.2s ease-out both;user-select:none}
  .iclock{font-size:clamp(72px,16vw,160px);font-weight:700;letter-spacing:-4px;line-height:1;opacity:.9}
  .idate{font-size:18px;font-weight:500;opacity:.7;text-transform:capitalize}
  .iwx{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.8;margin-top:14px}
  .iwx ha-icon{--mdc-icon-size:24px}
  .iline{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5;margin-top:4px}
`;
