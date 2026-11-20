// Vocabulary Quiz: 10 questions, choose what each English word means in Filipino.
import { h } from '../lib/dom.js';
import { baoSays } from '../lib/bao.js';
import { CATEGORIES, LEVELS, labelOf, buildQuiz } from '../../shared/content.mjs';
import { answerFlow, lessonBar } from '../lib/answer-flow.js';
import { enter } from '../lib/motion.js';
import { chipRow, levelChips } from './words.js';
import { celebrate } from './celebrate.js';

export function quizView(el, ctx, [catArg, levelArg]) {
  let category = CATEGORIES.some((c) => c.id === catArg) ? catArg : 'school';
  let level = LEVELS.some((l) => l.id === levelArg) ? levelArg : (ctx.settings.level || 'beginner');

  function setup() {
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Vocabulary Quiz'), h('p', 'Ten questions. Choose what each English word means in Filipino.'))),
      h('div.panel.quiz-setup',
        baoSays('Pick a topic and a level. Kaya mo ’yan!', 'idle', { size: 84 }),
        h('h3', 'Topic'), chipRow(CATEGORIES, category, (c) => { category = c; setup(); }),
        h('h3', 'Level'), levelChips(level, (l) => { level = l; setup(); }),
        h('button.btn-chunky.primary', { type: 'button', onclick: start }, `Start ${labelOf(CATEGORIES, category)} quiz`)));
  }

  async function start() {
    const questions = buildQuiz(ctx.content.words, { category, level });
    const byId = new Map(ctx.content.words.map((w) => [w.id, w]));
    let score = 0;
    const bar = lessonBar({ total: questions.length, onClose: setup });
    const mascot = baoSays('Take your time.', 'idle', { size: 92 });
    const stage = h('div.lesson-stage');
    el.replaceChildren(h('div.lesson', bar, h('div.lesson-body', h('div.lesson-side', mascot), stage)));

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const w = byId.get(q.wordId);
      const flow = answerFlow({
        prompt: [h('p.af-kicker', `${labelOf(CATEGORIES, category)} · ${labelOf(LEVELS, level)} · ${i + 1} of ${questions.length}`),
          h('h2', 'What does ', h('span.hl', `“${w.word}”`), ' mean?')],
        options: q.options,
        answer: q.answer,
        explain: `${w.word} · ${w.pronunciation} — ${w.example}`,
        mascot,
        // Quiz XP is saved when the quiz ends, so nothing floats up mid-quiz.
        onResult: (ok) => { if (ok) score++; return 0; },
        continueLabel: i + 1 < questions.length ? 'Continue' : 'See my score',
      });
      stage.replaceChildren(flow.el);
      enter(flow.el);
      await flow.done;
      if (!el.isConnected) return; // student left the page
      bar.set(i + 1);
    }

    const { xpGained } = await ctx.api.progress.recordQuiz({ category, level, score, total: questions.length });
    const stats = await ctx.api.progress.stats();
    ctx.refreshHeader?.(stats);
    const pct = Math.round((score / questions.length) * 100);
    celebrate(el, {
      title: pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Great work!' : pct >= 40 ? 'Good try!' : 'Keep practicing!',
      message: pct === 100 ? 'Galing! Every answer right.' : pct >= 40 ? 'Review the word cards, then try again to beat your score.' : 'Study the word cards first, then try this quiz again.',
      score, total: questions.length, xp: xpGained, streak: stats.streak,
      actions: [
        { label: 'Try again', primary: true, onClick: start },
        { label: 'Another quiz', onClick: setup },
        { label: 'Back home', href: '#/dashboard' },
      ],
    });
  }

  if (catArg && levelArg) start(); else setup();
}
