// `npm run deploy:dev`: builds the dev variant and copies it into Home Assistant, next to the HACS install.
// Target folder: HACASA_DEV_TARGET, or "target" in deploy.local.json (git-ignored), e.g.
//   { "target": "\\\\homeassistant\\config\\www\\hacasa-dev" }
// In configuration.yaml (once, then restart):
//   panel_custom:
//     - name: hacasa-nova-dev
//       url_path: hacasa-dev
//       sidebar_title: HaCasa dev
//       sidebar_icon: mdi:flask-outline
//       require_admin: true
//       module_url: /local/hacasa-dev/hacasa-nova-dev-loader.js
// After a deploy, reload the browser: the loader picks up the new build by itself.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const local = existsSync("deploy.local.json") ? JSON.parse(readFileSync("deploy.local.json", "utf8")) : {};
const target = process.env.HACASA_DEV_TARGET || local.target;
if (!target) { console.error("No target: set HACASA_DEV_TARGET or create deploy.local.json with { \"target\": \"...\" }"); process.exit(1); }

execSync("node build.mjs --dev", { stdio: "inherit" });
mkdirSync(target, { recursive: true });
for (const [from, to] of [["dist-dev/hacasa-nova-dev.js", "hacasa-nova-dev.js"], ["dist-dev/version.json", "version.json"], ["dev/dev-loader.js", "hacasa-nova-dev-loader.js"]])
  copyFileSync(from, join(target, to));
const { version, v } = JSON.parse(readFileSync("dist-dev/version.json", "utf8"));
console.log(`[hacasa-nova] deployed ${version} (v=${v}) to ${target}; reload the browser`);
