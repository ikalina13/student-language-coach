const { test, before } = require('node:test');
const assert = require('node:assert');
let C;
before(async () => { C = await import('../app/shared/content.mjs'); });

const mk = (n, cat = 'food', level = 'beginner') => Array.from({ length: n }, (_, i) => ({
  id: `${cat}-${i}`, word: `word${i}`, filipino: `salita${i}`, category: cat, level,
}));

test('dailyWord is stable within a day and changes the next day', () => {
  const words = mk(50);
  const a = C.dailyWord(words, new Date(2026, 10, 19, 1));
  const b = C.dailyWord(words, new Date(2026, 10, 19, 23));
  const c = C.dailyWord(words, new Date(2026, 10, 20, 9));
  assert.strictEqual(a.id, b.id);
  assert.notStrictEqual(a.id, c.id);
});

test('dailyWord works for dates before 2026', () => {
  assert.ok(C.dailyWord(mk(5), new Date(2020, 0, 1)));
});

test('buildQuiz makes 10 questions with 4 distinct options and the right answer', () => {
  const words = mk(30);
  const q = C.buildQuiz(words, { category: 'food', level: 'beginner' });
  assert.strictEqual(q.length, 10);
  for (const item of q) {
    const w = words.find((x) => x.id === item.wordId);
    assert.strictEqual(item.prompt, `What does "${w.word}" mean?`);
    assert.strictEqual(new Set(item.options).size, 4);
    assert.strictEqual(item.options[item.answer], w.filipino);
  }
});

test('buildQuiz keeps options distinct when words share a meaning', () => {
  const words = mk(12);
  words[1].filipino = words[0].filipino; words[2].filipino = words[0].filipino;
  for (let i = 0; i < 20; i++) {
    for (const item of C.buildQuiz(words, { category: 'food', level: 'beginner' })) {
      assert.strictEqual(new Set(item.options).size, 4);
      assert.strictEqual(item.options.filter((o) => o === words.find((w) => w.id === item.wordId).filipino).length, 1);
    }
  }
});

test('buildQuiz only uses the chosen category and level', () => {
  const words = [...mk(15), ...mk(15, 'school')];
  const q = C.buildQuiz(words, { category: 'school', level: 'beginner' });
  assert.ok(q.every((i) => i.wordId.startsWith('school-')));
});

test('searchWords is case and space insensitive on English', () => {
  const words = [{ id: 1, word: 'happy', filipino: 'masaya', category: 'feelings', level: 'beginner' }];
  assert.strictEqual(C.searchWords(words, { query: '  HaPpy ' }).length, 1);
});

test('searchWords finds by Filipino meaning', () => {
  const words = [{ id: 1, word: 'happy', filipino: 'masaya', category: 'feelings', level: 'beginner' }];
  assert.strictEqual(C.searchWords(words, { query: 'Masaya' }).length, 1);
});

test('empty query with category filter returns only that category sorted', () => {
  const words = [...mk(3, 'food'), ...mk(2, 'school')].reverse();
  const r = C.searchWords(words, { query: '', category: 'school' });
  assert.deepStrictEqual(r.map((w) => w.id), ['school-0', 'school-1']);
});

const sent = (n, level = 'beginner') => Array.from({ length: n }, (_, i) => ({ id: `s${level[0]}${String(i + 1).padStart(2, '0')}`, level }));

test('sentenceSets splits a level into sets of 10 with a smaller last set', () => {
  const sets = C.sentenceSets([...sent(23), ...sent(5, 'advanced')], 'beginner');
  assert.deepStrictEqual(sets.map((s) => s.items.length), [10, 10, 3]);
  assert.deepStrictEqual(sets.map((s) => s.index), [0, 1, 2]);
  assert.strictEqual(sets[2].items[0].id, 'sb21');
});

test('studyDeck puts unlearned words first, each group in id order', () => {
  const words = mk(5);
  const deck = C.studyDeck(words, ['food-1', 'food-3'], { category: 'food', level: 'beginner' });
  assert.deepStrictEqual(deck.map((w) => w.id), ['food-0', 'food-2', 'food-4', 'food-1', 'food-3']);
});

const content = () => ({
  words: [...mk(4, 'food'), ...mk(4, 'school')],
  stories: [{ id: 'b1', level: 'beginner', title: 'One' }, { id: 'b2', level: 'beginner', title: 'Two' }],
  sentences: sent(12),
});
const prog = (o = {}) => ({ learnedWords: [], completedStories: [], sentencesDone: [], ...o });

test('nextUp suggests the first sentence set with unpractised sentences', () => {
  const doneFirst10 = sent(10).map((s) => s.id);
  const n = C.nextUp(prog({ sentencesDone: doneFirst10 }), content(), 'beginner');
  assert.strictEqual(n.kind, 'sentences');
  assert.strictEqual(n.route, 'sentences/beginner/1');
});

test('nextUp suggests the first unread story once sentences are done', () => {
  const n = C.nextUp(prog({ sentencesDone: sent(12).map((s) => s.id), completedStories: ['b1'] }), content(), 'beginner');
  assert.deepStrictEqual([n.kind, n.route], ['story', 'stories/b2']);
});

test('nextUp falls back to a quiz on the category with the fewest learned words', () => {
  const n = C.nextUp(prog({ sentencesDone: sent(12).map((s) => s.id), completedStories: ['b1', 'b2'], learnedWords: ['food-0', 'food-1'] }), content(), 'beginner');
  assert.strictEqual(n.kind, 'quiz');
  assert.strictEqual(n.route, 'quiz/school/beginner');
});
