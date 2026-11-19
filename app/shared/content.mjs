// Content logic shared by the app screens and the tests. No Node or DOM APIs here.

export const CATEGORIES = [
  { id: 'school', label: 'School' },
  { id: 'family', label: 'Family' },
  { id: 'food', label: 'Food' },
  { id: 'animals', label: 'Animals' },
  { id: 'places', label: 'Places' },
  { id: 'feelings', label: 'Feelings' },
  { id: 'actions', label: 'Actions' },
  { id: 'common', label: 'Common Words' },
];

export const LEVELS = [
  { id: 'beginner', label: 'Beginner', dot: '🟢' },
  { id: 'intermediate', label: 'Intermediate', dot: '🟡' },
  { id: 'advanced', label: 'Advanced', dot: '🔵' },
];

export const labelOf = (list, id) => (list.find((x) => x.id === id) || {}).label || id;

// Small, deterministic random number generator so the daily word is the same for everyone.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DAY = 86400000;
const EPOCH = Date.UTC(2026, 0, 1);

export function dailyWord(words, date = new Date()) {
  if (!words.length) return null;
  const ordered = shuffle([...words].sort((a, b) => String(a.id).localeCompare(String(b.id))), mulberry32(2026));
  // Use the local calendar day, so the word changes at the student's midnight.
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / DAY);
  const n = ordered.length;
  return ordered[((day % n) + n) % n];
}

export function buildQuiz(words, { category, level }, rng = Math.random) {
  const pool = words.filter((w) => w.category === category && w.level === level);
  const picked = shuffle(pool, rng).slice(0, 10);
  const sameCategory = words.filter((w) => w.category === category);

  return picked.map((w) => {
    const distractorsFrom = (list) => [...new Set(list.map((x) => x.filipino))].filter((f) => f !== w.filipino);
    let wrong = distractorsFrom(sameCategory);
    if (wrong.length < 3) wrong = distractorsFrom(words);
    const options = shuffle([w.filipino, ...shuffle(wrong, rng).slice(0, 3)], rng);
    return {
      wordId: w.id,
      prompt: `What does "${w.word}" mean?`,
      options,
      answer: options.indexOf(w.filipino),
    };
  });
}

const norm = (s) => String(s || '').trim().toLowerCase();

export function searchWords(words, { query = '', category = '', level = '' } = {}) {
  const q = norm(query);
  return words
    .filter((w) => (!category || w.category === category) && (!level || w.level === level))
    .filter((w) => !q || norm(w.word).includes(q) || norm(w.filipino).includes(q))
    .sort((a, b) => a.word.localeCompare(b.word));
}
