# Theme for Home Assistant

HaCasa Nova does not need a theme. If you want the rest of Home Assistant to match, the repository includes an optional theme, [`theme/hacasa-nova.yaml`](https://github.com/damianeickhoff/HaCasa/blob/main/theme/hacasa-nova.yaml). It puts your home photo behind the sidebar, header and views, and turns cards and dialogs into the same frosted glass.

It needs [card-mod](https://github.com/thomasloven/lovelace-card-mod) (HACS) and is dark only.

## Install

1. Make sure `configuration.yaml` loads themes from a folder:

    ```yaml
    frontend:
      themes: !include_dir_merge_named themes
    ```

2. Copy `hacasa-nova.yaml` to `/config/themes/hacasa-nova/hacasa-nova.yaml`.
3. **Developer tools → YAML → Themes** (reload).
4. **Profile → Theme → HaCasa Nova**.

The theme uses `/local/images/rooms/home.jpg` as background. Change the `url()` near the top of the file to use another photo.

## Font

For the same font everywhere, add Hanken Grotesk as a dashboard resource (**Settings → Dashboards → ⋮ → Resources**), type *Stylesheet*:

```
https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700
```
