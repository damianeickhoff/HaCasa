// Drag to reorder a vertical list (page settings, rooms, status pills). The list carries `data-drag`, each row `data-k`,
// and the grip calls dragRows on pointerdown. The order changes live while dragging (apply) and is reported once at
// the end (done). Mouse and touch both work because the grip has touch-action:none.

/** nearest ancestor that scrolls vertically (crossing shadow roots), else the page */
function scroller(el) {
  for (let n = el; n; n = n.parentElement || n.getRootNode()?.host) {
    if (n === document.body || n === document.documentElement) break;
    const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement;
}

export function dragRows(ev, key, apply, done) {
  if (ev.button) return;
  ev.preventDefault(); ev.stopPropagation();
  const grip = ev.currentTarget, list = grip.closest("[data-drag]"); if (!list) return;
  const sc = scroller(list);
  try { grip.setPointerCapture(ev.pointerId); } catch {}
  let order = [...list.querySelectorAll(":scope > [data-k]")].map(r => r.dataset.k), y = ev.clientY, raf = 0;
  const place = () => {
    const rows = [...list.querySelectorAll(":scope > [data-k]")], dom = rows.map(r => r.dataset.k);
    // the slot is before the first row whose middle is below the pointer
    let idx = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
    if (idx < 0) idx = rows.length;
    const cur = dom.indexOf(key); if (cur >= 0 && cur < idx) idx -= 1;
    const rest = dom.filter(k => k !== key), next = [...rest.slice(0, idx), key, ...rest.slice(idx)];
    if (next.join("\n") !== order.join("\n")) { order = next; apply(order); }
  };
  // keep scrolling while the pointer rests near the top or bottom edge
  const edge = () => {
    const b = sc === document.scrollingElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect();
    const d = y < b.top + 60 ? -10 : y > b.bottom - 60 ? 10 : 0;
    if (d) { sc.scrollTop += d; place(); }
    raf = requestAnimationFrame(edge);
  };
  raf = requestAnimationFrame(edge);
  const move = e => { e.preventDefault(); y = e.clientY; place(); };
  const up = () => {
    cancelAnimationFrame(raf);
    removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    done(order);
  };
  addEventListener("pointermove", move, { passive: false }); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
