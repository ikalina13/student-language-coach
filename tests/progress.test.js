const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createStore } = require('../app/core/store');
const { createProgress, computeStats, streakFrom, dayKey } = require('../app/core/progress');

function store() {
  const s = createStore(fs.mkdtempSync(path.join(os.tmpdir(), 'salita-'))); s.ensureDirs(); return s;
}

test('new user gets default progress', () => {
  assert.deepStrictEqual(createProgress(store(), 'ana').get(), {
    learnedWords: [], completedStories: [], sentencesDone: [], quizzes: [],
    xp: 0, activeDays: [], xpAwarded: [],
    settings: { mode: 'light', accent: 'blue', level: null },
  });
});

test('toggleLearned adds then removes and persists', () => {
  const s = store();
  assert.strictEqual(createProgress(s, 'ana').toggleLearned('w1').learned, true);
  assert.deepStrictEqual(createProgress(s, 'ana').get().learnedWords, ['w1']);
  assert.strictEqual(createProgress(s, 'ana').toggleLearned('w1').learned, false);
  assert.deepStrictEqual(createProgress(s, 'ana').get().learnedWords, []);
});

test('completeStory and markSentence are idempotent', () => {
  const p = createProgress(store(), 'ana');
  p.completeStory('s1'); p.completeStory('s1'); p.markSentence('x'); p.markSentence('x');
  assert.deepStrictEqual(p.get().completedStories, ['s1']);
  assert.deepStrictEqual(p.get().sentencesDone, ['x']);
});

test('two users are isolated', () => {
  const s = store();
  createProgress(s, 'ana').toggleLearned('w1');
  assert.deepStrictEqual(createProgress(s, 'ben').get().learnedWords, []);
});

test('recordQuiz stamps a date and setSettings merges', () => {
  const p = createProgress(store(), 'ana');
  p.recordQuiz({ category: 'food', level: 'beginner', score: 8, total: 10 });
  assert.ok(!isNaN(Date.parse(p.get().quizzes[0].date)));
  p.setSettings({ mode: 'dark' });
  assert.deepStrictEqual(p.get().settings, { mode: 'dark', accent: 'blue', level: null });
});

