// The agenda popup: a week grid (desktop), one day, or a list per day (phones). Events come from the panel (p.events,
// fetched by fetchEvents for a window of a few weeks around today); a colour per calendar, a now-line, and a side
// column with what is on now, what is next, the calendars to hide and the event that was tapped.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale, timeOpts } from "./i18n.js";
import { relTime } from "./util.js";

const DAY = 86400000, HOUR_PX = 44;
export const CAL_COLORS = ["#7db8ff", "#f2b63a", "#8fd16a", "#c58cff", "#f27a5c", "#5fd4c8", "#ff9ecf", "#d9c27a"];
export const calColor = (home, cal) => CAL_COLORS[Math.max(0, (home?.calendars || []).indexOf(cal)) % CAL_COLORS.length];
const calName = (p, cal) => p.hass.states[cal]?.attributes.friendly_name || cal.replace(/^calendar\./, "").replace(/_/g, " ");
const hm = d => d.toLocaleTimeString(locale(), timeOpts());
const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
/** Monday of the week that holds d */
const monday = d => { const x = sod(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const evKey = ev => `${ev.cal}|${ev.start.toISOString()}|${ev.summary}`;
/** an event counts as all-day when the calendar says so or it spans a whole day or more */
const isAllDay = ev => ev.allDay || (ev.end - ev.start) >= DAY;
const dayLabel = d => { const today = sod(new Date()), k = Math.round((sod(d) - today) / DAY); return k === 0 ? t("Vandaag") : k === 1 ? t("Morgen") : k === -1 ? t("Gisteren") : d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" }); };
export const whenText = ev => isAllDay(ev)
  ? (ev.end - ev.start > DAY ? `${dayLabel(ev.start)} – ${new Date(ev.end - 1).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" })}` : `${dayLabel(ev.start)} · ${t("hele dag")}`)
  : `${dayLabel(ev.start)} · ${hm(ev.start)} – ${hm(ev.end)}`;

/** lay timed events of one day out in columns so overlapping ones sit side by side */
function layout(list) {
  const ev = [...list].sort((a, b) => a.start - b.start || b.end - a.end), out = [];
  let cluster = [], clusterEnd = 0;
  const flush = () => { if (!cluster.length) return; const cols = []; for (const x of cluster) { let c = cols.findIndex(end => end <= x.start); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = x.end; x.col = c; } for (const x of cluster) { x.cols = cols.length; out.push(x); } cluster = []; clusterEnd = 0; };
  for (const x of ev) { const it = { ev: x, start: x.start.getTime(), end: Math.max(x.end.getTime(), x.start.getTime() + 15 * 60000) }; if (cluster.length && it.start >= clusterEnd) flush(); cluster.push(it); clusterEnd = Math.max(clusterEnd, it.end); }
  flush();
  return out;
}

export function calendarBody(p, pop) {
  const home = p.home, now = new Date(), phone = matchMedia("(max-width:900px)").matches;
  const view = pop.view || (phone ? "agenda" : "week"), off = pop.off || 0, hide = new Set(pop.hide || []);
  const set = patch => p.openPopup({ ...pop, ...patch });
  const all = (p.events || []).filter(ev => !hide.has(ev.cal));
  const cals = home.calendars || [];
  // the days on screen
  const base = view === "week" ? monday(now) : sod(now);
  const first = new Date(base.getTime() + off * (view === "week" ? 7 : view === "day" ? 1 : 7) * DAY);
  const nDays = view === "day" ? 1 : 7;
  const days = Array.from({ length: nDays }, (_, i) => new Date(first.getTime() + i * DAY));
  const last = new Date(first.getTime() + nDays * DAY);
  const inRange = all.filter(ev => ev.start < last && ev.end > first);
  const onDay = (d, list) => list.filter(ev => ev.start < new Date(d.getTime() + DAY) && ev.end > d);
  const sel = pop.sel ? all.find(ev => evKey(ev) === pop.sel) : null;
  const pick = ev => set({ sel: pop.sel === evKey(ev) ? null : evKey(ev) });
  const color = ev => calColor(home, ev.cal);
  const chip = (ev, cls = "") => html`<div class=${`cev ${cls} ${pop.sel === evKey(ev) ? "sel" : ""} ${ev.start <= now && ev.end > now ? "now" : ""}`} style=${`--c:${color(ev)}`} @click=${e => { e.stopPropagation(); pick(ev); }}>${ev.summary}${isAllDay(ev) ? nothing : html`<small>${hm(ev.start)}${ev.location ? " · " + ev.location : ""}</small>`}</div>`;

  /* ---------- toolbar: ‹ today ›, the range, the view ---------- */
  const range = view === "day" ? first.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })
    : `${first.toLocaleDateString(locale(), { day: "numeric", month: "short" })} – ${new Date(last - 1).toLocaleDateString(locale(), { day: "numeric", month: "short" })}`;
  const bar = html`<div class="cbar">
    <div class="cnav"><button title=${t("Vorige")} @click=${() => set({ off: off - 1 })}>‹</button><button class=${off ? "" : "on"} @click=${() => set({ off: 0 })}>${t("Vandaag")}</button><button title=${t("Volgende")} @click=${() => set({ off: off + 1 })}>›</button><span class="rng">${range}${view === "week" ? html` · ${t("week {n}", { n: weekNo(first) })}` : nothing}</span></div>
    <div class="seg">${[["day", t("Dag")], ["week", t("Week")], ["agenda", t("Lijst")]].map(([v, l]) => html`<button class=${view === v ? "on" : ""} @click=${() => set({ view: v, off: 0 })}>${l}</button>`)}</div>
  </div>`;

  /* ---------- week / day grid ---------- */
  let grid = nothing;
  if (view !== "agenda") {
    const timed = inRange.filter(ev => !isAllDay(ev)), allDay = inRange.filter(isAllDay);
    const h0 = Math.min(8, ...timed.map(ev => ev.start.getHours())), h1 = Math.max(20, ...timed.map(ev => Math.min(24, Math.ceil((ev.end - sod(ev.end)) / 3600000) || 24)));
    const hours = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
    const y = d => ((d - sod(d)) / 3600000 - h0) * HOUR_PX;
    const todayIdx = days.findIndex(d => d.toDateString() === now.toDateString());
    const nowY = y(now);
    const spanOf = ev => { const a = Math.max(0, Math.floor((sod(ev.start) - first) / DAY)), b = Math.min(nDays, Math.ceil((ev.end - first) / DAY)); return [a + 2, Math.max(a + 3, b + 2)]; };
    grid = html`<div class=${classMap({ cwgrid: true, one: nDays === 1 })} style=${`--n:${nDays}`}>
      <div class="chd"><div></div>${days.map((d, i) => html`<div class=${i === todayIdx ? "today" : ""}>${d.toLocaleDateString(locale(), { weekday: phone && nDays > 1 ? "narrow" : "short" }).replace(".", "")}<b>${d.getDate()}</b></div>`)}</div>
      ${allDay.length ? (() => { const rows = []; const placed = allDay.map(ev => { const [a, b] = spanOf(ev); let r = rows.findIndex(end => end <= a); if (r < 0) { r = rows.length; rows.push(0); } rows[r] = b; return { ev, a, b, r }; });
        return html`<div class="cad"><span style=${`grid-row:1/${rows.length + 1}`}>${t("hele dag")}</span>${placed.map(x => html`<div style=${`grid-column:${x.a}/${x.b};grid-row:${x.r + 1}`}>${chip(x.ev, "ad")}</div>`)}</div>`; })() : nothing}
      <div class="cbody" style=${`height:${hours.length * HOUR_PX}px`}>
        <div class="ctimes">${hours.map(h => html`<div style=${`top:${(h - h0) * HOUR_PX}px`}>${String(h).padStart(2, "0")}</div>`)}</div>
        ${days.map((d, i) => html`<div class=${classMap({ cday: true, today: i === todayIdx })}>
          ${layout(onDay(d, timed)).map(({ ev, col, cols }) => { const top = Math.max(0, y(ev.start < d ? d : ev.start)), bottom = Math.min(hours.length * HOUR_PX, y(ev.end > new Date(d.getTime() + DAY) ? new Date(d.getTime() + DAY - 1) : ev.end));
            return html`<div class="cslot" style=${`top:${top}px;height:${Math.max(22, bottom - top)}px;left:calc(${col / cols * 100}% + 2px);width:calc(${100 / cols}% - 4px)`}>${chip(ev)}</div>`; })}
          ${i === todayIdx && nowY >= 0 && nowY <= hours.length * HOUR_PX ? html`<div class="cnow" style=${`top:${nowY}px`}></div>` : nothing}
        </div>`)}
      </div>
    </div>`;
  }

  /* ---------- agenda list: the next seven days, grouped per day ---------- */
  let list = nothing;
  if (view === "agenda") {
    const groups = days.map(d => [d, onDay(d, inRange).filter(ev => ev.end > now || sod(ev.start) > sod(now) || off !== 0).sort((a, b) => (isAllDay(b) - isAllDay(a)) || a.start - b.start)]).filter(([, l]) => l.length);
    list = groups.length ? html`<div class="clist">${groups.map(([d, l]) => html`<div class="cdh">${dayLabel(d)}<small>${d.toLocaleDateString(locale(), { day: "numeric", month: "long" })}</small></div>
      ${l.map(ev => html`<div class=${classMap({ crow: true, sel: pop.sel === evKey(ev), now: ev.start <= now && ev.end > now })} style=${`--c:${color(ev)}`} @click=${() => pick(ev)}><i></i><span class="tm">${isAllDay(ev) ? t("hele dag") : hm(ev.start)}</span><div>${ev.summary}<small>${isAllDay(ev) ? calName(p, ev.cal) : `${hm(ev.start)} – ${hm(ev.end)}${ev.location ? " · " + ev.location : ""}`}</small></div></div>`)}`)}</div>`
      : html`<div class="sub" style="margin-top:16px">${t("Niets gepland in deze periode")}</div>`;
  }

  /* ---------- side column: now, next, the tapped event, calendars ---------- */
  const current = all.filter(ev => ev.start <= now && ev.end > now), next = all.filter(ev => ev.start > now).slice(0, 3);
  const side = html`<div class="cside">
    ${sel ? html`<div class="csh">${t("Afspraak")}</div><div class="cdet" style=${`--c:${color(sel)}`}><b>${sel.summary}</b><div>${whenText(sel)}</div>${sel.location ? html`<div><ha-icon icon="mdi:map-marker-outline"></ha-icon>${sel.location}</div>` : nothing}${sel.description ? html`<p>${sel.description}</p>` : nothing}<small>${calName(p, sel.cal)}${sel.start > now ? ` · ${t("over {t}", { t: untilText(sel.start) })}` : sel.end > now ? ` · ${t("tot {t}", { t: hm(sel.end) })}` : ""}</small></div>` : nothing}
    ${current.length ? html`<div class="csh">${t("Nu")}</div>${current.map(ev => chip(ev, "side"))}` : nothing}
    ${next.length ? html`<div class="csh">${t("Hierna")}</div>${next.map(ev => html`<div class=${`cev side ${pop.sel === evKey(ev) ? "sel" : ""}`} style=${`--c:${color(ev)}`} @click=${() => pick(ev)}>${ev.summary}<small>${whenText(ev)}</small></div>`)}` : nothing}
    ${cals.length > 1 ? html`<div class="csh">${t("Agenda's")}</div><div class="chips ccal">${cals.map(c => html`<button class=${hide.has(c) ? "" : "on"} style=${`--c:${calColor(home, c)}`} @click=${() => set({ hide: hide.has(c) ? [...hide].filter(x => x !== c) : [...hide, c] })}><i></i>${calName(p, c)}</button>`)}</div>` : nothing}
  </div>`;

  return html`${bar}<div class=${classMap({ cwrap: true, agenda: view === "agenda" })}>${grid}${list}${side}</div>`;
}
const untilText = d => { const m = Math.round((d - Date.now()) / 60000); return m < 60 ? t("{m} min", { m }) : m < 48 * 60 ? t("{h}u {m}m", { h: Math.floor(m / 60), m: m % 60 }) : t("{n} dagen", { n: Math.round(m / 1440) }); };
const weekNo = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y0) / DAY + 1) / 7); };
export { relTime };

