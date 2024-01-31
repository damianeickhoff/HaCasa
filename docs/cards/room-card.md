---
title: Room Card
hide_table_of_contents: true
---

The `room card` is a card that can be used to navigate but also to show some information. You can add up to 3 items on the right side, like a `light entity` or a `motion entity`.

You can also show an entity on the left top side like `temperature`.

![Room Light](/img/cards/room/room.png)
![Room Dark](/img/cards/room/room-dark.png)

## Usage

```yaml
type: 'custom:button-card'
template:
  - custom_card_room
name: Bedroom
entity: sensor.bedroom_temperature
variables:
  hc_entity_1: light.bedroom
  hc_entity_2: media_player.bedroom_tv
  hc_entity_3: binary_sensor.bedroom_motion
```
<!-- markdownlint-disable MD033 -->

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_room/custom_card_room.yaml" class="template-button" target="_blank" >Template</a>
