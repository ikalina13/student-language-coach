// Basic Words: pick a category and level, study the cards.
import { h, icon, levelTag, toast } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf } from '../../shared/content.mjs';
import { canSpeak, speak } from '../lib/speech.js';

export function wordCard(w, ctx, { big = false } = {}) {
  const learned = ctx.progress.learnedWords.includes(w.id);
  const learnBtn = h('button.icon-btn', { type: 'button', 'aria-pressed': String(learned) }, icon('check'), learned ? 'Learned' : 'Mark learned');
  const card = h(`article.card${big ? '.big' : ''}${learned ? '.learned' : ''}`,
    h('div.row', h('span.word', w.word), levelTag(w.level, labelOf(LEVELS, w.level))),
    h('div.pron', w.pronunciation),
    h('div.fil', w.filipino),
    h('div.ex', w.example),
    h('div.actions',
      canSpeak() && h('button.icon-btn', { type: 'button', onclick: () => speak(w.word), title: `Listen to "${w.word}"` }, icon('sound'), 'Listen'),
      learnBtn));

  learnBtn.addEventListener('click', async () => {
    const now = await ctx.api.progress.toggleLearned(w.id);
    ctx.progress.learnedWords = now ? [...ctx.progress.learnedWords, w.id] : ctx.progress.learnedWords.filter((x) => x !== w.id);
    learnBtn.setAttribute('aria-pressed', String(now));
    learnBtn.lastChild.textContent = now ? 'Learned' : 'Mark learned';
    card.classList.toggle('learned', now);
    if (now) toast(`Nice! “${w.word}” added to your words learned.`);
  });
  return card;
}

export function chipRow(items, selected, onPick, render = (i) => i.label) {
  return h('div.chips', { role: 'group' }, items.map((i) =>
    h('button.chip', { type: 'button', 'aria-pressed': String(i.id === selected), onclick: () => onPick(i.id) }, render(i))));
}

export const levelChips = (selected, onPick) => chipRow(LEVELS, selected, onPick, (l) => levelTag(l.id, l.label));

export async function wordsView(el, ctx) {
  let category = sessionStorage.getItem('words.cat') || 'school';
  let level = sessionStorage.getItem('words.lvl') || ctx.settings.level || 'beginner';

  const body = h('div');
  function draw() {
    sessionStorage.setItem('words.cat', category);
    sessionStorage.setItem('words.lvl', level);
    const list = ctx.content.words.filter((w) => w.category === category && w.level === level);
    const done = list.filter((w) => ctx.progress.learnedWords.includes(w.id)).length;
    body.replaceChildren(
      h('div.toolbar',
        chipRow(CATEGORIES, category, (c) => { category = c; draw(); }),
        levelChips(level, (l) => { level = l; draw(); })),
      h('p.muted.small', { style: { marginBottom: '14px' } }, `${labelOf(CATEGORIES, category)} · ${list.length} words · ${done} learned`),
      h('div.grid', list.map((w) => wordCard(w, ctx))));
  }
  el.append(h('div.page-head', h('div', h('h1', 'Basic Words'), h('p', 'Read the word, say it out loud, then check the meaning and example.'))), body);
  draw();
}
