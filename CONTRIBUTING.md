# Contributing to HaCasa Nova

Thanks for wanting to help! HaCasa Nova is a beta maintained by one person, so small, focused contributions are the easiest to review.

## Where to go

- **Bug?** Open an [issue](https://github.com/damianeickhoff/HaCasa/issues/new/choose) with your Home Assistant version, browser and any red lines from the browser console (F12).
- **Question or idea?** Start a [discussion](https://github.com/damianeickhoff/HaCasa/discussions): Q&A for help, Ideas for suggestions, Show and tell for your setup. For a quick chat, or to test betas, join the [HaCasa Discord](https://discord.gg/2Xgtqm8Xmw).
- **Known issues** are tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158). Pick one, say in the issue that you're on it, and go.

## Development

```bash
npm install
npm run watch            # rebuilds dist/hacasa-nova.js on every change
npx http-server .. -p 8097 -c-1
# open http://localhost:8097/<this folder>/dev/index.html
npm run deploy:dev       # a dev panel in your own Home Assistant, next to the HACS one
```

`dev/index.html` runs the panel against a mock home; add `?lang=nl` for Dutch. More in the [development guide](https://damianeickhoff.github.io/HaCasa/development/).

## Pull requests

- Branch from `main`, keep one change per pull request.
- Run `npm run build` and commit `dist/hacasa-nova.js` with your change (CI checks that it is up to date).
- All user-visible text goes through `t()` from `src/i18n.js`, with the Dutch text as the key and an English translation in `src/lang/en.js`. `npm run i18n:check` (also run by CI) tells you when one is missing.
- Match the style of the surrounding code; no new runtime dependencies without discussing it first.
- Screenshots in the pull request help a lot for anything visual.

## Translations

Each language is one file in [`src/lang/`](src/lang/). To add one:

1. Copy `src/lang/en.js` to `src/lang/<code>.js` (`de`, `fr`, … as Home Assistant names the language) and translate the values. The keys are the Dutch text used in the source; leave them as they are.
2. Add one line to `LANGS` in `src/i18n.js`: `de: { name: "Deutsch", locale: "de-DE", dict: de }`, plus the matching `import`.
3. Run `npm run i18n:check`. It shows how many keys are translated, and fails on a `{placeholder}` that differs from the key. `npm run i18n:check -- <code>` prints the keys still missing, ready to paste into your file.

A missing or empty key falls back to English, so a partial translation works. The panel picks the language from the Home Assistant profile (`de-CH` uses `de`); users can override it in the panel settings. Check long words with `?lang=<code>` in `dev/index.html`.

See [#156](https://github.com/damianeickhoff/HaCasa/issues/156).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE) of this project.
