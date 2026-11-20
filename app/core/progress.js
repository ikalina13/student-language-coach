// Per-student progress, one JSON file each: progress/<username>.json
const CATEGORY_IDS = ['school', 'family', 'food', 'animals', 'places', 'feelings', 'actions', 'common'];
const LEVEL_IDS = ['beginner', 'intermediate', 'advanced'];

const XP = { word: 2, sentence: 5, story: 30, quizAnswer: 10, perfectQuiz: 20 };

const defaults = () => ({
  learnedWords: [],
  completedStories: [],
  sentencesDone: [],
  quizzes: [],
  xp: 0,
  activeDays: [],
  xpAwarded: [],
  settings: { mode: 'light', accent: 'blue', level: null },
});

const pad = (n) => String(n).padStart(2, '0');
// The student's local calendar day, e.g. "2026-11-20".
function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const shiftDay = (key, by) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + by));
};

// Consecutive active days ending today — or ending yesterday, if today isn't active yet.
function streakFrom(activeDays, today = dayKey()) {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (days.has(cursor)) { n++; cursor = shiftDay(cursor, -1); }
  return n;
}

function createProgress(store, username) {
  const file = `progress/${username}.json`;

  function get() {
    const d = defaults();
    const saved = store.readJSON(file, {}, (x) => x !== null && typeof x === 'object' && !Array.isArray(x));
    const list = (k) => (Array.isArray(saved[k]) ? saved[k] : d[k]);
    const settings = saved.settings && typeof saved.settings === 'object' ? saved.settings : {};
    return {
      learnedWords: list('learnedWords'),
      completedStories: list('completedStories'),
      sentencesDone: list('sentencesDone'),
      quizzes: list('quizzes').filter((q) => q && typeof q === 'object'),
      xp: Number.isFinite(saved.xp) && saved.xp > 0 ? Math.floor(saved.xp) : 0,
      activeDays: list('activeDays').filter((x) => typeof x === 'string'),
      xpAwarded: list('xpAwarded').filter((x) => typeof x === 'string'),
      settings: { ...d.settings, ...settings },
    };
  }
  const save = (p) => store.writeJSON(file, p);

  function gain(p, amount) {
    if (amount <= 0) return 0;
    p.xp += amount;
    const today = dayKey();
    if (!p.activeDays.includes(today)) p.activeDays.push(today);
    return amount;
  }
  // XP that can only be earned once per item (e.g. "w:food-b-001").
  function gainOnce(p, awardId, amount) {
    if (p.xpAwarded.includes(awardId)) return 0;
    p.xpAwarded.push(awardId);
    return gain(p, amount);
  }
  function addOnce(key, id, awardId, amount) {
    const p = get();
    if (!p[key].includes(id)) p[key].push(id);
    const xpGained = gainOnce(p, awardId, amount);
    save(p);
    return { xpGained };
  }

  return {
    get,
    toggleLearned(wordId) {
      const p = get();
      const has = p.learnedWords.includes(wordId);
      p.learnedWords = has ? p.learnedWords.filter((w) => w !== wordId) : [...p.learnedWords, wordId];
      const xpGained = has ? 0 : gainOnce(p, `w:${wordId}`, XP.word);
      save(p);
      return { learned: !has, xpGained };
    },
    completeStory: (id) => addOnce('completedStories', id, `st:${id}`, XP.story),
    markSentence: (id) => addOnce('sentencesDone', id, `s:${id}`, XP.sentence),
    recordQuiz({ category, level, score, total }) {
      const p = get();
      p.quizzes.push({ date: new Date().toISOString(), category, level, score, total });
      const xpGained = gain(p, score * XP.quizAnswer + (total > 0 && score === total ? XP.perfectQuiz : 0));
      save(p);
      return { xpGained };
    },
    setSettings(partial) {
      const p = get();
      p.settings = { ...p.settings, ...partial };
      save(p);
      return p.settings;
    },
  };
}

const pct = (q) => (q.total ? Math.round((q.score / q.total) * 100) : 0);

function computeStats(progress, content) {
  const wordIds = new Set(content.words.map((w) => w.id));
  const learned = new Set(progress.learnedWords.filter((id) => wordIds.has(id)));
  const storyIds = new Set(content.stories.map((s) => s.id));
  const sentenceIds = new Set(content.sentences.map((s) => s.id));
  const quizzes = progress.quizzes || [];
  const scores = quizzes.map(pct);

  const tally = (key, ids) => Object.fromEntries(ids.map((id) => {
    const ws = content.words.filter((w) => w[key] === id);
    return [id, { learned: ws.filter((w) => learned.has(w.id)).length, total: ws.length }];
  }));

  return {
    wordsLearned: learned.size,
    totalWords: content.words.length,
    storiesCompleted: progress.completedStories.filter((id) => storyIds.has(id)).length,
    totalStories: content.stories.length,
    sentencesDone: progress.sentencesDone.filter((id) => sentenceIds.has(id)).length,
    totalSentences: content.sentences.length,
    quizzesTaken: quizzes.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    byCategory: tally('category', CATEGORY_IDS),
    byLevel: tally('level', LEVEL_IDS),
    recentQuizzes: quizzes.slice(-10).reverse().map((q) => ({ ...q, percent: pct(q) })),
    xp: progress.xp || 0,
    streak: streakFrom(progress.activeDays || []),
    activeToday: (progress.activeDays || []).includes(dayKey()),
  };
}

module.exports = { createProgress, computeStats, streakFrom, dayKey, XP, CATEGORY_IDS, LEVEL_IDS };
