// Mini Dictionary: search every word in English or Filipino.
import { h, levelTag } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf, searchWords } from '../../shared/content.mjs';
import { canSpeak, speak } from '../lib/speech.js';
import { icon } from '../lib/dom.js';

export function dictionaryView(el, ctx) {
  const q = h('input', { type: 'search', placeholder: 'Type an English or Filipino word…', 'aria-label': 'Search words', autofocus: true });
  const cat = h('select', { 'aria-label': 'Category' }, h('option', { value: '' }, 'All categories'), CATEGORIES.map((c) => h('option', { value: c.id }, c.label)));
  const lvl = h('select', { 'aria-label': 'Level' }, h('option', { value: '' }, 'All levels'), LEVELS.map((l) => h('option', { value: l.id }, l.label)));
  const count = h('p.muted.small');
  const list = h('ul.list.dict');

  function draw() {
    const found = searchWords(ctx.content.words, { query: q.value, category: cat.value, level: lvl.value });
    count.textContent = found.length === 1 ? '1 word' : `${found.length} words`;
    list.replaceChildren(...(found.length ? found.map((w) => h('li',
      h('div.entry',
        h('div', h('b.dword', w.word), ' ', h('span.muted', w.pronunciation)),
        h('div', h('span.fil', w.filipino), h('span.muted', ` — ${w.example}`))),
      h('div.meta', levelTag(w.level, labelOf(LEVELS, w.level)), h('span.muted.small', labelOf(CATEGORIES, w.category)),
        h('button.icon-btn.speak', { hidden: !canSpeak(),  type: 'button', title: `Listen to "${w.word}"`, onclick: () => speak(w.word) }, icon('sound'))))) :
      [h('li.empty-state', `No words match “${q.value.trim()}”. Try a shorter word or another category.`)]));
  }
  [q, cat, lvl].forEach((x) => x.addEventListener('input', draw));

  el.append(
    h('div.page-head', h('div', h('h1', 'Mini Dictionary'), h('p', 'Common words students use, with their Filipino meaning.'))),
    h('div.dict-bar', q, cat, lvl), count, list);
  draw();
}
