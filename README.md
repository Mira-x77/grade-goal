# Grade Goal (Score Target)

React + Vite + Capacitor exam library and grade-planning app.

## Quick links

| Topic | Doc |
|-------|-----|
| **Getting started** | [docs/guides/QUICK_START.md](docs/guides/QUICK_START.md) |
| **Supabase setup** | [docs/guides/START_HERE.md](docs/guides/START_HERE.md) |
| **Testing** | [docs/guides/TESTING_GUIDE.md](docs/guides/TESTING_GUIDE.md) |
| **APK build** | [docs/build/APK_BUILD_PROCESS.md](docs/build/APK_BUILD_PROCESS.md) |
| **App overview** | [docs/Grade-Goal-App-Overview.md](docs/Grade-Goal-App-Overview.md) |
| **All docs** | [docs/README.md](docs/README.md) |

## Development

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # web build
.\build-and-copy.ps1 # Android APK (Capacitor)
```

Admin panel: `exam-library-admin/` (separate Vite app).

## Repo layout

- `src/` — main mobile/web app
- `exam-library-admin/` — admin UI
- `supabase/migrations/` — database migrations
- `scripts/maintenance/` — one-off DB/quota scripts
- `docs/` — guides, build notes, and archived session logs
