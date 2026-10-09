# Contributing to HaCasa Nova

Thanks for wanting to help! HaCasa Nova is a beta maintained by one person, so small, focused contributions are the easiest to review.

## Where to go

- **Bug?** Open an [issue](https://github.com/damianeickhoff/HaCasa/issues/new/choose) with your Home Assistant version, browser and any red lines from the browser console (F12).
- **Question or idea?** Start a [discussion](https://github.com/damianeickhoff/HaCasa/discussions): Q&A for help, Ideas for suggestions, Show and tell for your setup.
- **Known issues** are tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158). Pick one, say in the issue that you're on it, and go.

## Development

```bash
npm install
npm run watch            # rebuilds dist/hacasa-nova.js on every change
npx http-server .. -p 8097 -c-1
# open http://localhost:8097/<this folder>/dev/index.html
```

`dev/index.html` runs the panel against a mock home; add `?lang=nl` for Dutch. More in the [development guide](https://damianeickhoff.github.io/HaCasa/development/).

## Pull requests

- Branch from `main`, keep one change per pull request.
- Run `npm run build` and commit `dist/hacasa-nova.js` with your change (CI checks that it is up to date).
- All user-visible text goes through `t()` from `src/i18n.js`, with the Dutch text as the key and an English translation in `EN`.
- Match the style of the surrounding code; no new runtime dependencies without discussing it first.
- Screenshots in the pull request help a lot for anything visual.

## Translations

All text lives in [`src/i18n.js`](src/i18n.js). To add a language: add a dictionary next to `EN`, list it in `LANGUAGES` and extend `setLang()`. See [#156](https://github.com/damianeickhoff/HaCasa/issues/156).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE) of this project.
