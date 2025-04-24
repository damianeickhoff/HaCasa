---
title: Downloads
layout: page
parent: Installation
nav_order: 1.1
---

# Download the files
Because HaCasa can't be installed through the UI, we will need to manually download and upload some files to your Home Assistant configuration.

But don't worry, we'll guide you through it 😄

## Verify Prerequisites

Ensure you have the following:

- A running [Home Assistant](https://www.home-assistant.io/) instance.
- Basic knowledge of Home Assistant like changing your `configuration.yaml` file.
- Preferrably [HACS](https://hacs.xyz) installed which is needed for installing the cards.
- You have access to your config folder of HA. It doesn’t matter which way this is. You will need this to upload and change files in your configuration.

## Backup Your Home Assistant

1. Navigate to `Settings` > `System` > `Backups`.
2. Create a backup of your Home Assistant instance.
3. Alternatively, [click here](https://my.home-assistant.io/redirect/backup/) to create a backup directly.

**Note:** We are not responsible for any data loss. Always ensure you have a backup before proceeding.

## Install Required Dependencies

Install the following integrations through HACS or manual (see their documentation):

- [Button Card](https://github.com/custom-cards/button-card) by RomRider.
- [my-slider-v2](https://github.com/AnthonMS/my-cards) by AnthonMS (part of the `my-cards` integration).
- [Card Mod](https://github.com/thomasloven/lovelace-card-mod) by Thomas Lovén.
- [Mini Graph Card](https://github.com/kalkih/mini-graph-card) by Karl Kihlström.
- [Font Awesome](https://github.com/thomasloven/hass-fontawesome) by Thomas Lovén.

## Download and place files

1. Go to [latest release](https://github.com/damianeickhoff/HaCasa/releases).
2. Download the latest `HaCasa.zip` file.
3. Unpack the ZIP file.
4. Copy the contents (file **and** folders) to the root of your Home Assistant configuration directory (where `configuration.yaml` is located).

**Note:** If you don't copy all the files, the theme, cards and dashboard will probably not function correctly.

## Verify File Structure

Ensure your file structure matches the following:

```markdown
custom_icons/
├── house.svg
└── ...
dashboard/
└── hacasa/
    ├── templates/
    │   ├── internal_templates/
    │   │   └── example: hc_light_card.yaml
    │   ├── ...
    │   └── custom_templates
    ├── views/
    │   └── example: 00-default_view.yaml
    └── main.yaml
themes/
└── hacasa/
    ├── hacasa-gold.yaml
    └── hacasa-peachy.yaml
www/
└── images/
    ├── idle-media.gif
    └── weather/
        ├── sunny.svg
        └── bg-sunny.svg
configuration.yaml
```

## Proceed to Configuration

Once the files are in place, proceed to the [configuration guide](https://damianeickhoff.github.io/HaCasa/docs/installation/configuration.html) to set up your dashboard.
