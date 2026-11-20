# Student Language Coach Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename to Student Language Coach, add Bao the carabao mascot, XP + streak, game-like answer flow, flip-card study mode, celebrations and app-wide motion.

**Architecture:** XP/streak/award rules live in `app/core/progress.js`; set/deck/next-up logic in `app/shared/content.mjs` — both unit-tested. Renderer gains `lib/bao.js` (SVG mascot), `lib/motion.js` (transitions, count-up, confetti, XP float), `lib/answer-flow.js` (shared Check/feedback flow) and `views/celebrate.js`.

**Tech Stack:** unchanged (Electron, plain ES modules, `node:test`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-20-slc-redesign-design.md` (+ `2026-11-19-salita-design.md`)

## Global Constraints

- Product name `Student Language Coach`; short mark `SLC`; installer `Student-Language-Coach-Setup.exe`; userData folder `Student Language Coach`; appId `ph.slc.app`; npm name `student-language-coach`.
- XP: +10 per correct quiz answer, +20 perfect quiz, +30 first story completion, +5 first correct sentence, +2 first time a word is learned. No XP removal. First-time awards tracked in `xpAwarded` (`w:`, `s:`, `st:` prefixes).
- Active day = any XP earned that local day (`YYYY-MM-DD`). Streak = consecutive active days ending today, or ending yesterday if today not yet active.
- Sentence sets of 10 per level; one attempt per sentence.
- Bao colours fixed: blue `#2f6fd1`, navy `#1b3a6b`, cream `#f3ead8`, red `#d64545`, ink `#0c1f3d`.
- Feedback never blocks the next tap > ~400 ms. Keyboard: 1–4 choose, Enter = Check/Continue.
- `prefers-reduced-motion: reduce` → no motion.
- No hearts/lives, no sounds, no new deps.

## Review Focus

1. Marking, unmarking and re-marking a word → +2 XP once, active day not re-earned on re-mark. (Task 2 test)
2. Streak across month boundary / gap of one day / today not yet active. (Task 2 test)
3. Old progress file without `xp`/`activeDays`/`xpAwarded` → loads as 0/[]/[]. (Task 2 test)
4. Sentence level with count not divisible by 10 → last set smaller, still completable. (Task 3 test)
5. Pressing Enter or a number key repeatedly during the feedback animation → one answer recorded, no double XP. (Task 6 — guard flag; manual check)

---

### Task 1: Rename

**Files:** `package.json`, `electron-builder.yml`, `app/main.js`, `app/core/report.js`, `app/renderer/**` strings, `site/*`, `README.md`, `.github/workflows/release.yml` comments, `build/icon.png` (SLC mark on card), `tests/report.test.js`.
- [ ] Test: report contains `Student Language Coach`; no `Salita` left: `grep -ri salita app site README.md package.json electron-builder.yml` → only folder/repo name references allowed (none in UI).
- [ ] `app.setName('Student Language Coach')`; electron-builder `productName`, `artifactName: Student-Language-Coach-Setup.${ext}`; site download URL file name.
- [ ] Commit `chore: rename to Student Language Coach`.

### Task 2: XP, streak and first-time awards

**Files:** `app/core/progress.js`, `tests/progress.test.js`
**Produces:**
- default progress adds `xp: 0, activeDays: [], xpAwarded: []`.
- `streakFrom(activeDays: string[], today: string) → number`; `dayKey(date) → 'YYYY-MM-DD'` (local).
- mutators now return `{ ..., xpGained: number }`: `toggleLearned(id) → { learned, xpGained }`, `completeStory(id) → { xpGained }`, `markSentence(id) → { xpGained }`, `recordQuiz(q) → { xpGained }` (10×score + 20 if score===total).
- `computeStats` adds `xp, streak, activeToday`.
- [ ] Tests: award once per word across toggles; story +30 once; sentence +5 once; quiz 8/10 → 80, 10/10 → 120; activeDays dedup + set on XP>0 only; streak cases (3 consecutive ending today → 3; ending yesterday → n; gap → resets; month boundary); old file loads with defaults.
- [ ] FAIL → implement → PASS. Update `app/main.js` IPC + renderer callers for new return shapes. Commit.

### Task 3: Sets, study deck, next-up

**Files:** `app/shared/content.mjs`, `tests/content.test.js`
**Produces:**
- `sentenceSets(sentences, level) → [{ index, items: sentence[] }]` (chunks of 10 in id order).
- `studyDeck(words, learnedIds, {category, level}) → word[]` (unlearned first, each group id order).
- `nextUp(progress, content, level) → { kind: 'sentences'|'story'|'quiz', label, route }` — first set with unpractised sentences, else first uncompleted story at level, else quiz on category with fewest learned.
- [ ] Tests incl. 23 sentences → sets of 10,10,3; deck ordering; nextUp each branch. FAIL → PASS. Commit.

### Task 4: Report + stats wiring

**Files:** `app/core/report.js`, `tests/report.test.js`
- [ ] Test: report shows `XP` total and `day streak`. FAIL → PASS. Commit.

### Task 5: Bao and motion libraries

**Files:** `app/renderer/lib/bao.js`, `app/renderer/lib/motion.js`, `app/renderer/styles/motion.css`
**Produces:** `bao(mood: 'idle'|'thinking'|'happy'|'oops'|'celebrate', {size}) → SVGElement`; `setMood(el, mood)`; `baoSays(text, mood) → element` (Bao + bubble). `motion.countUp(el, to)`, `motion.confetti(container)`, `motion.floatXp(anchor, n)`, `motion.reduced()`, `motion.enter(el)` (page transition).
- [ ] Screenshot sheet of all five moods light/dark. Commit.

### Task 6: Answer flow + celebration

**Files:** `app/renderer/lib/answer-flow.js`, `app/renderer/views/celebrate.js`, `views/quiz.js`, `views/sentences.js`, `views/stories.js`, styles.
**Produces:** `answerFlow({ prompt, options, answer, explain, onResult(correct) → Promise<xpGained> }) → { el, done: Promise }` — chunky options, Check, slide-up sheet with Bao, Continue, keys 1–4/Enter, guard against double submit. `celebrate(el, { title, score, total, xp, streak, actions })`.
- [ ] Quiz uses it per question → celebrate. Sentences: sets list per level → set run → celebrate. Stories: read, then questions one at a time → celebrate.
- [ ] Screenshots of question, correct sheet, wrong sheet, celebration. Commit.

### Task 7: Words — flip cards, Study and Browse

**Files:** `views/words.js`, styles.
- [ ] Browse: grid of flip cards (front word/pron/Listen; back Filipino/example/Learned). Study: one card, flip, "I know this"/"Study again" swipe animations, round summary with Bao. Screenshots. Commit.

### Task 8: Home, header strip, progress rings, login

**Files:** `app.js`, `views/dashboard.js`, `views/progress.js`, `views/auth.js`, `lib/rings.js`, styles.
- [ ] Header strip (streak flame + XP) on every page; home with Bao greeting, nudge, daily flip card, Continue (nextUp), rings; progress page rings; login with Bao. Page transitions. Screenshots light/dark/red. Commit.

### Task 9: Site, icon, README, screenshots

- [ ] Site hero adds Bao; refreshed screenshots; README rename + XP/streak notes. Commit.

### Task 10: Final review and handoff
- [ ] Full suite, smoke run, fresh reviewer, fix pass, merge, zip.
