---
hide_table_of_contents: true
title: Weather Card
layout: page
parent: Cards
---

This card is still in development and might not work as expected. Any feedback is welcome in the Discord server or Github.  
**Only use it if you know what you are doing.**

The `hc_weather_card` is a somewhat multifunctional weather card. In the example beneath it shows a nice greeting, tells you some facts, shows the conditions and what the weather will be tomorrow.

Those sensors are just examples, you can use any sensor you want. The sensors I used, are custom sensors which I cannot share. But there are a lot of guides online to create your own custom sensors.


![Weather Title Card Light](../../../assets/images/cards/hc_weather_card/weathercard_light.png)

## Usage


```yaml
type: custom:button-card
template: hc_weather_card
entity: <your weather entity>
variables:
    name_entity: <sensor for greeting>
    label_entity: <sensor for facts>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| card_background | var(--weather-card-color) | No | The color of the card |
| card_text_color | var(--weather-card-text-color) | No | The color of the text |
| name_entity | "" | No | A entity for the greeting (first line of text) |
| label_entity | "" | No | A entity for the facs  (second line of text) |
| secondary_info | "" | No | A entity for the secondary info (last line of text) |
| icon_color | white | No | The color for the weather icon |
