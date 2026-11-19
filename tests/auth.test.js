const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { createStore } = require('../app/core/store');
const { createAuth, suggestedLevel } = require('../app/core/auth');

function fresh() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'salita-'));
  const store = createStore(dir); store.ensureDirs();
  return { dir, auth: createAuth(store) };
}
const ana = { username: 'ana', password: 'pass1', displayName: 'Ana', grade: 5 };

test('register then login succeeds', () => {
  const { auth } = fresh();
  assert.strictEqual(auth.register(ana).ok, true);
  const r = auth.login('ana', 'pass1');
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.user, { username: 'ana', displayName: 'Ana', grade: 5 });
});

test('username differing only in case is taken', () => {
  const { auth } = fresh(); auth.register(ana);
  assert.deepStrictEqual(auth.register({ ...ana, username: 'ANA' }), { ok: false, error: 'That username is taken' });
});

test('login is case-insensitive on username', () => {
  const { auth } = fresh(); auth.register(ana);
  assert.strictEqual(auth.login('ANA', 'pass1').ok, true);
});

test('path-like username is rejected', () => {
  const { auth } = fresh();
  assert.deepStrictEqual(auth.register({ ...ana, username: '../x' }), { ok: false, error: 'Username must be 3–20 letters, numbers or _' });
});

test('short password is rejected', () => {
  const { auth } = fresh();
  assert.deepStrictEqual(auth.register({ ...ana, password: 'abc' }), { ok: false, error: 'Password must be at least 4 characters' });
});

test('grade outside 4-10 is rejected', () => {
  const { auth } = fresh();
  assert.deepStrictEqual(auth.register({ ...ana, grade: 3 }), { ok: false, error: 'Pick a grade from 4 to 10' });
});

test('wrong password and unknown user give the same error', () => {
  const { auth } = fresh(); auth.register(ana);
  const e = { ok: false, error: 'Wrong username or password' };
  assert.deepStrictEqual(auth.login('ana', 'nope'), e);
  assert.deepStrictEqual(auth.login('ghost', 'pass1'), e);
});

test('password is not stored in plain text', () => {
  const { dir, auth } = fresh(); auth.register(ana);
  const raw = fs.readFileSync(path.join(dir, 'users.json'), 'utf8');
  assert.ok(!raw.includes('pass1'));
});

test('remove requires the correct password', () => {
  const { auth } = fresh(); auth.register(ana);
  assert.strictEqual(auth.remove('ana', 'bad').ok, false);
  assert.strictEqual(auth.remove('ana', 'pass1').ok, true);
  assert.deepStrictEqual(auth.listUsers(), []);
});

test('suggestedLevel maps grades to levels', () => {
  assert.strictEqual(suggestedLevel(4), 'beginner');
  assert.strictEqual(suggestedLevel(5), 'beginner');
  assert.strictEqual(suggestedLevel(7), 'intermediate');
  assert.strictEqual(suggestedLevel(10), 'advanced');
});

test('users.json with the wrong shape does not crash and accounts can be made', () => {
  const { dir, auth } = fresh();
  fs.writeFileSync(path.join(dir, 'users.json'), '{}');
  assert.deepStrictEqual(auth.listUsers(), []);
  assert.strictEqual(auth.register(ana).ok, true);
});

test('users.json set to null does not crash login', () => {
  const { dir, auth } = fresh();
  fs.writeFileSync(path.join(dir, 'users.json'), 'null');
  assert.strictEqual(auth.login('ana', 'pass1').ok, false);
});
