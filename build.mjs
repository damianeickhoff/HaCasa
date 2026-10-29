// Bundles src/panel.js into one self-contained file (HACS serves a single file), with the SVG icons from icons/
// inlined as data: URLs, every language file in src/lang/ gathered as "hcn:langs" and the Material Design Icons names
// (from @mdi/svg, the version Home Assistant ships) as "hcn:mdi" for the icon picker. Also writes version.json.
// `node build.mjs` is the release build: dist/hacasa-nova.js, committed only with a release (HACS reads it from
// the release commit). It is copied to dev/build/ too, so the dev pages always load the newest build.
// `node build.mjs --local` (npm run dev) and `--watch` build into dev/build/ only (git-ignored), for working on the code.
// `node build.mjs --dev` builds the dev variant into dist-dev/hacasa-nova-dev.js: element <hacasa-nova-dev>,
// card custom:hacasa-nova-dev-card and its own settings key, so it runs next to the HACS install.
import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const watch = process.argv.includes("--watch");
const dev = process.argv.includes("--dev");
const local = watch || process.argv.includes("--local");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version + (dev ? "-dev" : "");
const outdir = dev ? "dist-dev" : local ? "dev/build" : "dist";
const name = dev ? "hacasa-nova-dev" : "hacasa-nova";
mkdirSync(outdir, { recursive: true });
mkdirSync("dev/build", { recursive: true });

const icons = {
  name: "icons",
  setup(build) {
    build.onResolve({ filter: /^hcn:icons$/ }, () => ({ path: "icons", namespace: "hcn" }));
    build.onLoad({ filter: /.*/, namespace: "hcn" }, () => {
      const map = {};
      for (const f of readdirSync("icons").filter(f => f.endsWith(".svg")).sort())   // sorted: NTFS and ext4 list files in different orders, the bundle must not depend on that
        map[f.slice(0, -4)] = "data:image/svg+xml," + encodeURIComponent(readFileSync(`icons/${f}`, "utf8").trim());
      return { contents: `export default ${JSON.stringify(map)};`, loader: "js", watchDirs: ["icons"] };
    });
  },
};

// "hcn:langs" = { de: { meta, default }, en: … } from src/lang/<code>.js, sorted so the build stays deterministic.
const langs = {
  name: "langs",
  setup(build) {
    build.onResolve({ filter: /^hcn:langs$/ }, () => ({ path: "langs", namespace: "hcn-langs" }));
    build.onLoad({ filter: /.*/, namespace: "hcn-langs" }, () => {
      const files = readdirSync("src/lang").filter(f => /^[a-z]{2,3}(-[a-z0-9]+)*\.js$/.test(f)).sort();
      const code = files.map((f, i) => `import * as l${i} from "./${f}";`).join("\n")
        + `\nexport default { ${files.map((f, i) => `${JSON.stringify(f.slice(0, -3))}: l${i}`).join(", ")} };`;
      return { contents: code, loader: "js", resolveDir: resolve("src/lang"), watchDirs: ["src/lang"] };
    });
  },
};

// "hcn:mdi" = one line per icon: name|extra alias words|categories as one character each (char code - 65 = index into TAGS); deprecated icons left out
const mdi = {
  name: "mdi",
  setup(build) {
    build.onResolve({ filter: /^hcn:mdi$/ }, () => ({ path: "mdi", namespace: "hcn-mdi" }));
    build.onLoad({ filter: /.*/, namespace: "hcn-mdi" }, () => {
      const meta = JSON.parse(readFileSync("node_modules/@mdi/svg/meta.json", "utf8")).filter(x => !x.deprecated).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);   // code-unit order, the same on every machine
      const tags = [...new Set(meta.flatMap(x => x.tags))].sort();
      const lines = meta.map(x => { const own = new Set(x.name.split("-")), extra = [...new Set(x.aliases.flatMap(a => a.split("-")))].filter(w => !own.has(w));
        return [x.name, extra.join(" "), x.tags.map(tg => String.fromCharCode(65 + tags.indexOf(tg))).join("")].join("|").replace(/\|+$/, ""); });
      return { contents: `export const TAGS = ${JSON.stringify(tags)};\nexport default ${JSON.stringify(lines.join("\n"))};`, loader: "js" };
    });
  },
};

const stamp = {
  name: "version-stamp",
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length) return;
      const v = Date.now().toString(36);
      writeFileSync(`${outdir}/version.json`, JSON.stringify({ v, version, built: new Date().toISOString() }));
      if (outdir === "dist") copyFileSync(`dist/${name}.js`, `dev/build/${name}.js`);
      console.log(`[hacasa-nova] built ${version} v=${v}`);
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/panel.js"],
  define: { __VERSION__: JSON.stringify(version), __SUFFIX__: JSON.stringify(dev ? "-dev" : "") },
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  outfile: `${outdir}/${name}.js`,
  legalComments: "eof",
  banner: { js: `/*! HaCasa Nova ${version} · MIT · https://github.com/damianeickhoff/HaCasa */` },
  plugins: [icons, langs, mdi, stamp],
});

if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
