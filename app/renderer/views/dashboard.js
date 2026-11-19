// Home: greeting, daily word, quick numbers, and where to go next.
import { h, icon, levelTag } from '../lib/dom.js';
import { dailyWord, labelOf, CATEGORIES, LEVELS } from '../../shared/content.mjs';
import { wordCard } from './words.js';

export async function dashboardView(el, ctx) {
  const { api, content, user } = ctx;
  const stats = await api.progress.stats();
  const today = dailyWord(content.words, new Date());
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Magandang umaga' : hour < 18 ? 'Magandang hapon' : 'Magandang gabi';
  const level = ctx.settings.level || 'beginner';

  const stat = (n, of, label, route) => h('a.stat', { href: `#/${route}` },
    h('b', n), of != null ? h('span.of', ` / ${of}`) : null, h('span.label', label));

  const go = (route, title, text, ic) => h('li', h('a.go', { href: `#/${route}` }, icon(ic), h('span', h('b', title), h('span.muted.small', text))));

  el.append(
    h('div.page-head',
      h('div', h('h1', `${greet}, ${user.displayName.split(' ')[0]}!`),
        h('p', 'Your level: ', levelTag(level, labelOf(LEVELS, level)), '. Pick up where you left off, or try today’s word.'))),
    h('div.dash',
      h('section.daily',
        h('h2', 'Word of the day'),
        h('p.muted.small', { style: { margin: '2px 0 14px' } }, new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }),
          ' · ', labelOf(CATEGORIES, today.category)),
        wordCard(today, ctx, { big: true })),
      h('section',
        h('h2', 'Your progress'),
        h('div.stats',
          stat(stats.wordsLearned, stats.totalWords, 'words learned', 'words'),
          stat(stats.storiesCompleted, stats.totalStories, 'stories completed', 'stories'),
          stat(stats.quizzesTaken, null, 'quizzes completed', 'quiz'),
          stat(stats.sentencesDone, stats.totalSentences, 'sentences practiced', 'sentences')),
        h('h2', { style: { marginTop: '28px' } }, 'What to do next'),
        h('ul.list.next',
          go('words', 'Study word cards', 'Meanings, pronunciation and examples', 'words'),
          go('quiz', 'Take a quiz', '10 questions, see your score right away', 'quiz'),
          go('stories', 'Read a short story', 'Then answer three questions', 'stories'),
          go('sentences', 'Practice sentences', 'Fill in the missing word', 'sentences')))));
}
