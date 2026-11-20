// End-of-round screen: Bao celebrates, the score counts up, confetti for a good round.
import { h, icon } from '../lib/dom.js';
import { bao } from '../lib/bao.js';
import { countUp, confetti, stagger } from '../lib/motion.js';

/**
 * @param {HTMLElement} el
 * @param {{ title: string, message?: string, score?: number, total?: number, xp: number,
 *           streak: number, actions: {label:string, primary?:boolean, href?:string, onClick?:Function}[] }} o
 */
export function celebrate(el, { title, message, score, total, xp, streak, actions }) {
  const hasScore = Number.isFinite(score) && total;
  const good = !hasScore || score / total >= 0.6;
  const scoreEl = h('span', '0');
  const xpEl = h('span', '0');

  const card = h('section.celebrate',
    bao(good ? 'celebrate' : 'happy', { size: 170 }),
    h('h1', title),
    message ? h('p.celebrate-msg', message) : null,
    hasScore ? h('div.big-score', scoreEl, h('small', ` / ${total}`)) : null,
    h('div.celebrate-stats',
      h('div.chip-stat.xp', icon('star'), h('b', '+', xpEl), ' XP'),
      h('div.chip-stat.streak', icon('flame'), h('b', String(streak)), streak === 1 ? ' day streak' : ' day streak')),
    h('div.celebrate-actions', actions.map((a) => a.href
      ? h(`a.btn-chunky${a.primary ? '.primary' : ''}`, { href: a.href }, a.label)
      : h(`button.btn-chunky${a.primary ? '.primary' : ''}`, { type: 'button', onclick: a.onClick }, a.label))));

  el.replaceChildren(card);
  stagger(card.children, { step: 70 });
  if (hasScore) countUp(scoreEl, score, { duration: 900 });
  countUp(xpEl, xp, { duration: 1100 });
  if (good) setTimeout(() => confetti(card), 150);
  card.querySelector('.celebrate-actions .primary')?.focus({ preventScroll: true });
}
