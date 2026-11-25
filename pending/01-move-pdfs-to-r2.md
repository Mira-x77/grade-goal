# 1. Move PDFs to Cloudflare R2

**Type:** infrastructure / migration
**Status:** In progress — level 1 live (app reads R2, 395 papers + 415 books,
5 Actus posts); waiting on Supabase to lift the 402 before deleting the originals
**Owner:** —

## Goal

PDFs are served from Cloudflare R2 instead of Supabase Storage. Same files, same
paths, same order. Only the domain in `file_url` changes:

```
https://aaayzhvqgqptgqaxxbdh.supabase.co/storage/v1/object/public/exam-papers/edusocial/...
                                        ↓
https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev/edusocial/...
```

No compression, no renames, no database schema change. Filtering, sorting and
search stay in the app code and are untouched.

## Why

Supabase Storage holds ~1.6 GB against the Free plan's 1 GB. The project is
restricted (HTTP 402 on every request), so nothing can be deleted and the app
falls back to 8 sample papers. Moving the files out drops Supabase Storage to
near zero, which keeps the Free plan viable permanently.

## Layout rule (important)

R2 must mirror the **path inside** the Supabase bucket, not merely the file
names, otherwise re-pointing the database needs a per-file mapping. Supabase
Storage holds:

```
exam-papers/edusocial/papers/<class>/<subject>/<id>-<title>.pdf
exam-papers/edusocial/books/<category>/<subject>/<id>-<title>.pdf
exam-papers/previews/edusocial_<sha256[:24]>.jpg
exam-papers/book-covers/edusocial_<sha256[:24]>.jpg
```

`publish.py` uploads a flat interim layout (`papers/`, `books/`,
`previews/<id>.jpg`) because it is fast and restartable; `rekey.py --execute`
then moves every object, inside R2, to the exact paths above and deletes the
flat keys. The bucket name is not repeated on R2, so the migration reduces to

```sql
replace(file_url, 'https://<ref>.supabase.co/storage/v1/object/public/exam-papers',
                 'https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev')
```

`--resume` lists the bucket and skips keys already stored, so re-publishing
after adding files uploads only the new documents — never the whole library.

## What is already built

| Piece | Where | State |
|---|---|---|
| Local library, 674 PDFs (~1.6 GB) | `downloads/edusocial-books/` | done |
| Page-1 thumbnails, 674 JPEGs (~105 MB) | `scripts/r2/output/previews/` | done |
| Catalogue, 395 papers + 415 books | `scripts/r2/output/catalog/` | done |
| Uploader (keys verified, CORS set) | `scripts/r2/publish.py` | done |
| Re-key to the Supabase layout | `scripts/r2/rekey.py` | done (1,152 keys moved) |
| App-side fallback reader | `src/services/staticCatalog.ts` | done |
| Recovered 98 missing documents | `scripts/r2/fetch_missing.py` | done (263 MB, 0 failures) |
| Recovered PDFs from outside the repo | `scripts/r2/ingest_missing.py` | done — 129 papers + 62 books added |
| Upload to R2 | `gostudy` bucket | done — 1,321 objects, 1.7 GB + 382 recovered |

Bucket: `gostudy`, WEUR, public at
`https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev`.
Credentials live in `scripts/r2/.env` (git-ignored).

## Why the catalogue used to list 289 papers, not 420

Historical note (before the recovered-PDF ingest). The papers tab shows exactly
what the catalogue contains, so 289 was a coverage number, not a filter bug.
Breakdown (last DB count before the 402: 420 papers + 259 books):

| | Papers | Books | Total |
|---|---|---|---|
| Database rows (pre-402) | 420 | 259 | 679 |
| On R2 | 289 | 287 | 576 |
| EduSocial catalogue, all entries | 319 | 355 | 674 |

1. **98 catalogue entries were never downloaded** (`scripts/r2/fetch_missing.py`).
   The download endpoint still serves them; fetching them brings the catalogue
   to 674 documents (~319 papers / ~355 books).
2. **The remaining ~101 DB papers are not EduSocial rows at all.** For EduSocial
   documents `publish.py` calls the same `detect_kind(title, slug)` rule the
   uploader used, so the split matches by construction — the surplus lives in
   `exam_papers` only as older/manual uploads whose bytes never entered
   `downloads/edusocial-books/`. Their files exist only in the frozen Supabase
   bucket.

