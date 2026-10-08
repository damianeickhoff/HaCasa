// Bundles src/panel.js into one self-contained file, dist/hacasa-nova.js (HACS serves a single file),
// with the SVG icons from icons/ inlined as data: URLs. Also writes dist/version.json for local cache-busting.
// `node build.mjs --watch` rebuilds on change.
import * as esbuild from "esbuild";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const watch = process.argv.includes("--watch");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

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
      writeFileSync("dist/version.json", JSON.stringify({ v, version: pkg.version, built: new Date().toISOString() }));
      console.log(`[hacasa-nova] built ${pkg.version} v=${v}`);
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/panel.js"],
  define: { __VERSION__: JSON.stringify(pkg.version) },
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  outfile: "dist/hacasa-nova.js",
  legalComments: "eof",
  banner: { js: `/*! HaCasa Nova ${pkg.version} · MIT · https://github.com/damianeickhoff/HaCasa */` },
  plugins: [icons, stamp],
});

if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
