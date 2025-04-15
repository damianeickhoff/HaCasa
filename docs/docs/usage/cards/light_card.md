---
title: Light Card
layout: page
parent: Cards
---

# HC Light Card
The `hc_light_card` is used to turn on and off a light. You have the option to show or hide the bightness slider.


![light Card Light](../../../assets/images/cards/hc_light_card/lightcard_light.png)

## Usage

```yaml
    type: custom:button-card
    template: hc_light_card
    entity: <your light entity>
    variables:
        enable_slider: True
```
**Remember to take care of indentation**
## Variables

| Variable | Default | Required | Description|
|:----------|:---------|:----------|:------------|
| enable_slider | False | No | Show or hide the brightness slider|
| card_color | var(--color-orange) | No | The color of the card |

