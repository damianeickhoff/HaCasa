// Motion: exit animations, view crossfade, number tweens, state feedback and the reduced-motion switch.
// Rule from styles.js still applies: never animate opacity on an ancestor of a blurred element (it stops backdrop-filter).
import { AsyncDirective, directive } from "lit/async-directive.js";
import { noChange } from "lit";

let motion = true;
/** off when the user disabled animations (settings) or the OS asks for reduced motion */
export const setMotion = v => { motion = !!v; };
export const motionOn = () => motion;

/* ---------- ghosts: a static copy of DOM that is about to disappear, faded out and removed ---------- */
/** clones the matching elements into a wrapper that plays the exit animation; the real DOM is free to change */
export function ghost(p, selector, cls, ms, prep) {
  if (!motion) return;
  const els = [...p.renderRoot.querySelectorAll(selector)];
  if (!els.length) return;
  p.renderRoot.querySelectorAll(".ghost." + cls).forEach(g => g.remove());   // a second switch mid-fade replaces the first ghost
  const g = document.createElement("div"); g.className = "ghost " + cls;
  for (const el of els) { const c = el.cloneNode(true); c.querySelectorAll("hcn-cam-snap,video,iframe").forEach(x => x.remove()); prep && prep(c, el); g.appendChild(c); }
  p.renderRoot.appendChild(g);
  setTimeout(() => g.remove(), ms);
}

/* ---------- numbers: count from the old value to the new one, keeping the format ("20,8°", "842 W") ---------- */
const NUM = /-?\d+(?:[.,]\d+)?/;
class TweenDirective extends AsyncDirective {
  render(text) { return text; }
  update(part, [text]) {
    text = text == null ? "" : String(text);
    const m = text.match(NUM);
    if (!motion || !m || this.last === undefined || this.text === text) { this.stop(); this.text = text; this.last = m ? m[0] : undefined; return text; }
    const to = parseFloat(m[0].replace(",", ".")), from = parseFloat(String(this.last).replace(",", "."));
    this.text = text; this.last = m[0];
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) { this.stop(); return text; }
    const dec = (m[0].split(/[.,]/)[1] || "").length, sep = m[0].includes(",") ? "," : ".", t0 = performance.now(), D = 450;
    this.stop();
    const step = now => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3), v = (from + (to - from) * e).toFixed(dec).replace(".", sep);
      this.setValue(k < 1 ? text.replace(NUM, v) : text);
      this.raf = k < 1 ? requestAnimationFrame(step) : 0;
    };
    this.raf = requestAnimationFrame(step);
    return noChange;
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  disconnected() { this.stop(); }
}
/** `${tw("20,8°")}`: the text renders as is, later values count up or down to the new number */
export const tw = directive(TweenDirective);

/* ---------- after each render: cards that just turned on get a pop, segmented controls get their sliding highlight ---------- */
export function afterRender(p) {
  if (!motion) return;
  for (const c of p.renderRoot.querySelectorAll(".card")) {
    const on = c.classList.contains("on");
    if (c._on === false && on && !c.classList.contains("dragghost")) { c.classList.add("pop"); clearTimeout(c._popT); c._popT = setTimeout(() => c.classList.remove("pop"), 600); }
    c._on = on;
  }
  for (const seg of p.renderRoot.querySelectorAll(".seg.pseg")) {
    let hl = seg.querySelector(":scope > i.hl");
    if (!hl) { hl = document.createElement("i"); hl.className = "hl"; seg.prepend(hl); }
    const on = seg.querySelector(":scope > button.on");
    if (on) { hl.style.left = on.offsetLeft + "px"; hl.style.top = on.offsetTop + "px"; hl.style.width = on.offsetWidth + "px"; hl.style.height = on.offsetHeight + "px"; hl.style.opacity = "1"; } else hl.style.opacity = "0";
  }
}

