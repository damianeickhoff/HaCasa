---
hide_table_of_contents: true
title: Security Card
layout: page
parent: Cards
---

# Security Card

The `hc_security_card` is used for enabling or disabling your alarm. It's configured to set the `Arm Away`, `Arm Home` or `Disarmed`. When the alarm is triggered, the card will turn to red and the icon will flash constatly.


![Security Card Light](../../../assets/images/cards/hc_security_card/securitycard_light.png)

## Usage

```yaml
type: custom:button-card
template: hc_security_card
entity: <your_alarm_entity>
variables:
  security_code: <your_code>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| security_code | / | **Yes** | The code to arm or disarm the alarm |
| icon_color | var(--color-blue) | No | Color of the icon |
