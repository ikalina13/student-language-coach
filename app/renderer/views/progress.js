// Progress Tracker: totals, breakdowns, quiz history, and PDF export.
import { h, icon, levelTag, toast } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf } from '../../shared/content.mjs';

export async function progressView(el, ctx) {
  const s = await ctx.api.progress.stats();
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  const bigNum = (n, of, label) => h('div.stat', h('b', n), of != null ? h('span.of', ` / ${of}`) : null, h('span.label', label));
  const barRow = (label, { learned, total }) => h('li.bar-row',
    h('span', label), h('div.meter', h('span', { style: { width: `${pct(learned, total)}%` } })), h('span.muted.small.num', `${learned}/${total}`));

  const exportBtn = h('button.btn.primary', { type: 'button', onclick: async () => {
    exportBtn.disabled = true;
    const r = await ctx.api.report.exportPdf();
    exportBtn.disabled = false;
    if (r.ok) toast('Report saved as PDF');
  } }, icon('download'), 'Export report (PDF)');

  el.append(
    h('div.page-head',
      h('div', h('h1', 'My Progress'), h('p', 'Everything you’ve done so far. Export it as a PDF to print or send to your teacher.')),
      exportBtn),
    h('div.stats.wide',
      bigNum(s.wordsLearned, s.totalWords, 'words learned'),
      bigNum(s.storiesCompleted, s.totalStories, 'stories completed'),
      bigNum(s.quizzesTaken, null, 'quizzes completed'),
      bigNum(s.sentencesDone, s.totalSentences, 'sentences practiced'),
      bigNum(`${s.averageScore}%`, null, 'average quiz score'),
      bigNum(`${s.bestScore}%`, null, 'best quiz score')),
    h('div.two-col',
      h('section.panel', h('h2', 'Words by category'), h('ul.list.bars', CATEGORIES.map((c) => barRow(c.label, s.byCategory[c.id])))),
      h('section.panel', h('h2', 'Words by level'), h('ul.list.bars', LEVELS.map((l) => barRow(levelTag(l.id, l.label), s.byLevel[l.id]))),
        h('h2', { style: { marginTop: '24px' } }, 'Practice'),
        h('ul.list.bars',
          barRow('Stories', { learned: s.storiesCompleted, total: s.totalStories }),
          barRow('Sentences', { learned: s.sentencesDone, total: s.totalSentences })))),
    h('section.panel', { style: { marginTop: '20px' } },
      h('h2', 'Recent quizzes'),
      s.recentQuizzes.length
        ? h('table.quiz-table',
          h('thead', h('tr', h('th', 'Date'), h('th', 'Category'), h('th', 'Level'), h('th.num', 'Score'))),
          h('tbody', s.recentQuizzes.map((q) => h('tr',
            h('td', new Date(q.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
            h('td', labelOf(CATEGORIES, q.category)), h('td', levelTag(q.level, labelOf(LEVELS, q.level))),
            h('td.num', h('b', `${q.score}/${q.total}`), h('span.muted', ` (${q.percent}%)`))))))
        : h('p.empty-state', 'No quizzes yet. ', h('a', { href: '#/quiz' }, 'Take your first quiz'), ' to see your scores here.')));
}
