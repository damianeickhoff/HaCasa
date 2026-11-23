# Installation

HaCasa Nova needs **Home Assistant 2024.4 or newer**. It ships as one file, `hacasa-nova.js`, that you can use in two ways:

- as a **sidebar panel** (recommended): its own entry in the sidebar, full screen, with clean URLs per room;
- as a **dashboard card**: no YAML at all, the panel lives inside a dashboard view.

Both use the same settings, so you can switch later.

## 1. Download

=== "Marketplace (recommended)"

    Home Assistant 2026.11 and newer have the Marketplace built in. Click the button and confirm adding the repository:

    [![Open your Home Assistant instance and add HaCasa Nova to the Marketplace.](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=damianeickhoff&repository=HaCasa&category=plugin)

    Then choose **Download** and reload the browser when Home Assistant asks.

    Adding a repository that isn't in the Marketplace catalogue needs the Marketplace to be connected to GitHub; it asks you to connect when it isn't yet. Without the button: **Settings → Marketplace → ⋮ → Custom repositories → Add from link**, paste `https://github.com/damianeickhoff/HaCasa` and pick type **Dashboard**, then open **HaCasa Nova** and choose **Download**.

    The Marketplace installs the file at `/config/www/community/HaCasa/hacasa-nova.js`, which Home Assistant serves as `/local/community/HaCasa/hacasa-nova.js`, and adds it as a dashboard resource.

=== "HACS (older Home Assistant)"

    1. Open **HACS** in Home Assistant.
    2. Open the menu (⋮, top right) and choose **Custom repositories**.
    3. Add `https://github.com/damianeickhoff/HaCasa` with type **Dashboard**.
    4. Search for **HaCasa Nova**, open it and choose **Download**.
    5. Reload the browser when HACS asks.

    HACS installs the file in the same place, `/local/community/HaCasa/hacasa-nova.js`, and adds it as a dashboard resource.

=== "Manual"

    1. Download `hacasa-nova.js` from the [latest release](https://github.com/damianeickhoff/HaCasa/releases/latest).
    2. Copy it to `/config/www/hacasa-nova/hacasa-nova.js`.
    3. Its URL is `/local/hacasa-nova/hacasa-nova.js`. Use that instead of `/local/community/HaCasa/hacasa-nova.js` below.
    4. For the card variant, add it as a resource yourself: **Settings → Dashboards → ⋮ → Resources → Add resource**, type *JavaScript module*.

## 2a. Sidebar panel

Add this to `configuration.yaml` and restart Home Assistant:

```yaml
frontend:
  extra_module_url:
    - /local/community/HaCasa/hacasa-nova.js   # loads the HaCasa logo icon for the sidebar

panel_custom:
  - name: hacasa-nova
    url_path: hacasa
    sidebar_title: HaCasa
    sidebar_icon: hacasa:logo
    module_url: /local/community/HaCasa/hacasa-nova.js
```

| key | value |
|---|---|
| `name` | must be `hacasa-nova` (the element the file registers) |
| `url_path` | the address: `http://homeassistant.local:8123/hacasa` |
| `sidebar_title` | whatever you like |
| `sidebar_icon` | `hacasa:logo` for the HaCasa logo, or any `mdi:` icon |
| `require_admin` | optional, `true` hides it from non-admin users |

!!! note "Upgrading from HACS"
    Older guides used `/hacsfiles/HaCasa/hacasa-nova.js`. That path keeps working after the Marketplace takes over from HACS, but Home Assistant raises a repair asking you to switch YAML resources to `/local/community/…`, so change it when you next edit `configuration.yaml`.

!!! note "The logo icon and `extra_module_url`"
    `hacasa:logo` is an icon that HaCasa Nova registers itself. `extra_module_url` loads the file when Home Assistant starts, so the icon is there before you open the panel. Already have a `frontend:` section (for themes, for example)? Add `extra_module_url` to it rather than adding a second `frontend:`. Without it the panel works fine; use an `mdi:` icon for `sidebar_icon` then.

    The icon works anywhere Home Assistant takes an icon, for example `icon: hacasa:logo` on your own cards.

!!! tip "Make it the start page"
    In the panel go to **More → HaCasa settings → General → HA start page** to open Home Assistant on HaCasa Nova (per user). See [Best experience](best-experience.md) for that, hiding the sidebar and wall tablets.

## 2b. Dashboard card

1. **Settings → Dashboards → Add dashboard → New dashboard from scratch** and open it.
2. Click the pencil, open the view settings and set **View type** to **Panel (single card)**.
3. Add a card and pick **HaCasa Nova**, or use the YAML editor:

```yaml
type: custom:hacasa-nova-card
```

Inside a card the rooms are routed through the URL hash (`/dashboard-home/0#/kitchen`), so the dashboard URL itself never changes.

!!! note "Panel view only"
    The card fills the whole view. In a masonry or sections view it does not have room to work.

Optionally give the card a starting configuration. It is shared by all users, and each user can still change things in the panel settings:

```yaml
type: custom:hacasa-nova-card
config:
  title: Home.
  rooms: [living_room, kitchen, bedroom]
```

## 3. Open it

Open the panel and the [setup wizard](first-run.md) starts. Then add [room photos](photos.md) and you are done.

## Updating

When a new version is out, administrators see a line in the notification row on the home page: **HaCasa Nova 3.x.x · update available**. Tap it to open Home Assistant's update dialog with the **changelog** (all release notes since your version) and an **Install** button. The same dialog is under **Settings → System → Updates → HaCasa Nova**. After installing, reload the browser.

Your settings are stored in Home Assistant, not in the file, so updates never touch them.

!!! note
    The notice comes from the update entity the Marketplace (or HACS) creates for HaCasa Nova. Installed by hand? Then the panel asks GitHub for the latest release, at most twice a day. Turn the notice off under **More → HaCasa settings → General → Check for updates**.
