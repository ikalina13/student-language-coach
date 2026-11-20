// Log in / create account screen.
import { h } from '../lib/dom.js';
import { baoSays } from '../lib/bao.js';

export function authView(ctx, mode, done) {
  const { api } = ctx;
  const isSignup = mode === 'signup';
  const err = h('p.error', { role: 'alert' });

  const field = (id, label, input, hint) => h('div.field', h('label', { for: id }, label), input, hint && h('span.hint', hint));
  const username = h('input', { id: 'username', type: 'text', autocomplete: 'username', maxlength: 20, required: true });
  const password = h('input', { id: 'password', type: 'password', autocomplete: isSignup ? 'new-password' : 'current-password', required: true });
  const displayName = h('input', { id: 'displayName', type: 'text', maxlength: 40 });
  const grade = h('select', { id: 'grade' },
    h('option', { value: '' }, 'Choose your grade'),
    [4, 5, 6, 7, 8, 9, 10].map((g) => h('option', { value: g }, `Grade ${g}`)));

  api.prefs.getLast().then((p) => { if (!isSignup && p.username) { username.value = p.username; password.focus(); } else username.focus(); });

  async function submit(e) {
    e.preventDefault();
    err.textContent = '';
    const r = isSignup
      ? await api.auth.register({ username: username.value.trim(), password: password.value, displayName: displayName.value, grade: Number(grade.value) })
      : await api.auth.login(username.value.trim(), password.value);
    if (!r.ok) { err.textContent = r.error; return; }
    await api.prefs.setLast({ username: r.user.username });
    location.hash = '#/dashboard';
    done();
  }

  const form = h('form', { onsubmit: submit, novalidate: true },
    isSignup && field('displayName', 'Your name', displayName, 'This goes on your progress report.'),
    field('username', 'Username', username, isSignup ? '3–20 letters, numbers or _' : null),
    field('password', 'Password', password, isSignup ? 'At least 4 characters. Remember it — there is no reset.' : null),
    isSignup && field('grade', 'Grade', grade, 'We use this to pick your starting level. You can change levels anytime.'),
    err,
    h('button.btn.primary', { type: 'submit', style: { width: '100%' } }, isSignup ? 'Create account' : 'Log in'));

  return h('div.auth',
    h('section.auth-intro',
      h('div.auth-brand', h('span.brand-mark', 'SLC'), h('span', 'Student Language Coach')),
      h('h2.lede', 'Learn English words, one card at a time.'),
      baoSays(isSignup ? 'Kumusta! I’m Bao. Let’s set up your account.' : 'Welcome back! I’m Bao, your study buddy.', 'happy', { size: 150 }),
      h('ul.auth-points',
        h('li', 'Word cards with Filipino meanings'),
        h('li', 'Quizzes, stories and sentence practice'),
        h('li', 'Earn XP and keep a daily streak'))),
    h('section.auth-form',
      h('h1', isSignup ? 'Create your account' : 'Welcome back'),
      h('p.muted', { style: { margin: '6px 0 22px' } }, isSignup ? 'Your account and progress stay on this computer.' : 'Log in to continue where you left off.'),
      form,
      h('p.switch', isSignup ? 'Already have an account? ' : 'New here? ',
        h('a', { href: isSignup ? '#/login' : '#/signup' }, isSignup ? 'Log in' : 'Create an account'))));
}
