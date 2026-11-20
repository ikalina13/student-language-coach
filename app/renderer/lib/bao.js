// Bao the carabao — the app's mascot. One SVG holds every expression; CSS shows the right
// parts for the current mood, so switching moods animates instead of swapping pictures.
import { h } from './dom.js';

export const MOODS = ['idle', 'thinking', 'happy', 'oops', 'celebrate'];

const SVG = `
<svg viewBox="0 0 200 200" class="bao-svg" aria-hidden="true">
  <ellipse class="bao-shadow" cx="100" cy="188" rx="54" ry="6"/>
  <g class="bao-body">
    <g class="bao-legs">
      <rect class="leg-back" x="58" y="146" width="20" height="36" rx="9"/>
      <rect class="leg-back" x="122" y="146" width="20" height="36" rx="9"/>
    </g>
    <ellipse class="bao-torso" cx="100" cy="142" rx="58" ry="36"/>
    <ellipse class="bao-belly" cx="100" cy="152" rx="30" ry="20"/>
    <g class="bao-arms">
      <rect class="arm arm-l" x="52" y="150" width="18" height="30" rx="9"/>
      <rect class="arm arm-r" x="130" y="150" width="18" height="30" rx="9"/>
    </g>
    <g class="bao-head">
      <path class="horn" d="M46 64 Q8 58 14 20 Q30 48 58 50Z"/>
      <path class="horn" d="M154 64 Q192 58 186 20 Q170 48 142 50Z"/>
      <g class="ear ear-l"><ellipse cx="44" cy="80" rx="16" ry="9" transform="rotate(-20 44 80)"/></g>
      <g class="ear ear-r"><ellipse cx="156" cy="80" rx="16" ry="9" transform="rotate(20 156 80)"/></g>
      <g class="pencil" transform="rotate(-38 158 64)">
        <rect x="130" y="60" width="40" height="9" rx="2"/><path class="pencil-tip" d="M170 60 L180 64.5 L170 69Z"/><path class="pencil-lead" d="M177 63 L180 64.5 L177 66Z"/>
      </g>
      <ellipse class="bao-skin" cx="100" cy="88" rx="50" ry="44"/>
      <path class="tuft" d="M86 50 Q100 40 114 50"/>
      <ellipse class="muzzle" cx="100" cy="114" rx="34" ry="22"/>
      <ellipse class="nostril" cx="88" cy="111" rx="4" ry="5"/>
      <ellipse class="nostril" cx="112" cy="111" rx="4" ry="5"/>
      <ellipse class="cheek" cx="64" cy="102" rx="7" ry="4"/>
      <ellipse class="cheek" cx="136" cy="102" rx="7" ry="4"/>
      <g class="eyes-open">
        <g class="eye"><circle class="sclera" cx="80" cy="80" r="12"/><g class="pupil"><circle cx="81" cy="81" r="7.5"/><circle class="glint" cx="84" cy="77" r="2.5"/></g></g>
        <g class="eye"><circle class="sclera" cx="120" cy="80" r="12"/><g class="pupil"><circle cx="121" cy="81" r="7.5"/><circle class="glint" cx="124" cy="77" r="2.5"/></g></g>
        <path class="brow brow-l" d="M68 64 Q80 58 90 64"/>
        <path class="brow brow-r" d="M110 64 Q120 58 132 64"/>
      </g>
      <g class="eyes-happy">
        <path d="M68 84 Q80 70 92 84"/><path d="M108 84 Q120 70 132 84"/>
      </g>
      <path class="mouth m-smile" d="M88 124 Q100 132 112 124"/>
      <path class="mouth m-grin" d="M84 122 Q100 142 116 122 Z"/>
      <path class="mouth m-hmm" d="M92 127 L108 125"/>
      <path class="mouth m-oops" d="M89 130 Q100 122 111 130"/>
    </g>
    <text class="x-q" x="168" y="128">?</text>
    <path class="x-sweat" d="M150 58 q7 11 0 16 q-7 -5 0 -16z"/>
    <g class="x-spark">
      <path d="M24 34 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z"/>
      <path d="M176 116 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/>
      <path d="M168 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>
    </g>
  </g>
</svg>`;

export function bao(mood = 'idle', { size = 120, label = 'Bao the carabao' } = {}) {
  const el = h('span.bao', { role: 'img', 'aria-label': label, 'data-mood': mood, style: { width: `${size}px`, height: `${size}px` }, html: SVG });
  return el;
}

export function setMood(el, mood) {
  const target = el.classList.contains('bao') ? el : el.querySelector('.bao');
  if (!target) return;
  // Restart one-shot animations (hop, shake) even when the mood repeats.
  target.removeAttribute('data-mood');
  void target.offsetWidth;
  target.setAttribute('data-mood', mood);
}

// Bao with a speech bubble. side: where the bubble sits relative to Bao.
export function baoSays(text, mood = 'idle', { size = 96, side = 'right' } = {}) {
  const bubble = h('div.bao-bubble', { role: 'status' }, text);
  const wrap = h(`div.bao-says.bubble-${side}`, bao(mood, { size }), bubble);
  wrap.say = (t, m) => {
    bubble.textContent = t;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    if (m) setMood(wrap, m);
  };
  return wrap;
}

const LINES = {
  correct: ['Galing!', 'Tama! That’s right.', 'Nice one!', 'Ang husay mo!', 'You got it!'],
  wrong: ['Almost! Kaya mo ’yan.', 'Not quite — try the next one.', 'Close! Keep going.', 'Oops! Now you know it.'],
  thinking: ['Take your time.', 'Hmm, which one?', 'Read it out loud first.'],
};
export const line = (kind) => { const l = LINES[kind]; return l[Math.floor(Math.random() * l.length)]; };
