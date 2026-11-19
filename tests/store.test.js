const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createStore } = require('../app/core/store');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'salita-'));

test('missing file returns fallback', () => {
  const s = createStore(tmp());
  assert.deepStrictEqual(s.readJSON('users.json', []), []);
});

test('write then read round-trips', () => {
  const s = createStore(tmp());
  s.writeJSON('users.json', [{ a: 1 }]);
  assert.deepStrictEqual(s.readJSON('users.json', []), [{ a: 1 }]);
});

test('corrupt file returns fallback and leaves .bak', () => {
  const dir = tmp(); const s = createStore(dir);
  fs.writeFileSync(path.join(dir, 'users.json'), '{not json');
  assert.deepStrictEqual(s.readJSON('users.json', []), []);
  assert.ok(fs.existsSync(path.join(dir, 'users.json.bak')));
  assert.ok(!fs.existsSync(path.join(dir, 'users.json')));
});

test('ensureDirs creates progress/', () => {
  const dir = path.join(tmp(), 'nested');
  createStore(dir).ensureDirs();
  assert.ok(fs.statSync(path.join(dir, 'progress')).isDirectory());
});
