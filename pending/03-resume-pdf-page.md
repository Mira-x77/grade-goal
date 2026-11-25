# 3. Resume the PDF page the user was on

**Type:** feature
**Status:** Open

## Goal

When a student closes the app (or leaves a PDF) and comes back, the reader opens
at the same page they stopped on, per document.

Example: closes *BEPC 2024 Maths* on page 17 → reopens it later → page 17.

## Behaviour wanted

- Remember position per `paperId`, not just "the last PDF".
- Restore when opening from the library, from My Downloads, and from a deep link.
- Do not restore when the user explicitly starts from page 1 (e.g. "Read from
  beginning" action) — add that action while we are here.
- Clear the saved position when the download is deleted.
- Keep it local to the device. No server call, so it also works offline.

## Implementation sketch

1. Store `paperId -> { page, scroll, updatedAt }` in IndexedDB (same DB as
   `cacheService`) or Capacitor Preferences for small values.
2. Debounce writes (every page change / on pause / on app background).
3. On viewer mount, read the value and call the viewer's `goToPage`.
4. Add a "resume" toast: *Repris à la page 17* with a "Start over" action.

## Done when

- [ ] Kill the app on page N, reopen the same PDF → page N
- [ ] Different PDFs keep different positions
- [ ] Deleting a download clears its position
- [ ] Works offline and in the APK
- [ ] Position survives an app update (schema is versioned)

## Notes

Check whether the viewer already exposes a page-change event before adding one.
