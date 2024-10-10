---
order: 1
title: Configuration
hide_table_of_contents: true
---
<!-- markdownlint-disable MD033 -->

Now that you've downloaded and uploaded all the necessarry files, we need to change some configuration to make this all work.

## Theme

To load the theme file, you will need to add this line to your `configuration.yaml`

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

This is needed to load custom themes (like HaCasa's).

## UI Mode <span class="badge-warning">Not Supported</span>

Home Assistant does not allow you to `!include` folders and files in the UI-Mode. Therefore it can not be used with the template structure HaCasa uses. You can technically add the templates manually to the raw config, but this is not recommended and thus we can not support that way of using HaCasa. Also, only do this if you want to feel miserable 🥲.

## Resources and YAML mode

To use HaCasa, we need to add resources and add a YAML-Mode dashboard. That means that you can't change this dashboard through the UI, but only through YAML. So, add the following code to your `configuration.yaml`:

```yaml
lovelace:
  mode: "storage"
  resources:
    - url: "/hacsfiles/button-card/button-card.js"
      type: "module"
    - url: "/hacsfiles/my-cards/my-cards.js"
      type: "module"
    - url: "/hacsfiles/kiosk-mode/kiosk-mode.js"
      type: module
    - url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
      type: css
  dashboards:
    hacasa-dashboard:
      mode: "yaml"
      title: HaCasa
      icon: mdi:script
      show_in_sidebar: true
      filename: "dashboard/HaCasa/main.yaml"
```

Save the file, restart Home Assistant and boom💥, you should be done.
Also, don't forget to change the theme to HaCasa in your HA Profile. You can do that [here](https://my.home-assistant.io/redirect/profile).

Now, when everything is done, you should see a demo page with a few cards as example. Check out our cards and make it your own.
