// Small animation helpers. Every one of them does nothing when Windows "Show animations" is off.
import { h } from './dom.js';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

// Page entrance: a short fade and rise.
export function enter(el) {
  if (reduced()) return;
  el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT });
}

// Children appear one after another (used once per screen, never on every update).
export function stagger(children, { step = 45, max = 12 } = {}) {
  if (reduced()) return;
  [...children].slice(0, max).forEach((c, i) => c.animate(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, delay: i * step, easing: EASE_OUT, fill: 'backwards' }));
}

// Numbers that count up to their value.
export function countUp(el, to, { duration = 800, format = (n) => n.toLocaleString('en-US'), from = 0 } = {}) {
  if (reduced() || to === from) { el.textContent = format(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function pop(el) {
  if (reduced()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: SPRING });
}

export function shake(el) {
  if (reduced()) return;
  el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 340 });
}

// "+10 XP" that floats up from an element.
export function floatXp(anchor, amount) {
  if (!amount) return;
  const tag = h('span.xp-float', `+${amount} XP`);
  const r = anchor.getBoundingClientRect();
  Object.assign(tag.style, { left: `${r.left + r.width / 2}px`, top: `${r.top}px` });
  document.body.append(tag);
  if (reduced()) { setTimeout(() => tag.remove(), 900); return; }
  tag.animate([
    { opacity: 0, transform: 'translate(-50%, 6px) scale(.8)' },
    { opacity: 1, transform: 'translate(-50%, -14px) scale(1.05)', offset: 0.25 },
    { opacity: 0, transform: 'translate(-50%, -58px) scale(1)' },
  ], { duration: 1100, easing: EASE_OUT }).finished.then(() => tag.remove());
}

// A burst of paper confetti from the top of a container.
export function confetti(container, { pieces = 70 } = {}) {
  if (reduced()) return;
  const colors = ['var(--accent)', '#2f6fd1', '#f3c74a', '#e06b6b', '#2f9e57', '#f3ead8'];
  const layer = h('div.confetti');
  container.append(layer);
  const w = container.clientWidth || 600;
  const height = container.clientHeight || 500;
  const done = [];
  for (let i = 0; i < pieces; i++) {
    const p = h('i', { style: { background: colors[i % colors.length], left: `${w / 2 + (Math.random() - 0.5) * 80}px` } });
    if (i % 3 === 0) p.style.borderRadius = '50%';
    layer.append(p);
    const dx = (Math.random() - 0.5) * w * 1.1;
    const up = -(120 + Math.random() * 160);
    const spin = (Math.random() - 0.5) * 1080;
    done.push(p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${up}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${height * 0.9}px) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: 1600 + Math.random() * 900, delay: Math.random() * 120, easing: 'cubic-bezier(.25,.6,.4,1)' }).finished);
  }
  Promise.all(done).then(() => layer.remove());
}
