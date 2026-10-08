# Home view and rooms

## Navigation

The pill at the top lists your rooms and **More** (the built-in pages and settings). The search icon finds rooms, pages and devices. On the right: who is home, the alarm state and the clock.

On phones the rooms move behind the menu button, and the cards become a two-column grid.

- **Swipe** left or right on a room page (outside the cards) for the next or previous room.
- **Scroll** the card strip with the mouse wheel, by dragging, or by touch.
- **Hold a page title** to set up that page.

## Home view

![Home view](assets/screenshots/home.png)

From top to bottom:

- **Date, indoor temperature and humidity.** The average of all rooms, or the sensors you choose under *Settings → Home page*.
- **Greeting.** Changes with the time of day, or set your own per page.
- **Notification line.** Rotates through what is worth knowing: waste pickup, the next appointment, an open door, a playing speaker, a running appliance, active modes, and your own lines (plain text or Jinja templates).
- **Status pills.** Lights on, doors and windows open, items needing attention. Tap one for the list.
- **Quick actions.** Your own buttons: a scene, a script, toggle something, all lights off, media off. Optionally with a confirmation.
- **Weather.** Current conditions with a heads-up when rain is coming; tap for the hourly and 7-day forecast.
- **Cards.** Thermostat, playing media, attention, weather, waste, scenes, agenda, appliances, energy and your groups and template cards.
- **Motion bar.** Shows where motion is detected right now.

## Room pages

![Room page](assets/screenshots/room.png)

Each room shows its photo, its temperature and humidity, a notification line for that room (lights on, open windows, what is playing) and a card for every device in the area. See [Cards](cards.md) for each type.

## Per-page settings

Hold the title of any page (or go to **Settings → Pages**) to change:

- the **title** and **photo**,
- which **cards** are shown and in which **order**,
- which kinds of **notification lines** appear,
- your **own lines** for that page: plain text, or a Jinja template rendered live by Home Assistant.
