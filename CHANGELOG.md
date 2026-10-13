# Changelog

## 3.1.0-beta.4 (beta)

- **Fewer cards by default.** The home view starts with Attention (now always there, "all is well" when nothing needs it), Weather, Household, and Security and Agenda when an alarm, a lock or a calendar exists. A room shows its lights, plugs and motion sensors that are reachable. Everything else (thermostat, media players, waste, scenes, energy, list, timers, car, solar, garden; in a room: covers, fans, locks, doors and windows, cameras, scenes, light scenes, air quality …) is added through edit mode → *Add card*, where the room's own entities are listed first, and removed again with the bin instead of hidden. Groups, graphs and template cards you made stay where they are. A room without a reachable light, plug or motion sensor and without anything you added is left out of the navigation (Settings → Rooms still lists every room by hand). Cards that showed up by themselves before are not carried over: add them back once. The *Media* and *Weather card* switches under Settings → Home page are gone with it.
- **Agenda popup is a calendar now:** a week grid with a colour per calendar, an all-day row, a now-line and a column with what is on now and next; *Day* and *List* views (the list is the default on phones), ‹ today › to page through, calendars to hide, and a tap on an event for its time, location and description. The panel fetches six weeks of events for it.
- **The alarm pill opens the Security popup** now (arm or disarm with the keypad, what is open, locks, cameras), so there is one popup for it.
- **Seven new cards:** *Security* (alarm, open doors and windows, locks, cameras: one card, one popup to arm, lock and look), *Household* (who is home, with pictures; with the Proximity integration or a travel-time sensor named after the person it says "on the way · 12 km · 14 min"), *List* (a to-do or shopping list with tick boxes, an add field and *Clear completed*), *Timers* (timer helpers counting down, +5 / +15 / +60), *Car* (charge ring, range, charging power, done at, start / stop), *Solar* (power now, today's yield, home battery, your own share) and *Garden* (watering zones as buttons, next run, rain today). Security, Household, List and Timers appear by themselves when the entities exist (hide them in edit mode like any card). Car and Garden come through *Add card* and are set up in their own card settings; Solar takes its sensors under **Settings → Energy**.
- **Air quality card per room:** a room with a CO₂, VOC, fine dust, AQI, NO₂ or ozone sensor gets a card with up to four readings rated good / so-so / poor, a one-line advice and the humidity.
- **Lights popup:** every lamp that is on, per room, with a brightness slider on its row (*Hide sliders* turns that off), on / off per room, and a hint for a lamp that has been on for a while in a room where nothing moved.
- **Weather popup:** rain for the next two hours as a graph (Buienradar's minute forecast when present, else the hourly forecast) with a line like "rain from 16:20, about 25 min", eight hours, the week as a temperature bar per day and the details as tiles.
- **Energy popup:** a flow block (solar → house, grid in or out, battery charging or discharging, your own share) when a solar sensor is set under Settings → Energy, today per hour with the solar share in yellow, and the biggest consumers right now with a switch for the plugs among them and a note when nobody is in that room.
- **Media popup:** every player in the house with a volume slider each, grouping (join to the player you opened, *Everywhere*, *Ungroup*) where the integration supports it, a seek bar and *Stop all*.

- **Motion:** pop-ups, menus and toasts now leave the screen with a short animation instead of vanishing; switching pages or rooms crossfades the old view into the new one; a card that turns on gets an icon pop and a light sweep, and cards and their buttons press down under your finger; numbers (power, temperatures, setpoints) count to their new value; the phone bar's active tab grows and shows its label with a transition, page filters have a sliding highlight; thermostats that are heating or cooling get a soft breathing glow, running fans spin, the weather icon drifts and the hourly forecast tiles stagger in; history and forecast pop-ups show a shimmer while loading and sparklines draw themselves. Saving settings now confirms with a toast as well. Everything respects the system *reduce motion* setting, and **Settings → General → Animations** switches it all off for a slow wall tablet.
- **Groups come in two kinds now:** a *light group* or a *plug group* (switches, plugs, fans). A light group gets the light card's bottom line: *brightness steps* or *colours* under **Bottom** in its card settings, aimed at every light in the group at once. Groups also take tap / hold behaviour and action buttons like other cards (an action without an `entity_id` targets all members). Existing groups keep working: one with only lights counts as a light group, anything else as a plug group.
- **Group popup:** a light group with dimmable lights gets a brightness slider, *together* (one slider for all) or *per light* (one under every light). Holding a member opens that light, fan or switch in its own popup, with an arrow back to the group.
- **New group style *counter*:** how many members are on as a big number, with a progress line and the names of the lit members underneath.
- **Group and graph settings preview:** the live preview in the card settings now follows the name, icon, kind, style and members (or sensor and period) as you change them; it used to show the saved version until you pressed Save.
- **Status pills are yours now:** the pills under the notification line (lights, doors & windows, notices) can be hidden, edited, dragged into a new order and joined by your own. Open the page settings (hold the title, or Settings → Pages) and look for *Status pills*. A pill of your own has an icon, a text (plain or Jinja; empty shows the entity's state), an optional entity, what a tap does (Home Assistant dialog, toggle, go to a page, nothing) and when it lights up. Every pill, built-in ones included, can be shown on a condition: a simple comparison on an entity or a Jinja template, the same as cards. Room pages can have pills too. A live preview shows the row while you edit.
- **Card defaults redone:** the tab shows a preview of one of your own cards per kind (lights, switches, plugs, sensors, thermostats …). Tap one to set its defaults, with the preview updating as you choose.
- **Drag to reorder** in the page settings card list and in Settings → Rooms; the arrows still work.
- **Edit mode tidied up:** a hidden card now leaves the row instead of staying in it dimmed. Two buttons above the row, only while editing: *Hidden cards* (with a count) opens the cards hidden on that page with a small preview each, to show them again one by one or all at once, and *Add card* opens the card picker, so you no longer scroll to the end of the row for it. Hiding a card uses an eye with a line through it instead of the ×. Cards hidden by a condition stay in the row, dimmed, so their settings are still reachable.
- **Icon picker:** every icon field (card settings, status pills, quick actions, modes, More menu, template cards, groups, light scenes, notification lines, action buttons) now has a button with the current icon. It opens a search over all Material Design Icons that Home Assistant ships, with the most used home icons shown first. Search works on names, aliases and categories, and common Dutch and German words (deur, Tür, verwarming, Lampe …) find the English-named icons. Typing `mdi:…` yourself still works.
- **Your icon wins:** an icon you pick now shows exactly as picked. Before, MDI icons with a word like *lightbulb*, *door* or *home* in their name were swapped for HaCasa's own drawing of a lamp, door or house, so `mdi:lightbulb-group` showed up as a table lamp. HaCasa's own icons can be picked too (`hacasa:<name>`), and the picker shows them in a section of their own next to Material Design Icons, with an *All / HaCasa / MDI* filter. The icon button now sits after the text field.
- **53 new HaCasa icons** in the panel's thin-line style: bulb, bulb group, ceiling light, floor lamp, LED strip, spot, wall light, bed, sofa, bath, shower, toilet, desk, kitchen, stairs, garage, gate, blinds, curtain, open window, doorbell, key, shield, bell, alarm clock, air conditioner, air purifier, snowflake, speaker, play, headphones, book, movie, palette, fridge, kettle, vacuum, printer, router, phone, laptop, car, EV charger, bike, plant, tree, person, people, paw, star, heart, info and check.
- **Dismissing a notification** in the Attention popup (*Close*) now removes it straight away; it used to stay in the list until the page was reloaded.
- **Panel settings is now HaCasa settings.**
- **⋯ on every card's popup:** groups, light scenes, agenda, waste, energy and attention popups now have the options button too, with *Card settings* (for a group: name, members and condition) and *Hide on this page*. *Open in Home Assistant* only shows when there is an entity behind the card. The home thermostat can now be hidden from its menu as well.
- The on/off chips for the notification line in the page settings had a dimmed grey look; they now match every other pill.
- Unavailable lights, fans and covers no longer show their slider.
- Saving the page settings popup no longer drops cards that were added to the page by hand.

## 3.1.0-beta.3 (beta)

- **Home view on phones with quick actions** (#169): the greeting, notification line and pills were pushed up under the top bar, leaving a gap above the cards. A desktop-only rule for the quick-action row was leaking into the phone layout; it is now limited to desktop widths.

## 3.1.0-beta.2 (beta)

- **Non-admin users** (#144): template cards say *only for administrators* instead of showing an error, the System page says why host and core figures are missing, the Template cards settings carry the same note, and *install* on an update opens Home Assistant's dialog instead of failing silently.
- **Room cap gone** (#146): automatic room mode no longer stops at nine rooms. **Settings → Rooms → Maximum** sets a limit if you want one.
- **Room photo lookup** (#149): paths that gave a 404 are remembered for the session, so a reload no longer retries every extension for every room.
- **Plurals** (#152): "1 sensor", "1 battery low", "1 update" instead of "1 sensors".
- **Popups** (#153): a popup whose entity disappears while it renders closes instead of breaking the panel.
- Dead code for the old Lights / Doors home cards removed (#155).

## 3.1.0-beta.1 (beta)

- **Edit mode:** administrators pick **More → Edit room** (or *Edit home view*), or hold the page title. The strip then shows every card of the page: drag a card by its grip to reorder, × hides it, hidden cards stay in the row dimmed with an eye to bring them back, a tap opens the card settings, and an **Add card** tile sits at the end. *Done* in the bar at the bottom (the bottom nav on phones) leaves edit mode. This replaces the up/down list in Page settings for ordering.
- **Template cards as a library:** a template card now lives in **Settings → Template cards** as a reusable definition. The entity is chosen when you place it (`$entity` in the templates), and the template marks which fields (text, label, condition) are **filled in when placing**. Place the same template as often as you like through edit mode → Add card → Template; each copy keeps its own values, name and icon. A template can also be written right in the picker, once for that page or kept in the library. Template cards that were pinned to a page are moved to that page's cards automatically.
- **Card picker:** Add card opens a picker like Home Assistant's: *Devices* (light, switch or plug, door or window, motion, on/off sensor, value, media, thermostat, shutter, fan, lock, camera, other — then the matching entities), *HaCasa cards* (weather, agenda, waste, energy, attention, home thermostat, scenes and light scenes of a room, a new group or graph configured right there) and *Your own cards* (a template from your library). A tap on a group or graph in edit mode edits it. Cards added by hand are removed with the bin in edit mode; the panel's automatic cards are hidden with × and come back dimmed with a banner.
- **Simple conditions:** the visibility condition can be a plain comparison (entity · is / is not / greater / less · value) next to the Jinja template; every card in edit mode, including the panel's own, gets this.
- **Add card:** from edit mode, add any light, switch, sensor, media player, cover, thermostat, lock, fan, camera… to the home view or a room. Entities without an area come first, entities from other rooms carry their room name. By default the card is added in HaCasa only (`pages[room].add`); administrators can instead move the entity's area in Home Assistant. A plain sensor becomes a **value card**: the number large, the name under it, the last change at the bottom; a tap opens its details. Groups, graphs and template cards start from the same tile and land in their settings tab with the room filled in.
- **Card settings redone:** a live preview of the card next to the form, so every change shows before you save; settings grouped under Appearance, Behaviour, Action buttons and Advanced; choices as buttons with a *std* marker for what the Card defaults give you; action buttons as one row each with a service picker and a JSON check; templates folded away. Door, window and motion cards get a **Kind** choice for sensors with a missing or wrong device class.
- **Visible (condition):** every card, and every template card, can carry a Jinja condition. The card is hidden when it renders false, 0, no, off, none or nothing; *show when false* inverts it. For the home-maintenance use case from #167, and anything else that should only appear when it matters.
- **••• in popups:** the options button now opens a small menu over the popup instead of replacing its contents: Card settings, Open in Home Assistant, Open device (when the entity belongs to a device) and Hide on this page. On phones it is a sheet at the bottom. Esc or a tap outside closes just the menu.
- **Graph card:** Settings → Graphs adds a card with the line of one numeric sensor (temperature, humidity, power, …) over the last 3 hours to 7 days, on the home view or in a room. Current value in the corner, average and range under the name; tap opens the Home Assistant history dialog. Door, window and motion cards get the same layout with **Bottom → graph (on/off line)**.
- **Bottom bar on phones and tablets:** the menu button and the search button in the top bar are replaced by a glass pill at the bottom with icon tabs — the rooms (opens the room list with Home on top, or the floors when navigation is set to floors), two shortcuts (Sensors and Energy by default; pick any page or none under Settings → General → Shortcut 1 / 2) and More — plus a separate search button. Only the active tab slides open to show its name. Search opens in the bar itself, with the results above it. Prefer the 3.0 layout? **Settings → General → Bar on phones → at the top** brings the menu and search buttons in the top bar back.
- **Settings slimmed down:** the Groups and Graphs tabs are gone; groups and graphs are made and edited on the page itself (edit mode → Add card → HaCasa card). Card defaults use the same pill buttons as the card settings.
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
