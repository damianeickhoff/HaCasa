// Bundles src/panel.js into one self-contained file, dist/hacasa-nova.js (HACS serves a single file),
// with the SVG icons from icons/ inlined as data: URLs. Also writes version.json for cache-busting.
// `node build.mjs --watch` rebuilds on change.
// `node build.mjs --dev` builds the dev variant into dist-dev/hacasa-nova-dev.js: element <hacasa-nova-dev>,
// card custom:hacasa-nova-dev-card and its own settings key, so it runs next to the HACS install.
import * as esbuild from "esbuild";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const watch = process.argv.includes("--watch");
const dev = process.argv.includes("--dev");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version + (dev ? "-dev" : "");
const outdir = dev ? "dist-dev" : "dist";
const name = dev ? "hacasa-nova-dev" : "hacasa-nova";
mkdirSync(outdir, { recursive: true });

const icons = {
  name: "icons",
  setup(build) {
    build.onResolve({ filter: /^hcn:icons$/ }, () => ({ path: "icons", namespace: "hcn" }));
    build.onLoad({ filter: /.*/, namespace: "hcn" }, () => {
      const map = {};
      for (const f of readdirSync("icons").filter(f => f.endsWith(".svg")))
        map[f.slice(0, -4)] = "data:image/svg+xml," + encodeURIComponent(readFileSync(`icons/${f}`, "utf8").trim());
      return { contents: `export default ${JSON.stringify(map)};`, loader: "js", watchDirs: ["icons"] };
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
  plugins: [icons, stamp],
});

if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
