const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createStore } = require('../app/core/store');
const { createProgress, computeStats } = require('../app/core/progress');

function store() {
  const s = createStore(fs.mkdtempSync(path.join(os.tmpdir(), 'salita-'))); s.ensureDirs(); return s;
}

test('new user gets default progress', () => {
  assert.deepStrictEqual(createProgress(store(), 'ana').get(), {
    learnedWords: [], completedStories: [], sentencesDone: [], quizzes: [],
    settings: { mode: 'light', accent: 'blue', level: null },
  });
});

test('toggleLearned adds then removes and persists', () => {
  const s = store();
  assert.strictEqual(createProgress(s, 'ana').toggleLearned('w1'), true);
  assert.deepStrictEqual(createProgress(s, 'ana').get().learnedWords, ['w1']);
  assert.strictEqual(createProgress(s, 'ana').toggleLearned('w1'), false);
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
  assert.strictEqual(p.toggleLearned('w1'), true);
});
