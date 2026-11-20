// Stories: read a short story, then answer three questions one at a time.
import { h, icon, levelTag } from '../lib/dom.js';
import { baoSays } from '../lib/bao.js';
import { LEVELS, labelOf } from '../../shared/content.mjs';
import { answerFlow } from '../lib/answer-flow.js';
import { enter, stagger } from '../lib/motion.js';
import { levelChips } from './words.js';
import { celebrate } from './celebrate.js';

export function storiesView(el, ctx, [storyId]) {
  if (storyId) return reader(el, ctx, ctx.content.stories.find((s) => s.id === storyId));
  let level = ctx.settings.level || 'beginner';
  function draw() {
    const stories = ctx.content.stories.filter((s) => s.level === level);
    const list = h('ul.story-list', stories.map((s) => {
      const done = ctx.progress.completedStories.includes(s.id);
      const words = s.body.join(' ').split(/\s+/).length;
      return h('li', h('a.story-card', { href: `#/stories/${s.id}` },
        h('div.story-card-text', h('b', s.title), h('span.muted.small', `${words} words · about ${Math.max(1, Math.round(words / 120))} min read`), h('span.story-teaser', `${s.body[0].slice(0, 110)}…`)),
        done ? h('span.done', icon('check'), 'Completed') : h('span.btn-chunky.small', 'Read')));
    }));
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Stories'), h('p', 'Short stories from everyday Filipino life. Finish the questions to complete a story.'))),
      h('div.toolbar', levelChips(level, (l) => { level = l; draw(); })),
      list);
    stagger(list.children);
  }
  draw();
}

function reader(el, ctx, story) {
  if (!story) { location.hash = '#/stories'; return; }
  const qArea = h('section.story-questions');
  const startBtn = h('button.btn-chunky.primary', { type: 'button', onclick: () => ask() }, 'I’m done reading — start questions');
  qArea.append(baoSays('Read the whole story first. Then I’ll ask you three questions.', 'idle', { size: 84 }), startBtn);

  el.append(
    h('a.btn.ghost.back', { href: '#/stories' }, icon('back'), 'All stories'),
    h('article.story', h('div.story-meta', levelTag(story.level, labelOf(LEVELS, story.level))), h('h1', story.title), story.body.map((p) => h('p', p))),
    qArea);

  async function ask() {
    let right = 0;
    const mascot = baoSays('Take your time. You can scroll up to check the story.', 'thinking', { size: 84 });
    const stage = h('div.lesson-stage');
    qArea.replaceChildren(h('h2', 'Check your understanding'), h('div.lesson-body.compact', h('div.lesson-side', mascot), stage));
    qArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    for (let i = 0; i < story.questions.length; i++) {
      const q = story.questions[i];
      const flow = answerFlow({
        prompt: [h('p.af-kicker', `Question ${i + 1} of ${story.questions.length}`), h('h2', q.q)],
        options: q.options, answer: q.answer, mascot,
        onResult: (ok) => { if (ok) right++; return 0; },
        continueLabel: i + 1 < story.questions.length ? 'Next question' : 'Finish story',
      });
      stage.replaceChildren(flow.el);
      enter(flow.el);
      await flow.done;
      if (!el.isConnected) return;
    }
    const { xpGained } = await ctx.api.progress.completeStory(story.id);
    if (!ctx.progress.completedStories.includes(story.id)) ctx.progress.completedStories.push(story.id);
    const stats = await ctx.api.progress.stats();
    ctx.refreshHeader?.(stats);
    const next = ctx.content.stories.find((s) => s.level === story.level && s.id !== story.id && !ctx.progress.completedStories.includes(s.id));
    el.replaceChildren(h('div'));
    celebrate(el.firstChild, {
      title: 'Story completed!',
      message: xpGained ? `You finished “${story.title}”.` : `You read “${story.title}” again. Nice practice!`,
      score: right, total: story.questions.length, xp: xpGained, streak: stats.streak,
      actions: [
        next ? { label: `Next: ${next.title}`, primary: true, href: `#/stories/${next.id}` } : { label: 'All stories', primary: true, href: '#/stories' },
        { label: 'Read again', onClick: () => { el.replaceChildren(); reader(el, ctx, story); } },
        { label: 'Back home', href: '#/dashboard' },
      ],
    });
  }
}
