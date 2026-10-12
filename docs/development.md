# Development

HaCasa Nova is written with [Lit](https://lit.dev) and bundled with [esbuild](https://esbuild.github.io) into one file.

```bash
git clone https://github.com/damianeickhoff/HaCasa.git
cd HaCasa
npm install
npm run watch            # rebuilds dev/build/hacasa-nova.js on every change
```

`npm run dev` builds once into `dev/build/` (git-ignored), which the dev pages load. `npm run build` is the release build into `dist/`, which is only committed with a release; it is copied to `dev/build/` as well.

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

Releases go the normal way (see [Releasing](#releasing)), and you update your own install through HACS like any other user.

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
  i18n.js       t(), the language list and fallbacks (the Dutch text is the key)
  lang/         one file per language (en.js, de.js, …), found by build.mjs
  styles.js     all CSS
icons/          SVG icons, drawn by dev/make-icons.mjs, inlined by build.mjs
dist/           the built file Home Assistant loads (committed with each release, for HACS)
docs/           this site (MkDocs Material)
```

## Translations

All text goes through `t()` from `src/i18n.js`. The Dutch text is the key; each other language is one file in `src/lang/` (`en.js` holds the English). To add a language:

1. Copy `src/lang/en.js` to `src/lang/<code>.js`, where `<code>` is the Home Assistant language code in lower case (`fr.js`, `pt-br.js`).
2. Set the first line to your language: `export const meta = { name: "Français", locale: "fr-FR" };`. Add `keepCase: true` when room names keep their capital inside a sentence, as German nouns do.
3. Translate the values. The keys are the Dutch text used in the source; leave them as they are.
4. Run `npm run i18n:check` and open `dev/index.html?lang=<code>` after `npm run dev` to look for long words.

That one file is the whole pull request: the build finds every file in `src/lang/`, the panel picks the language from the Home Assistant profile (`fr-CA` uses `fr`) and lists it under Settings → General → Language. No other files, no `dist/`, no docs; the maintainer adds the language to the docs with the release.

`npm run i18n:check` (also run by CI) shows how many keys are translated and fails on a `{placeholder}` that differs from the key, or on anything in the file that isn't text: language files ship to every user, so they may not contain code. `npm run i18n:check -- <code>` prints the keys still missing, ready to paste. A missing or empty key falls back to English, so a partial translation works.

Pull requests are welcome.

## Releasing

1. Bump `version` in `package.json` and add the changes to `CHANGELOG.md`. New languages: add them to [Language](extras.md#language).
2. `npm run build` and commit `dist/hacasa-nova.js` (pull requests don't touch it, so this is where it catches up).
3. Tag `vX.Y.Z` and publish a GitHub release with `dist/hacasa-nova.js` attached; HACS picks it up. CI checks that a release tag's `dist/` matches the source.
