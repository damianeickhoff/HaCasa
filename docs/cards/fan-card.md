---
hide_table_of_contents: true
title: Fan Card
---
<!-- markdownlint-disable MD033 -->
The `Fan Card` is a modified `light card` turning on and off your `fan entity`. It also provides a toggle for turning on and off the oscillation of the fan.

![Fan Light](/img/cards/fan/fan.png)
![Fan Small Dark](/img/cards/fan/fan-small-dark.png)
![Fan Dark](/img/cards/fan/fan-dark.png)

## Usage

```yaml
type: "custom:button-card"
entity: fan.whisper_flex
template:
  - custom_card_fan
```

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_fan/custom_card_fan.yaml" class="template-button" target="_blank" >Template</a>
