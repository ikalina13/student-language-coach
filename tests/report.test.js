const { test } = require('node:test');
const assert = require('node:assert');
const { renderReportHTML } = require('../app/core/report');

const stats = {
  wordsLearned: 42, totalWords: 720, storiesCompleted: 3, totalStories: 9, sentencesDone: 17, totalSentences: 60,
  quizzesTaken: 2, averageScore: 70, bestScore: 80,
  byCategory: { food: { learned: 5, total: 90 } }, byLevel: { beginner: { learned: 42, total: 240 } },
  recentQuizzes: [{ date: '2026-11-19T03:00:00Z', category: 'food', level: 'beginner', score: 8, total: 10, percent: 80 }],
};

test('report shows the student, grade and every stat', () => {
  const html = renderReportHTML({ user: { displayName: 'Ana Cruz', username: 'ana', grade: 5 }, stats, date: new Date('2026-11-19T12:00:00') });
  for (const s of ['Ana Cruz', 'Grade 5', '42', '720', '3', '9', '17', '60', '70%', '80%', 'Food', 'Beginner', '8/10']) {
    assert.ok(html.includes(s), `missing ${s}`);
  }
});

test('report escapes HTML in the display name', () => {
  const html = renderReportHTML({ user: { displayName: '<script>x</script>', username: 'a', grade: 4 }, stats, date: new Date() });
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('report with no quizzes says so', () => {
  const html = renderReportHTML({ user: { displayName: 'A', username: 'a', grade: 4 }, stats: { ...stats, recentQuizzes: [], quizzesTaken: 0 }, date: new Date() });
  assert.ok(html.includes('No quizzes taken yet'));
});

test('report carries the Student Language Coach name', () => {
  const html = renderReportHTML({ user: { displayName: 'A', username: 'a', grade: 4 }, stats, date: new Date() });
  assert.ok(html.includes('Student Language Coach'));
  assert.ok(!/Salita/.test(html));
});

test('report shows XP and the day streak', () => {
  const html = renderReportHTML({ user: { displayName: 'A', username: 'a', grade: 4 }, stats: { ...stats, xp: 1234, streak: 5 }, date: new Date() });
  assert.ok(html.includes('1,234'));
  assert.ok(html.includes('XP earned'));
  assert.ok(html.includes('5-day streak'));
});
