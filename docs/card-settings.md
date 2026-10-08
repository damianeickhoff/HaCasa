# Card settings

Open any card's popup and choose **⋯ → Card settings**. Changes apply right away and are listed under **Settings → Card settings**, where you can reset them.

## Per card

| setting | what it does |
|---|---|
| **Name** and **icon** | your own name and Material Design icon (`mdi:…`) |
| **Tap** and **hold** | *toggle*, *details* (the panel's popup), *Home Assistant* (Home Assistant's own dialog) or *nothing* |
| **Bottom line** | the extra row at the bottom; options depend on the card (brightness steps, colours, today, sparkline, timer, cost …) |
| **Hide parts** | hide the name, the line under it or the state |
| **Hide card** | take the card off its page |
| **Actions** | up to three of your own buttons on light, switch, sensor, fan and lock cards: a label, an icon, a service (`light.turn_on`) and JSON data |
| **Template overrides** | replace the state, the line under the name or the bottom line with a Jinja template |
| **Power sensor** | link a power sensor to a switch by hand (it then becomes a plug card) |
| **Appliance features** | for plugs with a power meter: show *busy / done*, and the threshold in watts |

## Card defaults

**Settings → Card defaults** sets the same tap, hold and bottom-line options for a whole card type at once. A setting on a single card wins over the default.

## Buttons

A small design rule runs through the panel: **round buttons pick a value** (a mode, a brightness step, a colour), **square buttons do something** (play, stop, up, down).
