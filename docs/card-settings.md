# Card settings

Open any card's popup and choose **⋯ → Card settings**. The form shows a **live preview** of the card on the left: every change you make is visible there before you save. Changes apply right away after **Save** and are listed under **Settings → Card settings**, where you can reset them.

A small *std* marker on a choice means that is what the card gets when you choose nothing: the built-in behaviour, or what you set under **Settings → Card defaults**. Picking the marked choice stores nothing, so the card keeps following the defaults.

## Appearance

| setting | what it does |
|---|---|
| **Name** and **icon** | your own name and Material Design icon (`mdi:…`); empty = from Home Assistant |
| **Kind** (door, window and motion cards) | door, window, motion or general; use it when a sensor has no or the wrong device class |
| **Show** | name, the line under it, the state in the corner, and the battery of the device (bottom right) |
| **Bottom** | the extra row at the bottom; the choices depend on the card (brightness steps, colours, today, graph, timer, cost …) |
| card-specific options | colour tint and colours for lights, album art and linked player for media, mode buttons for thermostats, live stream for cameras, power sensor and appliance features for plugs |

## Behaviour

**Tap** and **hold**: *toggle*, *open details* (the panel's popup), *Home Assistant dialog* or *nothing*. The preview's caption shows what the card currently does.

## Action buttons

Up to three of your own buttons on light, switch, sensor, fan and lock cards. Each has a label, an icon, a service (`light.turn_on`; the field suggests the services of your Home Assistant) and optional JSON data. When the data has no `entity_id`, the card's own entity is used. The form checks that the JSON is valid.

## Advanced

Jinja templates, rendered live by Home Assistant:

| template | what it replaces |
|---|---|
| **State** | the text in the corner |
| **Subtitle** | the line under the name |
| **Bottom** | the bottom line (instead of the choice above) |
| **Visible (condition)** | whether the card is shown at all |

The visibility condition comes in two forms:

- **Simple:** an entity, a comparison (*is*, *is not*, *greater than*, *less than*) and a value — `binary_sensor.front_door` *is* `on`, `sensor.battery` *less than* `30`.
- **Template:** a Jinja template; the card is hidden when it renders `false`, `0`, `no`, `off`, `none` or nothing.

**Show when false** inverts either. A hidden card comes back in [edit mode](rooms.md#edit-mode), dimmed with a banner, so you can always reach its settings. Template cards have the same field in their definition. (Templates need an administrator account; for other users the card is simply shown.)

## Panel cards and template cards

In edit mode a tap opens the settings of *every* card, also the panel's own (weather, agenda, scenes …): those only carry the visibility condition. A placed template card shows its **fields** here, so you can change the entity or threshold it was placed with, and its own name and icon.

## Card defaults

**Settings → Card defaults** sets the same tap, hold, bottom and show options for a whole card type at once. A setting on a single card wins over the default.

## Hiding a card

**⋯ → Hide on this page** takes a card off the page it is on; **Page settings** (hold the page title) lists hidden cards so you can bring them back.

## Buttons

A small design rule runs through the panel: **round buttons pick a value** (a mode, a brightness step, a colour), **square buttons do something** (play, stop, up, down).
