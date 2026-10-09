import { t, locale } from "./i18n.js";
// Small helpers shared by the panel.
import ICONS from "hcn:icons";                                 // icons/*.svg as data: URLs (inlined by build.mjs)
export const BASE = new URL("./", import.meta.url);           // dist/ folder URL at runtime
export const icon = name => ICONS[name] || ICONS.sparkles;
// "" for the release build, "-dev" for `npm run build:dev`, so a dev copy can run next to the HACS install
export const SUFFIX = typeof __SUFFIX__ === "string" ? __SUFFIX__ : "";
export const TAG = "hacasa-nova" + SUFFIX;                    // custom element name of the panel
export const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "dev";

export const slug = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const domain = id => id.split(".")[0];
export const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
export const isOn = s => !!s && ["on", "open", "playing", "heating", "cooling", "home"].includes(s.state);
export const unavailable = s => !s || s.state === "unavailable" || s.state === "unknown";

export const comfort = v => v == null ? "" : v < 16 ? t("Erg koud") : v < 18 ? t("Fris") : v < 21 ? t("Comfortabel") : t("Warm");
export const humidityText = h => h == null ? "" : h < 30 ? t("Luchtvochtigheid is erg droog, {h}%", { h: Math.round(h) })
  : h <= 60 ? t("Luchtvochtigheid is goed, {h}%", { h: Math.round(h) }) : t("Luchtvochtigheid is hoog, {h}%", { h: Math.round(h) });

export const greeting = (h = new Date().getHours()) => h < 6 ? t("Goedenacht") : h < 12 ? t("Goedemorgen") : h < 18 ? t("Goedemiddag") : t("Goedenavond");

const DAY = 86400000;
export function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date(), diff = now - d;
  const hm = d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (diff < 60000) return t("nu");
  if (diff < 3600000) return t("{n} min geleden", { n: Math.round(diff / 60000) });
  if (d.toDateString() === now.toDateString()) return hm;
  if (diff < 2 * DAY) return t("gisteren {t}", { t: hm });
  if (diff < 7 * DAY) return t("{n} dagen geleden", { n: Math.round(diff / DAY) });
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}
export function shortDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
}
export function daysUntil(iso) {
  const d = new Date(iso); if (isNaN(d)) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - a) / DAY);
}
/** "zojuist" / "12 min geleden" / "sinds 14:02" / "sinds gisteren 14:02" */
export function sinceText(iso) {
  if (!iso) return "";
  const d = new Date(iso), diff = Date.now() - d;
  if (diff < 60000) return t("zojuist");
  if (diff < 3600000) return t("{n} min geleden", { n: Math.round(diff / 60000) });
  return t("sinds {t}", { t: relTime(iso) });
}
export const clock = () => new Date().toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

// Navigate inside Home Assistant without a full reload.
export function navigate(path) {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}
// buttons, scenes and events are "unknown" until first used: only a real "unavailable" counts as offline for them
const STATELESS = ["button", "input_button", "scene", "event", "notify"];
export const isDown = e => STATELESS.includes(domain(e.id)) ? e.state?.state === "unavailable" : unavailable(e.state);
