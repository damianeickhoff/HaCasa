# HaCasa v2 (legacy)

Before Nova, HaCasa was a dashboard made of [button-card](https://github.com/custom-cards/button-card) templates, themes and custom icons, configured in YAML. Version 2.1.3 was its last release; the project was archived in 2025.

That code is kept, unchanged, on the [`legacy` branch](https://github.com/damianeickhoff/HaCasa/tree/legacy), and the v2 tags and releases still point to it. It is no longer maintained.

## Moving from v2 to Nova

Nova is a new panel, not an update of the templates, so there is nothing to migrate:

1. Install Nova next to your existing dashboard ([Installation](installation.md)). They do not conflict.
2. Make sure your devices are assigned to **areas**; Nova builds its rooms from them.
3. When you are happy, remove the HaCasa v2 dashboard, its button-card templates and, if nothing else uses them, the HaCasa themes and `custom_icons`.

Thank you to everyone who used, translated, reported and contributed to HaCasa v2. 💜
