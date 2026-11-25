# Pending work

Tracked fixes and features that are **not done yet**. One file per item so each
can be picked up independently and updated as it progresses.

| # | Item | Type | Status |
|---|---|---|---|
| 1 | [Move PDFs to Cloudflare R2](01-move-pdfs-to-r2.md) | Infra / migration | In progress — 674 documents live on R2 (319/355 in app); admin can upload to R2 or Supabase via a picker and reads the R2 catalogue while Supabase is restricted; Supabase cleanup pending the Pro upgrade |
| 2 | [PDF reader fix](02-pdf-reader-fix.md) | Bug | Partially fixed — cache dropped file URLs; remote PDFs open, device test pending |
| 3 | [Resume the PDF page the user was on](03-resume-pdf-page.md) | Feature | Open |
| 4 | [Grade entry order fix](04-grade-entry-order.md) | Bug | Open — symptoms to capture |
| 5 | [Web app version](05-web-app-version.md) | Release | Open |
| 6 | [Ad pop-up for the web app](06-web-ads-popup.md) | Feature | Open |
| 7 | [Import epreuvesetcorriges.com](07-epreuves-import.md) | Content import | Paused — needs site account, size too big for R2 free tier |
| 8 | [iPhone (iOS) build](08-ios-app.md) | Release | Blocked on macOS — project configured (Capacitor 8.6.2, `com.gostudy.student`, 1.3.3/15, iOS 15), unsigned + signed CI workflows ready; first device install pending |

## Status values

- **Open** — not started, or needs details before it can start
- **In progress** — being worked on
- **Blocked** — waiting on something external (credentials, account, decision)
- **Done** — shipped; keep the file and add the release/version

## Adding an item

Copy any file, renumber it, add a row to the table above. Keep each item short:
what is wrong, what "fixed" looks like, and how to verify it. Long design notes
belong in the item file, not in this index.

## Related docs

- `scripts/r2/README.md` — full R2 runbook
- `scripts/r2/publish.py` — uploader / catalogue generator
- `src/services/staticCatalog.ts` — offline catalogue fallback already added
