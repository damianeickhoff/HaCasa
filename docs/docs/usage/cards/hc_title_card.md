---
hide_table_of_contents: true
title: Title card / back button
layout: page
parent: Cards
---

# Title Card

The `hc_title_card` is a card that shows a title, subtitle and has the option to add 3 buttons for example scenes. The card used the default name and label parameter and variables for the extra 3 buttons.
The `hc_title_card_backbtn` is a card that shows a title and a back button. The card used the default name parameter.

## Title Card
![Title Card Light](../../../assets/images/cards/hc_title_card/titlecard_light.png)

## Back Button Card
![Backbtn Card Light](../../../assets/images/cards/hc_title_card/titlecard_backbtn_light.png)


## Usage Title

```yaml
  - type: custom:button-card
    template: hc_title_card
    name: <title>
    label: <subtitle>
    variables:
      entity1: <entity>
      entity1_name: <entity name>
```

## Usage Backbutton

```yaml
  - type: custom:button-card
    template: hc_title_card_backbtn
    name: The Climate
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| entity1 | / | No | The entity to call when the first button is pressed |
| entity2 | / | No | The entity to call when the second button is pressed |
| entity3 | / | No | The entity to call when the third button is pressed |
| entity1_name | / | No | The name of the first button |
| entity2_name | / | No | The name of the second button |
| entity3_name | / | No | The name of the third button |