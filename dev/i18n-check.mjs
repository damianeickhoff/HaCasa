// Checks the translations in src/lang/ against the t("…") calls in src/.
//   npm run i18n:check          report per language; exits 1 on errors (CI runs this)
//   npm run i18n:check -- de    also print the keys German is missing, ready to paste into src/lang/de.js
// Errors: a language file that holds anything but text (it ships to every user, so it may not run code), a bad
// file name or meta, a key used in the source that English lacks, or {placeholders} that differ from the key.
// Warnings: keys a language is missing (they fall back to English), keys no source uses any more.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const only = process.argv[2];
let errors = 0;
const err = msg => { errors++; console.log(`  ✗ ${msg}`); };

// Data only: after removing strings and comments, nothing may remain but the two exports, braces, colons,
// commas and the meta keys/values. No calls, imports, property access or template literals.
const META = { name: "string", locale: "string", keepCase: "boolean" };
function dataOnly(src) {
  const rest = src.replace(/"(?:\\.|[^"\\\n])*"/g, '""').replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*export const meta =/m, "").replace(/^\s*export default/m, "");
  const words = (rest.match(/[A-Za-z_$][\w$]*/g) || []).filter(w => !(w in META) && w !== "true" && w !== "false");
  const odd = rest.replace(/""|[A-Za-z_$][\w$]*/g, "").replace(/[\s{}:,;]/g, "");
  return words.length || odd ? [...new Set([...words, ...odd])].slice(0, 8).join(" ") : "";
}

const LANGS = { nl: { name: "Nederlands" } };
for (const f of readdirSync("src/lang").filter(f => f.endsWith(".js")).sort()) {
  const code = f.slice(0, -3), src = readFileSync(join("src/lang", f), "utf8");
  console.log(`src/lang/${f}`);
  if (!/^[a-z]{2,3}(-[a-z0-9]+)*$/.test(code)) { err(`file name must be a Home Assistant language code in lower case (de.js, pt-br.js), so the build skips it`); continue; }
  const bad = dataOnly(src);
  if (bad) { err(`may only contain text; found: ${bad}`); continue; }
  const mod = await import(pathToFileURL(resolve("src/lang", f)).href);
  const meta = mod.meta || {};
  for (const [k, type] of Object.entries(META)) if (meta[k] != null && typeof meta[k] !== type) err(`meta.${k} must be a ${type}`);
  if (!meta.name || !meta.locale) err(`needs export const meta = { name: "…", locale: "…" }`);
  else if (!Intl.DateTimeFormat.supportedLocalesOf(meta.locale).length) err(`meta.locale "${meta.locale}" is not a locale this browser engine knows`);
  LANGS[code] = { ...meta, dict: mod.default || {} };
}
if (!LANGS.en) { console.log("\nsrc/lang/en.js is missing"); process.exit(1); }
if (only && !LANGS[only]) { console.error(`\nUnknown language "${only}": create src/lang/${only}.js first.`); process.exit(1); }

const files = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === "lang" ? [] : files(p)) : p.endsWith(".js") ? [p] : [];
});

// Every literal first argument of t(…). Template literals with ${…} are dynamic and skipped.
const used = new Map();
const lit = /\bt\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\$])*)`)/g;
for (const f of files("src")) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(lit)) {
    const raw = m[1] ?? m[2] ?? m[3];
    const key = JSON.parse(`"${raw.replace(/\\'/g, "'").replace(/\\`/g, "`").replace(/(?<!\\)"/g, '\\"')}"`);
    if (!used.has(key)) used.set(key, `${f.replace(/\\/g, "/")}:${src.slice(0, m.index).split("\n").length}`);
  }
}

const holders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");
const en = LANGS.en.dict;

console.log(`\n${used.size} keys used in src/`);
for (const [code, { name, dict }] of Object.entries(LANGS)) {
  if (!dict) continue;
  const keys = Object.keys(dict);
  const missing = [...used.keys()].filter(k => !dict[k]);
  const unused = keys.filter(k => !used.has(k));
  console.log(`\n${code} · ${name}: ${used.size - missing.length}/${used.size} translated`);
  for (const k of keys) if (typeof dict[k] !== "string") err(`not text: "${k}"`); else if (dict[k] && holders(k) !== holders(dict[k])) err(`placeholders differ: "${k}" → "${dict[k]}"`);
  if (code === "en") for (const k of missing) err(`missing: "${k}" (${used.get(k)})`);
  else if (missing.length) console.log(`  ! ${missing.length} missing, shown in English (npm run i18n:check -- ${code})`);
  if (unused.length) console.log(`  ! ${unused.length} not used in src/ (maybe built at runtime): ${unused.slice(0, 5).map(k => `"${k}"`).join(", ")}${unused.length > 5 ? ", …" : ""}`);
}

if (only && only !== "nl") {
  const missing = [...used.keys()].filter(k => !LANGS[only].dict?.[k]);
  console.log(`\n// ${missing.length} keys missing in src/lang/${only}.js (English for reference)`);
  for (const k of missing) console.log(`  ${JSON.stringify(k)}: "", // ${en[k] || k}`);
}

console.log(errors ? `\n${errors} error(s)` : "\nOK");
process.exit(errors ? 1 : 0);
