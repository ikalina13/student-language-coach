// Basic Words: flip cards. Browse = all cards in a grid; Study = one card at a time.
import { h, icon, levelTag, toast } from '../lib/dom.js';
import { CATEGORIES, LEVELS, labelOf, studyDeck } from '../../shared/content.mjs';
import { canSpeak, speak } from '../lib/speech.js';
import { baoSays } from '../lib/bao.js';
import { floatXp, stagger, reduced, confetti } from '../lib/motion.js';

async function markLearned(ctx, w, anchor) {
  const r = await ctx.api.progress.toggleLearned(w.id);
  ctx.progress.learnedWords = r.learned ? [...ctx.progress.learnedWords, w.id] : ctx.progress.learnedWords.filter((x) => x !== w.id);
  if (r.xpGained) { floatXp(anchor, r.xpGained); ctx.refreshHeader?.(); }
  return r;
}

// A flip card: front = word + pronunciation; back = Filipino meaning + example.
export function wordCard(w, ctx, { big = false, flippable = true } = {}) {
  const learned = () => ctx.progress.learnedWords.includes(w.id);
  const learnBtn = h('button.icon-btn.learn', { type: 'button', 'aria-pressed': String(learned()) }, icon('check'), learned() ? 'Learned' : 'Mark learned');
  const listen = h('button.icon-btn.speak', { type: 'button', hidden: !canSpeak(), title: `Listen to "${w.word}"`, onclick: (e) => { e.stopPropagation(); speak(w.word); } }, icon('sound'), 'Listen');

  const front = h('div.face.front.card',
    h('div.row', levelTag(w.level, labelOf(LEVELS, w.level)), h('span.muted.small', labelOf(CATEGORIES, w.category))),
    h('div.word', w.word),
    h('div.pron', w.pronunciation),
    h('div.actions', listen, h('span.flip-hint', icon('flip'), 'Tap to flip')));
  const back = h('div.face.back.card',
    h('div.row', h('span.muted.small', 'Filipino'), levelTag(w.level, labelOf(LEVELS, w.level))),
    h('div.fil', w.filipino),
    h('div.ex', w.example),
    h('div.actions', learnBtn));
  const card = h(`article.flip${big ? '.big' : ''}${learned() ? '.learned' : ''}`, {
    tabindex: flippable ? '0' : null, role: flippable ? 'button' : null, 'aria-label': `${w.word}. Flip to see the meaning.`,
  }, h('div.flip-inner', front, back));

  const flip = () => { card.classList.toggle('flipped'); };
  if (flippable) {
    card.addEventListener('click', (e) => { if (!e.target.closest('button')) flip(); });
    card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); flip(); } });
  }
  learnBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const r = await markLearned(ctx, w, learnBtn);
    learnBtn.setAttribute('aria-pressed', String(r.learned));
    learnBtn.lastChild.textContent = r.learned ? 'Learned' : 'Mark learned';
    card.classList.toggle('learned', r.learned);
    if (r.learned && !r.xpGained) toast(`“${w.word}” is in your words learned.`);
  });
  card.flip = flip;
  return card;
}

export function chipRow(items, selected, onPick, render = (i) => i.label) {
  return h('div.chips', { role: 'group' }, items.map((i) =>
    h('button.chip', { type: 'button', 'aria-pressed': String(i.id === selected), onclick: () => onPick(i.id) }, render(i))));
}

export const levelChips = (selected, onPick) => chipRow(LEVELS, selected, onPick, (l) => levelTag(l.id, l.label));

const MODES = [{ id: 'study', label: 'Study', icon: 'cards' }, { id: 'browse', label: 'Browse all', icon: 'grid' }];

