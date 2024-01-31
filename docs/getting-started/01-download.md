---
order: 100
title: Download
hide_table_of_contents: true
---
<!-- markdownlint-disable MD033 -->
First of all we recommend create a backup in HA before you proceed. We are in no way responsible for any data loss. We also don't expect there will be any data loss, but just in case... make a backup...

![always-snape](https://media1.tenor.com/m/_xXpIoJbwfYAAAAC/always-severus-snape.gif)

You will need Home Assistant installed (obviously) and need to have access to the configuration files so you can change them but also upload files.

You will need some basic HA knowledge since you have to edit files and your `lovelace` configuration but the documentation from HA can help you out.

## HACS Download <span class="badge-danger">Not Available Yet</span>

HaCasa is not available through [HACS](https://hacs.xyz) yet, but we still recommend installing HACS. There are some integrations that HaCasa depends on which you can easily install through HACS.
Manual installation is also possible, but you should check the docs for that in the specific repository of that card.

## Manual Download

Downloading HaCasa is really easy but like we said, there are some dependencies. You will need to install those first.

:::danger skipping recommended
You can skip the recommended ones, but this will ruin the layout and you will need to do more customizations yourself. We don't support this.
:::

### Prerequisites

- [Button Card](https://github.com/custom-cards/button-card) - Required
- [My Cards](https://github.com/AnthonMS/my-cards) - Required
- [Card Mod](https://github.com/thomasloven/lovelace-card-mod) - Required
- [Font Awesome](https://github.com/thomasloven/hass-fontawesome) - Recommended
- [Kiosk Mode](https://github.com/NemesisRE/kiosk-mode) - Recommended

These are all Lovelace Resources and can be downloaded through HACS or manually, but again, check their documentations.

### Download files

Download the `Source code (zip)` from the latest [release](https://github.com/damianeickhoff/HaCasa/releases). Unpack the zip file and open the unpacked folder. Copy the `dashboard` and the `custom_icons` folder to the root of your HA configuration (this is where your `configuration.yaml` lives) and copy the HaCasa folder from within the `theme folder` into your own `theme folder`. Which is also in the root.

When you have successfully completed these tasks, you can move on to [configuration](02-configuration.md).
