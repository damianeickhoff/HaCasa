# Changelog

## Unreleased

- **Edit mode:** administrators pick **More → Edit room** (or *Edit home view*), or hold the page title. The strip then shows every card of the page: drag a card by its grip to reorder, × hides it, hidden cards stay in the row dimmed with an eye to bring them back, a tap opens the card settings, and an **Add card** tile sits at the end. *Done* in the bar at the bottom (the bottom nav on phones) leaves edit mode. This replaces the up/down list in Page settings for ordering.
- **Add card:** from edit mode, add any light, switch, sensor, media player, cover, thermostat, lock, fan, camera… to the home view or a room. Entities without an area come first, entities from other rooms carry their room name. By default the card is added in HaCasa only (`pages[room].add`); administrators can instead move the entity's area in Home Assistant. A plain sensor becomes a **value card**: the number large, the name under it, the last change at the bottom; a tap opens its details. Groups, graphs and template cards start from the same tile and land in their settings tab with the room filled in.
- **Card settings redone:** a live preview of the card next to the form, so every change shows before you save; settings grouped under Appearance, Behaviour, Action buttons and Advanced; choices as buttons with a *std* marker for what the Card defaults give you; action buttons as one row each with a service picker and a JSON check; templates folded away. Door, window and motion cards get a **Kind** choice for sensors with a missing or wrong device class.
- **Visible (condition):** every card, and every template card, can carry a Jinja condition. The card is hidden when it renders false, 0, no, off, none or nothing; *show when false* inverts it. For the home-maintenance use case from #167, and anything else that should only appear when it matters.
- **••• in popups:** the options button now opens a small menu over the popup instead of replacing its contents: Card settings, Open in Home Assistant, Open device (when the entity belongs to a device) and Hide on this page. On phones it is a sheet at the bottom. Esc or a tap outside closes just the menu.
- **Graph card:** Settings → Graphs adds a card with the line of one numeric sensor (temperature, humidity, power, …) over the last 3 hours to 7 days, on the home view or in a room. Current value in the corner, average and range under the name; tap opens the Home Assistant history dialog. Door, window and motion cards get the same layout with **Bottom → graph (on/off line)**.
- **Bottom bar on phones and tablets:** the menu button and the search button in the top bar are replaced by a bar at the bottom: Home, the current room (opens the room list, or the floors when navigation is set to floors), More and a search button. Search opens in the bar itself, with the results above it.
- **More on phone cards:** the waste card shows the pickup after the next one at the bottom, and the agenda card the appointment after the next one (on wider screens both were already in the side column).
- **Thermostat card:** the big number is now the current temperature; the setpoint stays on the slider and is listed under the name, next to one extra item you pick under Bottom line in the card settings (or for all thermostats under Card defaults): humidity or the active preset (automatic), heating time today, outside temperature, or nothing. Phones show that item at the bottom.

## 3.0.5

- **Update notice:** when a new HaCasa Nova is out, administrators see it in the notification row on the home page. Tap it for the changelog and an Install button (Home Assistant's update dialog, from HACS). Installs without HACS check GitHub instead, at most twice a day. Can be turned off under Panel settings → General → Check for updates.
- Lines in the notification row can now be tapped when they lead somewhere.
- For developers: `npm run deploy:dev` builds a dev variant (`hacasa-nova-dev`) that runs next to the HACS install in your own Home Assistant. See the [development guide](https://damianeickhoff.github.io/HaCasa/development/).

## 3.0.4

Maintenance release; the panel works the same as 3.0.3.

- Build tool esbuild updated to 0.28.1 (security advisory GHSA-67mh-4wv8-2f99 affects only esbuild's development server, which HaCasa Nova does not use; the released file was never affected).
- README: a Community section and links to [GitHub Discussions](https://github.com/damianeickhoff/HaCasa/discussions) for questions, ideas and showing your setup.
- New CONTRIBUTING.md and SECURITY.md (report security problems privately via the Security tab).

## 3.0.3

README and docs only; the panel is unchanged since 3.0.2.

- A 40-second demo video, playing on the docs home page; the README header links to it.
- New docs page [Best experience](https://damianeickhoff.github.io/HaCasa/best-experience/): make HaCasa Nova your start page, hide the sidebar, wall tablet tips. Linked from the README.
- The Cards page in the docs shows a picture of every card.

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
