// Loader for the dev build in Home Assistant (copied by `npm run deploy:dev` as hacasa-nova-dev-loader.js).
// Reads version.json next to it so every deploy is picked up after a browser reload, without restarting HA.
const base = new URL(".", import.meta.url);
let v = Date.now();
try {
  const res = await fetch(new URL("version.json?" + Date.now(), base), { cache: "no-store" });
  v = (await res.json()).v;
} catch {
  // version.json missing or blocked: load uncached
}
await import(new URL("hacasa-nova-dev.js?v=" + v, base).href);
