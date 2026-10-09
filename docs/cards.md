# Cards

Every entity in a room becomes a card. A card shows its icon top left, its state top right, the name and a short line in the middle, and an optional extra line at the bottom.

**Tap and hold.** By default lights and switches **toggle on tap** and open details on **hold**. Everything else opens details on tap. Media, covers and thermostats also have buttons right on the card. You can change all of this per card or per card type: see [Card settings](card-settings.md).

## Lights

<div class="grid2" markdown>
<figure markdown>
![Light card, on](assets/cards/light.webp)
<figcaption>On, with brightness steps</figcaption>
</figure>
<figure markdown>
![Light card, off](assets/cards/light-off.webp)
<figcaption>Off</figcaption>
</figure>
</div>

A thin vertical bar on the right sets the brightness (drag it; dragging to 0 turns the light off). The bottom line can show:

| bottom | shows |
|---|---|
| auto | brightness steps (25, 50, 75, 100) when the light is dimmable |
| steps | always the brightness steps |
| colors | colour dots; lights with only colour temperature get warm, neutral and cool |
| today | 24 hourly bars of when the light was on today |
| none | nothing |

## Switches and smart plugs

<div class="grid2" markdown>
<figure markdown>
![Switch card](assets/cards/switch.webp)
<figcaption>A plain switch</figcaption>
</figure>
<figure markdown>
![Plug card](assets/cards/plug.webp)
<figcaption>A plug with a power meter</figcaption>
</figure>
</div>

A switch toggles on tap. A switch whose device also reports **power** becomes a plug card: live watts big, kWh used today, and a three-hour sparkline. The bottom line can also be a **timer** (switch off after 15, 30, 60 … minutes), the **cost** today (set your price under *Settings → Energy*), or hourly **bars**. You can link a power sensor by hand when it lives on another device.

<div class="grid2" markdown>
<figure markdown>
![Power strip card](assets/cards/strip.webp)
<figcaption>A power strip: one button per outlet</figcaption>
</figure>
</div>

## Appliances

<div class="grid2" markdown>
<figure markdown>
![Appliance card](assets/cards/appliance.webp)
<figcaption>A dishwasher (Home Connect) with programme, progress and Stop</figcaption>
</figure>
</div>

Washing machines, dishwashers and dryers are recognised in two ways:

- a device that reports its own status (Home Connect, Miele, LG ThinQ …): the card shows the programme, progress, finish time and door, with a **Stop** button;
- a smart plug with a power meter: *busy* above a threshold (5 W by default, adjustable per card), *done* when it drops, *standby* otherwise.

## Media

<div class="grid2" markdown>
<figure markdown>
![Media card with artwork](assets/cards/media.webp)
<figcaption>Music with artwork</figcaption>
</figure>
<figure markdown>
![Media card for a TV app](assets/cards/media-app.webp)
<figcaption>A TV app without artwork gets the app's colours</figcaption>
</figure>
</div>

Artwork as the card background, title and artist, and previous / play-pause / next on the card. When the same TV appears through several integrations (Android TV, Cast, Bravia), they are merged into one card.

## Climate

<div class="grid2" markdown>
<figure markdown>
![Climate card](assets/cards/climate.webp)
<figcaption>Target, current temperature, modes and the rail</figcaption>
</figure>
</div>

The target temperature big, current temperature below it, and a rail on the right to drag the target up and down. HVAC modes and presets sit in a row at the bottom. The popup lists every room's temperature.

## Covers and fans

<div class="grid2" markdown>
<figure markdown>
![Cover card](assets/cards/cover.webp)
<figcaption>Cover: up and down</figcaption>
</figure>
<figure markdown>
![Fan card](assets/cards/fan.webp)
<figcaption>Fan: the bar sets the speed</figcaption>
</figure>
</div>

- **Covers**: up and down buttons; covers with a position get the vertical bar.
- **Fans**: vertical bar for speed, presets and oscillation in the popup.

## Locks, vacuums and humidifiers

<div class="grid2" markdown>
<figure markdown>
![Lock card](assets/cards/lock.webp)
<figcaption>Lock: tap to lock or unlock</figcaption>
</figure>
<figure markdown>
![Vacuum card](assets/cards/vacuum.webp)
<figcaption>Vacuum: start / pause and dock</figcaption>
</figure>
<figure markdown>
![Humidifier card](assets/cards/humidifier.webp)
<figcaption>Humidifier: target up and down</figcaption>
</figure>
</div>

## Sensors

<div class="grid2" markdown>
<figure markdown>
![Door sensor card](assets/cards/door.webp)
<figcaption>Door, with how long it has been open</figcaption>
</figure>
<figure markdown>
![Motion sensor card](assets/cards/motion.webp)
<figcaption>Motion</figcaption>
</figure>
</div>

Doors, windows, motion, smoke, leak and other binary sensors show their state and how long it has been that way ("Closed · since 08:51"). Their bottom line can show **today**: when they were active, as bars. Battery-powered sensors can show the battery level in the corner.

## Cameras

<div class="grid2" markdown>
<figure markdown>
![Camera card](assets/cards/camera.webp)
<figcaption>A live snapshot</figcaption>
</figure>
</div>

A live snapshot that refreshes every few seconds without flicker; tap for the stream and the motion events of the last 24 hours.

## Home view cards

<div class="grid2" markdown>
<figure markdown>
![Attention card](assets/cards/attention.webp)
<figcaption>Attention: unavailable devices, low batteries, updates and notifications</figcaption>
</figure>
<figure markdown>
![Weather card](assets/cards/weather.webp)
<figcaption>Weather: condition, temperature and a rain heads-up</figcaption>
</figure>
<figure markdown>
![Waste card](assets/cards/waste.webp)
<figcaption>Waste: the next pickups</figcaption>
</figure>
<figure markdown>
![Agenda card](assets/cards/agenda.webp)
<figcaption>Agenda: the next events from your calendars</figcaption>
</figure>
<figure markdown>
![Scenes card](assets/cards/scenes.webp)
<figcaption>Scenes: your favourite scenes as buttons</figcaption>
</figure>
<figure markdown>
![Energy card](assets/cards/energy.webp)
<figcaption>Energy: power now and today's use</figcaption>
</figure>
</div>

Waste pickups work with the Afvalbeheer and Afvalwijzer integrations and any sensor with a date. The weather card shows on the home view when the weather block in the header is hidden (on phones, for example), or always with **Settings → Home page → Weather card**.

## Groups

**Settings → Groups** combines several lights, switches or plugs into one card, placed in a room or on the home view. Style *tiles* shows a master switch with a chip per member; *list* shows the members as rows.

## Light scenes

<div class="grid2" markdown>
<figure markdown>
![Light scenes card](assets/cards/presets.webp)
<figcaption>Light scenes: save and recall the room's lights</figcaption>
</figure>
</div>

Every room with lights gets a **Light scenes** card. Save the current state of the room's lights (on/off, brightness, colour) as a preset and recall it with one tap.

## Template cards

<div class="grid2" markdown>
<figure markdown>
![Template card](assets/cards/template.webp)
<figcaption>A template card showing the weather state</figcaption>
</figure>
</div>

**Settings → Template cards** adds cards whose text and label are **Jinja templates**, rendered live by Home Assistant. Place them on the home view or in a room and give them a tap action: details, toggle, a service call or navigation.

!!! note
    Templates are rendered by Home Assistant's template websocket, which needs an administrator account.
