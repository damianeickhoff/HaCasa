---
hide_table_of_contents: true
title: Navigationbar Card
layout: page
parent: Cards
---

# Navigation bar Card
This is a navigation bar for the bottom of your dashboard. You can add a entity to a button so it shows a green dot if something is active.

![Navigation bar Card](../../../assets/images/cards/hc_navigationbar_card/navigationcard_light.png)

## Usage
This card is fairly simple. The most important part is that you change the background color on each view to the desired color, in this case `var(--primary-color)`. So, if you go to your second page, you remove the variable `background_color_1` and add the `background_color_2`.

### View code
```yaml
  - type: custom:button-card
    template: hc_navigationbar_card
    variables:
      icon_color_1: white
      background_color_1: var(--primary-color)
      navigation_path_1: home
      icon_1: fapro:house
      navigation_path_2: climate
      icon_2: fapro:thermometer
      navigation_path_3: devices
      icon_3: fapro:plug
      entity_3: switch.all_switches
      navigation_path_4: media
      icon_4: fapro:music
      entity_4: 'media_player.all_media'
```        

## Variables

| Variable | Default | Required | Description|
|----------|---------|----------|------------| 
| icon_color_1       | var(--color-dark-gray)      | No       | Color of the first icon              |
| background_color_1 | var(--color-light-gray-nav) | No       | Background color of the first button |
| navigation_path_1  | ''                          | yes      | Navigation path for the first button |
| icon_1             |                             | No       | Icon for the first button            |
| entity_1           |                             | No       | Entity for the first button          |
| active_state_1     | 'on'                        | No       | Active state for the first button    |
| icon_color_2       | var(--color-dark-gray)      | No       | Color of the second icon             |
| background_color_2 | var(--color-light-gray-nav) | No       | Background color of the second button|
| navigation_path_2  | ''                          | No       | Navigation path for the second button|
| icon_2             |                             | No       | Icon for the second button           |
| entity_2           |                             | No       | Entity for the second button         |
| active_state_2     | 'on'                        | No       | Active state for the second button   |
| icon_color_3       | var(--color-dark-gray)      | No       | Color of the third icon              |
| background_color_3 | var(--color-light-gray-nav) | No       | Background color of the third button |
| navigation_path_3  | ''                          | No       | Navigation path for the third button |
| icon_3             |                             | No       | Icon for the third button            |
| entity_3           |                             | No       | Entity for the third button          |
| active_state_3     | 'on'                        | No       | Active state for the third button    |
| icon_color_4       | var(--color-dark-gray)      | No       | Color of the fourth icon             |
| background_color_4 | var(--color-light-gray-nav) | No       | Background color of the fourth button|
| navigation_path_4  | ''                          | No       | Navigation path for the fourth button|
| icon_4             |                             | No       | Icon for the fourth button           |
| entity_4           | ''                          | No       | Entity for the fourth button         |
| active_state_4     | 'on'                        | No       | Active state for the fourth button   |
| icon_color_5       | var(--color-dark-gray)      | No       | Color of the fifth icon              |
| background_color_5 | var(--color-light-gray-nav) | No       | Background color of the fifth button |
| navigation_path_5  | ''                          | No       | Navigation path for the fifth button |
| icon_5             |                             | No       | Icon for the fifth button            |
| entity_5           |                             | No       | Entity for the fifth button          |
| active_state_5     | 'on'                        | No       | Active state for the fifth button    |
| icon_color_6       | var(--color-dark-gray)      | No       | Color of the sixth icon              |
| background_color_6 | var(--color-light-gray-nav) | No       | Background color of the sixth button |
| navigation_path_6  | ''                          | No       | Navigation path for the sixth button |
| icon_6             |                             | No       | Icon for the sixth button            |
| entity_6           |                             | No       | Entity for the sixth button          |
| active_state_6     | 'on'                        | No       | Active state for the sixth button    |
