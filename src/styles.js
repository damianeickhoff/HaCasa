import { css, unsafeCSS } from "lit";
import { settingsStyles } from "./settings.js";
import { pageStyles } from "./pages.js";
import { extraStyles } from "./extras.js";
import { extra2Styles } from "./extras2.js";
import { featureStyles } from "./features.js";
import { searchStyles } from "./search.js";
import { extra3Styles } from "./extras3.js";

// Started from our own Homio-style mockup; scoped to the panel host.
export const styles = css`
  :host{
    --fg:#fff; --fg-2:rgba(255,255,255,.78); --fg-3:rgba(255,255,255,.55);
    --card:rgba(255,255,255,.10); --card-on:rgba(255,255,255,.34);
    --line:rgba(255,255,255,.14); --line-on:rgba(255,255,255,.38); --accent:#f2b63a;
    --pad:8vw; --u:clamp(1px, min(.07vw, .12vh), 1.25px); --card-h:calc(200 * var(--u)); --card-w:calc(var(--card-h) * 1.6); --card-gap:6px;
    --r:8px; --r-sm:6px; --ease:cubic-bezier(.2,.7,.2,1);
    --font:"Hanken Grotesk",Roboto,system-ui,sans-serif;
    display:block;height:100vh;overflow:hidden;position:relative;
    font-family:var(--font);color:var(--fg);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1;
    background:#222;
  }
  /* photo with a slow drift; the dark wash sits only where the text is (radial, bottom-left) plus a light top/bottom gradient */
  .bg{position:absolute;inset:0;z-index:0;background:var(--bg) center center / cover no-repeat;animation:fadeIn .4s ease-out both,kb 40s ease-in-out infinite alternate;transform-origin:60% 40%;pointer-events:none}
  .bg::after{content:"";position:absolute;inset:0;background:radial-gradient(90% 70% at 18% 62%, rgba(20,20,22,.55) 0%, rgba(20,20,22,0) 100%),linear-gradient(to bottom, rgba(51,51,51,.62) 0%, rgba(51,51,51,.55) 50%, rgba(51,51,51,.45) 100%)}
  .bg.out{animation:none;z-index:0}
  .bg.plain{background:radial-gradient(120% 90% at 15% 0%,#3d454d 0%,#2a2f35 55%,#1d2125 100%);animation:none}
  .bg.grad{background:linear-gradient(160deg,hsl(var(--hue,210) 26% 36%),hsl(calc(var(--hue,210) + 40) 22% 13%));animation:none}
  .bg.plain::after,.bg.grad::after{display:none}
  @keyframes kb{from{transform:scale(1)}to{transform:scale(1.045)}}
  :host(.in-card){height:100%}
  .nav,.title,.strip,.page,.settings,.banner,.empty{z-index:1}
  *{box-sizing:border-box;margin:0;padding:0}
  a{color:inherit;text-decoration:none}
  button{font:inherit;color:inherit}
  ha-icon{--mdc-icon-size:30px;display:inline-flex}
  img.ico{width:30px;height:30px;display:block}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  /* transform-only entrances for wrappers whose children blur the page (an opacity animation on an ancestor stops backdrop-filter) */
  @keyframes downT{from{transform:translateY(-10px)}to{transform:none}}
  @keyframes upT{from{transform:translateY(10px)}to{transform:none}}

  /* ===== navigation ===== */
  .nav{position:absolute;top:calc(40px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));left:var(--pad);right:var(--pad);height:46px;z-index:5;display:flex;--navgap:clamp(10px,1.4vw,18px);gap:var(--navgap);align-items:center;animation:downT .5s var(--ease) both}
  .nav .links + *{margin-left:auto}
  .nav>*{height:46px;display:flex;align-items:center}
  .brand{gap:10px}
  .logo{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:800;letter-spacing:-.4px;cursor:pointer;white-space:nowrap;min-width:0}
  .logo .bt{overflow:hidden;text-overflow:ellipsis;min-width:0}
  .logo .mark{width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:grid;place-items:center;border:1px solid var(--line);flex:none}
  .logo .mark img.ico{width:22px;height:22px}
  .ham{width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.12);backdrop-filter:blur(16px);color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}
  .ham ha-icon{--mdc-icon-size:20px}
  .pill{border-radius:999px;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18)}
  .links{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;gap:2px;padding:4px;max-width:calc(100% - 560px);overflow:auto;scrollbar-width:none}
  .links a{font-size:clamp(12px,1vw,14px);white-space:nowrap;font-weight:600;padding:0 clamp(8px,.85vw,14px);height:36px;display:flex;align-items:center;border-radius:999px;color:var(--fg-2);cursor:pointer;transition:background .2s,color .2s}
  .links a:hover{background:rgba(255,255,255,.08);color:#fff}
  .links a.active{background:rgba(255,255,255,.26);color:#fff;font-weight:700}
  .links .sep{width:1px;height:20px;background:var(--line);align-self:center;margin:0 4px 0 8px;flex:none}
  .links a.search{width:38px;padding:0;justify-content:center;flex:none}
  .links a.search img.ico{width:16px;height:16px}
  .links.srch{padding:0;overflow:visible;width:min(560px,calc(100% - 560px));display:block}
  .links.srch .searchbar{position:static;transform:none;width:100%;animation:none}
  /* floor navigation: one pill per floor, rooms in a dropdown (hover on desktop, tap on touch) */
  /* the pill glass sits on ::before so the dropdown (a child) is not inside a backdrop-filter and can blur on its own; z-index lifts it over the search bar */
  .links.floors{overflow:visible;position:absolute;z-index:7;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;border:0;box-shadow:none}
  .links.floors::before{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18);z-index:-1}
  .links .fl{position:relative;display:flex;align-items:center}
  .links .fl>a{gap:6px}
  .links .fl>a small{font-weight:600;opacity:.6;font-size:.92em}
  .links .fl>a ha-icon{--mdc-icon-size:16px;width:16px;height:16px;opacity:.7;transition:transform .2s;margin-right:-4px}
  .links .fl.open>a ha-icon{transform:rotate(180deg)}
  .links .dd{display:none;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);min-width:190px;flex-direction:column;gap:2px;padding:6px;border-radius:var(--r);background:rgba(255,255,255,.14);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25);z-index:20;animation:fadeIn .15s ease-out both}
  .links .dd::before{content:"";position:absolute;left:0;right:0;top:-10px;height:10px}
  .links .dd a{height:40px;border-radius:var(--r-sm);padding:0 14px;font-size:14px}
  .links .dd a:hover{background:rgba(255,255,255,.1)}
  .links .dd a.active{background:rgba(255,255,255,.22)}
  .links .fl.open .dd{display:flex}
  @media (hover:hover) and (min-width:901px){ .links .fl:hover .dd{display:flex} .links .fl:hover>a ha-icon{transform:rotate(180deg)} }
  @media (max-width:1700px){ .links a{padding:0 clamp(6px,.75vw,12px)} .nav{--navgap:clamp(8px,1.1vw,14px)} }
  @media (max-width:1200px){ .links a{padding:0 clamp(6px,.8vw,12px);font-size:clamp(11px,1vw,13px)} .nav{--navgap:clamp(8px,1.2vw,14px)} }
  .people{display:inline-flex;align-items:center;gap:7px;padding:0 14px 0 12px;cursor:pointer;font-size:14px;font-weight:700}
  .people ha-icon{--mdc-icon-size:18px}
  .people .pc small{font-weight:700;color:var(--fg-3);font-size:inherit}
  .people + .alarm{margin-left:calc(8px - var(--navgap))}
  .alarm{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;padding:0 16px;cursor:pointer;white-space:nowrap}
  .alarm ha-icon{--mdc-icon-size:17px}
  .alarm i{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.4;flex:none}
  .alarm.off i{background:#fff;opacity:.4;box-shadow:none}
  .alarm.armed{background:rgba(255,255,255,.4)}
  .alarm.armed i{background:#f2b63a;opacity:1;box-shadow:0 0 8px rgba(242,182,58,.7)}
  .alarm.home i{background:#8fd16a;opacity:1;box-shadow:0 0 8px rgba(143,209,106,.7)}
  .alarm.arming i{background:#f2b63a;opacity:1;animation:blink 1s ease-in-out infinite}
  .alarm.triggered{background:rgba(242,122,92,.6)}
  .alarm.triggered i{background:#f27a5c;opacity:1;animation:blink .5s ease-in-out infinite}
  .alarm.unavailable i{opacity:.3}
  @keyframes blink{0%,100%{opacity:1;box-shadow:0 0 8px rgba(242,182,58,.8)}50%{opacity:.25;box-shadow:none}}
  .time{align-items:center;justify-content:center;white-space:nowrap}
  .time b{font-size:19px;font-weight:800;letter-spacing:-.4px}
  .time small{font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-top:3px}
  .menu,.sbtn{display:none;width:46px;height:46px;border-radius:999px;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18);place-items:center;cursor:pointer;flex:none;color:#fff}
  .menu img,.sbtn img{width:18px;height:18px}
  .sbtn.on{background:rgba(255,255,255,.3)}

  /* ===== title block: eyebrow, greeting, one line, rotating notice; weather block on the right ===== */
  .title{position:absolute;left:var(--pad);right:var(--pad);top:44%;transform:translateY(-50%);display:grid;grid-template-columns:minmax(0,1fr) max-content;align-items:end;gap:40px}
  .title>*{animation:upT .6s var(--ease) both;animation-delay:.1s}
  .title .tl{min-width:0}
  .title .temp{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);min-height:18px}
  .title .temp .dt{margin:0 -3px}
  .title h1{font-size:clamp(48px,6.6vw,92px);font-weight:600;letter-spacing:-3.2px;line-height:1;margin:12px 0 6px;text-shadow:0 2px 24px rgba(0,0,0,.25)}
  .title .sub{font-size:19px;font-weight:400;color:var(--fg-2);max-width:48ch;line-height:1.35;min-height:22px}
  .title .sub b{font-weight:600;color:#fff}
  .ticker{margin:8px 0 0 2px;height:24px;position:relative;overflow:hidden;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);max-width:640px}
  .pills{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0 2px}
  .pills button{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--fg-2);font:inherit;font-size:13px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .2s}
  .pills button.on{background:rgba(255,255,255,.18);color:#fff}
  .pills button:active{background:rgba(255,255,255,.3)}
  .pills button img.ico,.pills button ha-icon{width:17px;height:17px;--mdc-icon-size:17px}
  .title .pills + .quick{margin-top:10px}
  .ticker div{position:absolute;left:0;top:0;height:24px;display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(100%);transition:opacity .45s var(--ease),transform .45s var(--ease);white-space:nowrap}
  .ticker div.show{opacity:1;transform:none}
  .ticker div.out{opacity:0;transform:translateY(-100%)}
  .ticker .tt{color:#fff;font-weight:700}
  .ticker b{color:#fff;font-weight:700}
  .ticker span{color:var(--fg-2)}
  .dt,.ticker .dt,.card .s .dt,.card .lbl .dt,.wx .cnd .dt,.title .temp .dt{display:inline-block;width:4px;height:4px;border-radius:50%;background:#fff;opacity:.5;margin:0 7px;vertical-align:2px;flex:none}
  .ticker .dt{margin:0 -3px}
  .card .lbl .dt{align-self:center}
  .ticker ha-icon{--mdc-icon-size:18px}
  .ticker img.ico{width:18px;height:18px}
  .wx{text-align:right;padding-bottom:6px;cursor:pointer;animation-name:upT;animation-delay:.25s}
  .wx .big{display:flex;align-items:flex-start;justify-content:flex-end;gap:6px}
  .wx .big img.ico,.wx .big ha-icon{width:52px;height:52px;--mdc-icon-size:52px;margin-top:6px;opacity:.95}
  .wx .t{font-size:72px;font-weight:500;letter-spacing:-3px;line-height:1}
  .wx .t sup{font-size:28px;font-weight:600;vertical-align:top;margin-left:2px;line-height:1.6}
  .wx .cnd{font-size:15px;font-weight:600;color:var(--fg-2);margin-top:2px}
  .wx .hl{font-size:13px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-top:4px}
  .wx .hours{display:flex;gap:4px;justify-content:flex-end;margin-top:14px}
  .wx .hours div{width:64px;padding:10px 0;border-radius:var(--r);background:rgba(255,255,255,.10);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--line);text-align:center;font-size:12px;font-weight:600;color:var(--fg-2)}
  .wx .hours div{font-size:13px}
  .wx .hours div img.ico,.wx .hours div ha-icon{width:24px;height:24px;--mdc-icon-size:24px;margin:6px auto;display:block}
  .wx .hours div b{display:block;color:#fff;font-weight:700;font-size:14px}
  @media (max-width:1100px){ .wx .hours{display:none} }

  /* ===== card strip ===== */
  .strip{position:absolute;left:var(--pad);right:0;bottom:85px;display:flex;gap:var(--card-gap);overflow-x:auto;scroll-snap-type:none;scrollbar-width:none;padding:6px 0}
  @media (pointer:coarse){ .strip{scroll-snap-type:x proximity} }
  .strip::-webkit-scrollbar{display:none}
  /* soft shadows on the row's edges: right always, left once scrolled */
  .sfade{position:absolute;bottom:85px;height:calc(var(--card-h) + 12px);width:64px;pointer-events:none;z-index:2;opacity:0;transition:opacity .25s}
  .sfade.r{right:0;background:linear-gradient(to left,rgba(0,0,0,.38),transparent);opacity:1}
  .sfade.l{left:var(--pad);background:linear-gradient(to right,rgba(0,0,0,.38),transparent)}
  .sfade.l.on{opacity:1}
  .strip::after{content:"";flex:none;width:var(--pad)}
  .strip.drag{cursor:grabbing;scroll-snap-type:none}
  /* layout: icon + corner text on top, name/state centred in what is left, caps line at the bottom */
  .card{flex:none;width:var(--card-w);height:var(--card-h);background:var(--card);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 12px 32px rgba(0,0,0,.18);--cp:22px;padding:var(--cp);display:grid;grid-template-columns:minmax(0,1fr) max-content;grid-template-rows:max-content 1fr max-content max-content 1fr 28px;grid-template-areas:"i c" ". ." "n n" "s s" ". ." "l l";scroll-snap-align:start;position:relative;border-radius:var(--r);overflow:hidden;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;animation:rise .55s var(--ease) both;transition:transform .25s var(--ease),background .25s,border-color .25s,padding .3s}
  .card:nth-child(2){animation-delay:60ms}.card:nth-child(3){animation-delay:120ms}.card:nth-child(4){animation-delay:180ms}.card:nth-child(5){animation-delay:240ms}.card:nth-child(n+6){animation-delay:300ms}
  @media (hover:hover){ .card:hover{transform:translateY(-3px);background-color:rgba(255,255,255,.14)} .card.on:hover{background-color:rgba(255,255,255,.4)} .card.art:hover,.card.appart:hover{background-color:transparent} }
  .card.on{background:var(--card-on);border-color:var(--line-on)}
  /* no opacity/filter here: both would turn the card into a backdrop root and kill the blur behind it */
  .card.unavailable{background:rgba(255,255,255,.04);border-style:dashed;color:var(--fg-3)}
  .card.unavailable .i,.card.unavailable .ua{opacity:.5}
  .card.unavailable .i{filter:grayscale(1)}
  .card.unavailable .ctl,.card.unavailable .seg,.card.unavailable .socks,.card.unavailable .slider{display:none}
  .card.unavailable .s{font-style:italic}
  .card .i{grid-area:i;width:36px;height:36px;margin-left:-3px;align-self:center}
  .card .i img.ico{width:100%;height:100%;display:block}
  .card .i ha-icon{--mdc-icon-size:40px;margin:-2px}
  .card .c{position:absolute;top:var(--cp);right:var(--cp);height:36px;display:flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--fg-2);white-space:nowrap;max-width:calc(var(--card-w) * .55);overflow:hidden;text-overflow:ellipsis}
  .card .n{grid-area:n;font-size:17px;font-weight:600;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .card .s{grid-area:s;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .s b{color:var(--fg-2);font-weight:600}
  .card .s.big{font-size:36px;font-weight:600;letter-spacing:-1.8px;line-height:1;color:#fff;margin:0}
  .card .lbl{grid-area:l;height:28px;display:flex;align-items:flex-end;font-size:11px;text-transform:uppercase;letter-spacing:1.8px;font-weight:600;color:var(--fg-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .lbl>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card .lbl.steps{display:flex;gap:4px;overflow:visible;align-items:center}
  .card .lbl.steps button{height:28px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);font:inherit;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);cursor:pointer}
  .card .lbl.steps button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card .lbl.cols{display:flex;gap:6px;align-items:center;overflow:visible}
  .card .lbl.cols button{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.35);padding:0;cursor:pointer;flex:none}
  .card .lbl.cols button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.25)}
  .card .lbl.cols span{margin-left:4px;overflow:hidden;text-overflow:ellipsis}
  .card .lbl.bars{display:flex;align-items:flex-end;gap:2px;padding:6px 0 0;margin:0;height:28px}
  .card .lbl.bars i{flex:1;background:rgba(255,255,255,.25);border-radius:2px 2px 0 0;min-height:2px}
  .card .lbl.bars i.on{background:#fff}
  .card .lbl.today b{color:#fff;font-weight:700}
  .card .bat{position:absolute;right:var(--cp);bottom:var(--cp);display:flex;align-items:center;gap:5px;height:14px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:var(--fg-3)}
  .card .bat img.ico,.card .bat ha-icon{width:14px;height:14px;--mdc-icon-size:14px;opacity:.8}
  .card .bat.low{color:#fff}
  .card.vs .bat{right:calc(var(--cp) + 26px)}
  .card:has(.bat) .lbl{padding-right:66px}
  .card:has(.bat) .lbl.bars{margin-right:66px;padding-right:0}
  .card .ua{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.25);display:grid;place-items:center}
  .card .ua ha-icon{--mdc-icon-size:16px}
  /* cards with action buttons keep the text clear of the button column */
  .card.actions{padding-right:calc(var(--cp) + 56px)}
  .card .ctl{position:absolute;right:var(--cp);bottom:var(--cp);width:46px;display:grid;grid-auto-rows:46px;gap:4px}
  .card .ctl button{border:1px solid rgba(255,255,255,.08);border-radius:var(--r-sm);background:rgba(0,0,0,.22);color:#fff;cursor:pointer;display:grid;place-items:center;-webkit-tap-highlight-color:transparent;transition:background .15s}
  .card .ctl button:active{background:rgba(0,0,0,.35)}
  .card .ctl button img{display:block;width:18px;transform:rotate(-90deg)}
  .card .ctl button.down img{transform:rotate(90deg)}
  .card .ctl button ha-icon{--mdc-icon-size:22px}
  /* climate: setpoint big above the name, current temperature under it, presets bottom-left, hvac modes in a column left of up/down */
  .card.climate{grid-template-areas:"i c" ". ." "s s" "n n" "l l" ". .";grid-template-rows:max-content 1fr max-content max-content max-content 1fr;--bt:calc(30 * var(--u));--rw:calc(44 * var(--u));padding-right:calc(var(--rw) + var(--cp) + 14px);padding-bottom:calc(var(--bt) + var(--cp) + 10px)}
  .card.climate .ctl.row{position:absolute;left:var(--cp);right:auto;bottom:var(--cp);width:auto;display:flex;align-items:center;gap:4px;grid-auto-rows:auto}
  .card.climate .ctl.row .seg{height:var(--bt);padding:3px;align-items:center;margin-right:4px}
  .card.climate .ctl.row .seg button{height:100%;white-space:nowrap;padding:0 10px;font-size:calc(10 * var(--u))}
  .card.climate .ctl.row>button{width:var(--bt);height:var(--bt);flex:none;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:999px}
  .card.climate .ctl.row>button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.climate .ctl.row>button ha-icon{--mdc-icon-size:calc(16 * var(--u))}
  /* the rail: + at the top, − at the bottom, drag the filled part to set the temperature */
  .card.climate .c{right:calc(var(--rw) + var(--cp) + 12px)}
  .card.climate .rail{position:absolute;top:var(--cp);bottom:var(--cp);right:var(--cp);width:var(--rw);border-radius:999px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);touch-action:none;user-select:none;overflow:hidden}
  .card.climate .rail i{position:absolute;left:3px;right:3px;bottom:3px;height:calc(var(--v) * 1%);border-radius:999px;background:rgba(255,255,255,.22);pointer-events:none;transition:height .15s}
  .card.climate .rail b::after{content:attr(data-v)}
  .card.climate .rail b{position:absolute;left:3px;right:3px;height:calc(var(--rw) - 6px);bottom:calc(var(--v) * 1% - (var(--rw) - 6px) / 2);border-radius:50%;background:#fff;color:#1d1d1f;display:grid;place-items:center;font-size:calc(11 * var(--u));font-weight:800;letter-spacing:-.3px;pointer-events:none;transition:bottom .15s}
  .card.climate .rail em{position:absolute;left:0;right:0;height:26px;display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:700;color:var(--fg-2);cursor:pointer}
  .card.climate .rail em.up{top:2px} .card.climate .rail em.dn{bottom:2px}
  .card.climate:not(.on) .rail i{background:rgba(255,255,255,.12)}
  .card.climate:not(.on) .rail b{background:rgba(255,255,255,.6)}
  .card.climate .seg button{height:30px;padding:0 10px;font-size:10px}
  .card.climate .n{margin-top:4px}
  .card.climate .lbl{font-size:13px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--fg-3);margin-top:3px}
  .card .seg{display:inline-flex;border-radius:999px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);padding:3px;width:max-content}
  .card .seg button{border:0;border-radius:999px;background:transparent;color:var(--fg-3);font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;height:32px;padding:0 14px;cursor:pointer}
  .card .seg button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* media: artwork fills the card, the text sits on a translucent panel on the right, transport row at the bottom */
  .card.media{grid-template-areas:"i c" ". ." "n n" "s s" "l l" ". .";grid-template-rows:max-content 1fr max-content max-content max-content 1fr;padding:var(--cp) var(--cp) 72px calc(var(--card-w) * .34 + var(--cp))}
  .card.media:not(.art):not(.appart){padding-left:var(--cp)}
  .card.art,.card.appart{--cb:rgba(255,255,255,.2);border-color:var(--cb)}
  .card.art{background-size:cover;background-position:center}
  .card.art::before,.card.appart::before{content:"";position:absolute;top:0;bottom:0;right:0;left:34%;background:rgba(20,20,24,.32);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);box-shadow:-6px 0 14px -2px rgba(0,0,0,.4);pointer-events:none}
  .card.art>*:not(.ctl):not(.ua):not(.appi):not(.c),.card.appart>*:not(.ctl):not(.ua):not(.appi):not(.c){position:relative}
  .card.art .c,.card.appart .c{z-index:1}
  .card.art .ctl{z-index:1}
  .card.media .prog{grid-area:l;height:3px;border-radius:2px;background:rgba(255,255,255,.18);margin-top:10px;overflow:hidden;align-self:start}
  .card.media .prog i{display:block;height:100%;background:#fff;border-radius:2px}
  .card.media .ctl{left:calc(var(--card-w) * .34 + var(--cp));right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.media:not(.art):not(.appart) .ctl{left:var(--cp)}
  .card.media .ctl button{flex:1;height:42px;background:rgba(255,255,255,.12);border:1px solid var(--line)}
  .card.media .ctl button.main{flex:1.6;background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  /* media card without artwork: the running app in its brand colour */
  .card.appart{background:linear-gradient(135deg,color-mix(in srgb,var(--app,#8a8f96) 70%,#1c1c1c) 0%,color-mix(in srgb,var(--app,#8a8f96) 30%,#1c1c1c) 100%)}
  .card.appart .appi{position:absolute;left:calc(var(--card-w) * .17);top:50%;transform:translate(-50%,-50%);--mdc-icon-size:44px;opacity:.95}
  /* light colour tint */
  .card.tinted .slider{background:rgba(255,255,255,.9)}
  /* vertical brightness / speed / position bar: full card height, fills from the bottom, value in the corner */
  .card.vs{padding-right:calc(var(--cp) + 26px)}
  .card.vs .c{right:calc(var(--cp) + 26px)}
  .vslider{position:absolute;top:var(--cp);bottom:var(--cp);right:var(--cp);width:12px;border-radius:999px;background:rgba(255,255,255,.14);cursor:ns-resize;touch-action:none;overflow:hidden}
  .vslider::before{content:"";position:absolute;inset:0 -14px}
  .vslider i{position:absolute;left:0;right:0;bottom:0;height:var(--v,0%);background:#fff;border-radius:999px;transition:height .15s;pointer-events:none}
  .card.vs:not(.on) .vslider{background:rgba(255,255,255,.08)}
  .card.vs:not(.on) .vslider i{height:0}
  .card .slider{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);height:8px;border-radius:20px;background:hsl(0 0% 98%);transition:transform .6s,opacity .3s;cursor:pointer}
  .card .slider i{position:absolute;left:0;top:0;bottom:0;border-radius:20px;background:hsl(0 0% 75%);width:var(--v);pointer-events:none}
  .card .slider b{position:absolute;top:50%;left:var(--v);width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;box-shadow:2px 0 8px 2px rgba(0,0,0,.15);pointer-events:none}
  .card:not(.on) .slider{transform:translateY(45px);opacity:0;pointer-events:none}
  /* camera: snapshot behind, name and state in the bottom-left over a gradient */
  .card.cam{grid-template-areas:"i c" ". ." "n n" "s s";grid-template-rows:max-content 1fr max-content max-content;isolation:isolate}
  .card.cam hcn-cam-snap{z-index:-1}
  .card.cam::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(20,20,20,.75),rgba(20,20,20,0) 60%);pointer-events:none}
  .card.cam .n,.card.cam .s,.card.cam .i{position:relative}
  /* power strip sockets */
  .card.pstrip{padding-bottom:92px}
  .card .socks{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);display:flex;gap:6px}
  .card .socks button{flex:1;height:56px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:grid;place-items:center;gap:2px;font:inherit;-webkit-tap-highlight-color:transparent;user-select:none}
  .card .socks button.on{background:rgba(255,255,255,.45)}
  .card .socks button.unavailable{opacity:.35}
  .card .socks button ha-icon{--mdc-icon-size:20px}
  .card .socks button small{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* appliance: stop / power row at the bottom */
  .card.appl{padding-bottom:calc(var(--cp) + 34px + 10px)}
  .card.appl .ctl.row{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.appl .ctl.row button{height:34px;padding:0 14px;flex:none;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:var(--r-sm)}
  .card.appl .ctl.row button ha-icon{--mdc-icon-size:16px}
  .card.appl .ctl.row button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.noname .n,.card.nosub .s,.card.nostate .c{display:none}
  .card.acts{padding-bottom:calc(var(--cp) + 34px + 10px)}
  .card.acts .ctl.row{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.acts .ctl.row button{height:34px;padding:0 14px;flex:none;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:var(--r-sm)}
  .card.acts .ctl.row button ha-icon{--mdc-icon-size:16px}
  .card.acts.vs .ctl.row{right:calc(var(--cp) + 26px)}
  .card.acts .lbl{display:none}
  /* plug with a power meter: watts as the hero, sparkline right, options at the bottom */
  .card.plug{grid-template-areas:"i c" ". ." "s s" "n n" "l l" ". ." "f f";grid-template-rows:max-content 1fr max-content max-content max-content 1fr max-content}
  .card.plug .s.big small{font-size:16px;font-weight:600;letter-spacing:0;color:var(--fg-3);margin-left:4px}
  .card.plug .meta{grid-area:l;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card.plug .meta b{color:var(--fg-2);font-weight:600}
  .card.plug .lbl{grid-area:f}
  .card.plug .spk{position:absolute;right:var(--cp);top:calc(var(--cp) + 50px);width:110px;height:34px;pointer-events:none}
  .card.plug .spk svg{width:100%;height:100%}
  .card.plug.appl .spk{top:auto;bottom:calc(var(--cp) + 46px)}
  .card.plug.hasspk{padding-right:calc(var(--cp) + 120px)}
  .card .lbl.chips{display:flex;gap:4px;align-items:center;overflow:visible}
  .card .lbl.chips button{height:28px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);font:inherit;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);cursor:pointer}
  .card .lbl.chips button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* with an action row, the bottom option shares the line with the buttons */
  .card.plug.appl{grid-template-areas:"i c" ". ." "s s" "n n" "l l" ". .";grid-template-rows:max-content 1fr max-content max-content max-content 1fr}
  .card.plug.appl .lbl{position:absolute;left:var(--cp);right:calc(var(--cp) + 96px);bottom:var(--cp);height:34px;align-items:center}
  .card.plug.appl .ctl.row{left:auto}
  .card.plug .c i{width:6px;height:6px;border-radius:50%;background:#fff;margin-right:7px;animation:blink 1.4s ease-in-out infinite}
  .card .lbl.cost b{color:#fff;font-weight:700}
  /* attention list */
  .card.list .s{white-space:normal;display:flex;flex-direction:column;gap:6px;margin-top:10px;overflow:hidden}
  .card.list .s span{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--fg-2);white-space:nowrap;min-width:0}
  .card.list .s span img.ico,.card.list .s span ha-icon{width:16px;height:16px;--mdc-icon-size:16px;opacity:.8;flex:none}
  .card.list .s span b{font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis}
  .card.list .s span em{margin-left:auto;font-style:normal;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.14);flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis}
  .card.people .s{display:flex;gap:6px;margin-top:4px}
  .card.people .s span{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.3);display:grid;place-items:center;font-size:12px;font-weight:700;overflow:hidden}
  .card.people .s span img{width:100%;height:100%;object-fit:cover}
  .card.people .s span.away{opacity:.3}
  /* scenes: one button per scene with its name */
  .card.scenes .s{display:flex;gap:6px;margin-top:10px;white-space:normal;overflow:visible}
  .card.scenes .s button{flex:1;min-width:0;height:52px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;display:grid;place-items:center;gap:3px;padding:0 4px;align-content:center}
  .card.scenes .s button ha-icon{--mdc-icon-size:20px}
  .card.scenes .s button small{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
  .card.scenes .s button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* sub-card: a glass tile inside a card listing what comes next (agenda, weather, waste) */
  .card.hassub{padding-right:calc(var(--card-w) * .42 + 16px)}
  .card .subc{position:absolute;right:var(--cp);top:var(--cp);bottom:var(--cp);width:calc(var(--card-w) * .40);border-left:1px solid var(--line);padding-left:16px;display:flex;flex-direction:column;justify-content:center;gap:12px;overflow:hidden}
  .card .subc div{min-width:0}
  .card .subc div b{display:block;font-size:9px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .subc div span{display:block;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
  .card.group .gtiles{display:flex;gap:6px;margin-top:10px;white-space:normal;overflow:visible}
  .card.group .gtiles button{flex:1;min-width:0;height:52px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;display:grid;place-items:center;gap:3px;padding:0 4px;align-content:center}
  .card.group .gtiles button img.ico{width:20px;height:20px}
  .card.group .gtiles button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.group .gtiles button.on img.ico{filter:invert(1)}
  .card.group .gtiles button small{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
  .card.group .glist{white-space:normal;display:flex;flex-direction:column;gap:6px;margin-top:8px;overflow:hidden}
  .card.group .glist div{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--fg-2);white-space:nowrap;min-width:0}
  .card.group .glist div i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);flex:none}
  .card.group .glist div.on{color:#fff}
  .card.group .glist div.on i{background:#fff;box-shadow:0 0 8px rgba(255,255,255,.7)}
  .card.group .glist div img.ico{width:16px;height:16px;opacity:.9;flex:none}
  .card.group .glist div span{overflow:hidden;text-overflow:ellipsis}
  .card.group .glist div b{margin-left:auto;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3);flex:none}
  .card.group .glist div.on b{color:#fff}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
  .empty{position:absolute;left:var(--pad);bottom:120px;font-size:14px;opacity:.6}

  /* ===== motion banner ===== */
  .banner{position:absolute;left:0;right:0;bottom:0;padding:17px 20px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;background:rgba(255,255,255,.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--line);display:flex;justify-content:center;align-items:center;gap:10px;transform:translateY(100%);transition:transform .5s var(--ease);z-index:4}
  .banner.show{transform:translateY(0)}
  .banner img.ico{width:16px;height:16px}

  /* ===== popups ===== */
  .overlay{position:fixed;inset:0;z-index:50;background:rgba(20,20,20,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center}
  .toast.info{background:rgba(255,255,255,.14);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);color:#fff;font-weight:600;letter-spacing:0}
  .popup{width:max-content;min-width:400px;max-width:min(620px,calc(100vw - 32px));max-height:80vh;overflow:auto;border-radius:10px;background:rgba(255,255,255,.10);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 24px 60px rgba(0,0,0,.35);padding:28px 30px 26px;animation:upT .25s var(--ease);scrollbar-width:none}
  .overlay{animation:fadeIn .2s ease-out}
  .popup h2{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .popup h2 .hb{display:flex;gap:6px;flex:none}
  .popup h2 .hb button{width:32px;height:32px;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:grid;place-items:center}
  .popup h2 .hb button img{width:14px;height:14px}
  .popup h2 .hb button ha-icon{--mdc-icon-size:18px}
  .popup .big{font-size:clamp(26px,4vw,40px);font-weight:600;letter-spacing:-1.5px;margin:14px 0 2px;overflow-wrap:anywhere}
  .popup.wide{max-width:min(960px,calc(100vw - 32px));width:min(960px,calc(100vw - 32px))}
  .popup .menu-list{list-style:none;margin-top:18px}
  .popup .menu-list li{cursor:pointer}
  .popup.wide .form .f{grid-template-columns:160px 1fr}
  .popup .form .f{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;padding:10px 12px;margin-top:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:var(--r-sm);font-size:13px;font-weight:600}
  .popup .form .chk3{display:flex;gap:14px;font-weight:600}
  .popup .form .chk3 label{display:inline-flex;align-items:center;gap:6px}
  .popup .form .f.acts{grid-template-columns:140px 1fr}
  .popup .form .f.acts .arow{display:grid;grid-template-columns:1fr 1fr 1.2fr 1.4fr;gap:4px;margin-bottom:4px}
  .popup .form .f.acts .arow input{font-size:12px;padding:7px 8px}
  .popup .form input,.popup .form select{width:100%;border:0;border-radius:var(--r-sm);padding:9px 11px;background:rgba(0,0,0,.3);color:#fff;font:inherit;font-size:13px;outline:none}
  .popup .form select{color-scheme:dark}
  .popup .form select option{color:#fff;background:#2b2b2b}
  .popup .form input[type=checkbox]{width:auto;justify-self:start;accent-color:#fff}
  .popup .sub{font-size:14px;opacity:.75;margin-bottom:18px}
  .popup ul{list-style:none;display:flex;flex-direction:column;gap:4px;margin-top:18px}
  .popup li{border-radius:var(--r-sm);display:grid;grid-template-columns:30px 1fr max-content;gap:16px;align-items:center;padding:14px 16px;background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:15px;font-weight:600}
  .popup li.on{background:rgba(255,255,255,.3);border-color:var(--line-on)}
  .popup li.tap{cursor:pointer}
  .popup li small{display:block;font-size:12px;font-weight:500;opacity:.7;margin-top:2px}
  .popup li .st{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.8;white-space:nowrap}
  .popup li ha-icon{--mdc-icon-size:26px}
  .popup li img.ico{width:26px;height:26px}
  .popup .prow{display:grid;grid-template-columns:1fr max-content;gap:6px 12px;align-items:center;margin-top:16px;font-size:13px;font-weight:600}
  .popup .modes{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:18px}
  .popup .modes.n2{grid-template-columns:1fr 1fr}
  .popup .modes.n3{grid-template-columns:repeat(3,1fr)}
  .popup .mart{height:170px;margin-top:16px;border-radius:var(--r-sm);background-size:cover;background-position:center}
  .popup .modes.att{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px}
  .popup .modes.att button{flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:6px;padding:13px 11px;font-size:11px;letter-spacing:.6px;white-space:nowrap}
  .popup .modes.att .cnt{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:rgba(255,255,255,.2);font-size:10px;letter-spacing:0;line-height:18px;text-align:center}
  .popup .modes.att button.on .cnt{background:rgba(0,0,0,.25)}
  .popup .modes button{border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:14px 0;cursor:pointer}
  .popup .modes button.on{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .popup .therm{display:grid;grid-template-columns:1fr 80px 80px;gap:4px;align-items:center;margin-top:14px}
  .popup .therm button{border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;height:64px;cursor:pointer;display:grid;place-items:center}
  .popup .therm button img{width:18px;transform:rotate(-90deg)}
  .popup .therm button.down img{transform:rotate(90deg)}
  .popup .fc{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:18px}
  .popup .fc div{border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);padding:14px 0;text-align:center;font-size:12px;font-weight:600}
  .popup .fc div ha-icon{--mdc-icon-size:24px;display:block;margin:6px auto}
  .popup .fc div b{display:block;font-size:15px}
  .popup .fc.week{grid-template-columns:repeat(7,1fr)}
  .popup .fc.week div{padding:10px 0}
  .popup .fc div small{display:block;font-size:11px;opacity:.6}
  .popup .fc div em{display:block;font-style:normal;font-size:10px;opacity:.6;margin-top:2px}
  .popup .pages{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:18px}
  .popup .pages a{display:flex;align-items:center;gap:14px;padding:18px 16px;background:rgba(255,255,255,.08);border:1px solid var(--line);border-radius:var(--r-sm);font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
  .popup .pages a:hover{background:rgba(255,255,255,.14)}
  .popup .pages a ha-icon{--mdc-icon-size:24px}
  .popup .pages a small{display:block;font-size:12px;font-weight:500;opacity:.7}
  .popup .avs{display:flex;gap:6px;margin-top:14px}
  /* real range inputs, styled like Homio's slider */
  input[type=range]{-webkit-appearance:none;appearance:none;grid-column:1/3;width:100%;height:8px;border-radius:20px;background:rgba(255,255,255,.35);margin:6px 0 0;outline:none}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:2px 0 8px 2px rgba(0,0,0,.15);cursor:pointer}
  input[type=range]::-moz-range-thumb{width:20px;height:20px;border:0;border-radius:50%;background:#fff;cursor:pointer}
  input[type=range].hue{background:linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)}
  input[type=range].ct{background:linear-gradient(to right,#ffb46e,#fff2e0,#cfe3ff)}
  .popup .swatches{display:flex;gap:8px;margin-top:14px}
  .popup .swatches button{flex:1;height:34px;border:0;border-radius:999px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
  .popup .swatches button.on{box-shadow:inset 0 0 0 3px #fff}

  /* ===== tablet portrait & phone ===== */
  @media (max-width:900px){
    :host(.in-card){position:relative;height:100%}
    :host{--pad:20px;--u:1px;--card-h:132px;position:fixed;inset:0;height:auto;max-height:none;overflow:hidden;overscroll-behavior:none;touch-action:none;display:flex;flex-direction:column}
    .strip,.page,.settings,.popup,.nav.open .links{touch-action:pan-y}
    .nav{top:calc(20px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));display:grid;grid-template-columns:minmax(0,1fr) 0 max-content max-content max-content max-content;height:46px;grid-column-gap:10px;animation:none}
    .nav .links + *{margin-left:0}
    .nav .searchbar{position:absolute;top:calc(100% + 8px);left:0;right:0;transform:none;width:auto;animation:none;z-index:8}
    .sbtn{display:grid}
    .nav.open .links .sep,.nav.open .links a.search{display:none}
    .logo{font-size:17px;flex:1;min-width:0}
    @media (max-width:400px){.logo .bt{display:none}}   /* small phones: the pills need the room, the home mark stays */
    /* compact glass pills: count and status dot sit inside the pill, like on desktop (no badges on top) */
    .people{justify-self:end;min-width:44px;padding:0 13px 0 12px;justify-content:center;gap:6px}
    .people .pc{font-size:13px}
    .people .pc small{display:none}
    .people + .alarm{margin-left:0}
    .time{display:none}
    .alarm{min-width:44px;padding:0 13px 0 12px;justify-content:center;gap:7px}
    .alarm .al{display:none}
    .alarm i{width:7px;height:7px}
    .menu{display:grid}
    .links{display:none}
    .nav.open .links{display:flex;flex-direction:column;align-items:stretch;gap:4px;position:fixed;top:0;left:0;bottom:0;transform:none;max-width:none;width:260px;height:auto;padding:calc(90px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 20px 30px;border-radius:0;background:rgba(28,28,32,.55);backdrop-filter:blur(28px) saturate(1.3);-webkit-backdrop-filter:blur(28px) saturate(1.3);border:0;border-right:1px solid var(--line);box-shadow:20px 0 60px rgba(0,0,0,.35);z-index:40;overflow:auto}
    .nav.open .links a{height:46px;font-size:17px;border-radius:var(--r-sm)}
    .nav.open .links.floors{position:fixed;overflow:auto;background:rgba(28,28,32,.55);backdrop-filter:blur(28px) saturate(1.3);-webkit-backdrop-filter:blur(28px) saturate(1.3);border-right:1px solid var(--line);box-shadow:20px 0 60px rgba(0,0,0,.35)}
    .nav.open .links.floors::before{display:none}
    .nav.open .links .fl{flex-direction:column;align-items:stretch}
    .nav.open .links .fl>a{justify-content:space-between;gap:10px}
    .nav.open .links .fl>a small{margin-left:auto;opacity:.5}
    .nav.open .links .fl>a ha-icon{margin:0;opacity:.6;flex:none}
    .nav.open .links .dd{position:static;transform:none;min-width:0;margin:0 0 8px 16px;padding:0 0 0 12px;border:0;border-left:1px solid var(--line);border-radius:0;background:none;box-shadow:none;animation:none;backdrop-filter:none;-webkit-backdrop-filter:none}
    .nav.open .links .dd a{height:42px;font-size:16px;font-weight:600;padding:0 10px;color:var(--fg-2)}
    .nav.open .links .dd a.active{color:#fff;background:rgba(255,255,255,.14)}
    .nav.open .links.expanded .fl>a{cursor:default;font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:.6;height:34px;background:none}
    .nav.open .links.expanded .fl>a small{display:none}
    .nav.open .links.expanded .dd{padding-left:0}
    .title{position:static;transform:none;flex:none;padding:calc(88px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) var(--pad) 18px;display:block}
    .title .temp{font-size:11px;letter-spacing:1.4px;gap:6px}
    .title h1{font-size:clamp(40px,11vw,64px);letter-spacing:-2px}
    .title .sub{font-size:15px}
    .ticker{height:40px;font-size:11px;letter-spacing:1.3px;max-width:none;margin-top:14px}
    .ticker div{align-items:center;line-height:1.4;white-space:normal}
    .ticker div span{min-width:0}
    .wx{display:none;text-align:left;align-items:center;gap:14px;padding:0;margin-top:16px}
    .wx.wxm{display:flex}
    .card.hassub{padding-right:var(--cp)}
    .card .subc{display:none}
    .card.climate{--bt:26px;--rw:34px;padding-right:calc(var(--rw) + var(--cp) + 10px);padding-bottom:var(--cp)}
    .card.climate .ctl.row{display:none}
    .card.climate .c{right:calc(var(--rw) + var(--cp) + 8px)}
    .card.climate .rail em{display:none}
    .card.climate .rail b{font-size:9px}
    .pills{gap:6px;margin-top:10px}
    .pills button{height:32px;font-size:12px;padding:0 12px 0 9px}
    .card.climate .ctl.row button.mode ha-icon{--mdc-icon-size:15px}
    .card.climate .seg{margin-right:2px}
    .wx .big{justify-content:flex-start;gap:4px}
    .wx .big img.ico,.wx .big ha-icon{width:36px;height:36px;--mdc-icon-size:36px;margin-top:0}
    .wx .t{font-size:40px;letter-spacing:-2px}
    .wx .t sup{font-size:16px;line-height:1.4}
    .wx .cnd{margin:0}
    .wx .hl{margin-top:2px}
    .wx .hours{display:none}
    .strip{position:static;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:6px;padding:4px var(--pad) calc(90px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));scroll-snap-type:none;scrollbar-width:none}
    .strip::after{display:none}
    .sfade{display:none}
    .card{--cp:14px;width:auto;height:var(--card-h);padding:var(--cp);grid-template-rows:max-content 1fr max-content max-content 1fr 24px}
    .card .i{width:26px;height:26px;margin-left:-2px}
    .card .i img.ico{width:26px;height:26px}
    .card .i ha-icon{--mdc-icon-size:30px;margin:-2px}
    .card .c{font-size:9px;letter-spacing:1.2px;height:26px}
    .card .n{font-size:14px}
    .card .s{font-size:11px;margin-top:2px}
    .card .s.big{font-size:24px;letter-spacing:-1px}
    .card .lbl{font-size:9px;letter-spacing:1.4px;height:24px}
    .card .lbl.steps button{height:24px;padding:0 8px;font-size:9px}
    .card .lbl.cols button{width:20px;height:20px}
    .card .lbl.bars{padding-top:6px}
    .card.plug .spk{display:none}
    .card.plug .meta{display:none}
    .card.plug.appl .lbl{right:calc(var(--cp) + 70px);height:30px}
    .card.plug.hasspk{padding-right:var(--cp)}
    .card.actions{padding-right:calc(var(--cp) + 40px)}
    .card .ctl{width:34px;grid-auto-rows:34px;gap:3px}
    .card .ctl button img{width:14px}
    .card .ctl button ha-icon{--mdc-icon-size:18px}
    .card .ctl.modes{display:none}
    .card.wide{padding-right:52px}
    .card.climate .lbl{display:none}
    .card .s.big{font-size:22px}
    .card .seg{padding:2px}
    .card .seg button{height:24px;padding:0 9px;font-size:9px}
    .card.media{padding:var(--cp) var(--cp) 46px}
    .card.appart .appi{display:none !important}
    .card.appart::before{left:0;box-shadow:none;background:rgba(20,20,24,.35)}
    .card.art::before{left:0;box-shadow:none;background:rgba(20,20,24,.5)}
    .card.media .ctl{left:var(--cp);right:var(--cp);bottom:var(--cp);gap:4px}
    .card.media .ctl button{height:30px}
    .card .slider{height:6px}
    .card.vs{padding-right:calc(var(--cp) + 20px)}
    .card.vs .c{right:calc(var(--cp) + 20px)}
    .vslider{width:8px}
    .card .slider b{width:14px;height:14px;margin:-7px 0 0 -7px}
    .card.appl,.card.acts{padding-bottom:calc(var(--cp) + 30px + 6px)}
    .card.acts .ctl.row button{height:30px;padding:0 10px;font-size:10px}
    .card.appl .ctl.row button{height:30px;padding:0 10px;font-size:10px}
    .card.appl:not(.plug) .lbl{display:none}   /* phones: the stop / power row takes the bottom line */
    .card.list .s{gap:3px;margin-top:4px}
    .card.list .s span{font-size:11px;gap:6px}
    .card.list .s span em{display:none}
    .card .ua{top:8px;right:8px;width:18px;height:18px}
    .card .ua ha-icon{--mdc-icon-size:13px}
    .card.pstrip{padding-bottom:62px}
    .card .socks{gap:4px}
    .card .socks button{height:44px}
    .card .socks button ha-icon{--mdc-icon-size:16px}
    .card .socks button small{display:none}
    .card.scenes .s{gap:4px;margin-top:4px}
    .card.scenes .s button{height:40px}
    .card.scenes .s button small{display:none}
    .card.group .gtiles button{height:40px}
    .card.group .gtiles button small{display:none}
    .card.group .glist{gap:3px;margin-top:4px}
    .card.group .glist div{font-size:11px}
    .card.people .s span{width:36px;height:36px}
    .card.cam{padding-bottom:12px}
    .popup{width:calc(100% - 32px);min-width:0;max-height:85vh;padding:26px 24px 22px}
    .popup .pages{grid-template-columns:1fr}
    .popup .form .f,.popup.wide .form .f{grid-template-columns:1fr;gap:6px}
    .popup.wide{width:calc(100% - 32px);max-width:none}
    .banner{position:absolute;padding:14px}
    .empty{position:static;padding:0 var(--pad) 40px}
    .page,.settings{position:static;flex:1;min-height:0;overflow:auto;padding-top:calc(88px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))}
  }
  @media (min-width:600px) and (max-width:900px){ .strip{grid-template-columns:1fr 1fr 1fr} }
  ${unsafeCSS(pageStyles)}
  ${unsafeCSS(extraStyles)}
  ${unsafeCSS(extra2Styles)}
  ${unsafeCSS(settingsStyles)}
  ${unsafeCSS(featureStyles)}
  ${unsafeCSS(searchStyles)}
  ${unsafeCSS(extra3Styles)}
  /* unavailable: controls are hidden, so center what is left */
  .card.unavailable{grid-template-columns:1fr;grid-template-rows:1fr max-content max-content 1fr;grid-template-areas:"." "n" "s" ".";justify-items:center;text-align:center;padding:0 40px}
  .card.unavailable .i,.card.unavailable .c,.card.unavailable .lbl,.card.unavailable .prog,.card.unavailable hcn-cam-snap{display:none}
  .card.unavailable .n{margin-bottom:6px}
  @media (max-width:900px){ .card.unavailable{padding:0 16px} }
`;
