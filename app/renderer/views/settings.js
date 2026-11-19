// Settings: light/dark, accent color, starting level, delete account.
import { h, levelTag, toast } from '../lib/dom.js';
import { LEVELS } from '../../shared/content.mjs';
import { chipRow } from './words.js';

const ACCENTS = [
  { id: 'blue', label: 'Blue', hex: '#1f5fbf' },
  { id: 'red', label: 'Red', hex: '#c23a3a' },
  { id: 'green', label: 'Green', hex: '#1e7d4f' },
  { id: 'purple', label: 'Purple', hex: '#6a46b8' },
  { id: 'orange', label: 'Orange', hex: '#c4600f' },
];
const MODES = [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }];

export function settingsView(el, ctx) {
  async function save(partial) {
    ctx.settings = await ctx.api.progress.setSettings(partial);
    ctx.applyTheme(ctx.settings);
    await ctx.api.prefs.setLast({ mode: ctx.settings.mode, accent: ctx.settings.accent });
    draw();
  }

  const pw = h('input', { type: 'password', id: 'del-pw', autocomplete: 'current-password' });
  const delErr = h('p.error', { role: 'alert' });

  function draw() {
    const { mode, accent, level } = ctx.settings;
    el.replaceChildren(
      h('div.page-head', h('div', h('h1', 'Settings'), h('p', 'Make Salita look the way you like. Saved for your account only.'))),
      h('section.panel.settings',
        h('div.setting', h('div', h('h3', 'Appearance'), h('p.muted.small', 'Dark mode is easier on the eyes at night.')),
          chipRow(MODES, mode, (m) => save({ mode: m }))),
        h('div.setting', h('div', h('h3', 'Color'), h('p.muted.small', 'The main color for buttons and highlights.')),
          chipRow(ACCENTS, accent, (a) => save({ accent: a }), (a) => [h('span.swatch', { style: { background: a.hex } }), a.label])),
        h('div.setting', h('div', h('h3', 'My level'), h('p.muted.small', 'Used as the starting level on each page.')),
          chipRow(LEVELS, level || 'beginner', (l) => save({ level: l }), (l) => levelTag(l.id, l.label)))),
      h('section.panel.settings.danger', { style: { marginTop: '20px' } },
        h('h3', 'Delete my account'),
        h('p.muted.small', { style: { margin: '4px 0 12px' } }, 'This removes your account and all your progress from this computer. It cannot be undone.'),
        h('div.del-row', h('label', { for: 'del-pw' }, 'Password'), pw,
          h('button.btn', { type: 'button', onclick: async () => {
            const r = await ctx.api.auth.remove(ctx.user.username, pw.value);
            if (!r.ok) { delErr.textContent = r.error.replace('username or ', ''); return; }
            toast('Account deleted');
            location.hash = '#/login';
          } }, 'Delete account')),
        delErr));
  }
  draw();
}
