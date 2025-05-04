---
hide_table_of_contents: true
title: Scene card
layout: page
parent: Cards
---

# Scene card

Adds the scenes card. It switches between the scenes you selected. For now, it has to have 5 scenes. This will be updated in the next releases.

![Navigation bar Card](../../../assets/images/cards/hc_scene_card/scenecard_light.png)

## Usage

### Input selector needed
This card used an input selector to determine which scene is active. It does this based on the id of your scene. It's important that the options you add to the input selector have the same id as the scene you give in the card.

For example:

```json
{
  "key": "input_select",
  "data": {
    "items": [
      {
        "id": "scene_selector",
        "name": "scene_selector",
        "options": [
          "scene.home",
          "scene.work",
          "scene.away",
          "scene.night",
          "scene.movie"
        ]
      }
    ]
  }
}
```

You'll also need an automation to change the scene when the input selector changes. For example:

```yaml
- alias: Scene selector
  triggers:
  - trigger: state
    entity_id:
    - input_select.scene_selector
  actions:
  - action: scene.turn_on
    data:
      entity_id: '{{ trigger.to_state.state }}'
  mode: restart
```

There are a lot of guides online on how to do this.

### View code

```yaml
  - type: custom:button-card
    template: hc_scene_card
    entity: input_select.scene_selector # Create this one yourself!
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

## Variables

| Variable | Default | Required | Description                                                                                     |
|----------|---------|----------|-------------------------------------------------------------------------------------------------|
| icon_1 | '' | Yes | Icon for first item                                                                             |
| scene_1 | '' | Yes | Scene entity first item (`scene.x`), needs to be the same as a scene option in `input_selector` |
| name_1 | '' | Yes | Name of first item                                                                              |
| icon_2 | '' | Yes | Icon for second item                                                                            |
| scene_2 | '' | Yes | Scene entity second item (`scene.x`), needs to be the same as a scene option in `input_selector` |
| name_2 | '' | Yes | Name of second item                                                                             |
| icon_3 | '' | Yes | Icon for third item                                                                             |
| scene_3 | '' | Yes | Scene entity third item (`scene.x`), needs to be the same as a scene option in `input_selector` |
| name_3 | '' | Yes | Name of third item                                                                              |
| icon_4 | '' | Yes | Icon for forth item                                                                             |
| scene_4 | '' | Yes | Scene entity forth item (`scene.x`), needs to be the same as a scene option in `input_selector` |
| name_4 | '' | Yes | Name of forth item                                                                              |
| icon_5 | '' | Yes | Icon for fifth item                                                                             |
| scene_5 | '' | Yes | Scene entity fifth item (`scene.x`), needs to be the same as a scene option in `input_selector` |
| name_5 | '' | Yes | Name of fifth item                                                                              |
