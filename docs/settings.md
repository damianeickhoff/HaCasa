# Settings

Open **More → Panel settings**. Changes are a draft until you press **Save**; **Reset everything** clears all settings of the current user. Settings are stored per Home Assistant user.

![Settings](assets/screenshots/settings.png)

| tab | what you set there |
|---|---|
| **General** | export and import the settings file, language, title, navigation per room or per floor, photo paths, media background, light scenes on or off, idle screen, battery limit for Attention, run the setup wizard, make the panel Home Assistant's start page |
| **Pages** | per page: title, photo, which cards and in which order, notification lines and your own lines |
| **Card defaults** | tap, hold and the bottom line per card type (lights, switches, plugs, sensors …) |
| **Rooms** | which areas are rooms and their order in the navigation |
| **Home page** | temperature and humidity sensors for the header, weather, climate, alarm, scenes, media cards |
| **Quick actions** | the buttons under the greeting: scene, script, toggle, all lights off, media off, with optional confirmation |
| **Motion & doorbell** | which motion sensors drive the motion bar; doorbell triggers and the camera that pops up |
| **Calendar & waste** | calendars for the agenda card and notification line; waste sensors and their labels |
| **Energy** | power, consumption, solar return, gas and the price per kWh |
| **Groups** | cards that combine several lights, switches or plugs |
| **Template cards** | your own cards with Jinja templates |
| **More menu** | your own links next to the built-in pages |
| **Modes** | guest, vacation and other modes linked to an `input_boolean` or switch |
| **Card settings** | every card you changed, with a reset per card |

## Settings file

**General → Settings file → Export** downloads all settings of the current user as JSON. **Import** merges such a file (or a starter `config.json`) into the current settings. Use it to copy a setup to another household member or another Home Assistant.

## Starter config for the card

When you use the [dashboard card](installation.md#2b-dashboard-card), its `config:` block works as a shared starting point for every user. Keys:

| key | meaning |
|---|---|
| `title` | title top left |
| `language` | `en` or `nl` (leave out to follow Home Assistant) |
| `rooms` | `auto` or a list of area ids or names, in navigation order |
| `roomImage`, `homeImage` | photo paths; `{slug}` is replaced by the room name |
| `home.weather`, `home.climate`, `home.alarm` | entity ids for the home view |
| `home.temperature`, `home.humidity` | sensors for the header (default: average of the rooms) |
| `home.scenes` | list of scene ids |
| `home.waste` | list of `{entity, label}` |
| `home.energy` | `{power, today, returned, gas}` sensor ids |
| `home.lowBattery` | battery percentage that counts as low (default 20) |
| `more` | extra links: `{label, sub, icon, path}` |

Anything a user sets in the panel wins over the card config.
