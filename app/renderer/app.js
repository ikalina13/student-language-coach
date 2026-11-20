// Starts the app: loads content, applies the theme, and shows the right screen.
import { h, icon } from './lib/dom.js';
import { enter, countUp, pop } from './lib/motion.js';
import { authView } from './views/auth.js';
import { dashboardView } from './views/dashboard.js';
import { wordsView } from './views/words.js';
import { dictionaryView } from './views/dictionary.js';
import { quizView } from './views/quiz.js';
import { storiesView } from './views/stories.js';
import { sentencesView } from './views/sentences.js';
import { progressView } from './views/progress.js';
import { settingsView } from './views/settings.js';

const api = window.salita;
const root = document.getElementById('app');

const NAV = [
  { route: 'dashboard', label: 'Home', icon: 'home', view: dashboardView },
  { route: 'words', label: 'Basic Words', icon: 'words', view: wordsView },
  { route: 'stories', label: 'Stories', icon: 'stories', view: storiesView },
  { route: 'sentences', label: 'Sentence Practice', icon: 'sentences', view: sentencesView },
  { route: 'quiz', label: 'Vocabulary Quiz', icon: 'quiz', view: quizView },
  { route: 'dictionary', label: 'Mini Dictionary', icon: 'dictionary', view: dictionaryView },
  { route: 'progress', label: 'My Progress', icon: 'progress', view: progressView },
];
const EXTRA = [{ route: 'settings', label: 'Settings', icon: 'settings', view: settingsView }];

const ctx = { api, content: null, user: null, settings: null, navigate: (r) => { location.hash = `#/${r}`; } };

export function applyTheme({ mode, accent }) {
  document.documentElement.dataset.mode = mode || 'light';
  document.documentElement.dataset.accent = accent || 'blue';
}
ctx.applyTheme = applyTheme;

async function render() {
  const [route, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  ctx.user = await api.auth.current();

  if (!ctx.user) {
    applyTheme(await api.prefs.getLast());
    root.replaceChildren(authView(ctx, route === 'signup' ? 'signup' : 'login', render));
    return;
  }

  const progress = await api.progress.get();
  ctx.settings = progress.settings;
  ctx.progress = progress;
  applyTheme(ctx.settings);

  const all = [...NAV, ...EXTRA];
  const current = all.find((n) => n.route === route) || NAV[0];
  const page = h('main.page', { tabindex: '-1' });
  const link = (n) => h('a', { href: `#/${n.route}`, 'aria-current': n === current ? 'page' : null }, icon(n.icon), n.label);

  const streakNum = h('b');
  const xpNum = h('b');
  const streakChip = h('a.hchip.streak', { href: '#/progress', title: 'Day streak' }, icon('flame'), streakNum, h('span', 'day streak'));
  const xpChip = h('a.hchip.xp', { href: '#/progress', title: 'Total XP' }, icon('star'), xpNum, h('span', 'XP'));
  const modeBtn = h('button.hchip.mode', { type: 'button', title: 'Switch light / dark', 'aria-label': 'Switch between light and dark mode', onclick: async () => {
    const mode = (ctx.settings.mode === 'dark') ? 'light' : 'dark';
    ctx.settings = await api.progress.setSettings({ mode });
    applyTheme(ctx.settings);
    await api.prefs.setLast({ mode, accent: ctx.settings.accent });
    modeBtn.replaceChildren(icon(mode === 'dark' ? 'sun' : 'moon'));
  } }, icon(ctx.settings.mode === 'dark' ? 'sun' : 'moon'));
  const header = h('header.topbar', h('div.topbar-inner', streakChip, xpChip, modeBtn));

  let shown = null;
  ctx.refreshHeader = async (given) => {
    const stats = given || await api.progress.stats();
    streakChip.classList.toggle('lit', stats.activeToday);
    streakNum.textContent = stats.streak;
    if (shown && stats.xp > shown.xp) { countUp(xpNum, stats.xp, { from: shown.xp, duration: 700 }); pop(xpChip); }
    else xpNum.textContent = stats.xp.toLocaleString('en-US');
    if (shown && stats.streak > shown.streak) pop(streakChip);
    shown = stats;
  };

  root.replaceChildren(h('div.frame',
    h('aside.sidebar',
      h('a.brand', { href: '#/dashboard', 'aria-label': 'Student Language Coach home' },
        h('span.brand-mark', 'SLC'),
        h('span.brand-name', 'Student Language Coach', h('small', 'English para sa lahat'))),
      h('nav.nav', NAV.map(link), h('div.nav-gap'), EXTRA.map(link),
        h('a', { href: '#', onclick: async (e) => { e.preventDefault(); await api.auth.logout(); location.hash = '#/login'; render(); } }, icon('logout'), 'Log out')),
      h('div.me', h('span.avatar', initials(ctx.user.displayName)), h('div', h('b', ctx.user.displayName), `Grade ${ctx.user.grade}`))),
    h('div.main-col', header, page)));
  await ctx.refreshHeader();

  const inner = h('div.page-inner');
  page.append(inner);
  await current.view(inner, ctx, rest);
  enter(inner);
  page.focus({ preventScroll: true });
}

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

window.addEventListener('hashchange', render);

(async () => {
  ctx.content = await api.content.all();
  render();
})();
