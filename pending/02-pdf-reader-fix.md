# 2. PDF reader fix

**Type:** bug
**Status:** Partially fixed — remote PDFs now open; offline/mobile still to verify

## Fixed 14 Nov 2026 — cached papers lost their file URL

Symptom: library listed fine, but tapping **Voir** on any paper showed
*"Échec de l'ouverture du PDF."* The viewer never opened.

Root cause was not the reader: `examService.getPaper()` found the paper in the
IndexedDB cache before the static catalogue, and `cacheService.cachePapers()`
never stored `fileUrl` / `fileName` / `contentHash`. `convertCachedToExamPaper()`
returned `fileUrl: ''`, so `handleOpen()` in `PaperDetail` bailed out at
`if (!paper?.fileUrl)`. Books had the same bug (`file_url: ''` in
`convertCachedToLibraryBook`).

Changes:

- `CachedPaper` / `CachedBook` now carry `fileUrl`, `fileName`, `contentHash`,
  and for books `coverUrl`, `description`, `classLevel`, `system`.
- `cacheService.cachePapers()` / `cacheBooks()` persist them.
- `convertCachedToExamPaper()` / `convertCachedToLibraryBook()` read them back.
- `fetchPapers` / `fetchBooks` / `getBooks` / `getPaper` / `getBook` now prefer
  the published catalogue over the cache when the database is unreachable, so a
  stale cache entry can no longer shadow a working URL. The cache is still the
  offline fallback.

Verified in the browser with Supabase at 402: paper `edu-p-477` opens from R2
(22 pages, canvas renders, zoom/page controls work) and book `edu-b-41` returns
`200 application/pdf`.

## What we know

The in-app PDF reader does not work reliably. Existing code and notes:

- `src/components/pdf/` — viewer components
- `PDF_VIEWER_FIX.md`, `NATIVE_PDF_FIX.md`, `PDF_WORKER_FIX.md`,
  `IN_APP_PDF_VIEWER_COMPLETE.md` (older attempts, may be stale)
- Uses `pdfjs-dist`; the worker is loaded from a CDN in at least one path
  (`cdnjs.cloudflare.com/.../pdf.worker.min.js`), which breaks when offline or
  when the CDN is unreachable.

## To capture before starting

- [ ] Which build: APK, web, or both?
- [ ] Does the PDF fail to **open**, render blank, or crash the app?
- [ ] Local file (already downloaded) or remote stream?
- [ ] Android version / device
- [ ] Error text from `chrome://inspect` or the app console
- [ ] Screenshot or screen recording

## Likely causes (to confirm, do not assume)

1. PDF.js worker loaded from a CDN while offline → bundle the worker locally.
2. Remote PDF blocked by CORS / 402 → check the request in the network log.
3. Very large scans (8–14 MB) exhausting memory on low-end devices → render page
   by page, release canvases.
4. WebView hardware acceleration differences on older Android.

## Done when

- A downloaded PDF opens offline, renders every page, and can be zoomed.
- A remote PDF opens in the same viewer.
- No blank pages, no crash, no console errors.

## Notes

Do not add a second PDF library. Fix the existing viewer path first.
