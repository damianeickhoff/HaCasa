// Checks the translations in src/lang/ against the t("…") calls in src/.
//   npm run i18n:check          report per language; exits 1 on errors (CI runs this)
//   npm run i18n:check -- de    also print the keys German is missing, ready to paste into src/lang/de.js
// Errors: a key used in the source that English lacks, or a translation whose {placeholders} differ from the key.
// Warnings: keys a language is missing (they fall back to English), keys no source uses any more.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { LANGS } from "../src/i18n.js";

const only = process.argv[2];
if (only && !LANGS[only]) { console.error(`Unknown language "${only}". Add it to LANGS in src/i18n.js first.`); process.exit(1); }

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
let errors = 0;
const err = msg => { errors++; console.log(`  ✗ ${msg}`); };

console.log(`${used.size} keys used in src/`);
for (const [code, { name, dict }] of Object.entries(LANGS)) {
  if (!dict) continue;
  const keys = Object.keys(dict);
  const missing = [...used.keys()].filter(k => !dict[k]);
  const unused = keys.filter(k => !used.has(k));
  console.log(`\n${code} · ${name}: ${used.size - missing.length}/${used.size} translated`);
  for (const k of keys) if (dict[k] && holders(k) !== holders(dict[k])) err(`placeholders differ: "${k}" → "${dict[k]}"`);
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
