---
title: Configuration
layout: page
parent: Installation
nav_order: 1.2
---

# Configuration

Now that we have downloaded and placed the files, its time to do some configuration.

## Load the Theme

1. Open your `configuration.yaml` file. This file is located in the root of your Home Assistant instance.
2. Add the following code to the top of your file to load frontend themes. This is a part of Home Assistant itself and not HaCasa's. Place it underneath `default_config:` if you have that.


   ```yaml
   # Load frontend themes from the themes folder
   frontend:
     themes: !include_dir_merge_named themes
   ```

4. Add the next part of code also to the `configration.yaml` to enable YAML mode for the new dashboard:

   ```yaml
   lovelace:
     mode: "storage"
     dashboards:
       hacasa-dashboard:
         mode: "yaml"
         title: HaCasa
         icon: fapro:house-fill
         show_in_sidebar: true
         filename: "dashboard/HaCasa/main.yaml"
   ```
As you can see, we load the needed intergrations and add a new dashboard called HaCasa and because we set the `mode` to `storage` (underneath `lovelace`), we don't remove any other dashboards you created with UI.

3. Save the file and **Restart** Home Assistant.

## Change the Theme

We have two teams available by default. The gold (and original) one and the new Peach theme. You can always switch later.

1. Go to your Home Assistant profile settings.
2. Change the theme to your desired theme. You can access your profile settings [here](https://my.home-assistant.io/redirect/profile).

## Create a Default View

1. Navigate to the `dashboard/HaCasa/views` folder.
2. Create a new file named `00-default_view.yaml`. This file will also be used in the examples from the [Usage](../usage) section.
3. Add the following content to the file and change the values to your entities:

   ```yaml
   title: Home
   path: "home"
   icon: fapro:house-fill
   cards:
     - type: vertical-stack
       cards:
         - type: custom:button-card
           template: hc_header_card
           entity: weather.buienradar
         - type: custom:button-card
           template: hc_title_card
           name: "Welcome Home"
           label: "What are you up to"
   ```

4. Save the file.

## Verify the Dashboard

1. Open your Home Assistant webpage.
2. Navigate to the new HaCasa dashboard.
3. Verify that the header card, alarm card and scene card are displayed correctly like the image below (based on peachy theme):
![Example view Light](/img/other/example_view_light.jpeg#light-mode-only)![Example view Dark](/img/other/example_view_light.jpeg#dark-mode-only)

If everything works as expected, you are ready to start customizing your dashboard 🎉! Explore the cards section in the menu for more options.
