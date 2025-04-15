---
hide_table_of_contents: true
title: Header card
layout: page
parent: Cards
---

import CodeBlock from '@theme/CodeBlock';
import MyComponentSource from '!!raw-loader!/dashboard/HaCasa/templates/hc_header_card.yaml';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `hc_header_card` is used on top of your dashboard. It provides a button to navigate to the HA menu, a button to enable your alarm and a button for a person. 
The last two buttons will change color depending the state.

![Header Card Light](../../../assets/images/cards/hc_header_card/headercard_light.png)

## Usage

```yaml
type: custom:button-card
template: hc_header_card
variables:
  security_entity: <your alarm entity>
  person_entity: <your person entity>
  person_name: <Name>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| security_entity | / | **Yes** | Needed for the security card |
| person_entity | / | **Yes** | Needed for the person card |
| person_name | / | No | The name of the person (like a abbreviation) |
