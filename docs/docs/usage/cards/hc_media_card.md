---
hide_table_of_contents: true
title: Media Card
layout: page
parent: Cards
---

# Media Card

**The hc_media_card is not fully done yet. It can be used, but lacks some features like selecting the player. Its just a simple card to control the music at this moment.**

With the `hc_media_card` you can control your media. It can show the album art as background and the buttons provide to control the media.

![Media Card Light](../../../assets/images/cards/hc_media_card/mediacard_light.png)

## Usage

```yaml
  - type: custom:button-card
    template: hc_media_card
    entity: <media entity>
```

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------|
| show_background_art | true | No | If true, the background will show the album art. If nothing is payhing, a animated GIF will play. |
| background_color | var(--color-purple) | No | The color will be used for the background if `hc_show_background_art` if `false`. |
