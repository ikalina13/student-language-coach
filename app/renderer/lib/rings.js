// Animated progress ring.
import { h } from './dom.js';
import { reduced } from './motion.js';

export function ring(value, total, { size = 88, stroke = 9, label, sub } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, value / total) : 0;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const mk = (cls) => {
    const el = document.createElementNS(ns, 'circle');
    el.setAttribute('cx', size / 2); el.setAttribute('cy', size / 2); el.setAttribute('r', r);
    el.setAttribute('class', cls); el.setAttribute('stroke-width', stroke);
    return el;
  };
  const track = mk('ring-track');
  const bar = mk('ring-bar');
  bar.setAttribute('stroke-dasharray', c);
  bar.setAttribute('stroke-dashoffset', reduced() ? c * (1 - pct) : c);
  bar.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  svg.append(track, bar);
  if (!reduced()) requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('stroke-dashoffset', c * (1 - pct))));
  return h('div.ring', { style: { width: `${size}px`, height: `${size}px` }, role: 'img', 'aria-label': `${value} of ${total}` },
    svg, h('div.ring-label', label ?? `${Math.round(pct * 100)}%`, sub ? h('small', sub) : null));
}
