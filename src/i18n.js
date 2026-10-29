// Translations. The Dutch text is the key, so the source stays readable; `t("Aan")` returns "On" in English and "Ein" in German.
// `t("{n} van {m} aan", { n, m })` fills placeholders.
//
// A language is one file in src/lang/, named after the Home Assistant language code in lower case (`de.js`,
// `pt-br.js`): `export const meta = { name, locale, keepCase? }` and `export default { "Dutch key": "translation", … }`.
// build.mjs gathers every file in that folder as "hcn:langs", so nothing else needs editing.
// A key that is missing or empty falls back to English, then to the Dutch key.
// `npm run i18n:check` lists missing keys and placeholder mistakes; `npm run i18n:check -- <code>` prints the
// missing keys of one language as a block to paste into its file.
import files from "hcn:langs";

export const LANGS = {
  nl: { name: "Nederlands", locale: "nl-NL" },
  ...Object.fromEntries(Object.entries(files).map(([code, f]) => [code, { ...f.meta, dict: f.default }])),
};
const en = LANGS.en.dict;

let lang = "nl", dict = null;
export const setLang = l => { lang = LANGS[l] ? l : "en"; dict = LANGS[lang].dict || null; };
export const getLang = () => lang;
export const locale = () => LANGS[lang].locale;
export const LANGUAGES = Object.fromEntries(Object.entries(LANGS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => [k, v.name]));

// Home Assistant language ("de", "de-CH", "pt-BR", "zh-Hans") → our code: exact match first, then the base language.
export const pickLang = hassLang => {
  const l = String(hassLang || "en").toLowerCase();
  return LANGS[l] ? l : LANGS[l.split(/[-_]/)[0]] ? l.split(/[-_]/)[0] : "en";
};

// A room name inside a sentence ("Motion in the kitchen"): lower case, unless the language keeps it (German nouns).
export const inText = name => LANGS[lang].keepCase ? name : name.toLowerCase();

/** one of two strings by count: tn(n, "{n} sensor", "{n} sensoren") (#152) */
export const tn = (n, one, many, vars = {}) => t(n === 1 ? one : many, { n, ...vars });
export function t(key, vars) {
  let s = lang === "nl" ? key : (dict?.[key] || en[key] || key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}