export const motionStyles = `
  /* ===== motion ===== */
  @keyframes fadeOut{to{opacity:0}}
  @keyframes popOut{to{transform:translateY(8px) scale(.98)}}
  @keyframes menuOut{to{transform:translateY(-6px)}}
  @keyframes viewOut{to{opacity:0;transform:translateY(-10px)}}
  @keyframes toastIn{from{transform:translate(-50%,18px) scale(.96);opacity:0}to{transform:translate(-50%,0);opacity:1}}
  @keyframes toastOut{to{transform:translate(-50%,10px);opacity:0}}
  @keyframes iconPop{0%{transform:scale(1)}35%{transform:scale(1.22) rotate(-4deg)}70%{transform:scale(.96)}100%{transform:scale(1)}}
  @keyframes glowSweep{0%{opacity:.9;transform:translateX(-20%)}100%{opacity:0;transform:translateX(30%)}}
  @keyframes checkPop{0%{transform:scale(.4) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(4deg);opacity:1}100%{transform:none;opacity:1}}
  @keyframes drift{from{transform:translateY(0) rotate(0)}to{transform:translateY(-4px) rotate(6deg)}}
  @keyframes breathe{0%,100%{opacity:.35}50%{opacity:.9}}
  @keyframes fanspin{to{transform:rotate(360deg)}}
  @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
  @keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
  @keyframes tabBump{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}

  /* ghosts: static copies of a view, pop-up or menu that is gone from the DOM, played out and removed (see motion.js) */
  .ghost{position:absolute;inset:0;z-index:1;pointer-events:none}
  .ghost *{transition:none!important}
  .ghost .card,.ghost .title>*,.ghost .wx .hours div,.ghost .page>*,.ghost .settings>*,.ghost .bnav,.ghost .pw,.ghost .popup{animation:none}
  .ghost.view-out{animation:viewOut .22s var(--ease) both}
  .ghost.pop-out{z-index:50}
  .ghost.pop-out .overlay{animation:fadeOut .18s ease-out both}
  .ghost.pop-out .overlay .popup{animation:popOut .18s var(--ease) both}
  .ghost.menu-out{z-index:51}
  .ghost.menu-out .pmenu{animation:menuOut .15s var(--ease) both,fadeOut .15s ease-out both}
  @media (max-width:900px){ .ghost.menu-out .pmenu{animation:popOut .18s var(--ease) both,fadeOut .18s ease-out both} }

  /* toast: in from below, out downwards; "ok" is the glass look with a check */
  .toast{animation:toastIn .3s var(--ease) both}
  .toast.out{animation:toastOut .25s var(--ease) both;pointer-events:none}
  .toast.ok{background:rgba(255,255,255,.14);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);letter-spacing:0;display:flex;align-items:center;gap:10px}
  .toast.ok ha-icon{--mdc-icon-size:18px;animation:checkPop .4s .1s var(--ease) both}
  .settings .actions .ok{display:inline-flex;align-items:center;gap:6px}
  .settings .actions .ok ha-icon{--mdc-icon-size:18px;animation:checkPop .4s var(--ease) both}

  /* card feedback: press-down, icon pop + light sweep when a device turns on, control buttons squash */
  .card:active:not(.dragghost){transform:scale(.97)}
  .strip.drag .card:active,.ecard>.card:active{transform:none}
  .card.pop .i{animation:iconPop .45s var(--ease)}
  .card.pop.on::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:radial-gradient(60% 80% at 20% 20%,rgba(255,255,255,.5),rgba(255,255,255,0) 70%);animation:glowSweep .6s ease-out both}
  .card .ctl button,.card .gtiles button,.card .lbl.steps button,.card .lbl.chips button,.card .seg button,.card .rail em{transition:background .15s,color .15s,transform .12s}
  .card .ctl button:active,.card .gtiles button:active,.card .lbl.steps button:active,.card .lbl.chips button:active,.card .seg button:active,.card .rail em:active{transform:scale(.9)}

  /* segmented page filters: a highlight slides behind the active button (afterRender places it) */
  .seg.pseg{position:relative}
  .seg.pseg>button{position:relative;z-index:1}
  .seg.pseg>button.on{background:transparent;color:#1d1d1f;border-color:transparent}
  .seg.pseg>i.hl{position:absolute;left:0;top:0;border-radius:999px;background:rgba(255,255,255,.9);opacity:0;transition:left .3s var(--ease),top .3s var(--ease),width .3s var(--ease),opacity .2s;pointer-events:none;z-index:0}

  /* phone tabs: the active one grows and reveals its label instead of snapping */
  @media (max-width:900px){
    .btabs a{transition:flex .35s var(--ease),background .25s,color .25s,padding .35s var(--ease);gap:0}
    .btabs a span{display:inline;max-width:0;opacity:0;margin-left:0;transition:max-width .35s var(--ease),opacity .2s,margin-left .35s var(--ease)}
    .btabs a.active span{max-width:140px;opacity:1;margin-left:8px;transition:max-width .35s var(--ease),opacity .25s .1s,margin-left .35s var(--ease)}
    .btabs a.active img.ico,.btabs a.active ha-icon{animation:tabBump .35s var(--ease)}
  }

  /* ambience: things that are running keep moving a little */
  .wx .big img.ico,.wx .big ha-icon{animation:drift 5s ease-in-out infinite alternate}
  .wx .hours div{animation:rise .5s var(--ease) both}
  .wx .hours div:nth-child(2){animation-delay:70ms}.wx .hours div:nth-child(3){animation-delay:140ms}.wx .hours div:nth-child(4){animation-delay:210ms}
  .card.climate .hglow{position:absolute;inset:-1px;pointer-events:none;border-radius:var(--r);opacity:0;background:radial-gradient(70% 90% at 85% 90%,rgba(242,140,58,.45),rgba(242,140,58,0) 70%)}
  .card.climate.cooling .hglow{background:radial-gradient(70% 90% at 85% 90%,rgba(90,170,242,.45),rgba(90,170,242,0) 70%)}
  .card.climate.heating .hglow,.card.climate.cooling .hglow{animation:breathe 3.2s ease-in-out infinite}
  .card.fan.on .i{animation:fanspin 1.6s linear infinite;transform-origin:50% 50%}

  /* loading: a shimmer in the shape of the content; sparklines draw themselves */
  .skel{display:flex;flex-direction:column;gap:6px;margin-top:12px}
  .skel i{display:block;height:42px;border-radius:var(--r-sm);background:linear-gradient(90deg,rgba(255,255,255,.07) 25%,rgba(255,255,255,.16) 50%,rgba(255,255,255,.07) 75%);background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite}
  .skel i.tl{height:70px}
  .skel i.short{width:55%}
  .spk polyline.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .9s var(--ease) both}
  .spk polygon{animation:fadeIn .5s .4s ease-out both}

  /* reduced motion: the OS setting or the Animations switch in Appearance */
  :host(.still) *,:host(.still) *::before,:host(.still) *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  :host(.still) .bg{animation:none}
`;
