# Room photos

Photos are what make HaCasa Nova feel like your home. Each room page, and the home view, shows a full-screen photo behind the cards.

## Where the panel looks

For every room, in this order:

1. A photo chosen for that page in the panel (**hold the page title**, or **Settings → Pages**).
2. The **area picture** set in Home Assistant (**Settings → Areas → the area → picture**).
3. A file in `/config/www/images/rooms/` named after the area. The name is made lower case with hyphens: `Living room` → `living-room.jpg`. The panel tries `.jpg`, `.jpeg`, `.png` and `.webp`, and also the area's id (handy when you renamed an area).
4. Nothing found: a calm gradient.

The home view uses `/config/www/images/rooms/home.jpg`, or the photo chosen in **Settings → General → Home page photo**.

Files in `/config/www/` are served by Home Assistant under `/local/`, so `/config/www/images/rooms/kitchen.jpg` is `/local/images/rooms/kitchen.jpg` in the settings.

## Tips

- **Landscape, 1600 to 2400 px wide** works best. The panel darkens the photo so white text stays readable.
- **Evening shots** with warm lights on look great with the glass cards.
- **Change the folder** under **Settings → General → Room photo**. `{slug}` is replaced by the room's name.
- A replaced photo shows up after a reload (the panel adds an hourly cache-buster).
