// Home: Bao's greeting, what to do next, the word of the day, and progress rings.
import { h, icon } from '../lib/dom.js';
import { baoSays } from '../lib/bao.js';
import { dailyWord, labelOf, nextUp, CATEGORIES, LEVELS } from '../../shared/content.mjs';
import { ring } from '../lib/rings.js';
import { stagger } from '../lib/motion.js';
import { wordCard } from './words.js';

const KIND_ICON = { sentences: 'sentences', story: 'stories', quiz: 'quiz' };
const KIND_TEXT = { sentences: 'Sentence Practice', story: 'Story', quiz: 'Vocabulary Quiz' };

export async function dashboardView(el, ctx) {
  const { api, content, user } = ctx;
  const stats = await api.progress.stats();
  const today = dailyWord(content.words, new Date());
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Magandang umaga' : hour < 18 ? 'Magandang hapon' : 'Magandang gabi';
  const first = user.displayName.split(' ')[0];
  const level = ctx.settings.level || 'beginner';
  const next = nextUp(ctx.progress, content, level);

  const nudge = stats.activeToday
    ? 'You’ve practiced today. Galing!'
    : stats.streak > 0
      ? `Keep your ${stats.streak}-day streak going — do one activity today.`
      : 'Do one activity today to start a streak.';

  const shortcut = (route, title, text, ic) => h('a.shortcut', { href: `#/${route}` },
    h('span.shortcut-icon', icon(ic)), h('span', h('b', title), h('span.muted.small', text)));

  const hero = h('section.home-hero',
    baoSays(`${greet}, ${first}! ${nudge}`, stats.activeToday ? 'happy' : 'idle', { size: 128 }),
    h('a.continue', { href: `#/${next.route}` },
      h('span.continue-icon', icon(KIND_ICON[next.kind])),
      h('span.continue-text', h('span.muted.small', `Continue · ${KIND_TEXT[next.kind]} · ${labelOf(LEVELS, level)}`), h('b', next.label)),
      h('span.btn-chunky.primary.small', icon('play'), 'Start')));

  const rings = h('div.home-rings',
    h('div.ring-item', ring(stats.wordsLearned, stats.totalWords, { size: 96, label: String(stats.wordsLearned), sub: 'words' }), h('span', 'Words learned')),
    h('div.ring-item', ring(stats.storiesCompleted, stats.totalStories, { size: 96, label: `${stats.storiesCompleted}/${stats.totalStories}`, sub: 'stories' }), h('span', 'Stories completed')),
    h('div.ring-item', ring(stats.sentencesDone, stats.totalSentences, { size: 96, label: String(stats.sentencesDone), sub: 'sentences' }), h('span', 'Sentences practiced')),
    h('div.ring-item', ring(Math.min(stats.quizzesTaken, 10), 10, { size: 96, label: String(stats.quizzesTaken), sub: 'quizzes' }), h('span', 'Quizzes completed')));

  const grid = h('div.home-grid',
    h('section.home-daily',
      h('div.section-head', h('h2', 'Word of the day'), h('span.muted.small', new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }), ' · ', labelOf(CATEGORIES, today.category))),
      wordCard(today, ctx, { big: true })),
    h('section',
      h('div.section-head', h('h2', 'Your progress'), h('a.small', { href: '#/progress' }, 'See all')),
      rings,
      h('div.section-head', { style: { marginTop: '26px' } }, h('h2', 'Practice')),
      h('div.shortcuts',
        shortcut('words', 'Study word cards', 'Flip, say it, mark it learned', 'words'),
        shortcut('quiz', 'Take a quiz', '10 questions, +10 XP each', 'quiz'),
        shortcut('stories', 'Read a story', '+30 XP when you finish', 'stories'),
        shortcut('sentences', 'Practice sentences', 'Sets of 10 — fill the blank', 'sentences'))));

  el.append(hero, grid);
  stagger([hero, ...grid.children], { step: 80 });
}
