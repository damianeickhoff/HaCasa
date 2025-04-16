---
hide_table_of_contents: true
title: Header card
layout: page
parent: Cards
---

The `hc_header_card` is used on top of your dashboard. 

The header card will always show the weather conditions and the date. Its possible to hide the air quality and person when you don't use that variable.

![Header Card Light](../../../assets/images/cards/hc_header_card/headercard_light.png)

## Usage

```yaml
    - type: custom:button-card
      template: hc_header_card
      entity: weather.buienradar
      variables:
        air_quality_sensor: sensor.<airqualitysensor>
        person_entity: person.<person>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| entity | / | **Yes** | Needed for the weather condition |
| person_entity | / | No | Needed for the person card |
| air_quality_sensor | / | No | The entity for air quality|
