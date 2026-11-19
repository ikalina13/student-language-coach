// Stories: read a short story, then answer three questions.
import { h, icon, levelTag, toast } from '../lib/dom.js';
import { LEVELS, labelOf } from '../../shared/content.mjs';
import { levelChips } from './words.js';

export function storiesView(el, ctx, [storyId]) {
  if (storyId) return reader(el, ctx, ctx.content.stories.find((s) => s.id === storyId));
  let level = ctx.settings.level || 'beginner';
  function draw() {
    const stories = ctx.content.stories.filter((s) => s.level === level);
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Stories'), h('p', 'Short stories to practice reading. Finish the questions to complete a story.'))),
      h('div.toolbar', levelChips(level, (l) => { level = l; draw(); })),
      h('ul.list.stories', stories.map((s) => {
        const done = ctx.progress.completedStories.includes(s.id);
        const words = s.body.join(' ').split(/\s+/).length;
        return h('li',
          h('a.story-link', { href: `#/stories/${s.id}` }, h('b', s.title), h('span.muted.small', `${words} words · about ${Math.max(1, Math.round(words / 120))} min`)),
          done ? h('span.done', icon('check'), 'Completed') : h('a.btn', { href: `#/stories/${s.id}` }, 'Read'));
      })));
  }
  draw();
}

function reader(el, ctx, story) {
  if (!story) { location.hash = '#/stories'; return; }
  const answers = new Array(story.questions.length).fill(null);
  const result = h('p.feedback', { role: 'status' });

  const qs = story.questions.map((q, qi) => {
    const buttons = q.options.map((o, k) => h('button.option', { type: 'button', onclick: () => {
      answers[qi] = k;
      buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
    } }, h('b', 'ABCD'[k]), o));
    return { q, buttons, node: h('div.story-q', h('h3', `${qi + 1}. ${q.q}`), h('div.options', buttons)) };
  });

  const check = h('button.btn.primary', { type: 'button', onclick: async () => {
    if (answers.includes(null)) { result.textContent = 'Answer all three questions first.'; result.className = 'feedback bad'; return; }
    let right = 0;
    qs.forEach(({ q, buttons }, qi) => {
      buttons.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('correct'); else if (j === answers[qi]) b.classList.add('wrong'); });
      if (answers[qi] === q.answer) right++;
    });
    await ctx.api.progress.completeStory(story.id);
    if (!ctx.progress.completedStories.includes(story.id)) ctx.progress.completedStories.push(story.id);
    result.textContent = `You got ${right} of 3 right. Story completed!`;
    result.className = 'feedback good';
    check.hidden = true;
    toast('Story completed');
  } }, 'Check my answers');

  el.append(
    h('a.btn.ghost.back', { href: '#/stories' }, icon('back'), 'All stories'),
    h('article.story',
      h('div.story-meta', levelTag(story.level, labelOf(LEVELS, story.level))),
      h('h1', story.title),
      story.body.map((p) => h('p', p))),
    h('section.panel.story-questions', h('h2', 'Check your understanding'), qs.map((x) => x.node), result, check));
}
