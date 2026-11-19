// Starts the app: loads content, applies the theme, and shows the right screen.
import { h, icon } from './lib/dom.js';
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

  root.replaceChildren(h('div.frame',
    h('aside.sidebar',
      h('div.brand', 'Salita', h('small', 'English para sa lahat')),
      h('nav.nav', NAV.map(link), h('div.nav-gap'), EXTRA.map(link),
        h('a', { href: '#', onclick: async (e) => { e.preventDefault(); await api.auth.logout(); location.hash = '#/login'; render(); } }, icon('logout'), 'Log out')),
      h('div.me', h('b', ctx.user.displayName), `Grade ${ctx.user.grade}`)),
    page));

  const inner = h('div.page-inner');
  page.append(inner);
  await current.view(inner, ctx, rest);
  page.focus({ preventScroll: true });
}

window.addEventListener('hashchange', render);

(async () => {
  ctx.content = await api.content.all();
  render();
})();
