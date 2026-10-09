<div align="center">

<img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/logo/hacasa-banner.svg" alt="HaCasa" width="280">

# HaCasa Nova

**The HaCasa reboot.** A room-first Home Assistant panel, built on the [Homio](https://github.com/iamtherufus/Homio) design by [iamtherufus](https://github.com/iamtherufus).

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5?style=flat-square)](https://hacs.xyz/docs/faq/custom_repositories/)
[![Release](https://img.shields.io/github/v/release/damianeickhoff/HaCasa?style=flat-square&label=release)](https://github.com/damianeickhoff/HaCasa/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.4%2B-18BCF2?style=flat-square)](https://www.home-assistant.io/)
[![License](https://img.shields.io/github/license/damianeickhoff/HaCasa?style=flat-square)](https://github.com/damianeickhoff/HaCasa/blob/main/LICENSE)

[Documentation](https://damianeickhoff.github.io/HaCasa/) · [Demo video](https://damianeickhoff.github.io/HaCasa/#demo) · [Install](#install) · [Discussions](https://github.com/damianeickhoff/HaCasa/discussions) · [Screenshots](#screenshots) · [HaCasa v2 (legacy)](https://github.com/damianeickhoff/HaCasa/tree/legacy)

<a href="https://damianeickhoff.github.io/HaCasa/#demo"><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/demo/poster-play.webp" alt="HaCasa Nova: watch the 40-second demo" width="100%"></a>

<sub>▶ Click to watch the 40-second demo</sub>

</div>

> ⚠️ **HaCasa Nova is a work in progress and needs testing.** This first release has only been run on a handful of homes, so expect rough edges: things may break or change between versions. Try it next to your current dashboard rather than replacing it, and please [report what you run into](https://github.com/damianeickhoff/HaCasa/issues/new/choose). Known issues are tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158).

## Why a reboot?

HaCasa started as a set of button-card templates: a calm, good-looking dashboard that the whole household could use. It grew to almost 500 stars, and then it stalled, because every new device meant more YAML and every Home Assistant update risked breaking a template.

**HaCasa Nova** keeps the idea and throws out the YAML. It is a single JavaScript file that reads your home straight from Home Assistant:

- **Your areas become rooms.** Every entity assigned to an area (directly or through its device) shows up on that room's page. Add a lamp in Home Assistant and it appears; no dashboard to edit.
- **Everything is set up in the panel.** A four-step wizard on first open, then a settings page with tabs. Settings are stored per Home Assistant user, so they follow you to every device and survive updates.
- **No dependencies.** No button-card, card-mod, layout-card or theme required.

The look comes from [Homio](https://github.com/iamtherufus/Homio) by iamtherufus: big photo backgrounds, frosted-glass cards, a pill navigation and a lot of breathing room. Nova rebuilds that design as a native panel and adds HaCasa's focus on being friendly for everyone in the house.

## Features

| | |
|---|---|
| **Home view** | Greeting, date, indoor climate, weather with hourly forecast, a rotating line of things worth knowing (waste pickup, open doors, appointments), status pills and quick actions. |
| **Room pages** | One page per area with a photo, its temperature and humidity, and a scrolling strip of cards. Swipe or scroll between rooms. |
| **Cards** | Lights (vertical dimmer, brightness steps or colour dots), switches and smart plugs (live watts, kWh today, timers), media with artwork and transport, covers, thermostats (drag rail, modes, presets), fans, locks, vacuums, humidifiers, cameras, appliances (Home Connect, Miele …: programme, progress, finish time), groups, scenes and Jinja template cards. |
| **Pages** | Sensors (attention first, per room or per kind, trend bars), Energy (today per hour, biggest consumers), Automations (toggle, errors, last run), Cameras and System (CPU, memory, disk, network, updates). |
| **Attention** | Unavailable devices, low batteries, pending updates and persistent notifications in one place, with one-tap install for updates. |
| **Popups** | Every card opens a detailed popup: brightness, colour and colour temperature, climate modes, media volume, history of the last 24 hours, and a shortcut to Home Assistant's own dialog. |
| **Per-card settings** | Name, icon, tap and hold behaviour, bottom line, custom action buttons and template overrides per card, plus defaults per card type. |
| **Extras** | Search, presence pill, alarm keypad, doorbell camera popup, light scene presets per room, guest and vacation modes, idle screen, Dutch and English. |
| **Phone and tablet** | Built for wall tablets and phones alike: the strip becomes a two-column grid on phones. |

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/room.png" alt="Room page"><br><sub><b>Room page</b> · photo, climate and a strip of cards</sub></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/kitchen.png" alt="Kitchen"><br><sub><b>Appliances and plugs</b> · power strips, dishwasher programme and progress</sub></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/popup-light.png" alt="Light popup"><br><sub><b>Light popup</b> · brightness, colour and colour temperature</sub></td>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/popup-climate.png" alt="Climate popup"><br><sub><b>Climate popup</b> · target, modes, presets, every room's temperature</sub></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/sensors.png" alt="Sensors page"><br><sub><b>Sensors</b> · attention first, then every room</sub></td>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/energy.png" alt="Energy page"><br><sub><b>Energy</b> · now, today per hour, biggest consumers</sub></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/settings.png" alt="Settings"><br><sub><b>Settings</b> · everything in the panel, stored per user</sub></td>
    <td><img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/wizard.png" alt="Setup wizard"><br><sub><b>First run</b> · a four-step setup</sub></td>
  </tr>
</table>

<img src="https://raw.githubusercontent.com/damianeickhoff/HaCasa/main/docs/assets/screenshots/phones.png" alt="HaCasa Nova on phones" width="100%">

## Install

You need Home Assistant **2024.4 or newer**. HaCasa Nova can run as its own sidebar panel (recommended) or as a card inside a dashboard.

### 1. Download with HACS

1. Open **HACS** in Home Assistant.
2. Open the menu (⋮, top right) and choose **Custom repositories**.
3. Add `https://github.com/damianeickhoff/HaCasa` with type **Dashboard**.
4. Search for **HaCasa Nova**, open it and choose **Download**.
5. Reload your browser when HACS asks.

<details>
<summary>Manual download (without HACS)</summary>

1. Download `hacasa-nova.js` from the [latest release](https://github.com/damianeickhoff/HaCasa/releases/latest).
2. Copy it to `/config/www/hacasa-nova/hacasa-nova.js`.
3. Use `/local/hacasa-nova/hacasa-nova.js` wherever the steps below say `/hacsfiles/HaCasa/hacasa-nova.js`.

</details>

### 2a. Add it as a sidebar panel (recommended)

Add this to `configuration.yaml` and restart Home Assistant:

```yaml
frontend:
  extra_module_url:
    - /hacsfiles/HaCasa/hacasa-nova.js   # loads the HaCasa logo icon for the sidebar

panel_custom:
  - name: hacasa-nova
    url_path: hacasa
    sidebar_title: HaCasa
    sidebar_icon: hacasa:logo
    module_url: /hacsfiles/HaCasa/hacasa-nova.js
```

**HaCasa** now appears in the sidebar with the HaCasa logo. Open it and the setup wizard starts.

> 💡 Already have a `frontend:` section (for themes, for example)? Add `extra_module_url` to it instead of adding a second one. Without `extra_module_url` the panel still works; use `sidebar_icon: mdi:home-outline` then, because the logo icon only loads once the panel has been opened.

The icon works everywhere Home Assistant takes an icon, so `hacasa:logo` can also be used on your own cards.

### 2b. Or use it as a dashboard card (no YAML)

HACS registers the file as a dashboard resource for you. Then:

1. **Settings → Dashboards → Add dashboard → New dashboard from scratch**, then open it.
2. Edit the dashboard, change the view type to **Panel (single card)**.
3. Add a card of type **HaCasa Nova** (or paste the YAML below).

```yaml
type: custom:hacasa-nova-card
```

Inside a card the rooms are routed through the URL hash (`#/kitchen`), so the dashboard URL itself never changes.

### 3. Add room photos (optional)

Put a photo per room in `/config/www/images/rooms/`, named after the area: `Living room` → `living-room.jpg` (`.jpeg`, `.png` and `.webp` work too). The home view uses `home.jpg`. You can also set a picture on the area in Home Assistant, or choose a photo per page in the panel settings. Rooms without a photo get a calm gradient.

That's it. Everything else lives in the panel: **More → Panel settings**.

> 💡 **For the best experience**, make HaCasa Nova your start page and hide Home Assistant's sidebar. Both are one click per user; see [Best experience](https://damianeickhoff.github.io/HaCasa/best-experience/) in the docs, which also has tips for wall tablets.

## Documentation

The full guide is at **[damianeickhoff.github.io/HaCasa](https://damianeickhoff.github.io/HaCasa/)**: installation, the setup wizard, every card and its settings, the built-in pages, the optional theme for the rest of Home Assistant, and troubleshooting.

## Good to know

- **Admin features.** Template cards and your own ticker lines use Home Assistant's template renderer, installing updates calls `update.install`, and the System page asks the Supervisor for host info. These need an administrator account; for other users those parts stay empty.
- **Fonts.** The panel uses [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) from Google Fonts. Without internet access it falls back to the system font.
- **Languages.** English and Dutch, following your Home Assistant language. Other languages fall back to English. Translations are welcome: see [`src/i18n.js`](https://github.com/damianeickhoff/HaCasa/blob/main/src/i18n.js).

## Community

- **Questions and help:** [Discussions → Q&A](https://github.com/damianeickhoff/HaCasa/discussions/categories/q-a)
- **Show your setup:** [Discussions → Show and tell](https://github.com/damianeickhoff/HaCasa/discussions/categories/show-and-tell)
- **Ideas:** [Discussions → Ideas](https://github.com/damianeickhoff/HaCasa/discussions/categories/ideas)
- **Bugs:** [open an issue](https://github.com/damianeickhoff/HaCasa/issues/new/choose); known issues are in [#158](https://github.com/damianeickhoff/HaCasa/issues/158)
- **Want to help?** See [CONTRIBUTING.md](https://github.com/damianeickhoff/HaCasa/blob/main/CONTRIBUTING.md)

## HaCasa v2 (legacy)

The original button-card based HaCasa is kept on the [`legacy`](https://github.com/damianeickhoff/HaCasa/tree/legacy) branch, with its releases up to v2.1.3. It is no longer maintained.

## Development

```bash
npm install
npm run watch            # rebuilds dist/hacasa-nova.js on every change
npx http-server .. -p 8097 -c-1
# open http://localhost:8097/<this folder>/dev/index.html
npm run deploy:dev       # a dev panel in your own Home Assistant, next to the HACS one
```

`dev/index.html` runs the panel outside Home Assistant against a mock home (`dev/mock-hass.js`); add `?lang=nl` for Dutch. `dev/card.html?fresh` shows the card wrapper with the first-run wizard. Icons are drawn by `dev/make-icons.mjs` and inlined into the bundle by `build.mjs`. See the [development guide](https://damianeickhoff.github.io/HaCasa/development/) for more.

## Credits

- **Design:** [Homio](https://github.com/iamtherufus/Homio) by [iamtherufus](https://github.com/iamtherufus). HaCasa Nova would not look the way it does without it.
- **HaCasa:** created by [Damian Eickhoff](https://github.com/damianeickhoff). HaCasa logo by [Fredrik Persson](https://github.com/fredrikpersson92).
- **Built with** [Lit](https://lit.dev). Icons are original, drawn for this project.
- **Made with AI assistance.** HaCasa Nova was written together with an AI coding assistant ([Claude Code](https://claude.com/claude-code)). The design decisions, the testing and the maintenance are mine; much of the code was written by the AI under my direction, which is why you'll see it credited in the commit history. It is also what made bringing HaCasa back possible at all.
- **And the community**, who kept asking about HaCasa long after it went quiet. This one is for you. 💜

## License

[MIT](https://github.com/damianeickhoff/HaCasa/blob/main/LICENSE). The Homio design credit and the license notices of what is bundled are in [NOTICE.md](https://github.com/damianeickhoff/HaCasa/blob/main/NOTICE.md).
