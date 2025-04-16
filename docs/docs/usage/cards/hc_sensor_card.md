---
hide_table_of_contents: true
title: Sensor Card
layout: page
parent: Cards
---

# Sensor Card

The `hc_sensor_card` is used to view the state of a sensor or binary sensor. It's configured to show the state of the sensor and the last updated time.

![Sensor Card Light](../../../assets/images/cards/hc_sensor_card/sensorcard_light.png)

## Usage

```yaml
  - type: custom:button-card
    template: hc_sensor_card
    entity: <sensor or binary sensor>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| card_color | var(--color-blue) | No | Color for the card when state is on |
