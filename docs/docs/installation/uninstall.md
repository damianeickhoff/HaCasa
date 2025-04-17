---
title: Uninstall
layout: page
parent: Installation
nav_order: 1.5
---

# Uninstall

In some rare cases, you might want to uninstall the theme. Well, here are the instructions for that!

1. Go to the root folder of your Home Assistant and remove the folder `dashboard` or, if you have multiple dashboards, remove the `HaCasa` folder inside of there.
2. Remove, underneath the `themes` folder the `HaCasa` folder.
3. Remove the `custom_icons` folder.
4. Remove the `hacasa_img` folder inside `www`.
5. In your `configuration.yaml` file, make sure this part is gone:

   ```yaml
   hacasa-dashboard:
     mode: "yaml"
     title: HaCasa
     icon: mdi:home
     show_in_sidebar: true
     filename: "dashboard/HaCasa/main.yaml"
   ```

6. If you want to remove the whole yaml-mode part, make sure this is gone too:

   ```yaml
   lovelace:
     mode: "storage"
     resources:
       ...
     dashboards:
       hacasa-dashboard:
           mode: "yaml"
           title: HaCasa
           icon: mdi:home
           show_in_sidebar: true
           filename: "dashboard/HaCasa/main.yaml"
   ```

7. That was it, you just uninstalled HaCasa. Time to install it again 😄
