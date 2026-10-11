# Contributing to HaCasa Nova

Thanks for wanting to help! HaCasa Nova is a beta maintained by one person, so small, focused contributions are the easiest to review.

## Where to go

- **Bug?** Open an [issue](https://github.com/damianeickhoff/HaCasa/issues/new/choose) with your Home Assistant version, browser and any red lines from the browser console (F12).
- **Question or idea?** Start a [discussion](https://github.com/damianeickhoff/HaCasa/discussions): Q&A for help, Ideas for suggestions, Show and tell for your setup.
- **Known issues** are tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158). Pick one, say in the issue that you're on it, and go.

## Development

```bash
npm install
npm run watch            # rebuilds dev/build/hacasa-nova.js on every change (or npm run dev, once)
npx http-server .. -p 8097 -c-1
# open http://localhost:8097/<this folder>/dev/index.html
npm run deploy:dev       # a dev panel in your own Home Assistant, next to the HACS one
```

`dev/index.html` runs the panel against a mock home; add `?lang=nl` for Dutch. More in the [development guide](https://damianeickhoff.github.io/HaCasa/development/).

## Pull requests

- Branch from `main`, keep one change per pull request.
- Don't commit `dist/hacasa-nova.js`: it is rebuilt with each release. Use `npm run dev` or `npm run watch` to test; they build into `dev/build/` (git-ignored). If `dist/` changed anyway, `git restore dist` before you commit.
- All user-visible text goes through `t()` from `src/i18n.js`, with the Dutch text as the key and an English translation in `src/lang/en.js`. `npm run i18n:check` (also run by CI) tells you when one is missing.
- Match the style of the surrounding code; no new runtime dependencies without discussing it first.
- Screenshots in the pull request help a lot for anything visual.

## Translations

A language is one file in [`src/lang/`](src/lang/). To add one:

1. Copy `src/lang/en.js` to `src/lang/<code>.js`, where `<code>` is the Home Assistant language code in lower case (`fr.js`, `pt-br.js`).
2. Set the first line to your language: `export const meta = { name: "Français", locale: "fr-FR" };`. Add `keepCase: true` when room names keep their capital inside a sentence, as German nouns do.
3. Translate the values. The keys are the Dutch text used in the source; leave them as they are.
4. Run `npm run i18n:check` and open `dev/index.html?lang=<code>` after `npm run dev` to look for long words.

That one file is the whole pull request: the build finds every file in `src/lang/`, the panel picks the language from the Home Assistant profile (`fr-CA` uses `fr`) and lists it under Settings → General → Language. No other files, no `dist/`, no docs; the maintainer adds the language to the docs with the release.

`npm run i18n:check` (also run by CI) shows how many keys are translated and fails on a `{placeholder}` that differs from the key, or on anything in the file that isn't text: language files ship to every user, so they may not contain code. `npm run i18n:check -- <code>` prints the keys still missing, ready to paste. A missing or empty key falls back to English, so a partial translation works.

See [#156](https://github.com/damianeickhoff/HaCasa/issues/156).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE) of this project.
