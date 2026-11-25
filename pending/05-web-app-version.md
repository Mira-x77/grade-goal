# 5. Web app version

**Type:** release
**Status:** Open

## Goal

Run Go Study as a web app in a browser, from the same codebase as the APK.

The project is already a Vite React app (`npm run build` → `dist/`), so most of
the work is hosting plus fixing the places that assume a native shell.

## Decisions needed

- [ ] Hosting: Cloudflare Pages, Vercel, Netlify, or Firebase Hosting
- [ ] URL / subdomain (e.g. `app.gostudy.app`)
- [ ] Must the web version have every feature, or a subset (library, reader,
      grades) at launch?

## Known work items

1. **Storage adapter** — `src/lib/storage-adapter.ts` is Supabase-only; point it
   at R2 for uploads/downloads.
2. **Capacitor-only APIs** — `@capacitor/filesystem`, `file-opener`, `share`,
   `local-notifications`, `haptics`, `status-bar`, `splash-screen` need web
   fallbacks or guards. Search for `Capacitor.isNativePlatform()`.
3. **Downloads** — the browser cannot save to the app sandbox; use a normal
   `<a download>` or the File System Access API.
4. **Deep links / routing** — SPA rewrites so `/library`, `/library/books` etc.
   survive a refresh.
5. **Auth redirect URLs** — add the web origin to Supabase Auth allowed URLs.
6. **PWA (optional)** — manifest + service worker so it can be installed and
   keeps working offline; `public/manifest` and the existing `sw.js` already
   exist.
7. **Analytics / ads** — see item 6.

## Done when

- [ ] `https://` URL serves the app, refresh works on every route
- [ ] Library lists, PDF opens, grades save, on desktop and mobile browsers
- [ ] No unguarded Capacitor call throws in the browser console
- [ ] Deploy command documented here

## Notes

Keep the APK and web builds from one branch; do not fork the code.
