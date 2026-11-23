# Theme for Home Assistant

HaCasa Nova does not need a theme. If you want the rest of Home Assistant to match, the repository includes an optional theme, [`theme/hacasa-nova.yaml`](https://github.com/damianeickhoff/HaCasa/blob/main/theme/hacasa-nova.yaml). It puts your home photo behind the sidebar, header and views, and turns cards and dialogs into the same frosted glass.

It is dark only. [card-mod](https://github.com/thomasloven/lovelace-card-mod) (HACS) is optional:

- **Without card-mod** the photo is behind your dashboards (Home Assistant's own `lovelace-background`), and cards are a darker, more solid glass, because nothing blurs behind them.
- **With card-mod** the photo also runs behind the sidebar and header, and cards and dialogs are blurred glass.

## Install

1. Make sure `configuration.yaml` loads themes from a folder:

    ```yaml
    frontend:
      themes: !include_dir_merge_named themes
    ```

2. Copy `hacasa-nova.yaml` to `/config/themes/hacasa-nova/hacasa-nova.yaml`.
3. **Developer tools → YAML → Themes** (reload).
4. **Profile → Theme → HaCasa Nova**.

## Your photo

The theme uses `/local/images/rooms/home.jpg` (the file `/config/www/images/rooms/home.jpg`), the same photo the panel uses for the home page by default. To use another one, change `hacasa-photo` at the top of the theme and reload themes:

```yaml
  hacasa-photo: "url('/local/images/my-photo.jpg')"
```

Both the card-mod and the plain version use it. A background you set on a single view in the dashboard still wins on that view.

## Font

For the same font everywhere, add Hanken Grotesk as a dashboard resource (**Settings → Dashboards → ⋮ → Resources**), type *Stylesheet*:

```
https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700
```