export async function wordsView(el, ctx) {
  let category = sessionStorage.getItem('words.cat') || 'school';
  let level = sessionStorage.getItem('words.lvl') || ctx.settings.level || 'beginner';
  let mode = sessionStorage.getItem('words.mode') || 'study';

  const body = h('div');
  function draw() {
    sessionStorage.setItem('words.cat', category);
    sessionStorage.setItem('words.lvl', level);
    sessionStorage.setItem('words.mode', mode);
    const list = ctx.content.words.filter((w) => w.category === category && w.level === level);
    const done = list.filter((w) => ctx.progress.learnedWords.includes(w.id)).length;
    const stage = h('div.words-stage');
    body.replaceChildren(
      h('div.toolbar',
        h('div.toolbar-row', chipRow(CATEGORIES, category, (c) => { category = c; draw(); }),
          chipRow(MODES, mode, (m) => { mode = m; draw(); }, (m) => [icon(m.icon), m.label])),
        levelChips(level, (l) => { level = l; draw(); })),
      h('p.muted.small', { style: { marginBottom: '16px' } }, `${labelOf(CATEGORIES, category)} · ${list.length} words · ${done} learned`),
      stage);
    if (mode === 'browse') {
      const grid = h('div.grid', list.map((w) => wordCard(w, ctx)));
      stage.append(grid);
      stagger(grid.children, { max: 9 });
    } else {
      study(stage, ctx, studyDeck(ctx.content.words, ctx.progress.learnedWords, { category, level }), draw);
    }
  }
  el.append(h('div.page-head', h('div', h('h1', 'Basic Words'), h('p', 'Read the word, say it out loud, then flip the card to check the meaning.'))), body);
  draw();
}

// Study mode: one card at a time. "I know this" swipes right, "Study again" swipes left and re-queues.
function study(stage, ctx, deck, restart) {
  const queue = deck.slice(0, 10);
  const total = queue.length;
  let known = 0; let gainedXp = 0;
  const mascot = baoSays('Say the word, then flip the card.', 'idle', { size: 84 });
  const counter = h('span.muted.small');
  const holder = h('div.study-holder');
  const again = h('button.btn-chunky', { type: 'button' }, icon('back'), 'Study again');
  const know = h('button.btn-chunky.primary', { type: 'button' }, icon('check'), 'I know this');
  stage.append(h('div.study', h('div.study-side', mascot), h('div.study-main', counter, holder, h('div.study-actions', again, know))));

  let current = null; let busy = false;
  function show() {
    if (!queue.length) return finish();
    counter.textContent = `${known} of ${total} known · ${queue.length} card${queue.length === 1 ? '' : 's'} left`;
    current = wordCard(queue[0], ctx, { big: true });
    holder.replaceChildren(h('div.study-under'), current);
    if (!reduced()) current.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    current.focus({ preventScroll: true });
  }
  async function swipe(dir) {
    if (busy || !current) return;
    busy = true;
    const w = queue.shift();
    if (dir > 0) {
      known++;
      if (!ctx.progress.learnedWords.includes(w.id)) { const r = await markLearned(ctx, w, know); gainedXp += r.xpGained; }
      mascot.say(['Galing!', 'Nice!', 'You know it!'][known % 3], 'happy');
    } else {
      queue.push(w);
      mascot.say('No problem — it’ll come back.', 'thinking');
    }
    if (!reduced()) {
      await current.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${dir * 140}%) rotate(${dir * 14}deg)`, opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.4,0,.6,1)' }).finished;
    }
    busy = false;
    show();
  }
  function finish() {
    stage.replaceChildren(h('div.study-done',
      baoSays(gainedXp ? `Round done! You earned ${gainedXp} XP.` : 'Round done! Great review.', 'celebrate', { size: 130 }),
      h('div.celebrate-actions', h('button.btn-chunky.primary', { type: 'button', onclick: restart }, 'Study another round'),
        h('a.btn-chunky', { href: '#/quiz' }, 'Take a quiz'))));
    confetti(stage);
  }
  know.onclick = () => swipe(1);
  again.onclick = () => swipe(-1);
  const keys = (e) => {
    if (!stage.isConnected) { document.removeEventListener('keydown', keys); return; }
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight') swipe(1);
    else if (e.key === 'ArrowLeft') swipe(-1);
  };
  document.addEventListener('keydown', keys);
  if (!total) stage.replaceChildren(h('p.empty-state', 'No words here yet.')); else show();
}
