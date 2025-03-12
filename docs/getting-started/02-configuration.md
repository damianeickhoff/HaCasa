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
# Load frontend themes from the themes folder
frontend:
  themes: !include_dir_merge_named themes
```

This is needed to load custom themes in HomeAssistant (like HaCasa's).

## Resources and YAML mode

To use HaCasa, we need to add resources and add a YAML-Mode dashboard. That means that you can't change this dashboard through the UI, but only through YAML. So, add the following code to your `configuration.yaml`:

```yaml
lovelace:
  mode: "yaml"
  resources:
    - url: "/hacsfiles/button-card/button-card.js"
      type: "module"
    - url: "/hacsfiles/my-cards/my-cards.js"
      type: "module"
    - url: "/hacsfiles/lovelace-card-mod/card-mod.js"
      type: module   
    - url: "/hacsfiles/mini-graph-card/mini-graph-card-bundle.js"
      type: module     
    - url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
      type: css
  dashboards:
    hacasa-dashboard:
      mode: "yaml"
      title: HaCasa
      icon: mdi:home
      show_in_sidebar: true
      filename: "dashboard/HaCasa/main.yaml"
```

Save the file, restart Home Assistant and boom💥, you should be done.
Also, don't forget to change the theme to HaCasa in your HA Profile. You can do that [here](https://my.home-assistant.io/redirect/profile).

To actually enjoy the new dashboard, you will need to create at least one view. You can do this in the folder `dashboard/HaCasa/views`. For example, we can create a file called `00-default_view.yaml`. This file will be the first page, because it will be loaded first (because of the `00`).

When you created the file, you can add this to the content:

```yaml
title: Home
path: "home"
cards:
  - type: vertical-stack
    cards:
    - type: custom:button-card
      template: hc_header_card
      variables:
        security_entity: <your alarm entity>
        person_entity: <your person entity>
    - type: custom:button-card
      template: hc_glance_card
      variables:
          entity1: <your first entity>
          entity2: <your second entity>
          entity3: <your third entity>
```

Now when you go to your HomeAssistant webpage, you should see a new dashboard called HaCasa. If you open that dashboard, you would see a header card and a glance card.

![alt text](/img/other/example_view.png#light-mode-only)

If everything works as expected, you are ready to configure your dashboard 🥳! You can find our other cards in the cards section in the menu on the left!
