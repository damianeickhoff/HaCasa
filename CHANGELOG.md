# Changelog

## 3.0.0 · HaCasa Nova

The HaCasa reboot. A complete rewrite as a Home Assistant panel, built on the [Homio](https://github.com/iamtherufus/Homio) design by iamtherufus. Nothing from v2 carries over; v2 lives on the [`legacy`](https://github.com/damianeickhoff/HaCasa/tree/legacy) branch.

- One file, `hacasa-nova.js`, usable as a sidebar panel (`panel_custom`) or as a dashboard card (`custom:hacasa-nova-card`). No other frontend dependencies.
- Rooms built from Home Assistant areas, with photos, temperature and humidity.
- Home view with greeting, weather, notification line, status pills, quick actions and home cards.
- Cards for lights, switches, smart plugs, power strips, appliances, media, climate, covers, fans, locks, vacuums, humidifiers, sensors, cameras, groups, scenes, light scene presets and Jinja template cards.
- Built-in Sensors, Energy, Automations, Cameras and System pages.
- Setup wizard, settings page and per-card settings, stored per Home Assistant user.
- Search, presence, alarm keypad, doorbell camera popup, modes, idle screen.
- English and Dutch.
