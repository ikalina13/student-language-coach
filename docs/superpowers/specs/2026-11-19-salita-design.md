# Salita — English Vocabulary App for Filipino Students (Design)

Date: 2026-11-19
Status: approved by owner 2026-11-19

## Intent

An offline Windows app that helps Filipino students learn English vocabulary:
word meanings, pronunciation, reading simple sentences and short stories, and
quizzes, with visible progress they can print. It ships with a small download
website hosted free on GitHub Pages.

The owner is building this as a project to show and share; earlier progress
notes mentioned "4,800 entries", but the owner confirmed that number is not a
requirement. Quality of words matters more than count.

Name "Salita" (Filipino for "word") is the builder's call; easy to rename.

## Goals

1. **Windows desktop app** (installer `.exe`) that works fully offline.
2. **Local accounts**: create account with username + password, log in, log out.
   Several students can have accounts on the same PC; each sees only their own
   progress.
3. **No database server, no SQL.** Data is plain JSON files in the user's app
   data folder (`%APPDATA%\Salita\`). Created automatically on first launch on any
   new PC — nothing to set up.
4. **Features** (from the owner's list):
   - **Dashboard** — greeting, Daily Word, quick stats, shortcuts to each section.
   - **Basic Words** — 8 categories (School, Family, Food, Animals, Places,
     Feelings, Actions, Common Words) × 3 levels (Beginner, Intermediate,
     Advanced). Word cards show: English word, pronunciation guide, Filipino
     meaning, example sentence. A "Listen" button speaks the word; a "Mark as
     learned" toggle counts toward progress.
   - **Stories** — short reading passages per level, each followed by a few
     comprehension questions. Finishing one marks it completed.
   - **Sentence Practice** — simple sentences per level (not only single words).
     Student reads the sentence, can reveal the Filipino translation, then does a
     short exercise (fill in the missing word from choices). Progress counted per
     sentence answered correctly.
   - **Vocabulary Quiz** — pick category + level; 10 multiple-choice questions,
     e.g. "What does *happy* mean?" A. Malungkot B. Masaya C. Galit D. Pagod.
     Shows right/wrong with the correct answer, final score; every attempt is saved.
   - **Daily Word** — one word per calendar day, same for everyone that day,
     chosen deterministically from the word list by date.
   - **Mini Dictionary** — search across all words (English or Filipino),
     filter by category and level.
   - **Progress Tracker** — words learned, stories completed, quizzes completed
     (with average and best score), sentence practice progress; broken down by
     category/level with progress bars; recent quiz history.
   - **Difficulty levels** shown consistently as 🟢 Beginner, 🟡 Intermediate,
     🔵 Advanced (as colored badges).
5. **Export report to PDF** — one-page report card: student name, date, all
   progress stats, quiz history table. Saved via a Save dialog (Electron
   `printToPDF`).
6. **Themes** — default blue. Light/Dark toggle plus an accent color choice
   (Blue, Red, Green, Purple, Orange). Saved per user; login screen uses last used.
7. **Download website** — static site: what the app is, feature highlights,
   screenshots, a prominent "Download for Windows" button, short install note.
   Same visual identity and theme switcher as the app.
8. **Free builds and hosting** — GitHub Actions builds the Windows installer
   on a `windows-latest` runner when a version tag (`v*`) is pushed and attaches
   it to a GitHub Release. The site's button points to
   `https://github.com/<owner>/<repo>/releases/latest/download/Salita-Setup.exe`
   (stable file name). A second workflow deploys `site/` to GitHub Pages.

## Audience and decisions from review

- **Students: Grades 4–10.** At sign-up the student picks their grade; it sets a
  suggested starting level (Gr 4–5 → Beginner, 6–8 → Intermediate,
  9–10 → Advanced). Level is always switchable. Content difficulty calibrated to
  that span. (Owner liked the grade idea; mapping is builder's call.)
- **Interface language:** simple English UI; Filipino appears in learning content
  (meanings, translations). Builder's call.
- **Windows 10/11 64-bit only.** Per-user NSIS install, no admin rights needed.
  Builder's call.
- **Content review:** words also exported as `content/words.csv` so a fluent
  reviewer can spot-check; `csv-to-json` rebuilds the JSON. Builder's call.
- **Repo:** owner has none yet. Builder creates the full project locally with
  git history and hands it over as a zip plus step-by-step upload/release/Pages
  instructions in README. `<owner>/<repo>` is a single config value in
  `site/config.js`.

## Non-goals

- Android / mobile / Mac versions (later maybe).
- Online accounts, cloud sync, moving progress between PCs.
- Teacher/admin dashboard.
- Password recovery. (Mitigation: on the login screen, a student can delete an
  account they own only by entering its password; a forgotten-password account
  can be removed by deleting its file — documented in README.)
- Code signing (costs money). Consequence: Windows SmartScreen will show
  "Windows protected your PC / unknown publisher" on first install; the download
  page explains "More info → Run anyway".

## Anti-goals (would be a failure even if it works)

- Looks "vibecoded"/AI-generic: purple-blue gradients everywhere, glassy cards,
  emoji-stuffed headings, generic hero copy. Aim for a calm, deliberate,
  school-friendly look: real typography, consistent spacing, restrained color.
- Requires internet, an install of anything besides the app, or any setup step.
- Complicated to use for a young student.

## Constraints

- Builder works on Linux; Windows installer must be built in CI (GitHub
  Actions), not locally. Local dev/test of app logic runs on Linux.
- Owner hosts for free: GitHub repo + Pages + Releases only.
- Fonts and all assets bundled (offline). No CDN in the app.
- Text-to-speech uses the browser `speechSynthesis` API with Windows' built-in
  English voices (offline). If no voice is available, the Listen button is hidden.

## Approaches considered

1. **Installable web app (PWA) on GitHub Pages, data in browser storage** — free,
   cross-device link, but owner preferred a real local app.
2. **Windows desktop app (Electron) + static download site** — **chosen by owner.**
   Feels like a real app, local data, free builds via CI. Trade-off: download
   and install step; ~80 MB installer; SmartScreen warning without signing.
3. **Android app** — most work, needs sideloading or paid store account;
   deferred by owner.

Within approach 2, storage: SQLite was considered and rejected by the owner in
favor of plain files + PDF export. Tauri was considered instead of Electron
(smaller installer) but needs a Rust toolchain and is harder to maintain; builder
chose Electron.

## Decided "how"

- **Electron** app; renderer in plain HTML/CSS/JavaScript (ES modules), no
  frontend framework, no bundler. Keep it simple and readable.
- **Storage** (main process only; renderer talks via a preload `contextBridge`
  API, `contextIsolation: true`, `nodeIntegration: false`):
  - `%APPDATA%\Salita\users.json` — `[{ username, displayName, grade, salt, hash, createdAt }]`.
    Passwords hashed with Node `crypto.scrypt` + per-user random salt.
    Usernames case-insensitive unique, 3–20 chars (letters, numbers, `_`).
    Password min 4 chars (young students).
  - `%APPDATA%\Salita\progress\<username>.json` —
    `{ learnedWords: [wordId], completedStories: [storyId],
       sentencesDone: [sentenceId], quizzes: [{ date, category, level, score, total }],
       settings: { theme: "light"|"dark", accent: "blue"|... } }`.
  - Writes are atomic (write temp file, then rename). Missing/corrupt files are
    recreated empty (corrupt file kept as `.bak`).
  - Folder and files created on first launch.
- **Content** in `app/data/` as JSON, shipped inside the app:
  - `words.json` — ~30 words per category × level (~720 total). Fields:
    `id, word, pronunciation, filipino, example, category, level`.
    Pronunciation is simple respelling with stressed syllable in caps
    (e.g. "HAP-ee"), friendlier than IPA for this audience.
  - `stories.json` — 3 stories per level (9 total), 80–250 words, each with
    3 multiple-choice comprehension questions.
  - `sentences.json` — 20 sentences per level (60 total) with Filipino
    translation and one blank-able target word + 3 distractors.
  - A `scripts/csv-to-json` helper so more words can be added from a spreadsheet.
- **Quiz generation**: 10 random words from the chosen category+level; wrong
  options are Filipino meanings of other words in the same category (no
  duplicates).
- **Daily word**: index = days since 2026-01-01 mod word count, over a list
  ordered by a fixed seed shuffle.
- **Tests**: Node's built-in test runner for storage, auth, quiz generation,
  daily word, progress stats. UI checked manually + screenshots.
- **Repo layout**:
  ```
  app/            Electron app (main.js, preload.js, renderer/, data/)
  site/           Download website (static)
  scripts/        helpers (csv-to-json)
  tests/
  .github/workflows/release.yml   build Windows installer on tag v*
  .github/workflows/pages.yml     deploy site/ to GitHub Pages
  README.md       how to run, release, add words
  ```
- **Packaging**: electron-builder, NSIS one-click installer, artifact name
  `Salita-Setup.exe`, Start Menu + desktop shortcut, app icon.

## Left to the builder

- Exact visual design within the stated direction (use frontend-design guidance).
- Story topics and the specific words/sentences (age-appropriate, Philippine
  context where natural — jeepney, sari-sari store, barangay, etc.).
- Screens' exact layout; navigation as a left sidebar.
- Screenshot generation for the site.
