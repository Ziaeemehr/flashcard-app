# French Vocabulary Flashcard Reviewer

A browser-based flashcard app for learning French vocabulary, with automatic
dictionary lookups, spaced-repetition review (SM-2), text-to-speech, deck
organization, and Anki import/export.

<table>
  <tr>
    <td><img src="docs/dashboard.jpg" alt="Dashboard and deck panel" width="260" /></td>
    <td><img src="docs/review-card.jpg" alt="Review mode flashcard" width="260" /></td>
    <td><img src="docs/review-card-back.jpg" alt="Flashcard back with definition and examples" width="260" /></td>
  </tr>
</table>

## Features

- **Flashcards** — word, phonetic transcription, part of speech, definition,
  and example sentences.
- **Dictionary lookup** — looks up words on Wiktionary automatically and
  caches results locally.
- **Clickable definitions** — click any word inside a definition or example to
  look it up and add it as a new card.
- **Decks** — organize cards into nested decks (e.g. course chapters).
- **Bulk add** — paste a list of words (one per line, optional leading line
  numbers) and create a card for each, with definitions filled in
  automatically.
- **Review mode** — SM-2 spaced repetition with Again/Hard/Good/Easy ratings
  and a dashboard (due today, new words, learned, retention rate).
- **Sentence explorer** — paste a French sentence and click any word to look
  it up.
- **Text-to-speech** — natural-sounding French pronunciation via Edge neural
  voices.
- **Import/export** — JSON, CSV, and Anki-compatible formats, plus full
  `.apkg` import and JSON backup/restore.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui (`@base-ui/react`)
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite

## Getting Started

### Prerequisites

- Node.js (v18+)
- macOS or Linux. On Windows, run these commands via WSL or Git Bash (the
  scripts are bash and won't run in cmd/PowerShell directly).

### Running

From the project root:

```bash
./run.sh
```

The first run automatically installs dependencies for both frontend and
backend, sets up the SQLite database (`npx prisma migrate dev`), and builds
the standalone offline PWA (see below). Subsequent runs skip these steps.

This starts the backend (Express, port 3001) and frontend (Vite, port 5173)
concurrently. Press `Ctrl+C` or run `./stop.sh` to stop both.

Open `http://localhost:5173` in your browser.

### Accessing from your phone

`run.sh` prints a LAN URL (e.g. `http://<your-ip>:5173`) that you can open on
a phone connected to the same Wi-Fi network.

### Standalone offline app (Android/iOS, no laptop required)

`./run.sh` also builds a standalone PWA that stores all data locally in the
phone's browser (IndexedDB) instead of calling the backend. After running
`./run.sh`, it prints a second URL like `http://<your-ip>:3001/standalone` —
open that on your phone (same Wi-Fi) to install it. After that one-time
install, the app works fully offline — including review sessions and the
SM-2 algorithm.

If you change the app's code later, run `cd frontend && npm run build:standalone`
to refresh this bundle (see the cache note below).

#### Install steps (Android)

1. On your phone (Chrome, same Wi-Fi as your laptop), open
   `http://<your-ip>:3001/standalone`.
2. Tap the **⋮** menu → **Add to Home screen** (or "Install app").
3. Launch it from the new home screen icon — it now works fully offline.

#### Install steps (iPhone)

1. On your phone (Safari, same Wi-Fi as your laptop), open
   `http://<your-ip>:3001/standalone`.
2. Tap the **Share** icon → **Add to Home Screen**.
3. Launch it from the new home screen icon — it now works fully offline.

> Note: on iOS versions older than 17, Safari may clear an installed web app's
> local storage (including its IndexedDB database) if it isn't opened for
> about 7 days. Back up regularly (see below) if you're on an older iOS.

#### Getting your existing cards onto the phone

The standalone app starts with an **empty, separate** database — it does not
share data with the laptop app. To copy your cards over:

1. On your laptop, open the regular app and go to **Import & Export →
   Download backup** to save a JSON file.
2. Send that file to your phone (AirDrop, email, cloud drive, etc.).
3. On the phone, open the standalone app and use **Import & Export → Restore
   from backup…**, then pick that file.

#### Adding cards on the phone

Once installed, use the standalone app exactly like the normal app — **Add
card**, **Add multiple words…** (bulk add), or **Import file…** (CSV/JSON/Anki
TSV) all work offline using the phone's local database.

#### Syncing back to the laptop

There's no automatic sync. Whenever you want to merge phone changes back:

1. On the phone, **Import & Export → Download backup**.
2. Transfer that file to your laptop and **Restore from backup…** in the
   regular app (or vice versa, to push laptop changes to the phone).

Notes:

- Anki `.apkg` import isn't available in standalone mode (it requires the
  backend); use CSV/JSON/Anki-TSV import instead.
- Dictionary lookups in standalone mode call Wiktionary/Tatoeba directly from
  the browser and may not work without an internet connection.
- If you rebuild the standalone app (`npm run build:standalone`) after an
  update, the phone's installed PWA may keep using a cached old version. If
  something looks broken after an update, go to Chrome's site settings for
  `<your-ip>` and "Clear & reset" (this clears the cache **and** the local
  database, so restore your backup again afterward), then reload and reinstall.

## Project Structure

```
backend/    Express API, Prisma schema and migrations, SQLite database
frontend/   React + Vite app
```

### Backend API

| Route                  | Description                                  |
| ----------------------- | --------------------------------------------- |
| `/api/flashcards`      | CRUD, review, due cards, stats, bulk import, import/export |
| `/api/dictionary/:word` | Wiktionary lookup with caching                |
| `/api/decks`           | Deck CRUD (supports nesting via `parentId`)   |
| `/api/tts`             | Text-to-speech audio                          |
| `/api/backup`          | Full JSON backup/restore                      |
| `/api/import-anki`     | Import `.apkg` Anki packages                  |

## Keyboard Shortcuts (Browse/Review)

| Key     | Action       |
| ------- | ------------ |
| Space   | Flip card    |
| →       | Next card    |
| ←       | Previous card |
