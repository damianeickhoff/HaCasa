---
order: 1
title: Configuration
hide_table_of_contents: true
---
<!-- markdownlint-disable MD033 -->

Now you've downloaded and uploaded all the nesesarry files we need to change some configuration to make this all work.

## Theme

To load the theme file, you will need to add this line to your `configuration.yaml`

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

This is not only needed for the HaCasa theme, but just any custom theme you want to use.

After that, you will need to add the following code to your `configuration.yaml`:

```yaml
lovelace:
  mode: "storage"
  resources:
    - url: "/hacsfiles/button-card/button-card.js"
      type: "module"
    - url: "/hacsfiles/my-cards/my-cards.js"
      type: "module"
    - url: "/hacsfiles/Bubble-Card/bubble-card.js"
      type: "module"
    - url:  "/hacsfiles/mini-graph-card/mini-graph-card-bundle.js"
      type: "module"
    - url:  "/hacsfiles/lovelace-mushroom/mushroom.js"
      type: "module"
    - url: "/hacsfiles/kiosk-mode/kiosk-mode.js"
      type: module
    - url: "/hacsfiles/decluttering-card/decluttering-card.js"
      type: module
    - url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
      type: css
  dashboards:
    HaCasa:
      mode: "yaml"
      title: HaCasa
      icon: mdi:script
      show_in_sidebar: true
      filename: "dashboard/HaCasa/main.yaml"
```

Restart your Home Assistant and after it booted up, you should see a new dashboard in the menu with the name `HaCasa`.

Its also important that you change the theme in your HA profile. You can do that [here](https://my.home-assistant.io/redirect/profile).

## UI Mode <span class="badge">Not Supported</span>

Home Assistant doens't allow to include folders and files in the UI-Mode. Therefore it can't be used with the structure HaCasa uses. You could add the templates manually to the raw config, but this is not recommended and thus we can't support that way of using HaCasa.
