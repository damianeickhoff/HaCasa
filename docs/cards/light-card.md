---
icon: light-bulb
title: Light Card
hide_table_of_contents: true
---

The `light-card`, used for a light entity, displays the current state and brightness (if available). Its uses a slider where you can set the brightness with. It hides the slider if the state is off.

![Light](/img/cards/light/light.png)
![Light Dark](/img/cards/light/light-dark.png)

## Usage

```yaml
type: "custom:button-card"
entity: light.bedroom
label: Bedroom
template:
  - custom_card_light
```
<!-- markdownlint-disable MD033 -->

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_light/custom_card_light.yaml" class="template-button" target="_blank" >Template</a>
