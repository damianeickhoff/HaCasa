---
hide_table_of_contents: true
title: Switch Card
layout: page
parent: Cards
---

# Switch Card

With the `hc_switch_card` you can control your switch. It gives the ability to also show the power consumption and a graph.

![Switch Card Light](../../../assets/images/cards/hc_switch_card/switchcard_light.png)

## Usage

```yaml
type: custom:button-card
template: hc_switch_card
entity: <your switch entity>
```


## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| power_entity | / | No | The entity that shows the power consumption. |
| power_unit | w | No | The unit that will be shown next to the power consumption. |
| show_graph | false | No | If true, a graph will be shown as background. NOTE: It will not show if there is no Power Entity given! |
| graph_color | white | No | The color will be used for the graph. Line, fill or both. |
| show_graph_line | true | No | If true, a line will be shown in the graph. |
| show_graph_fill | false | No | If true, the graph will be filled. |
