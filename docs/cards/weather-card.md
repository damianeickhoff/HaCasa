---
icon: cloud
hide_table_of_contents: true
title: Weather Card
---
<!-- markdownlint-disable MD033 -->
The weather card shows you the current outside temperature with a matching image depending on the weather state. Those images are all animated and are included in this theme. They are made by [Bas Milius](https://bas.dev/work/meteocons).

The card also shows the rain anticipation but later on it will be customizable.

![Weather card with forecast](/img/cards/weather/weather-forecast-card.png)
![Weather card without forecast](/img/cards/weather/weather-card.png)

## Variables

Variable   | Default | Notes
---    | ---     | ---
hc_enable_forecast | true    | Toggle the forecast view

## Usage <span class="badge-warning">Not Ready Yet</span>

```yaml
type: custom:button-card
template:
  - custom_card_weather_forecast
variables:
  hc_enable_forecast: true
name: '[[[ return states["sensor.round_temp_outside"].state + " °C"]]]'
entity: weather.home
tap_action:
  action: navigate
  navigation_path: 'weather'
```

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_weather/custom_card_weather_forecast.yaml" class="template-button" target="_blank">Template</a>
