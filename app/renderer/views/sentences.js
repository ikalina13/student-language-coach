// Sentence Practice: sets of 10 sentences per level; choose the missing word.
import { h, icon } from '../lib/dom.js';
import { baoSays } from '../lib/bao.js';
import { LEVELS, shuffle, sentenceSets } from '../../shared/content.mjs';
import { answerFlow, lessonBar } from '../lib/answer-flow.js';
import { enter, stagger } from '../lib/motion.js';
import { canSpeak, speak } from '../lib/speech.js';
import { levelChips } from './words.js';
import { celebrate } from './celebrate.js';
import { ring } from '../lib/rings.js';

export function sentencesView(el, ctx, [levelArg, setArg]) {
  let level = LEVELS.some((l) => l.id === levelArg) ? levelArg : (ctx.settings.level || 'beginner');

  function list() {
    const done = new Set(ctx.progress.sentencesDone);
    const sets = sentenceSets(ctx.content.sentences, level);
    const grid = h('div.set-grid', sets.map((s) => {
      const n = s.items.filter((x) => done.has(x.id)).length;
      const complete = n === s.items.length;
      return h('a.set-card', { href: `#/sentences/${level}/${s.index}` },
        ring(n, s.items.length, { size: 64, label: complete ? icon('check') : `${n}/${s.items.length}` }),
        h('div', h('b', `Set ${s.index + 1}`), h('span.muted.small', complete ? 'All practiced — play again for fun' : `${s.items.length - n} sentences to go`)));
    }));
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Sentence Practice'), h('p', 'Not just single words — read simple sentences and choose the missing word.'))),
      h('div.toolbar', levelChips(level, (l) => { level = l; list(); })),
      grid);
    stagger(grid.children);
  }

  async function run(set) {
    let right = 0; let xp = 0;
    const bar = lessonBar({ total: set.items.length, onClose: list });
    const mascot = baoSays('Read the sentence out loud first.', 'idle', { size: 92 });
    const stage = h('div.lesson-stage');
    el.replaceChildren(h('div.lesson', bar, h('div.lesson-body', h('div.lesson-side', mascot), stage)));

    for (let i = 0; i < set.items.length; i++) {
      const s = set.items[i];
      const options = shuffle([s.target, ...s.distractors]);
      const [before, after] = s.en.split(new RegExp(`\\b${s.target}\\b`));
      const flow = answerFlow({
        prompt: [
          h('p.af-kicker', `Set ${set.index + 1} · ${i + 1} of ${set.items.length}`),
          h('p.sentence-text', before, h('span.blank', '_____'), after),
          h('div.sentence-tools',
            h('button.icon-btn.speak', { type: 'button', hidden: !canSpeak(), onclick: () => speak(s.en) }, icon('sound'), 'Listen')),
        ],
        options,
        answer: options.indexOf(s.target),
        explain: h('span', h('span', s.en), h('br'), h('i', s.fil)),
        onReveal: () => { const b = stage.querySelector('.blank'); b.textContent = s.target; b.classList.add('filled'); },
        mascot,
        onResult: async (ok) => {
          if (!ok) return 0;
          right++;
          const { xpGained } = await ctx.api.progress.markSentence(s.id);
          if (!ctx.progress.sentencesDone.includes(s.id)) ctx.progress.sentencesDone.push(s.id);
          xp += xpGained;
          if (xpGained) ctx.refreshHeader?.();
          return xpGained;
        },
        continueLabel: i + 1 < set.items.length ? 'Continue' : 'Finish set',
      });
      stage.replaceChildren(flow.el);
      enter(flow.el);
      await flow.done;
      if (!el.isConnected) return;
      bar.set(i + 1);
    }

    const stats = await ctx.api.progress.stats();
    ctx.refreshHeader?.(stats);
    const sets = sentenceSets(ctx.content.sentences, level);
    const next = sets[set.index + 1];
    celebrate(el, {
      title: `Set ${set.index + 1} done!`,
      message: right === set.items.length ? 'Every sentence right. Galing!' : 'Missed ones will come back next time you play this set.',
      score: right, total: set.items.length, xp, streak: stats.streak,
      actions: [
        next ? { label: `Next: Set ${next.index + 1}`, primary: true, href: `#/sentences/${level}/${next.index}` } : { label: 'Play again', primary: true, onClick: () => run(set) },
        { label: 'All sets', onClick: list },
        { label: 'Back home', href: '#/dashboard' },
      ],
    });
  }

  const sets = sentenceSets(ctx.content.sentences, level);
  const chosen = setArg !== undefined ? sets[Number(setArg)] : null;
  if (chosen) run(chosen); else list();
}
