// Local accounts. Passwords are hashed with scrypt; nothing leaves this PC.
const crypto = require('crypto');

const ERR = {
  username: 'Username must be 3–20 letters, numbers or _',
  taken: 'That username is taken',
  password: 'Password must be at least 4 characters',
  grade: 'Pick a grade from 4 to 10',
  login: 'Wrong username or password',
};

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function hash(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function suggestedLevel(grade) {
  if (grade <= 5) return 'beginner';
  if (grade <= 8) return 'intermediate';
  return 'advanced';
}

function publicUser(u) {
  return { username: u.username, displayName: u.displayName, grade: u.grade };
}

function createAuth(store) {
  const load = () => store.readJSON('users.json', []);
  const save = (users) => store.writeJSON('users.json', users);
  const find = (users, name) => users.find((u) => u.username === String(name || '').toLowerCase());

  function check(user, password) {
    if (!user) return false;
    const a = Buffer.from(hash(password, user.salt), 'hex');
    const b = Buffer.from(user.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function register({ username, password, displayName, grade }) {
    if (!USERNAME_RE.test(username || '')) return { ok: false, error: ERR.username };
    if (String(password || '').length < 4) return { ok: false, error: ERR.password };
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 4 || g > 10) return { ok: false, error: ERR.grade };
    const users = load();
    const name = username.toLowerCase();
    if (find(users, name)) return { ok: false, error: ERR.taken };
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      username: name,
      displayName: String(displayName || '').trim() || username,
      grade: g,
      salt,
      hash: hash(password, salt),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    save(users);
    return { ok: true, user: publicUser(user) };
  }

  function login(username, password) {
    const user = find(load(), username);
    if (!check(user, password)) return { ok: false, error: ERR.login };
    return { ok: true, user: publicUser(user) };
  }

  function remove(username, password) {
    const users = load();
    const user = find(users, username);
    if (!check(user, password)) return { ok: false, error: ERR.login };
    save(users.filter((u) => u !== user));
    return { ok: true };
  }

  function listUsers() {
    return load().map(publicUser);
  }

  return { register, login, remove, listUsers };
}

module.exports = { createAuth, suggestedLevel, USERNAME_RE };
