---
title: Mediaplayer TV Card
hide_table_of_contents: true
---

The `Mediaplayer TV Card` is a card focused on TV intergrations, like `Google Cast` or `Android Debug Bridge`. It shows the episode title and show name if available and uses the episode cover as image. If there is nothing playing, a simple `.gif` will be shown.

![Mediaplayer TV Light](/img/cards/mediaplayer-tv/mediaplayer-tv.png)
![Mediaplayer TV Dark](/img/cards/mediaplayer-tv/mediaplayer-tv-dark.png)

## Usage

```yaml
type: custom:button-card
template:
  - custom_card_mediaplayer_tv
entity: media_player.bedroom
```
<!-- markdownlint-disable MD033 -->

<a href="https://github.com/damianeickhoff/HaCasa/blob/main/dashboard/HaCasa/templates/custom_card_mediaplayer_tv/custom_card_mediaplayer_tv.yaml" class="template-button" target="_blank" >Template</a>
