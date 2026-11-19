// Sentence Practice: read a sentence, choose the missing word.
import { h, icon } from '../lib/dom.js';
import { shuffle } from '../../shared/content.mjs';
import { levelChips } from './words.js';
import { canSpeak, speak } from '../lib/speech.js';

export function sentencesView(el, ctx) {
  let level = ctx.settings.level || 'beginner';
  let index = 0;

  function draw() {
    const list = ctx.content.sentences.filter((s) => s.level === level);
    const done = list.filter((s) => ctx.progress.sentencesDone.includes(s.id)).length;
    const s = list[index % list.length];
    const options = shuffle([s.target, ...s.distractors]);
    const [before, after] = s.en.split(new RegExp(`\\b${s.target}\\b`));
    const blank = h('span.blank', '_____');
    const feedback = h('p.feedback', { role: 'status' });
    const translation = h('p.translation', { hidden: true }, s.fil);
    const nextBtn = h('button.btn.primary', { type: 'button', hidden: true, onclick: () => { index++; draw(); } }, 'Next sentence');

    const buttons = options.map((o) => h('button.option', { type: 'button', onclick: async () => {
      if (o === s.target) {
        buttons.forEach((b) => { b.disabled = true; if (b.textContent === o) b.classList.add('correct'); });
        blank.textContent = s.target; blank.classList.add('filled');
        feedback.textContent = 'Correct! Read the whole sentence out loud.'; feedback.className = 'feedback good';
        translation.hidden = false; nextBtn.hidden = false; nextBtn.focus();
        await ctx.api.progress.markSentence(s.id);
        if (!ctx.progress.sentencesDone.includes(s.id)) ctx.progress.sentencesDone.push(s.id);
      } else {
        const b = buttons.find((x) => x.textContent === o);
        b.classList.add('wrong'); b.disabled = true;
        feedback.textContent = `“${o}” doesn’t fit. Try another word.`; feedback.className = 'feedback bad';
      }
    } }, o));

    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Sentence Practice'), h('p', 'Not just single words — practice reading simple sentences.'))),
      h('div.toolbar', levelChips(level, (l) => { level = l; index = 0; draw(); })),
      h('div.quiz-top', h('span.muted', `Sentence ${(index % list.length) + 1} of ${list.length}`), h('span.muted', `${done} of ${list.length} practiced`)),
      h('div.meter', { style: { margin: '10px 0 30px' } }, h('span', { style: { width: `${(done / list.length) * 100}%` } })),
      h('div.panel.sentence',
        h('p.sentence-text', before, blank, after),
        h('div.sentence-tools',
          h('button.icon-btn', { type: 'button', onclick: () => { translation.hidden = !translation.hidden; } }, 'Show Filipino'),
          canSpeak() && h('button.icon-btn', { type: 'button', onclick: () => speak(s.en) }, icon('sound'), 'Listen')),
        translation,
        h('div.options', buttons), feedback,
        h('div.q-next', nextBtn, h('button.btn.ghost', { type: 'button', onclick: () => { index++; draw(); } }, 'Skip'))));
  }
  draw();
}
