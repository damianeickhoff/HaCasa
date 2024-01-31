---
order: 100
title: Download
hide_table_of_contents: true
---
<!-- markdownlint-disable MD033 -->
First of all its important to create an backup from HA before you going any further. If you don't create a backup then we are not responsible for any losses (and also with a backup we aren't 😉).
You will need Home Assistant installed and need to have access to the configuration files so you can change them but also for uploading files.

You will also need some basic HA knowledge since you have to change files and your `lovelace` configuration.

:::warning Warning
Both documentation and HaCasa are still under construction!
:::

## Hacs Download <span class="badge-danger">Not Available Yet</span>

HaCasa is not availble through [HACS](https://hacs.xyz) yet, but we still recommend installing HACS. There are some intergrations that HaCasa depends on which you can easily install through HACS.
Manual installation is also possible, but you should check the docs for that in the specific repository of that card.

## Manual Download

Downloading HaCasa is really easy but like we said, there are some dependencies. You will need to install those first.

### Prerequisites

- [Button Card](https://github.com/custom-cards/button-card) **Required**
- [Kiosk Mode](https://github.com/NemesisRE/kiosk-mode) **Highly recommended**
- [Card Mod](https://github.com/thomasloven/lovelace-card-mod) **Required**
- [Font Awesome](https://github.com/thomasloven/hass-fontawesome) **Highly recommended**

These are all Lovelace Resources and can be downloaded through HACS.

### Download files

Download the `Source code (zip)` in the latest [release](https://github.com/damianeickhoff/homeassistant/releases). Unpack the zip file and place the `dashboard` folder and the `custom_icons` folder in the root of your HA configuration. This is where your `configuration.yaml` is located.

You also need to place the `HaCasa` folder inside the `theme` folder into your own `theme` folder.

When you executed these tasks, you can move on to [configuration](02-configuration.md).
