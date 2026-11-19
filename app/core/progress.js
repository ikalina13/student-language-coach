// Per-student progress, one JSON file each: progress/<username>.json
const CATEGORY_IDS = ['school', 'family', 'food', 'animals', 'places', 'feelings', 'actions', 'common'];
const LEVEL_IDS = ['beginner', 'intermediate', 'advanced'];

const defaults = () => ({
  learnedWords: [],
  completedStories: [],
  sentencesDone: [],
  quizzes: [],
  settings: { mode: 'light', accent: 'blue', level: null },
});

function createProgress(store, username) {
  const file = `progress/${username}.json`;

  function get() {
    const d = defaults();
    const saved = store.readJSON(file, {});
    return { ...d, ...saved, settings: { ...d.settings, ...(saved.settings || {}) } };
  }
  const save = (p) => store.writeJSON(file, p);

  function addOnce(key, id) {
    const p = get();
    if (!p[key].includes(id)) { p[key].push(id); save(p); }
  }

  return {
    get,
    toggleLearned(wordId) {
      const p = get();
      const has = p.learnedWords.includes(wordId);
      p.learnedWords = has ? p.learnedWords.filter((w) => w !== wordId) : [...p.learnedWords, wordId];
      save(p);
      return !has;
    },
    completeStory: (id) => addOnce('completedStories', id),
    markSentence: (id) => addOnce('sentencesDone', id),
    recordQuiz({ category, level, score, total }) {
      const p = get();
      p.quizzes.push({ date: new Date().toISOString(), category, level, score, total });
      save(p);
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
  };
}

module.exports = { createProgress, computeStats, CATEGORY_IDS, LEVEL_IDS };
