const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const words = require('../app/data/words.json');
const stories = require('../app/data/stories.json');
const sentences = require('../app/data/sentences.json');
const { wordsToCsv, csvToWords } = require('../scripts/csv');

const CATS = ['school', 'family', 'food', 'animals', 'places', 'feelings', 'actions', 'common'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

test('word ids are unique', () => {
  assert.strictEqual(new Set(words.map((w) => w.id)).size, words.length);
});

test('every category and level has at least 25 words', () => {
  for (const c of CATS) for (const l of LEVELS) {
    const n = words.filter((w) => w.category === c && w.level === l).length;
    assert.ok(n >= 25, `${c}/${l} has ${n}`);
  }
});

test('no English word appears twice', () => {
  const seen = new Set();
  for (const w of words) { assert.ok(!seen.has(w.word), `duplicate ${w.word}`); seen.add(w.word); }
});

test('every word has all fields filled', () => {
  for (const w of words) for (const k of ['id', 'word', 'pronunciation', 'filipino', 'example', 'category', 'level']) {
    assert.ok(String(w[k] || '').trim(), `${w.id} missing ${k}`);
  }
});

test('each level has 3 stories with 3 valid questions', () => {
  for (const l of LEVELS) {
    const s = stories.filter((x) => x.level === l);
    assert.strictEqual(s.length, 3);
    for (const st of s) {
      assert.strictEqual(st.questions.length, 3);
      for (const q of st.questions) { assert.strictEqual(q.options.length, 4); assert.ok(q.answer >= 0 && q.answer < 4); }
    }
  }
});

test('each level has 20 sentences whose target appears as a whole word', () => {
  for (const l of LEVELS) assert.strictEqual(sentences.filter((s) => s.level === l).length, 20);
  for (const s of sentences) {
    assert.ok(new RegExp(`\\b${s.target}\\b`).test(s.en), s.id);
    assert.strictEqual(s.distractors.length, 3);
    assert.ok(!s.distractors.includes(s.target), s.id);
  }
});

test('csv round-trip keeps every word identical', () => {
  assert.deepStrictEqual(csvToWords(wordsToCsv(words)), words);
});

test('csv handles commas and quotes in fields', () => {
  const w = [{ id: 'x', word: 'a', pronunciation: 'AY', filipino: 'isa, "uno"', example: 'Say "a", then b.', category: 'common', level: 'beginner' }];
  assert.deepStrictEqual(csvToWords(wordsToCsv(w)), w);
});
