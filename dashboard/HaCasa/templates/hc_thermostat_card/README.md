# Thermostat Card
<img src="https://github.com/user-attachments/assets/10367602-2969-4e7f-b3a8-90453db0cd51" width=50% height=50%>

## Configuration
| Variable | Description |
|:---|:---|
| show_mode_state | Show/hide the mode state [true/false] |
| show_window_state | Show/hide the window state [true/false] |
| window_open_boolean | Value of the windows state [true/false] |

## Template example
```
type: custom:button-card
template: hc_thermostat_card
entity: climate.buro_thermostat
variables:
  show_window_state: true
  show_mode_state: true
  window_open_boolean: |
    [[[
      return states[entity.entity_id].attributes.window_open
    ]]]
```

## Actions
**_Tap_ on Button Up/Down:**  Increase/decrease the Temperature  
**_Long Press_ on Button Up:** Switch mode to "heat"  
**_Long Press_ on Button Down:** Switch mode to "off"
