# Standalone offline PWA — status

Tracks the remaining open items for the standalone (IndexedDB-based, installable)
phone app. Implementation is done; this is mainly untested-environment tracking.

## Done

- Standalone build (`frontend/npm run build:standalone`) producing an
  installable PWA served at `/standalone` by the backend.
- Local data layer (decks, flashcards, settings, dictionary cache, SM-2 review,
  CSV/JSON/Anki import/export, backup/restore) backed by IndexedDB, mirroring
  the backend's behavior.
- `run.sh` auto-installs deps, runs the Prisma migration, and builds the
  standalone bundle on first run; prints both the regular and `/standalone`
  LAN URLs.
- Verified end-to-end on macOS + Android: install via "Add to Home Screen",
  restore a real backup (1683 cards / 27 decks), export JSON/CSV/Anki and
  backup download all work.

## Open / untested

- **iPhone/iOS Safari**: not yet tested. Should work (PWA + IndexedDB
  supported since iOS 11.3+), but iOS <17 may evict an installed web app's
  local storage after ~7 days of inactivity — needs real-device confirmation
  and a reminder to back up periodically if this bites.
- **Linux**: `run.sh`'s LAN-IP detection has a `hostname -I` / `ip route`
  fallback for Linux but hasn't been run there.
- **Windows**: not supported directly (bash script). Documented as
  "use WSL or Git Bash" in the README; no further work planned unless needed.
- **PWA update flow**: after rebuilding `dist-standalone`, the phone's
  service worker can keep serving a stale cached bundle. Documented the
  workaround (clear site data + reinstall) in the README; could be improved
  later with a more aggressive `skipWaiting`/update-prompt if this becomes
  annoying.
