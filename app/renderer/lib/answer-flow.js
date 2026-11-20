// The game-like answer flow used by quizzes, sentence practice and story questions:
// pick an option → Check → a feedback bar slides up → Continue.
import { h, icon } from './dom.js';
import { floatXp, shake, pop, reduced } from './motion.js';
import { line } from './bao.js';

const KEYS = ['1', '2', '3', '4'];

/**
 * @param {object} o
 * @param {Node|string} o.prompt   the question
 * @param {string[]} o.options     answer texts
 * @param {number} o.answer        index of the right option
 * @param {Node|string} o.explain  shown in the feedback bar (e.g. pronunciation + example)
 * @param {HTMLElement} [o.mascot] a baoSays() element that reacts
 * @param {(correct:boolean)=>Promise<number>|number} [o.onResult]  save the result, return XP gained
 * @param {(correct:boolean)=>void} [o.onReveal]  called when the right answer is shown
 * @param {string} [o.continueLabel]
 * @returns {{ el: HTMLElement, done: Promise<{correct:boolean, xpGained:number}> }}
 */
export function answerFlow({ prompt, options, answer, explain, mascot, onResult, onReveal, continueLabel = 'Continue' }) {
  let selected = -1;
  let phase = 'choosing'; // choosing → checking → answered → finished
  let resolve;
  const done = new Promise((r) => { resolve = r; });

  const err = h('p.af-error', { role: 'alert' });
  const choices = options.map((text, i) => h('button.choice', { type: 'button', 'aria-pressed': 'false', onclick: () => choose(i) },
    h('span.key', KEYS[i]), h('span.choice-text', text)));
  const check = h('button.btn-chunky.primary.af-check', { type: 'button', onclick: () => submit() }, 'Check');
  const sheet = h('div.af-sheet', { 'aria-live': 'polite' });

  const el = h('div.af',
    h('div.af-prompt', prompt),
    h('div.af-options', { role: 'group', 'aria-label': 'Answers' }, choices),
    err,
    h('div.af-actions', check),
    sheet);

  function choose(i) {
    if (phase !== 'choosing') return;
    selected = i;
    err.textContent = '';
    choices.forEach((c, j) => c.setAttribute('aria-pressed', String(i === j)));
    if (mascot && mascot.querySelector('.bao')?.dataset.mood !== 'thinking') mascot.say(line('thinking'), 'thinking');
  }

  async function submit() {
    if (phase === 'answered') return finish();
    if (phase !== 'choosing') return;
    if (selected < 0) { err.textContent = 'Pick an answer first.'; shake(check); return; }
    phase = 'checking';
    const correct = selected === answer;
    choices.forEach((c, j) => {
      c.disabled = true;
      if (j === answer) c.classList.add('correct');
      else if (j === selected) c.classList.add('wrong');
    });
    if (correct) pop(choices[answer]); else shake(choices[selected]);

    let xpGained = 0;
    try { xpGained = (await onResult?.(correct)) || 0; } catch { xpGained = 0; }
    if (xpGained) floatXp(choices[answer], xpGained);
    mascot?.say(correct ? line('correct') : line('wrong'), correct ? 'happy' : 'oops');

    sheet.className = `af-sheet ${correct ? 'good' : 'bad'}`;
    const cont = h('button.btn-chunky.af-continue', { type: 'button', onclick: () => finish() }, continueLabel);
    sheet.replaceChildren(h('div.af-sheet-inner',
      h('div.af-verdict',
        h('span.af-badge', icon(correct ? 'check' : 'x')),
        h('div',
          h('b', correct ? 'Correct!' : `Correct answer: ${options[answer]}`),
          explain ? h('div.af-explain', explain) : null)),
      cont));
    requestAnimationFrame(() => sheet.classList.add('up'));
    onReveal?.(correct);
    phase = 'answered';
    check.hidden = true;
    // Let the slide finish before Enter can skip ahead, so a held key doesn't skip the feedback.
    setTimeout(() => cont.focus({ preventScroll: true }), reduced() ? 0 : 250);
    lastResult = { correct, xpGained };
  }

  let lastResult = null;
  function finish() {
    if (phase !== 'answered') return;
    phase = 'finished';
    document.removeEventListener('keydown', onKey);
    sheet.classList.remove('up');
    resolve(lastResult);
  }

  function onKey(e) {
    if (!el.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.repeat) return;
    const k = KEYS.indexOf(e.key);
    if (k >= 0 && k < options.length) { e.preventDefault(); choose(k); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
  }
  document.addEventListener('keydown', onKey);

  return { el, done };
}

// Thin progress bar with a springy fill and a close button.
export function lessonBar({ total, onClose }) {
  const fill = h('span');
  const bar = h('div.lesson-bar',
    h('button.icon-only', { type: 'button', 'aria-label': 'Leave', title: 'Leave', onclick: onClose }, icon('x')),
    h('div.lesson-track', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': 0 }, fill));
  bar.set = (n) => {
    fill.style.width = `${Math.max(4, (n / total) * 100)}%`;
    bar.querySelector('.lesson-track').setAttribute('aria-valuenow', n);
  };
  bar.set(0);
  return bar;
}
