---
hide_table_of_contents: true
title: Glance card
layout: page
parent: Cards
---

# Glance Card

The `hc_glance_card` is used to display a summary of your entities. It's configured to show the state of the entity and the icon.
You can add minimun 1 and maximum 3 entities. The card will automatically adjust the placement of the entities.

**Note: The card will show the name you have given the entity. If you want to change the name, you must do this in the entity configuration from HA self.**

![Glance Card Light](../../../assets/images/cards/hc_glance_card/glancecard_light.png)

## Usage


```yaml
  - type: custom:button-card
    template: hc_glance_card
    variables:
        entity1: <Your sensor>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| entity1 | / | **Yes** | add the first entity to the card|
| entity2 | / | No | add the second entity to the card|
| entity3 | / | No | add the third entity to the card|
| entity1_icon | Icon from entity itself | No | replace the icon for the first entity |
| entity2_icon | Icon from entity itself | No | replace the icon for the second entity |
| entity3_icon | Icon from entity itself | No | replace the icon for the third entity |
| entity1_icon_color: | var(--text) | No | The color of the first icon |
| entity2_icon_color: | var(--text) | No | The color of the second icon |
| entity3_icon_color: | var(--text) | No | The color of the third icon |
