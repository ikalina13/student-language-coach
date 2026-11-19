// Vocabulary Quiz: 10 questions, pick the Filipino meaning.
import { h } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf, buildQuiz } from '../../shared/content.mjs';
import { chipRow, levelChips } from './words.js';

export function quizView(el, ctx) {
  let category = 'school';
  let level = ctx.settings.level || 'beginner';

  function setup() {
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Vocabulary Quiz'), h('p', 'Ten questions. Choose what each English word means in Filipino.'))),
      h('div.panel.quiz-setup',
        h('h3', 'Category'), chipRow(CATEGORIES, category, (c) => { category = c; setup(); }),
        h('h3', 'Level'), levelChips(level, (l) => { level = l; setup(); }),
        h('button.btn.primary', { type: 'button', onclick: start }, `Start ${labelOf(CATEGORIES, category)} quiz`)));
  }

  function start() {
    const questions = buildQuiz(ctx.content.words, { category, level });
    let i = 0; let score = 0;

    function ask() {
      const q = questions[i];
      const feedback = h('p.feedback', { role: 'status' });
      const next = h('button.btn.primary', { type: 'button', hidden: true, onclick: () => { i++; i < questions.length ? ask() : finish(); } },
        i + 1 < questions.length ? 'Next question' : 'See my score');
      const buttons = q.options.map((opt, k) => h('button.option', { type: 'button', onclick: () => choose(k) }, h('b', 'ABCD'[k]), opt));

      function choose(k) {
        buttons.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('correct'); });
        if (k === q.answer) { score++; feedback.textContent = 'Correct!'; feedback.className = 'feedback good'; }
        else { buttons[k].classList.add('wrong'); feedback.textContent = `Not quite. The answer is ${'ABCD'[q.answer]}. ${q.options[q.answer]}.`; feedback.className = 'feedback bad'; }
        next.hidden = false; next.focus();
      }

      el.replaceChildren(
        h('div.quiz-top',
          h('span.muted', `${labelOf(CATEGORIES, category)} · ${labelOf(LEVELS, level)}`),
          h('span.muted', `Question ${i + 1} of ${questions.length} · Score ${score}`)),
        h('div.meter', { style: { margin: '10px 0 30px' } }, h('span', { style: { width: `${(i / questions.length) * 100}%` } })),
        h('div.panel.question', h('h2.prompt', q.prompt), h('div.options', buttons), feedback, h('div.q-next', next)));
      buttons[0].focus();
    }

    async function finish() {
      await ctx.api.progress.recordQuiz({ category, level, score, total: questions.length });
      const pct = Math.round((score / questions.length) * 100);
      const msg = pct === 100 ? 'Perfect score! Galing!' : pct >= 70 ? 'Great work. Keep it up!' : pct >= 40 ? 'Good try. Review the word cards and try again.' : 'Keep practicing — study the word cards first, then retry.';
      el.replaceChildren(h('div.panel.result',
        h('p.muted', `${labelOf(CATEGORIES, category)} · ${labelOf(LEVELS, level)}`),
        h('div.big-score', `${score}/${questions.length}`),
        h('p', msg),
        h('div.result-actions',
          h('button.btn.primary', { type: 'button', onclick: start }, 'Try again'),
          h('button.btn', { type: 'button', onclick: setup }, 'Choose another quiz'),
          h('a.btn.ghost', { href: '#/progress' }, 'See my progress'))));
    }
    ask();
  }
  setup();
}