test('computeStats counts exactly', () => {
  const content = {
    words: [
      { id: 'a', category: 'food', level: 'beginner' },
      { id: 'b', category: 'food', level: 'advanced' },
      { id: 'c', category: 'school', level: 'beginner' },
    ],
    stories: [{ id: 's1' }, { id: 's2' }],
    sentences: [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
  };
  const progress = {
    learnedWords: ['a', 'c', 'gone'], completedStories: ['s1'], sentencesDone: ['x', 'y'],
    quizzes: [
      { date: '2026-11-01T00:00:00Z', category: 'food', level: 'beginner', score: 8, total: 10 },
      { date: '2026-11-02T00:00:00Z', category: 'food', level: 'beginner', score: 6, total: 10 },
    ],
    settings: {},
  };
  const s = computeStats(progress, content);
  assert.strictEqual(s.wordsLearned, 2);
  assert.strictEqual(s.totalWords, 3);
  assert.strictEqual(s.storiesCompleted, 1);
  assert.strictEqual(s.totalStories, 2);
  assert.strictEqual(s.sentencesDone, 2);
  assert.strictEqual(s.totalSentences, 3);
  assert.strictEqual(s.quizzesTaken, 2);
  assert.strictEqual(s.averageScore, 70);
  assert.strictEqual(s.bestScore, 80);
  assert.deepStrictEqual(s.byCategory.food, { learned: 1, total: 2 });
  assert.deepStrictEqual(s.byLevel.beginner, { learned: 2, total: 2 });
  assert.strictEqual(s.recentQuizzes[0].score, 6);
});

test('computeStats with no quizzes has zero scores', () => {
  const s = computeStats({ learnedWords: [], completedStories: [], sentencesDone: [], quizzes: [] }, { words: [], stories: [], sentences: [] });
  assert.strictEqual(s.averageScore, 0);
  assert.strictEqual(s.bestScore, 0);
});

test('progress file set to null gives defaults', () => {
  const s = store();
  s.writeJSON('progress/ana.json', null);
  assert.deepStrictEqual(createProgress(s, 'ana').get().learnedWords, []);
});

test('hand-edited fields with the wrong type are reset', () => {
  const s = store();
  s.writeJSON('progress/ana.json', { learnedWords: {}, quizzes: 'x', settings: 5, completedStories: ['s1'] });
  const p = createProgress(s, 'ana');
  assert.deepStrictEqual(p.get().learnedWords, []);
  assert.deepStrictEqual(p.get().quizzes, []);
  assert.deepStrictEqual(p.get().completedStories, ['s1']);
  assert.strictEqual(p.get().settings.mode, 'light');
  assert.strictEqual(p.toggleLearned('w1').learned, true);
});

test('learning a word gives +2 XP only the first time', () => {
  const p = createProgress(store(), 'ana');
  assert.strictEqual(p.toggleLearned('w1').xpGained, 2);
  assert.strictEqual(p.toggleLearned('w1').xpGained, 0);
  assert.strictEqual(p.toggleLearned('w1').xpGained, 0);
  assert.strictEqual(p.get().xp, 2);
});

test('re-marking a word does not make a new day active', () => {
  const s = store();
  const p = createProgress(s, 'ana');
  p.toggleLearned('w1'); p.toggleLearned('w1');
  const saved = p.get(); saved.activeDays = []; s.writeJSON('progress/ana.json', saved);
  p.toggleLearned('w1');
  assert.deepStrictEqual(p.get().activeDays, []);
});

test('story gives +30 once and sentence +5 once', () => {
  const p = createProgress(store(), 'ana');
  assert.strictEqual(p.completeStory('st1').xpGained, 30);
  assert.strictEqual(p.completeStory('st1').xpGained, 0);
  assert.strictEqual(p.markSentence('s1').xpGained, 5);
  assert.strictEqual(p.markSentence('s1').xpGained, 0);
  assert.strictEqual(p.get().xp, 35);
});

test('quiz XP is 10 per correct answer plus 20 for a perfect score', () => {
  const p = createProgress(store(), 'ana');
  assert.strictEqual(p.recordQuiz({ category: 'food', level: 'beginner', score: 8, total: 10 }).xpGained, 80);
  assert.strictEqual(p.recordQuiz({ category: 'food', level: 'beginner', score: 10, total: 10 }).xpGained, 120);
  assert.strictEqual(p.recordQuiz({ category: 'food', level: 'beginner', score: 0, total: 10 }).xpGained, 0);
  assert.strictEqual(p.get().xp, 200);
});

test('earning XP marks today active once; zero XP does not', () => {
  const p = createProgress(store(), 'ana');
  p.recordQuiz({ category: 'food', level: 'beginner', score: 0, total: 10 });
  assert.deepStrictEqual(p.get().activeDays, []);
  p.markSentence('s1'); p.markSentence('s2');
  assert.deepStrictEqual(p.get().activeDays, [dayKey(new Date())]);
});

test('dayKey uses the local calendar date', () => {
  assert.strictEqual(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('streak counts consecutive days ending today', () => {
  assert.strictEqual(streakFrom(['2026-11-18', '2026-11-19', '2026-11-20'], '2026-11-20'), 3);
});

test('streak still shows when only yesterday is active', () => {
  assert.strictEqual(streakFrom(['2026-11-18', '2026-11-19'], '2026-11-20'), 2);
});

test('streak resets after a missed day', () => {
  assert.strictEqual(streakFrom(['2026-11-16', '2026-11-17', '2026-11-19'], '2026-11-21'), 0);
  assert.strictEqual(streakFrom(['2026-11-15', '2026-11-17', '2026-11-18'], '2026-11-18'), 2);
});

test('streak crosses a month boundary', () => {
  assert.strictEqual(streakFrom(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01'), 3);
});

test('streak ignores order and duplicates', () => {
  assert.strictEqual(streakFrom(['2026-11-20', '2026-11-19', '2026-11-20'], '2026-11-20'), 2);
});

test('old progress file without XP fields loads with defaults', () => {
  const s = store();
  s.writeJSON('progress/ana.json', { learnedWords: ['a'], completedStories: [], sentencesDone: [], quizzes: [] });
  const g = createProgress(s, 'ana').get();
  assert.strictEqual(g.xp, 0);
  assert.deepStrictEqual(g.activeDays, []);
  assert.deepStrictEqual(g.xpAwarded, []);
});

test('computeStats reports xp, streak and whether today is active', () => {
  const today = dayKey(new Date());
  const s = computeStats({ learnedWords: [], completedStories: [], sentencesDone: [], quizzes: [], xp: 42, activeDays: [today] }, { words: [], stories: [], sentences: [] });
  assert.strictEqual(s.xp, 42);
  assert.strictEqual(s.streak, 1);
  assert.strictEqual(s.activeToday, true);
});
