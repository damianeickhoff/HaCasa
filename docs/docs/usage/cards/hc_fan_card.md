---
hide_table_of_contents: true
title: Fan Card
layout: page
parent: Cards
---

# Fan Card

With the `hc_fan_card` you can control your fan. It has the option to add a oscillation button and a slider to set the speed. The fan icon has a little spinning animation.

![Climate Card Light](../../../assets/images/cards/hc_fan_card/fancard_light.png)

## Usage

```yaml
type: custom:button-card
template: hc_fan_card
entity: <fan entity>
variables:
    enable_osc_btn: true        
```
## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| enable_osc_btn | false | No | If true, the oscillation button will be shown. |
