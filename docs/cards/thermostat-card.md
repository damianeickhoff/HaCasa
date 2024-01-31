---
icon: flame
hide_table_of_contents: true
title: Thermostat Card
---
The `thermostat-card`, used for a climate entity, displays the current temperature (if available) and the set temperature. With the buttons on the right the temperature can be set higher or lower.

![Thermostat Light](/img/cards/thermostat/thermostat.png)
![Thermostat Dark](/img/cards/thermostat/thermostat-dark.png)

## Usage

```yaml
type: custom:button-card
template: custom_card_climate
entity: climate.hvac
```
<!-- markdownlint-disable MD033 -->

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_climate/custom_card_climate.yaml" class="template-button" target="_blank" >Template</a>
