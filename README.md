# Salita

**Learn English words, one card at a time.** Salita is a free, offline Windows app that helps Filipino students in Grades 4–10 learn English vocabulary.

- **Basic Words** — 768 word cards in 8 categories (School, Family, Food, Animals, Places, Feelings, Actions, Common Words) × 3 levels (Beginner, Intermediate, Advanced). Each card has the English word, a pronunciation guide, the Filipino meaning and an example sentence. A *Listen* button reads the word aloud.
- **Stories** — 9 short stories (3 per level) with comprehension questions.
- **Sentence Practice** — 60 sentences; pick the missing word, show the Filipino translation.
- **Vocabulary Quiz** — 10 multiple-choice questions per round, scores saved.
- **Daily Word**, **Mini Dictionary**, **Progress Tracker**, and a **printable PDF report**.
- **Accounts on the computer** — username + password, several students per PC. No internet, no database server.
- **Themes** — light or dark, in blue, red, green, purple or orange.

The project has two parts:

| Folder | What it is |
|---|---|
| `app/` | The Windows app (Electron) |
| `site/` | The download website (plain HTML, hosted free on GitHub Pages) |

---

## Put it on GitHub (step by step)

You need a free GitHub account and Git installed. All of this is free.

1. **Create the repository.** On github.com click **New repository**, name it `salita`, set it to **Public**, and don't add a README. Click **Create repository**.
2. **Set your repo name in the website.** Open `site/config.js` and change `OWNER/salita` to your username, e.g. `juandelacruz/salita`.
3. **Upload the code.** In a terminal, inside this folder:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/salita.git
   git add -A
   git commit -m "Set my repo name"
   git push -u origin main
   ```
4. **Turn on the website.** On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then go to the **Actions** tab, open **Deploy download page**, and click **Run workflow**. After a minute your site is live at `https://YOUR-USERNAME.github.io/salita/`.
5. **Build the Windows installer.** Create a version tag and push it:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   The **Release Windows app** workflow builds `Salita-Setup.exe` on GitHub's Windows computers (about 5–10 minutes) and attaches it to a new Release. The website's **Download for Windows** button always points to the newest release.

To release an update later: change the code, bump `"version"` in `package.json` (e.g. `1.0.1`), commit, push, then `git tag v1.0.1 && git push origin v1.0.1`.

> **"Windows protected your PC"** — Windows shows this for apps without a paid code-signing certificate. Users click **More info → Run anyway**. The download page explains this.

---

## Where student data is saved

Everything is saved as small files on the student's computer, in
`%APPDATA%\Salita\` (paste that into File Explorer's address bar):

| File | Contents |
|---|---|
| `users.json` | Accounts. Passwords are scrambled (scrypt hash), never stored as typed. |
| `progress\<username>.json` | That student's learned words, stories, sentences, quiz scores and theme. |
| `prefs.json` | Last used theme and username, for the login screen. |

The folder is created automatically the first time Salita runs on a new computer, so there's nothing to set up. Uninstalling Salita keeps this folder, so progress isn't lost.

**Forgot a password?** There's no reset (there's no internet account to reset). To remove that account, open `users.json` in Notepad, delete that student's `{ … }` entry, and delete their file in `progress\`. They can then create the account again.

**Moving to a different computer?** Progress stays on the original PC. Export the PDF report from **My Progress** before switching.

---

## Add or fix words

The word list is a spreadsheet: `content/words.csv`.

1. Open `content/words.csv` in Excel or Google Sheets.
2. Edit or add rows. Columns: `id, word, pronunciation, filipino, example, category, level`.
   - `id` must be unique, e.g. `food-b-033`.
   - `category`: `school`, `family`, `food`, `animals`, `places`, `feelings`, `actions` or `common`.
   - `level`: `beginner`, `intermediate` or `advanced`.
   - `pronunciation`: syllables with hyphens and the stressed one in capitals, e.g. `HAP-ee`.
3. Save as **CSV UTF-8**, then run `node scripts/csv-to-json.js`.
4. Run `npm test` to check nothing is broken.

Stories and sentences are in `app/data/stories.json` and `app/data/sentences.json`.

> The Filipino meanings were written carefully, but please have a teacher spot-check them, especially at the Advanced level.

---

## For developers

Requires Node.js 20+.

```bash
npm install       # once
npm start         # run the app
npm test          # run the tests
npm run dist      # build the Windows installer (on Windows; on Mac/Linux needs Wine)
```

To preview the website, open `site/index.html` in a browser.

Code map:

```
app/main.js           window, file access, PDF export
app/preload.js        safe bridge: window.salita.*
app/core/             storage, accounts, progress, report (Node, tested)
app/shared/content.mjs  daily word, quiz builder, search (tested)
app/renderer/         screens (plain HTML/CSS/JS, no framework)
app/data/             words, stories, sentences
site/                 download website
tests/                node --test
```

Fonts: Bitter and Atkinson Hyperlegible (SIL Open Font License), bundled so the app works offline.