**Decision (14 Nov 2026):** match the DB split by keeping that shared rule, and
drop the rows that have no R2 file. The library therefore settles at the 674
documents that actually exist in the mirror; nothing is invented and nothing is
left pointing at a bucket that may never be unfrozen.

## Recovered PDFs (19 Nov 2026)

The first uploads existed "outside the normal spots": `Desktop/Raw_Exam_PDFs`,
`Desktop/APC_Togo_Papers_1ere_CD`, `Desktop/GoStudy_Organized_Exams`, plus loose
files elsewhere on the disk. `scripts/r2/ingest_missing.py` scanned them:

| | Count |
|---|---|
| PDFs found outside the repo | 1,087 |
| Already on R2 (identical SHA-256) | 750 |
| New PDFs after hashing | 337 |
| New papers | 129 |
| New books | 62 |
| Skipped: already in catalogue / non-academic / off-curriculum | 78 / 37 / 8 |

Published catalogue after the ingest and a metadata re-pass:
**395 papers + 415 books** (`generated_at` 2026-11-19T06:12:19Z). Every PDF key
and `file_url` is unchanged by reclassification; only the JSON metadata moved.

Exclusion rules (filename/title only, never page text):

- Non-exam material: 2027 school-authorisation lists ("Liste des écoles
  autorisées à brevet… demi-25, demi-27"), circulars, contracts, sponsoring,
  brochures, logos, CVs, clearance forms, printer test pages, guidebooks, CCNA,
  codelab, bitcoin, occult/self-help books, travel/plumbing/anime art books.
- 52 administrative circulars were removed from `papers.json`, plus 1 commission
  list (`BAC 2026 COMMISSION ÉCRIT GRAND LOMÉ`).
- 2 non-exam books were removed from `books.json` (`DÉCISION ORGANISATION BACI`,
  `DÉCOUPAGE DE L'ANNÉE SCOLAIRE 2026-2027`).
- Off-curriculum books are skipped even when the file looks like a course.

Classification rules:

- Exams are **BAC, CEPD, BEPC** (CAP remains a separate concours type).
- BAC 1 / Probatoire → `1ère`; plain BAC / BAC II / Terminale → `Tle`.
- A title such as `épreuve de maths A, B, C` expands to séries A/B/C; letters
  are always capital.
- Multi-subject papers get every subject (`HIST-GEO`, `HG`, `Hist-Géo`,
  `hist geo` → Histoire + Géographie).
- Multi-class papers get every class (`1ère A4, 1ère C, 1ère D, Tle A4, …`).
- `class_level = "All"` belongs to every class filter.
- Document text wins over the folder hint; the folder is only a fallback for
  meaningless names (`IMG_0042.pdf`). Image-only scans get a readable synthetic
  title (`Épreuve scannée …`) because no OCR is available.

The app reads `class_levels` / `subjects` arrays when present and keeps the
comma-joined scalar `class_level` / `subject` for older clients. Both come from
`scripts/r2/classify.py`; `scripts/r2/reclassify.py` recreates the catalogue
metadata without touching R2 objects. A legacy bare class tag (`1ère`) is
ignored when the precise `cls:` tag (`cls:1ère D`) exists.

## Steps

```powershell
# 1. upload (resumable)                      -- running
python scripts/r2/publish.py --execute --cors --resume

# 2. mirror the Supabase paths inside R2    -- after 1 finishes
python scripts/r2/rekey.py --execute

# 3. point the app at the catalogue
#    .env -> VITE_CATALOG_URL=https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev/catalog
npm run build
npx cap sync android
```

## Two levels of "done"

**Level 1 — app works again while Supabase is frozen.**
R2 serves the PDFs and the catalogue snapshot; the app reads them when Supabase
fails. Requires nothing from Supabase.

**Level 2 — permanent fix, after the storage quota is cleared.**
Delete the mirrored paths in the Supabase dashboard (list generated at
`scripts/r2/output/catalog/supabase-delete-list.txt`; deleting the whole
`edusocial/` folder is the same set). Usage drops under 1 GB, the 402 lifts, then
run `repoint-prefix.sql` (a pure domain swap, limited to the hashes on R2) or
`repoint.sql` (hash mapping) in the SQL editor.

## Admin uploads

The admin panel can store new documents in **either** provider, and the operator
picks the destination in the upload form (a two-card "Upload to" selector) right
before uploading. The choice is remembered in `localStorage`
(`exam_admin_storage_target`), so it does not have to be re-picked each time.
Nothing is cut over automatically: Supabase Storage stays available.

The panel itself opens straight to the Dashboard — the sign-in page was removed
(`/login` now redirects to `/`, and the old logout button is gone). It runs under
a fixed local identity and uses the service-role client for Supabase access.

### Admin reads while Supabase is restricted

Every Supabase table read currently fails with HTTP `402
exceed_storage_size_quota`, so the admin used to show `0 papers` even though the
library was full. It now falls back to the catalogue that lives next to the PDFs
on R2 (`<public base>/catalog/papers.json` and `books.json`):

| Piece | Where |
|---|---|
| Catalogue reader (cached, maps rows to admin types) | `src/lib/r2-catalog.ts` |
| Supabase reachability probe (cached per session) | `src/lib/supabase-status.ts` |
| Status banner used by pages and the shell | `src/components/SupabaseNotice.tsx` |
| Papers + Books tabs (read-only in catalogue mode) | `src/pages/Papers.tsx`, `src/components/BooksTable.tsx` |
| Real counts, size and recent papers on the dashboard | `src/pages/Dashboard.tsx` |
| Fallback inside the data layer | `src/services/adminService.ts` (`getAllPapers`, `getAllBooks`, `getStorageAnalytics`, `getDownloadAnalytics`) |

Expected numbers when the catalogue is used: **395 papers + 415 books = 810
documents** (the R2 free tier is 10 GB). Edits and deletes stay
disabled in this mode because they need database rows; they re-enable
automatically once Supabase answers normally again (a page reload re-probes).

| Piece | Where |
|---|---|
| Destination picker (R2 / Supabase) | `src/components/StorageTargetSelect.tsx` |
| Remembered selection + `useStorageTarget` hook | `src/lib/storage-target.ts` |
| SigV4 signing + PUT/HEAD/DELETE (WebCrypto, no dependency) | `src/lib/r2Client.ts` |
| Provider switch (R2 when configured, Supabase otherwise) | `src/lib/storage-adapter.ts` |
| Single-paper upload | `src/components/UploadForm.tsx` |
| Batch upload | `src/components/MassUpload.tsx` (+ `adminService.uploadPDF`) |
| Book upload (PDF, cover, auto cover) | `src/components/BookUploadForm.tsx` |
| Destination banner in the admin shell | `src/components/Layout.tsx` |

Upload keys are the same relative paths Supabase used, so a file stored in
either provider can be moved with a plain domain swap:

```
exam_papers  <class>/<subject>/<year>/<file>.pdf   (adminService.uploadPDF)
exam_papers  <timestamp>_<file>.pdf                (UploadForm)
books        books/<timestamp>_<file>.pdf          (BookUploadForm)
covers       book-covers/<timestamp>_<file>        (BookUploadForm)
```

If a database insert fails after the upload, the file just stored is deleted
again so no orphan objects pile up.

Environment (`exam-library-admin/.env`, restart the dev server after editing):

```
VITE_R2_ACCOUNT_ID=...
VITE_R2_ACCESS_KEY_ID=...
VITE_R2_SECRET_ACCESS_KEY=...
VITE_R2_BUCKET=gostudy
VITE_R2_PUBLIC_URL=https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev
```

Bucket CORS now allows `GET`/`HEAD` from any origin and `PUT`/`POST`/`DELETE`
from `http://127.0.0.1:3001`, `http://localhost:3001` and
`https://admin.gostudy.app`. Add the deployed origin there if the panel ever
moves.

Deletes follow the migration rule: an R2 URL deletes the R2 object; a Supabase
URL is only deleted when the identical path already exists on R2, so the admin
can never remove the only copy of a file.

**Security note:** browser signing embeds the R2 secret key in the admin bundle.
That is fine for a local tool; before hosting the admin publicly, move uploads
behind a Worker holding the credentials.

## Actus / feed from R2 (23 Nov 2026)

The Actus tab (`/courses`) used to read only `course_posts` from Supabase, so
the 402 restriction dropped it to three English sample courses. The feed is now
published next to the PDFs as well:

```
<public base>/catalog/feed.json   same rows as course_posts
<public base>/feed/<slug>.png     the original promo images, byte for byte
```

| Piece | Where |
|---|---|
| Seeder (dry run by default, `--execute` to upload) | `scripts/r2/seed_feed.py` |
| Generated catalogue | `scripts/r2/output/catalog/feed.json` |
| App feed reader | `src/services/staticCatalog.ts` (`fetchStaticFeedPosts`) |
| App Actus fallback (Supabase → R2 → sample) | `src/pages/Courses.tsx` |
| Admin feed reader | `exam-library-admin/src/lib/r2-catalog.ts` (`fetchCatalogueFeed`) |
| Admin Actus fallback + read-only mode | `exam-library-admin/src/pages/Courses.tsx` |

The 5 seeded posts are the operator's own promo images, recovered from
`Desktop/gostudy img/`:

| Slug | Title |
|---|---|
| `track-practice-pass` | Go Study! — Track. Practice. Pass. (featured) |
| `one-goal-in-mind` | One goal in mind. One subject at a time. |
| `all-your-marks` | All your marks. Always in sight. |
| `learn-beyond-the-classroom` | Learn beyond the classroom. |
| `bac-probatoire-waec-neco` | Bac. Probatoire. WAEC. NECO. All in your pocket. |

They are `post_type: "news"` with no price, so the app labels them "Actu"
instead of "Cours". Supabase keeps priority: when `course_posts` answers with
active rows the app uses them and never touches `feed.json`. The R2 copy is only
the fallback while the project is restricted, and the admin shows it read-only
(no "Add post", no edit/delete) behind the same `SupabaseNotice` banner as the
library.

## Done when

- [x] 1,152 files + 2 catalogue objects uploaded, public URLs return `200 application/pdf`
- [x] `rekey.py --execute` finished; bucket matches the Supabase paths (0 missing, 0 extra)
- [x] App lists 289 papers / 287 books with Supabase still at 402 (verified in browser)
- [x] One real PDF opens from R2 in the in-app viewer (web; device still untested)
- [x] The 98 missing documents fetched and mirrored — 319 papers / 355 books, 1,321 objects
- [x] PDFs recovered from outside the repo — 129 papers + 62 books added, catalogue at 395 / 415
- [x] Multi-class / multi-subject classification published and re-verified against the live JSON
- [x] Admin can upload to R2 or Supabase (destination picker in every upload form); R2 path verified in-browser: PUT `200`, public `200 application/pdf`, HEAD `200`, DELETE `204`, Supabase selection routes to Supabase (still `402` until the plan is upgraded)
- [x] Admin shows the real library while Supabase is restricted: 319 papers / 355 books / 1.62 GiB from the R2 catalogue, with a status banner and read-only edit/delete
- [x] Actus/feed served from R2 while Supabase is restricted: `catalog/feed.json` with 5 news posts and their images under `feed/`; app and admin verified in-browser
- [ ] Supabase originals deleted, usage below 1 GB
- [ ] `repoint-prefix.sql` run after the project is unblocked

## Notes

- Keep the original Supabase objects until Level 2 succeeds. After the split
  decision above, the only rows relying on them are the drop candidates with no
  local file; everything in `supabase-delete-list.txt` already exists on R2.
- `r2.dev` is rate-limited; a custom domain can be attached later by changing one
  variable (`R2_PUBLIC_URL` / `VITE_CATALOG_URL`).
- The catalogue snapshot has 810 documents today (395 papers + 415 books).
  Rows with no R2 object are intentionally dropped rather than kept as dead
  links.
- Re-keying is guess-free only where the row was created by
  `scripts/upload-edusocial-library.py`; after unfreezing, compare a sample of
  real `file_url` values with the keys in `supabase-delete-list.txt`. The
  hash-based `repoint.sql` is the safety net if any disagree.
