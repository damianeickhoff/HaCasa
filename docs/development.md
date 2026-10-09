# Development

HaCasa Nova is written with [Lit](https://lit.dev) and bundled with [esbuild](https://esbuild.github.io) into one file.

```bash
git clone https://github.com/damianeickhoff/HaCasa.git
cd HaCasa
npm install
npm run watch            # rebuilds dist/hacasa-nova.js on every change
```

## Run it outside Home Assistant

The `dev/` folder runs the panel in a normal browser against a mock home:

```bash
npx http-server .. -p 8097 -c-1
```

then open `http://localhost:8097/HaCasa/dev/index.html` (adjust the folder name).

| page | what it is |
|---|---|
| `dev/index.html` | the panel with the mock home (`dev/mock-hass.js`); `?lang=nl` for Dutch, `#/kitchen` for a room |
| `dev/index.html?shot&popup=light:light.floor_lamp` | screenshot mode: no hints, animations off, a popup opened |
| `dev/card.html?fresh` | the dashboard card with empty settings, so the setup wizard shows |
| `dev/phones.html` | three phones side by side (the README image) |
| `dev/icons.html` | every icon |

Room photos are looked up under `/images/rooms/` of the served folder; without them the rooms get gradients.

## Inside Home Assistant: a dev panel next to the real one

`npm run build:dev` builds a variant that registers its own names (`<hacasa-nova-dev>`, `custom:hacasa-nova-dev-card`) and keeps its own settings (copied once from your real ones). It runs side by side with the version installed through HACS, so the household keeps the stable one while you experiment.

1. Tell the deploy script where your Home Assistant `www` folder is, in `deploy.local.json` (git-ignored):

    ```json
    { "target": "//homeassistant/config/www/hacasa-dev" }
    ```

    (any path to `/config/www/hacasa-dev`: a mapped network drive, a Samba share, …)

2. Add the dev panel to `configuration.yaml` once and restart Home Assistant:

    ```yaml
    panel_custom:
      - name: hacasa-nova-dev
        url_path: hacasa-dev
        sidebar_title: HaCasa dev
        sidebar_icon: mdi:flask-outline
        require_admin: true
        module_url: /local/hacasa-dev/hacasa-nova-dev-loader.js
    ```

3. After every change: `npm run deploy:dev` and reload the browser. The loader picks up the new build by itself, no restart needed.

Releases go the normal way: `npm run build`, commit `dist/hacasa-nova.js`, publish a GitHub release, and update your own install through HACS like any other user.

## Layout

```
src/
  panel.js      <hacasa-nova> element: navigation, header, strip, routing, popups
  card.js       <hacasa-nova-card> wrapper for dashboards
  model.js      registries and states → rooms and the home model
  cards.js      card renderers and tap/hold behaviour
  popups.js     popups, the setup wizard and the card settings form
  pages.js      Sensors, Energy, Automations, Cameras, System
  settings.js   the settings page and per-user storage
  features.js   quick actions, doorbell, updates, light scenes
  extras*.js    keypad, idle screen, history, statistics, calendar
  i18n.js       translations (the Dutch text is the key)
  styles.js     all CSS
icons/          SVG icons, drawn by dev/make-icons.mjs, inlined by build.mjs
dist/           the built file Home Assistant loads (committed for HACS)
docs/           this site (MkDocs Material)
```

## Translations

All text goes through `t()` from `src/i18n.js`. The Dutch text is the key and `EN` holds the English. To add a language, add a dictionary next to `EN`, list it in `LANGUAGES` and extend `setLang()`. Pull requests are welcome.

## Releasing

1. Bump `version` in `package.json` and add the changes to `CHANGELOG.md`.
2. `npm run build` and commit `dist/hacasa-nova.js`.
3. Tag `vX.Y.Z` and publish a GitHub release; HACS picks it up.
