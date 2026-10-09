// Registers the HaCasa logo as an icon set, so `hacasa:logo` works anywhere Home Assistant takes an icon:
// the sidebar (panel_custom sidebar_icon), cards, ha-icon. Load the bundle early with frontend: extra_module_url
// for the sidebar icon to show before the panel is opened.
const VIEWBOX = "0 0 500 443.5596";
// the house and the dot of the HaCasa mark (logo by Fredrik Persson) as one path
const LOGO = "m249.9981,0L0,250.0084l47.8479,47.6828v145.8684h79.22v-66.6484h245.8656v66.6484h79.22v-145.8684l47.8466-47.6841L249.9981,0Zm122.9354,297.6912H127.0678v-62.7184l122.9302-122.9302,122.9354,122.9328v62.7158Z" +
  "M47.8479,39.61a39.61,39.61 0 1,0 79.22,0a39.61,39.61 0 1,0 -79.22,0Z";
const ICONS = { logo: LOGO };

window.customIconsets = window.customIconsets || {};
if (!window.customIconsets.hacasa) window.customIconsets.hacasa = async name => ICONS[name] ? { path: ICONS[name], viewBox: VIEWBOX } : {};
// older frontends and other tools look in customIcons
window.customIcons = window.customIcons || {};
if (!window.customIcons.hacasa) window.customIcons.hacasa = { getIcon: async name => ICONS[name] ? { path: ICONS[name], viewBox: VIEWBOX } : {}, getIconList: async () => Object.keys(ICONS).map(name => ({ name })) };
