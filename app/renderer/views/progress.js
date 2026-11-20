// Progress Tracker: rings, XP and streak, breakdowns, quiz history, and PDF export.
import { h, icon, levelTag, toast } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf } from '../../shared/content.mjs';
import { ring } from '../lib/rings.js';
import { countUp, stagger } from '../lib/motion.js';
import { baoSays } from '../lib/bao.js';

export async function progressView(el, ctx) {
  const s = await ctx.api.progress.stats();
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  const num = (n, suffix = '') => { const b = h('b'); countUp(b, n, { format: (v) => `${v.toLocaleString('en-US')}${suffix}` }); return b; };
  const tile = (value, label, ic, suffix) => h('div.tile', ic ? h('span.tile-icon', icon(ic)) : null, h('div', num(value, suffix), h('span', label)));
  const barRow = (label, { learned, total }) => h('li.bar-row',
    h('span', label), h('div.meter', h('span', { style: { width: `${pct(learned, total)}%` } })), h('span.muted.small.num', `${learned}/${total}`));

  const exportBtn = h('button.btn-chunky.primary', { type: 'button', onclick: async () => {
    exportBtn.disabled = true;
    const r = await ctx.api.report.exportPdf();
    exportBtn.disabled = false;
    if (r.ok) toast('Report saved as PDF');
  } }, icon('download'), 'Export report (PDF)');

  const tiles = h('div.tiles',
    tile(s.xp, 'total XP', 'star'),
    tile(s.streak, s.streak === 1 ? 'day streak' : 'day streak', 'flame'),
    tile(s.quizzesTaken, 'quizzes completed', 'quiz'),
    tile(s.averageScore, 'average quiz score', null, '%'),
    tile(s.bestScore, 'best quiz score', null, '%'));

  const levelRings = h('div.level-rings', LEVELS.map((l) => h('div.ring-item',
    ring(s.byLevel[l.id].learned, s.byLevel[l.id].total, { size: 110, sub: `${s.byLevel[l.id].learned}/${s.byLevel[l.id].total}` }),
    levelTag(l.id, l.label))));

  el.append(
    h('div.page-head',
      h('div', h('h1', 'My Progress'), h('p', 'Everything you’ve done so far. Export it as a PDF to print or send to your teacher.')),
      exportBtn),
    h('section.progress-hero',
      baoSays(s.wordsLearned ? `You’ve learned ${s.wordsLearned} words. Keep going!` : 'Mark words as learned to fill these rings.', 'happy', { size: 96 }),
      h('div.ring-item.overall', ring(s.wordsLearned, s.totalWords, { size: 140, stroke: 12, sub: 'of all words' }), h('span', 'Words learned')),
      levelRings),
    tiles,
    h('div.two-col',
      h('section.panel', h('h2', 'Words by category'), h('ul.list.bars', CATEGORIES.map((c) => barRow(c.label, s.byCategory[c.id])))),
      h('section.panel', h('h2', 'Practice'),
        h('ul.list.bars',
          barRow('Stories', { learned: s.storiesCompleted, total: s.totalStories }),
          barRow('Sentences', { learned: s.sentencesDone, total: s.totalSentences })),
        h('h2', { style: { marginTop: '24px' } }, 'Recent quizzes'),
        s.recentQuizzes.length
          ? h('table.quiz-table',
            h('thead', h('tr', h('th', 'Date'), h('th', 'Topic'), h('th', 'Level'), h('th.num', 'Score'))),
            h('tbody', s.recentQuizzes.map((q) => h('tr',
              h('td', new Date(q.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })),
              h('td', labelOf(CATEGORIES, q.category)), h('td', levelTag(q.level, labelOf(LEVELS, q.level))),
              h('td.num', h('b', `${q.score}/${q.total}`))))))
          : h('p.empty-state', 'No quizzes yet. ', h('a', { href: '#/quiz' }, 'Take your first quiz'), ' to see your scores here.'))));
  stagger(tiles.children);
}
