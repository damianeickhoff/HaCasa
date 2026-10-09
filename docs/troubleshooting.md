# Troubleshooting

??? question "The sidebar entry shows an empty page"
    - Check `module_url` in `configuration.yaml`: open the URL in your browser (`http://homeassistant.local:8123/hacsfiles/HaCasa/hacasa-nova.js`). You should see JavaScript, not a 404.
    - `name` must be exactly `hacasa-nova`.
    - Restart Home Assistant after changing `panel_custom`, then reload the browser.

??? question "The sidebar icon is empty"
    `sidebar_icon: hacasa:logo` needs the file loaded at startup: add it under `frontend: extra_module_url` (see [Installation](installation.md#2a-sidebar-panel)) and restart. Or use an `mdi:` icon instead.

??? question "Custom element doesn't exist: hacasa-nova-card"
    The dashboard resource is missing. HACS adds it automatically in storage-mode dashboards; otherwise add `/hacsfiles/HaCasa/hacasa-nova.js` as a *JavaScript module* under **Settings → Dashboards → ⋮ → Resources**, then reload.

??? question "A device is missing from a room"
    Rooms are areas. Check that the entity, or its device, is assigned to that area in Home Assistant. Entities with the *diagnostic* or *config* category are left out on purpose. A card hidden via its card settings is listed under **Settings → Card settings**.

??? question "A room is missing from the navigation"
    **Settings → Rooms** decides which areas are rooms. With the default `auto`, areas without devices are skipped.

??? question "My photo does not show"
    See [Room photos](photos.md): the file name is the area name in lower case with hyphens (`living-room.jpg`). Open `/local/images/rooms/living-room.jpg` in the browser to check the path. A replaced photo can take a reload to appear.

??? question "Template cards or my own notification lines stay empty"
    Templates are rendered by Home Assistant's template websocket, which needs an administrator account. Also check the template in **Developer tools → Template**.

??? question "The per-hour energy chart is empty"
    The energy sensor needs long-term statistics (a `state_class`). Check it in **Developer tools → Statistics**.

??? question "It is in Dutch"
    **Settings → General → Language**. *Automatic* follows the language of your Home Assistant profile; anything other than Dutch shows English.

??? question "Something else"
    Open an [issue on GitHub](https://github.com/damianeickhoff/HaCasa/issues) with your Home Assistant version, the browser and any red lines from the browser console (F12).
