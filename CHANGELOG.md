# Changelog

## 3.0.2

- The README now displays properly inside HACS: one logo image that reads on light and dark backgrounds instead of a light/dark switch HACS cannot show, plain notes instead of GitHub-only alert boxes, and absolute links.

## 3.0.1

The HaCasa logo is back ([#159](https://github.com/damianeickhoff/HaCasa/issues/159)).

- The original HaCasa logo by Fredrik Persson is used again: in the panel (top left), the README and the docs site.
- New icon `hacasa:logo`, registered by the panel, for the sidebar (`sidebar_icon: hacasa:logo`) or anywhere else Home Assistant takes an icon. Load the file with `frontend: extra_module_url` so the icon is there at startup; see the [installation guide](https://damianeickhoff.github.io/HaCasa/installation/#2a-sidebar-panel).

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

### Known issues

Tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158). The main ones:

- Template cards, your own notification lines and the System page's host info need an administrator account; for other users they stay empty without a hint ([#144](https://github.com/damianeickhoff/HaCasa/issues/144)).
- The font is loaded from Google Fonts ([#145](https://github.com/damianeickhoff/HaCasa/issues/145)).
- Automatic room mode shows at most 9 rooms ([#146](https://github.com/damianeickhoff/HaCasa/issues/146)).
- Built-in page addresses are Dutch (`/instellingen`, `/sensoren` …) and an area with the same name can't be opened ([#147](https://github.com/damianeickhoff/HaCasa/issues/147)).
- The dashboard card only works in a Panel view ([#148](https://github.com/damianeickhoff/HaCasa/issues/148)).
- Rooms without a photo cause a burst of 404s in the browser console ([#149](https://github.com/damianeickhoff/HaCasa/issues/149)).
- The plug timer runs in the browser and stops when the panel closes ([#150](https://github.com/damianeickhoff/HaCasa/issues/150)).
