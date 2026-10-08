// A fake `hass` object for developing the panel outside Home Assistant.
// A generic demo home: nine areas on three floors, five persons and a plausible set of devices per room.
// Add ?lang=nl to the page URL to see the Dutch UI.
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

// floors as in the real setup (floor registry; level 0 = ground floor)
const floors = { ground_floor: { floor_id: "ground_floor", name: "Ground floor", level: 0 }, first_floor: { floor_id: "first_floor", name: "First floor", level: 1 }, attic: { floor_id: "attic", name: "Attic", level: 2 } };
const FLOOR_OF = { living_room: "ground_floor", kitchen: "ground_floor", backyard: "ground_floor", hallway: "ground_floor", bedroom: "first_floor", dressing_room: "first_floor", landing: "first_floor", bathroom: "first_floor", attic: "attic" };

export function makeHass(onChange) {
  const areas = {};
  for (const n of ["Living room", "Kitchen", "Bedroom", "Dressing room", "Landing", "Attic", "Backyard", "Bathroom", "Hallway"]) {
    const id = n.toLowerCase().replace(/ /g, "_"); areas[id] = { area_id: id, name: n, picture: null, floor_id: FLOOR_OF[id] || null };
  }
  const devices = {}, entities = {}, states = {};
  const add = (id, area, state, attributes = {}, { reg = {}, changed = ago(60), device = null } = {}) => {
    entities[id] = { entity_id: id, area_id: device ? null : area, device_id: device, ...reg };
    states[id] = { entity_id: id, state, attributes: { friendly_name: id.split(".")[1].replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()), ...attributes }, last_changed: changed, last_updated: changed };
    return id;
  };
  const dev = (id, area) => { devices[id] = { id, area_id: area, name: id }; return id; };

  // living_room
  add("light.floor_lamp", "living_room", "on", { friendly_name: "Floor lamp", brightness: 77, supported_color_modes: ["color_temp", "hs"], color_mode: "hs", hs_color: [225, 90], rgb_color: [25, 95, 255], color_temp_kelvin: 2700, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 }, { changed: ago(90) });
  add("light.ceiling_light_living_room", "living_room", "on", { friendly_name: "Ceiling light", brightness: 102, supported_color_modes: ["brightness"] }, { changed: ago(90) });
  add("light.spots_tv_meubel", "living_room", "off", { friendly_name: "TV cabinet spots", supported_color_modes: ["onoff"] }, { changed: ago(600) });
  add("climate.living_room_living_room", "living_room", "heat", { friendly_name: "Living room", temperature: 21.5, current_temperature: 20.8, hvac_action: "heating", hvac_modes: ["off", "heat", "auto"], preset_modes: ["home", "away", "sleep"], preset_mode: "home", target_temp_step: 0.5 });
  // living_room TV via Android TV Remote: only a package id, no title or artwork -> app fallback (Netflix colours)
  add("media_player.tv", "living_room", "on", { friendly_name: "TV", app_name: "com.netflix.ninja", volume_level: .3 });
  // bedroom TV seen through three integrations, like the real Lounge Sony: Android TV Remote + Bravia in the room,
  // Cast without an area but with title + artwork -> one card that shows The Boys
  const dS1 = dev("dev_sony_atv", "bedroom"); devices[dS1].name = "SONY KD-55X85L";
  const dS2 = dev("dev_sony_bravia", "bedroom"); devices[dS2].name = "Sony KD-55X85L";
  const dS3 = dev("dev_sony_cast", null); devices[dS3].name = "SONY KD-55X85L";
  add("media_player.sony_kd_55x85l_2", null, "on", { friendly_name: "Bedroom TV", app_name: "com.amazon.amazonvideo.livingroom", volume_level: .2 }, { device: dS1 });
  add("media_player.sony_kd_55x85l_4", null, "on", { friendly_name: "Sony KD-55X85L", source: "HDMI 1" }, { device: dS2 });
  add("media_player.sony_kd_55x85l", null, "playing", { friendly_name: "SONY KD-55X85L", app_name: "Prime Video", media_series_title: "The Boys", media_title: "S4 E3 · We'll Keep the Red Flag Flying Here", entity_picture: "/images/rooms/livingroom.png" }, { device: dS3 });
  add("media_player.speaker", "living_room", "playing", { friendly_name: "Speaker", media_title: "B2b", media_artist: "Charli xcx", volume_level: .35, entity_picture: "/images/rooms/lounge.png" });
  add("cover.blind_living_room", "living_room", "open", { friendly_name: "Blind", current_position: 100 });
  const dWin = dev("dev_window", "living_room");
  add("binary_sensor.living_room_living_room_window", "living_room", "off", { friendly_name: "Living room window", device_class: "window" }, { changed: ago(720), device: dWin });
  add("sensor.window_living_room_battery", null, "92", { friendly_name: "Living room window battery", device_class: "battery", unit_of_measurement: "%" }, { reg: { entity_category: "diagnostic" }, device: dWin });
  add("sensor.living_room_temperature", "living_room", "20.8", { friendly_name: "Living room temperature", device_class: "temperature", unit_of_measurement: "°C" });
  add("sensor.living_room_humidity", "living_room", "48", { friendly_name: "Living room humidity", device_class: "humidity", unit_of_measurement: "%" });
  add("binary_sensor.living_room_motion", "living_room", "off", { friendly_name: "Living room motion", device_class: "motion" }, { changed: ago(3) });

  // kitchen
  add("light.ceiling_light_kitchen", "kitchen", "on", { friendly_name: "Ceiling light", brightness: 255, supported_color_modes: ["brightness"] }, { changed: ago(160) });
  add("light.counter", "kitchen", "off", { friendly_name: "Counter lights", supported_color_modes: ["brightness"] });
  const dBack = dev("dev_back_door", "kitchen");
  add("binary_sensor.back_door_open", "kitchen", "on", { friendly_name: "Back door", device_class: "door" }, { changed: ago(24), device: dBack });
  add("sensor.back_door_battery", null, "70", { friendly_name: "Back door battery", device_class: "battery" }, { reg: { entity_category: "diagnostic" }, device: dBack });
  add("binary_sensor.kitchen_motion", "kitchen", "on", { friendly_name: "Kitchen motion", device_class: "motion" }, { changed: ago(0.2) });
  add("switch.coffee_maker", "kitchen", "off", { friendly_name: "Coffee maker" });
  const dStrip = dev("dev_strip", "kitchen"); devices[dStrip].name = "LSC Power Strip EU excl. Power Meter 2"; devices[dStrip].name_by_user = "Kitchen power strip";
  add("switch.power_strip_1", null, "on", { friendly_name: "Power strip 1" }, { device: dStrip });
  add("switch.power_strip_2", null, "off", { friendly_name: "Power strip 2" }, { device: dStrip });
  add("switch.power_strip_3", null, "on", { friendly_name: "Power strip 3", current_power_w: 12 }, { device: dStrip });
  add("switch.power_strip_4", null, "unavailable", { friendly_name: "Power strip 4" }, { device: dStrip });
  add("sensor.kitchen_temperature", "kitchen", "20.1", { device_class: "temperature" });
  add("sensor.kitchen_humidity", "kitchen", "52", { device_class: "humidity" });

  // bedroom
  add("light.bedside_lamp_links", "bedroom", "off", { friendly_name: "Bedside lamp left", supported_color_modes: ["brightness"] });
  add("light.bedside_lamp_rechts", "bedroom", "off", { friendly_name: "Bedside lamp right", supported_color_modes: ["brightness"] });
  add("cover.blind_bedroom", "bedroom", "open", { friendly_name: "Blind", current_position: 100 });
  add("sensor.bedroom_temperature", "bedroom", "18.4", { device_class: "temperature" });

  // dressing_room
  add("light.dressing_room", "dressing_room", "off", { friendly_name: "Ceiling light", supported_color_modes: ["onoff"] });
  const dKast = dev("dev_dressing", "dressing_room");
  add("binary_sensor.dressing_room_door_sensor_opening", "dressing_room", "off", { friendly_name: "Dressing room door", device_class: "opening" }, { device: dKast, changed: ago(300) });
  add("sensor.dressing_room_door_sensor_battery", null, "18", { friendly_name: "Dressing room door battery", device_class: "battery" }, { reg: { entity_category: "diagnostic" }, device: dKast });

  // landing
  add("light.landing", "landing", "on", { friendly_name: "Landing light", brightness: 153, supported_color_modes: ["brightness"] });
  add("binary_sensor.landing_motion", "landing", "off", { friendly_name: "Landing motion", device_class: "motion" }, { changed: ago(61) });
  add("binary_sensor.smoke_alarm_landing", "landing", "off", { friendly_name: "Smoke alarm", device_class: "smoke" });

  // kitchen: Home Connect dishwasher (no power sensor; status comes from the appliance)
  const dVw = dev("dev_dishwasher", "kitchen"); devices[dVw].name = "Dishwasher";
  const hc = (id, state, attr, tk, cat) => add(id, null, state, attr, { device: dVw, reg: { translation_key: tk, platform: "home_connect", ...(cat ? { entity_category: cat } : {}) } });
  hc("sensor.dishwasher_operation_state", "run", { friendly_name: "Dishwasher Operation state", device_class: "enum" }, "operation_state");
  hc("sensor.dishwasher_programme_progress", "11", { friendly_name: "Dishwasher Programme progress", unit_of_measurement: "%" }, "program_progress");
  hc("sensor.dishwasher_programme_finish_time", new Date(Date.now() + 113 * 60000).toISOString(), { friendly_name: "Dishwasher Programme finish time", device_class: "timestamp" }, "program_finish_time");
  hc("sensor.dishwasher_door", "closed", { friendly_name: "Dishwasher Door", device_class: "enum" }, "door");
  hc("select.dishwasher_active_programme", "dishcare_dishwasher_program_auto_2", { friendly_name: "Dishwasher Active programme" }, "active_program");
  hc("button.dishwasher_stop_programme", "unknown", { friendly_name: "Dishwasher Stop programme" }, "stop_program");
  hc("switch.dishwasher_power", "on", { friendly_name: "Dishwasher Power" }, "power");
  hc("switch.dishwasher_silence_on_demand", "off", { friendly_name: "Dishwasher Silence on demand" }, "silence_on_demand");
  hc("binary_sensor.dishwasher_remote_start", "on", { friendly_name: "Dishwasher Remote start" }, "remote_start");
  hc("binary_sensor.dishwasher_connectivity", "on", { friendly_name: "Dishwasher Connectivity", device_class: "connectivity" }, "connectivity", "diagnostic");

  // attic
  add("light.attic", "attic", "unavailable", { friendly_name: "Attic light" }, { changed: ago(630) });
  const dWas = dev("dev_washer", "attic"); devices[dWas].name = "Washing machine";
  add("switch.washing_machine", null, "on", { friendly_name: "Washing machine plug", current_power_w: 3 }, { device: dWas });
  add("sensor.attic_temperature", "attic", "17.2", { device_class: "temperature" });

  add("camera.front_door", "hallway", "idle", { friendly_name: "Front door", entity_picture: "/images/rooms/hallway.png?x=1", access_token: "abc" });
  add("camera.living_room", "living_room", "idle", { friendly_name: "Living room cam", entity_picture: "/images/rooms/livingroom.png?x=1", access_token: "ghi" });
  add("camera.backyard", "backyard", "streaming", { friendly_name: "Backyard", entity_picture: "/images/rooms/backyard.png?x=1", access_token: "def" });

  // whole-home
  for (const [p, st] of [["alex", "home"], ["sam", "home"], ["robin", "home"], ["jamie", "not_home"], ["charlie", "not_home"]])
    add(`person.${p}`, null, st, { friendly_name: p.split("_")[0].replace(/^\w/, c => c.toUpperCase()) }, { changed: ago(st === "home" ? 900 : 130) });
  add("alarm_control_panel.alarmo", null, "disarmed", { friendly_name: "Alarmo", changed_by: "Alex", code_format: "number", code_arm_required: false }, { changed: ago(640) });
  add("fan.ceiling_fan", "bedroom", "on", { friendly_name: "Ceiling fan", percentage: 40, preset_modes: ["low", "high", "auto"], oscillating: false });
  add("lock.front_door", "hallway", "locked", { friendly_name: "Front door lock", changed_by: "Sam" }, { changed: ago(130) });
  add("vacuum.robbie", "living_room", "docked", { friendly_name: "Robbie", battery_level: 86, fan_speed: "standard" });
  add("humidifier.humidifier", "bedroom", "on", { friendly_name: "Humidifier", humidity: 50, current_humidity: 44, action: "humidifying", available_modes: ["auto", "sleep"] });
  add("update.home_assistant_core_update", null, "on", { friendly_name: "Home Assistant Core Update", title: "Home Assistant Core", installed_version: "2026.9.3", latest_version: "2026.10.1", release_summary: "New features and improvements.", supported_features: 1 + 16 });
  add("update.shelly_plug_firmware", "kitchen", "on", { friendly_name: "Shelly Plug Firmware", title: "Shelly Plug", installed_version: "1.4.2", latest_version: "1.5.0", device_class: "firmware", supported_features: 1 });
  add("script.good_night", null, "off", { friendly_name: "Good night", icon: "mdi:weather-night" });
  add("binary_sensor.doorbell", "hallway", "off", { friendly_name: "Doorbell", device_class: "occupancy" });
  add("sensor.processor_use", null, "23", { friendly_name: "Processor use", unit_of_measurement: "%", icon: "mdi:cpu-64-bit" });
  add("sensor.processor_temperature", null, "48.2", { friendly_name: "Processor temperature", unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.memory_use_percent", null, "61", { friendly_name: "Memory use (percent)", unit_of_measurement: "%" });
  add("sensor.disk_use_percent", null, "88", { friendly_name: "Disk use (percent) /", unit_of_measurement: "%" });
  add("sensor.network_throughput_in_eth0", null, "1.8", { friendly_name: "Network throughput in eth0", unit_of_measurement: "MB/s", device_class: "data_rate" });
  add("sensor.network_throughput_out_eth0", null, "0.3", { friendly_name: "Network throughput out eth0", unit_of_measurement: "MB/s", device_class: "data_rate" });
  add("sensor.last_boot", null, new Date(Date.now() - 36 * 3600000).toISOString(), { friendly_name: "Last boot", device_class: "timestamp" });
  add("weather.home", null, "partlycloudy", { friendly_name: "Home", temperature: 14, humidity: 71, wind_speed: 17, wind_speed_unit: "km/h", attribution: "Home" });
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  // Afvalwijzer format: state "Tomorrow, 08-10-2026", Sort_date 20261008, Days_until 1
  const waste = (n, pre = "") => { const [y, m, dd] = d(n).split("-"); return [`${pre}${dd}-${m}-${y}`, { Wastecollector: "example", Sort_date: +`${y}${m}${dd}`, Days_until: n }]; };
  for (const [id, n, pre] of [["bio", 1, "Tomorrow, "], ["plastic", 5, ""], ["paper", 15, ""]]) { const [st, at] = waste(n, pre); add(`sensor.waste_${id}`, null, st, { friendly_name: `Waste ${id}`, ...at }); }
  add("calendar.family", null, "on", { friendly_name: "Family" });
  add("sun.sun", null, "above_horizon", { next_rising: new Date(Date.now() + 10 * 3600000).toISOString(), next_setting: new Date(Date.now() + 2 * 3600000).toISOString() });
  add("sensor.washing_machine_power", null, "0", { friendly_name: "Washing machine power", unit_of_measurement: "W", device_class: "power" }, { device: dWas });
  add("scene.living_room_movie", "living_room", "unknown", { friendly_name: "Movie", icon: "mdi:movie-open-outline" });
  add("scene.morning", null, "unknown", { friendly_name: "Morning", icon: "mdi:weather-sunset-up" });
  add("scene.film", null, "unknown", { friendly_name: "Movie", icon: "mdi:movie-open-outline" });
  add("scene.evening", null, "unknown", { friendly_name: "Evening", icon: "mdi:candle" });
  add("scene.night", null, "unknown", { friendly_name: "Night", icon: "mdi:power-sleep" });
  add("sensor.p1_power", null, "412", { friendly_name: "Power", unit_of_measurement: "W" });
  add("sensor.p1_energy_today", null, "6.8", { unit_of_measurement: "kWh" });
  add("automation.night_mode", null, "unavailable", { friendly_name: "Night mode" });

  const notifications = [{ notification_id: "update_available", title: "Update available", message: "Home Assistant 2026.10.1 is available.", created_at: ago(40) }];
  const hass = {
    areas, devices, entities, states, floors, language: new URLSearchParams(location.search).get("lang") || "en",
    connection: { subscribeMessage(cb, msg) { console.log("[mock] subscribe", msg.type); if (msg.type === "render_template") { setTimeout(() => cb({ result: msg.template.includes("weather") ? "Partly cloudy" : "example" }), 30); return Promise.resolve(() => {}); } setTimeout(() => cb({ notifications: Object.fromEntries(notifications.map(n => [n.notification_id, n])) }), 50); return () => {}; } },
    callService(domain, service, data) {
      console.log("[mock] callService", domain, service, data);
      const ids = [].concat(data.entity_id || []);
      for (const id of ids) {
        const s = states[id]; if (!s) continue;
        const set = (st, attrs = {}) => { states[id] = { ...s, state: st, attributes: { ...s.attributes, ...attrs }, last_changed: now() }; };
        if (service === "toggle") set(s.state === "on" ? "off" : "on");
        if (domain === "persistent_notification" && service === "dismiss") { const i = notifications.findIndex(n => n.notification_id === data.notification_id); if (i >= 0) notifications.splice(i, 1); }
        if (service === "turn_on") set("on", data.brightness_pct ? { brightness: Math.round(data.brightness_pct * 2.55) } : data.color_temp_kelvin ? { color_temp_kelvin: data.color_temp_kelvin, color_mode: "color_temp" } : data.hs_color ? { hs_color: data.hs_color, color_mode: "hs", rgb_color: (h => { const [hh, ss] = h, c = ss / 100, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = 1 - c; const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x]; return [r, g, b].map(v => Math.round((v + m) * 255)); })(data.hs_color) } : {});
        if (service === "turn_off") set("off");
        if (service === "media_play_pause") set(s.state === "playing" ? "paused" : "playing");
        if (service === "volume_set") set(s.state, { volume_level: data.volume_level });
        if (service === "open_cover") set("open", { current_position: 100 });
        if (service === "close_cover") set("closed", { current_position: 0 });
        if (service === "set_cover_position") set(data.position > 0 ? "open" : "closed", { current_position: data.position });
        if (service === "set_temperature") set(s.state, { temperature: data.temperature });
        if (service === "set_hvac_mode") set(data.hvac_mode);
        if (service === "set_preset_mode") set(s.state, { preset_mode: data.preset_mode });
        if (service === "set_percentage") set("on", { percentage: data.percentage });
        if (service === "lock") set("locked"); if (service === "unlock") set("unlocked");
        if (service === "start") set("cleaning"); if (service === "pause") set("paused"); if (service === "return_to_base") set("returning");
        if (service === "set_humidity") set(s.state, { humidity: data.humidity });
        if (service.startsWith("alarm_")) console.log("[mock] alarm code", data.code), set({ alarm_disarm: "disarmed", alarm_arm_home: "armed_home", alarm_arm_away: "armed_away", alarm_arm_night: "armed_night" }[service]);
      }
      hass.states = { ...states };
      onChange(hass);
      return Promise.resolve();
    },
    callWS(msg) {
      console.log("[mock] callWS", msg);
      if (msg.type === "call_service" && msg.domain === "calendar") { const t = new Date(); return Promise.resolve({ response: { "calendar.family": { events: [{ summary: "Swimming lesson", start: new Date(t.getTime() + 2 * 3600000).toISOString(), end: new Date(t.getTime() + 3 * 3600000).toISOString() }, { summary: "Grandma's birthday", start: new Date(t.getTime() + 86400000).toISOString().slice(0, 10), end: new Date(t.getTime() + 2 * 86400000).toISOString().slice(0, 10) }] } } }); }
      if (msg.type === "history/history_during_period") { const now = Date.now(); return Promise.resolve({ [msg.entity_ids[0]]: [3, 5, 8, 13].flatMap(h => [{ s: "on", lu: (now - h * 3600000) / 1000 }, { s: "off", lu: (now - h * 3600000 + 60000) / 1000 }]) }); }
      if (msg.type === "recorder/statistics_during_period") { const h = new Date().getHours(); const start = new Date(); start.setHours(0, 0, 0, 0); return Promise.resolve({ [msg.statistic_ids[0]]: Array.from({ length: h + 1 }, (_, i) => ({ start: new Date(start.getTime() + i * 36e5).toISOString(), change: +(0.1 + Math.abs(Math.sin(i / 3)) * 0.9).toFixed(2) })) }); }
      if (msg.type === "frontend/get_user_data") return Promise.resolve({ value: JSON.parse(localStorage.getItem("mock:" + msg.key) || "null") });
      if (msg.type === "frontend/set_user_data") { localStorage.setItem("mock:" + msg.key, JSON.stringify(msg.value)); if (msg.key === "core") hass.userData = msg.value; return Promise.resolve({}); }
      return Promise.resolve({ response: {} });
    },
  };
  return hass;
}
