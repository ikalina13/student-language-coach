# Student Language Coach — Redesign, Animations and Mascot (Design)

Date: 2026-11-20
Status: draft, awaiting approval
Builds on: `2026-11-19-salita-design.md` (everything there still holds unless changed here)

## Intent

The owner wants the app to feel **interactive and rewarding, "kinda like Duolingo but not that childish"**,
with good animations and a mascot, and renamed from "Salita" to **Student Language Coach**.
Audience is unchanged: Filipino students, Grades 4–10, on Windows, offline. The owner chose
**both** directions shown in mockups: the game-like layer (A) and the calm flip-card study layer (B).

## Goals

1. **Rename** everywhere to "Student Language Coach":
   window title, sidebar, login screen, PDF report, installer (`Student-Language-Coach-Setup.exe`),
   product name, app id, save folder (`%APPDATA%\Student Language Coach\`), download site, README.
   Short mark "SLC" where space is tight (icon, narrow headers). Nobody has installed the old build,
   so no data migration is needed.
2. **Mascot "Bao"** — a carabao (national animal) in the app palette: blue body (`#2f6fd1`), navy
   (`#1b3a6b`) legs/ears/outline details, cream (`#f3ead8`) horns and muzzle, red pencil behind the ear
   (notebook nod). Drawn as inline SVG (no image files), with five moods:
   - `idle` — blinks, gentle nod, ear flick now and then
   - `thinking` — head tilt while an answer is being chosen
   - `happy` — closed-eye smile, small hop (right answer)
   - `oops` — droop + sweat drop, still kind (wrong answer)
   - `celebrate` — arms/legs up, sparkles, bigger hop (quiz/story finished, streak kept)
   Bao appears with a short speech bubble: dashboard greeting, quiz/sentence/story feedback,
   celebration screen, empty states, login screen. Lines are short, encouraging, mix English with a
   little Filipino ("Galing!", "Kaya mo 'yan!"), never mocking.
3. **Game-like layer (A)** in Quiz, Sentence Practice and Story questions:
   - chunky answer buttons with a pressed-down 3D edge and press animation
   - select an option, then **Check**; a feedback bar slides up from the bottom (green "Galing! That's
     right." / red "Correct answer: …" with pronunciation + example), with **Continue**
   - wrong pick shakes; springy progress bar at the top; "+10 XP" floats up on correct answers
   - keyboard: 1–4 select, Enter = Check/Continue
   - end of quiz/story: celebration screen — Bao celebrating, confetti burst, score counting up,
     XP earned, streak status, buttons (Try again / Next / Back home)
4. **XP and daily streak**
   - XP: +10 per correct quiz answer, +20 bonus for a perfect quiz (quizzes can be replayed for XP),
     +30 the first time a story is completed, +5 the first time a sentence is answered correctly,
     +2 the first time a word is marked learned. Unmarking never removes XP and re-marking never
     re-awards it, so XP and streak days can't be farmed by toggling. First-time awards are tracked in
     `xpAwarded` (ids like `w:<wordId>`, `s:<sentenceId>`, `st:<storyId>`).
   - A day is "active" when the student earns any XP that local day. Streak = number of consecutive
     active days ending today; if today isn't active yet but yesterday was, the streak still shows
     (not lost until a whole day is missed). Show a flame + count in the header; "keep your streak"
     nudge on the dashboard if today isn't active.
   - Stored in the student's progress file: `xp` (number), `activeDays` (unique local `YYYY-MM-DD`
     strings) and `xpAwarded` (unique ids). Old progress files without these fields load as 0 / [] / [].
   - Shown on dashboard, progress page and in the PDF report.
5. **Calm study layer (B)**
   - Word cards **flip** (3D) to reveal Filipino meaning + example; front shows word + pronunciation
     + Listen. Ruled pad-paper look stays on both faces.
   - Basic Words gets a **Study mode**: one card at a time, "I know this" (marks learned, card swipes
     away right) / "Study again" (swipes left, comes back later in the round); round summary at the end.
     The existing grid view stays as **Browse** mode (cards in the grid also flip on click).
   - Progress shown with animated **rings** (overall words learned, per level) instead of only flat bars.
6. **Overall polish**
   - Home redesigned: Bao + greeting, streak and XP chips, word of the day as a flip card,
     a "Continue" suggestion (next quiz/story/sentence set), progress rings.
   - Page transitions (short fade/slide), number count-ups, staggered list entrance on first show only.
   - Header strip on every page with streak and XP.
   - Everything respects `prefers-reduced-motion` (Windows "Show animations" off): no motion, instant states.
7. **Download site** updated: new name, Bao in the hero next to the card deck, screenshots refreshed,
   installer link uses the new file name.

## Non-goals

- Hearts/lives or any penalty for mistakes (stressful for students).
- Sound effects (classroom use; the Listen button stays).
- Leaderboards, accounts across PCs, online anything.
- Changing content (words, stories, sentences) or the data folder format beyond adding `xp`/`activeDays`.
- Android/Mac.

## Anti-goals

- Childish: no bright rainbow palette, no baby talk, no constant bouncing. Motion answers actions;
  idle motion is limited to Bao's blink/nod.
- Generic "AI" look (gradients everywhere, glassmorphism, emoji headings).
- Animations that slow down a student who is going fast (feedback must never block the next tap for
  more than ~400 ms; Continue is available immediately).
- Looking like Duolingo's owl or brand green.

## Constraints

- Offline, no new runtime dependencies or CDNs; animations in CSS + Web Animations API; confetti in
  plain JS (small DOM/canvas, no library).
- Keep the existing architecture: core logic in `app/core` / `app/shared` with `node:test` tests;
  renderer is plain ES modules.
- Theme system (light/dark × 5 accents) must keep working; Bao's colours stay fixed (brand), UI accents follow the theme.

## Approaches

1. **A: game-like** (chunky buttons, XP, streak, slide-up feedback) — motivating, Duolingo-like;
   risks feeling young for Grade 9–10.
2. **B: calm** (flip cards, swipe, rings) — mature and focused; less "one more round" pull.
3. **Mix** — owner chose **both**: A's mechanics for answering questions, B's for studying words,
   restrained colours and a mascot to carry warmth.
Mascot options shown: tarsier, butanding (whale shark), carabao, pilandok. **Owner chose carabao.**
Name "Bao" proposed and accepted.

## Builder's calls (from review)

- **Story questions**: after reading, the three questions run one at a time with the game-like
  Check → feedback bar → Continue flow; the story text stays above, scrollable. No "+10" float for
  story answers; +30 on first completion shows on the celebration screen.
- **Sentence Practice**: one attempt per sentence, then the feedback bar reveals the answer. A sentence
  counts as practised (+5 first time) only when the first pick is right; missed ones come back in
  later sets. Sentences are grouped into **sets of 10** per level; finishing a set shows the
  celebration screen. "Continue" on home points to the next set with unpractised sentences.
- **Study mode deck**: the current category + level, unlearned words first, then learned ones.
  "I know this" marks learned (if not already); "Study again" never unmarks — it just re-queues the
  card later in the round.
- **Mascot reference**: the approved sketch is saved as `assets/bao-sketch.svg` next to this doc.

## Left to the builder

- Exact Bao artwork (based on the approved sketch), bubble copy lines, animation timings/easing.
- Exact layout of the new home and celebration screens within the sketch.
- Confetti implementation details.
- Which XP values show where, beyond the rules above.
