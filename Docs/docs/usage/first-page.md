---
title: Your first page
layout: page
parent: Usage
nav_order: 2.1
---

# Your first page

Now, the most exciting part begins. Creating your first page. Actually we're going to edit your first page since you had to create a page while installing HaCasa. There are 2 ways to go. 

You can create multiple views for different types like lights, security, switches or livingroom, bathroom and bedroom OR you can put everything on one page. Either way, HaCasa will work just fine so its totally up to you.

If you want to use multiple views remember that the file order of the views will determain which view comes first. So for example `01-home.yaml` will be shown first and `02-lights.yaml` second. Just give your files a logical name.

## Adding cards to the view

1. **Before you start**  
Like mentioned in the installation, you need to be able to edit your files. There are a few editors out there, like Visual Studio Code. Its up to you to configure the connection.

    **Note**: YAML is very sensitive for indentation. Make sure everything you do, has the right indentation.

2. **Open your view file**

    In the guides, we asked you to create a view file called `00-default-view.yaml`. Open that file and notice that on top, you have these default lines or something similar:

    ```yaml
    title: Home
    path: "home"
    icon: fapro:house-fill
    cards:
        - type: vertical-stack
        cards:
        - type: custom:button-card
            template: hc_header_card_beta
            entity: weather.buienradar
            variables:
            air_quality_sensor: sensor.burgemeester_stolklaan_air_quality_index
            person_entity: person.damian_eickhoff
        - type: custom:button-card
            template: hc_security_card_small
            entity: alarm_control_panel.alarmo
        - type: custom:button-card
            template: hc_title_card
            name: "Welcome Home"
            label: "What are you up to"
        - type: custom:button-card
            template: hc_scene_card
            entity: input_select.scene_selector
            variables:
            icon_1: fapro:house-fill
            name_1: Home
            scene_1: scene.home
            icon_2: fapro:computer
            name_2: Work
            scene_2: scene.work
            icon_3: fapro:door-open
            name_3: Away
            scene_3: scene.away
            icon_4: fapro:moon-stars
            name_4: Night
            scene_4: scene.night      
            icon_5: fapro:clapper-open
            name_5: Movie
            scene_5: scene.movie
    ```
From here on out, we can add some cards.

3. **Add a card**

    Adding a card is really easy. For example we are going to add a light button. You just grab this code:

    ```yaml
    - type: custom:button-card
      template: hc_light_card
      entity: light.<your light entity>
    ```

    and paste it underneath the last bit of code (`scene_5: scene.movie`) already in the `00-default-view.yaml` file as shown in step 2.

4. **Refresh the page**

Now to see the change you made just go to your dashboard in Home Assistant, press the 3 dots in the right corner and press `refresh`. That it!

## Explanation

So we just added a card, and it works! Great, but how? And why? Well, HaCasa uses something called `templates` which is a part of the `custom:button-card` intergration. Practically what happends is that we already created all the cards you will see later on and the only thing you have to do, is show them on the dashboard with that piece of code you added.

Every card we create uses the `name`,`label` and `entity` values from HA itself. We use those values to fill our information we want to show by default without you thinking about it.

## Variables

Many cards are customizable by setting variables. With those variables you can set different colors or enable / disable things, like a slider. In our template list, you can see the different variables that are available for each card.