export const calendarStyles = `
  .popup .cbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap}
  .popup .cnav{display:flex;align-items:center;gap:4px}
  .popup .cnav button{height:32px;min-width:32px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
  .popup .cnav button.on{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .popup .cnav .rng{margin-left:10px;font-size:13px;font-weight:600;color:var(--fg-2)}
  .popup .cbar .seg{padding:3px}
  .popup .cbar .seg button{height:26px;padding:0 12px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;border:0;border-radius:999px;background:none;color:var(--fg-2);font-family:inherit;cursor:pointer}
  .popup .cbar .seg button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .popup .cwrap{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:16px;margin-top:14px;align-items:start}
  .popup .cwrap.agenda{grid-template-columns:minmax(0,1fr) 230px}
  .popup .cwgrid{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:rgba(0,0,0,.15);--tw:40px}
  .popup .chd{display:grid;grid-template-columns:var(--tw) repeat(var(--n),minmax(0,1fr));border-bottom:1px solid var(--line)}
  .popup .chd div{padding:9px 4px 7px;text-align:center;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3)}
  .popup .chd div b{display:block;font-size:17px;letter-spacing:0;color:#fff;margin:3px auto 0;width:28px;height:28px;line-height:28px;border-radius:50%}
  .popup .chd div.today b{background:#fff;color:#1d1d1f}
  .popup .cad{display:grid;grid-template-columns:var(--tw) repeat(var(--n),minmax(0,1fr));grid-auto-rows:min-content;gap:2px 0;padding:3px 0;border-bottom:1px solid var(--line)}
  .popup .cad>span{grid-column:1;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3);padding:6px 0 0 6px;line-height:1.1}
  .popup .cad>div{min-width:0;padding:0 2px}
  .popup .cbody{position:relative;display:grid;grid-template-columns:var(--tw) repeat(var(--n),minmax(0,1fr));background-image:repeating-linear-gradient(to bottom,transparent 0 ${HOUR_PX - 1}px,rgba(255,255,255,.07) ${HOUR_PX - 1}px ${HOUR_PX}px)}
  .popup .ctimes{position:relative}
  .popup .ctimes div{position:absolute;right:6px;font-size:10px;color:var(--fg-3);transform:translateY(-6px)}
  .popup .cday{position:relative;border-left:1px solid rgba(255,255,255,.07);min-width:0}
  .popup .cday.today{background:rgba(255,255,255,.04)}
  .popup .cslot{position:absolute}
  .popup .cnow{position:absolute;left:0;right:0;height:1px;background:var(--accent);z-index:3;pointer-events:none}
  .popup .cnow::before{content:"";position:absolute;left:-3px;top:-3px;width:7px;height:7px;border-radius:50%;background:var(--accent)}
  .popup .cev{height:100%;border-radius:5px;padding:4px 6px;font-size:11px;font-weight:700;line-height:1.25;overflow:hidden;border-left:3px solid var(--c);background:color-mix(in srgb,var(--c) 28%,rgba(0,0,0,.35));color:#fff;cursor:pointer;white-space:nowrap;text-overflow:ellipsis}
  .popup .cev small{display:block;font-weight:500;opacity:.75;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup .cev.ad{height:auto;padding:3px 6px;font-size:10px}
  .popup .cev.now{outline:1.5px solid rgba(255,255,255,.85)}
  .popup .cev.sel{background:color-mix(in srgb,var(--c) 55%,rgba(0,0,0,.2))}
  .popup .cev.side{height:auto;white-space:normal;margin-top:4px;padding:8px 10px;font-size:12px}
  .popup .cside{min-width:0}
  .popup .csh{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);font-weight:700;margin:12px 0 2px}
  .popup .csh:first-child{margin-top:0}
  .popup .cdet{border-radius:var(--r-sm);border-left:3px solid var(--c);background:rgba(255,255,255,.08);padding:12px 14px;font-size:13px;font-weight:500;color:var(--fg-2);display:flex;flex-direction:column;gap:5px}
  .popup .cdet b{font-size:15px;color:#fff;font-weight:700}
  .popup .cdet div{display:flex;align-items:center;gap:6px}
  .popup .cdet ha-icon{--mdc-icon-size:15px;opacity:.7}
  .popup .cdet p{font-size:12px;line-height:1.45;opacity:.8;white-space:pre-line;max-height:120px;overflow:auto}
  .popup .cdet small{font-size:11px;opacity:.6}
  .popup .chips.ccal{margin-top:8px}
  .popup .chips.ccal button i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px;vertical-align:0}
  .popup .chips.ccal button:not(.on) i{opacity:.4}
  .popup .clist{display:flex;flex-direction:column;gap:3px}
  .popup .cdh{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);margin:12px 2px 4px}
  .popup .cdh:first-child{margin-top:0}
  .popup .cdh small{font-size:11px;letter-spacing:0;text-transform:none;font-weight:500;color:var(--fg-3)}
  .popup .crow{display:grid;grid-template-columns:4px 56px 1fr;gap:12px;align-items:center;padding:10px 12px;border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:14px;font-weight:600;cursor:pointer}
  .popup .crow i{display:block;width:4px;height:100%;min-height:28px;border-radius:2px;background:var(--c)}
  .popup .crow .tm{font-size:12px;font-weight:700;color:var(--fg-2)}
  .popup .crow small{display:block;font-size:11px;font-weight:500;opacity:.65;margin-top:1px}
  .popup .crow.now{background:rgba(255,255,255,.18)}
  .popup .crow.sel{border-color:var(--line-on);background:rgba(255,255,255,.22)}
  @media (max-width:900px){
    .popup .cwrap,.popup .cwrap.agenda{grid-template-columns:1fr;gap:12px}
    .popup .cwgrid{--tw:28px}
    .popup .chd div{font-size:8px;padding:6px 2px 5px}
    .popup .chd div b{font-size:13px;width:22px;height:22px;line-height:22px}
    .popup .cev{font-size:9px;padding:2px 3px;border-left-width:2px}
    .popup .cev small{display:none}
    .popup .cnav .rng{display:none}
  }
`;
