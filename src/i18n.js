// Translations. The Dutch text is the key, so the source stays readable; `t("Aan")` returns "On" in English and "Ein" in German.
// `t("{n} van {m} aan", { n, m })` fills placeholders.
//
// Each language is one file in src/lang/ (`export default { "Dutch key": "translation", … }`) plus one line in
// LANGS below. A key that is missing or empty falls back to English, then to the Dutch key.
// `npm run i18n:check` lists missing keys and placeholder mistakes; `npm run i18n:check -- <code>` prints the
// missing keys of one language as a block to paste into its file.
import en from "./lang/en.js";
import de from "./lang/de.js";

export const LANGS = {
  nl: { name: "Nederlands", locale: "nl-NL" },
  en: { name: "English", locale: "en-GB", dict: en },
  de: { name: "Deutsch", locale: "de-DE", dict: de },
};

let lang = "nl", dict = null;
export const setLang = l => { lang = LANGS[l] ? l : "en"; dict = LANGS[lang].dict || null; };
export const getLang = () => lang;
export const locale = () => LANGS[lang].locale;
export const LANGUAGES = Object.fromEntries(Object.entries(LANGS).map(([k, v]) => [k, v.name]));

// Home Assistant language ("de", "de-CH", "pt-BR", "zh-Hans") → our code: exact match first, then the base language.
export const pickLang = hassLang => {
  const l = String(hassLang || "en").toLowerCase();
  return LANGS[l] ? l : LANGS[l.split(/[-_]/)[0]] ? l.split(/[-_]/)[0] : "en";
};

export function t(key, vars) {
  let s = lang === "nl" ? key : (dict?.[key] || en[key] || key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}
