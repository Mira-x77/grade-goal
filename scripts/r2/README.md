# Move the Go Study library to Cloudflare R2

R2 free tier: **10 GB storage, 1 TB-class egress free, 1M writes/month**.
The whole library is **1.4 GB**, so it fits with ~8 GB to spare and costs **$0**.

The PDFs stay byte-for-byte identical (no re-compression). Every file is
uploaded once and then served from R2 with immutable cache headers, which is
also much faster for students than Supabase Storage.

---

## What is already done

| Step | State |
|---|---|
| Local library completed (674 PDFs) | done |
| Page-1 thumbnails rendered for every PDF | done — 674 JPEGs, 105 MB |
| Catalogue generated (`papers.json`, `books.json`) | done — 319 papers, 355 books |
| Uploader written and dry-run verified | done — `scripts/r2/publish.py` |
| App fallback to the static catalogue | done — `src/services/staticCatalog.ts` |
| Verified in the app with Supabase blocked | done — library shows 319 papers / 355 books |
| Upload to R2 | done — 1,321 objects, 1.7 GB |
| Re-key to the Supabase layout | done — 1,152 flat keys moved, 0 problems |

---

## What you have to do (once, ~5 minutes)

### 1. Create the bucket

Cloudflare dashboard → **R2** → **Create bucket**

- Name: `gostudy`
- Location: *Automatic* (or Eastern Europe if offered)

### 2. Make it public

Bucket → **Settings** → **Public access** → **R2.dev subdomain** → **Allow**

Copy the URL it gives you, e.g. `https://pub-1a2b3c4d5e6f.r2.dev`.

> For production you can later attach a custom domain (e.g. `files.gostudy.app`);
> `r2.dev` is rate-limited but fine for launching. All URLs are generated from
> one variable, so switching later is a one-line change.

### 3. Create an API token

R2 → **Manage API tokens** → **Create API token**

- Permission: **Object Read & Write**
- Scope: **Only the `gostudy` bucket**

Copy the **Access Key ID** and **Secret Access Key**.
The **Account ID** is shown on the R2 overview page.

### 4. Put the keys in `scripts/r2/.env`

Create the file (already git-ignored):

```ini
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=gostudy
R2_PUBLIC_URL=https://pub-1a2b3c4d5e6f.r2.dev
```

### 5. Upload

```powershell
python scripts/r2/publish.py --layout supabase --execute --cors --resume
```

- `--cors` allows the web app and the Android/iOS app to fetch the PDFs.
- `--resume` lists the bucket and skips keys already stored, so adding a few
  documents uploads only those, never the whole library.
- `--layout supabase` writes the mirrored keys directly; the flat-then-rekey path
  is only needed for a first upload of a fresh bucket.
- A cold 674-document upload is roughly 1.7 GB; the incremental re-run after
  `fetch_missing.py` moved only 195 objects (287 MB) in 4 minutes.

At the end it prints:

```
catalogue: https://pub-xxxx.r2.dev/catalog/papers.json
           https://pub-xxxx.r2.dev/catalog/books.json
```

### 5b. Re-key to the Supabase layout (once)

```powershell
python scripts/r2/rekey.py --execute
```

This rewrites the bucket so the paths are **identical to the ones Supabase
Storage already uses** (`edusocial/papers/<class>/<subject>/<id>-<title>.pdf`,
`previews/edusocial_<hash>.jpg`, `book-covers/…`). The copy happens inside R2,
so no bytes are re-uploaded; it just moves ~1,150 objects to their mirror
location and deletes the flat keys.

After that, re-pointing the database is a single domain swap, not a per-file
mapping:

```
old: https://<ref>.supabase.co/storage/v1/object/public/exam-papers
new: https://pub-xxxx.r2.dev
```

`scripts/r2/output/catalog/repoint-prefix.sql` does exactly that, restricted to
the rows whose PDF is known to be on R2.

### 6. Point the app at it

Add to `.env` (and to your hosting provider's environment variables):

```ini
VITE_CATALOG_URL=https://pub-xxxx.r2.dev/catalog
```

Then rebuild/redeploy. For the Play Store build that means:

```powershell
npm run build
npx cap sync android
```

and build a new APK/AAB. The web build picks it up on the next deploy. That is
all: the app keeps using Supabase when it is available and falls back to the R2
catalogue when it is not.

---

## What the app does now

`examService.fetchPapers()` and `bookService.fetchBooks()` try, in order:

1. Supabase (normal path, no change)
2. IndexedDB cache (offline)
3. **the R2 static catalogue** ← new
4. a handful of hard-coded sample rows (last resort)

The R2 catalogue keeps real `file_url` and `preview_url` values, so cards,
previews and downloads all work even while the Supabase project returns 402.

When the Supabase project is unblocked again you can either keep using the
database or run the generated `scripts/r2/output/catalog/repoint.sql` in the
SQL editor to re-point every row at R2 (matched by `content_hash`, so titles
and ids are untouched).

---

## Layout on R2

Before `rekey.py` (flat, what `publish.py` uploads first):

```
papers/<id>-<slug>.pdf     319 exam papers
books/<id>-<slug>.pdf      355 textbooks / guides
previews/<id>.jpg          674 page-1 thumbnails
catalog/papers.json        catalogue consumed by the app
catalog/books.json
```

After `rekey.py --execute` (mirror of Supabase Storage):

```
edusocial/papers/<class>/<subject>/<id>-<title>.pdf
edusocial/books/<category>/<subject>/<id>-<title>.pdf
previews/edusocial_<sha256[:24]>.jpg         paper thumbnails
book-covers/edusocial_<sha256[:24]>.jpg      book covers
catalog/papers.json
catalog/books.json
```

The bucket name (`exam-papers` on Supabase) is not repeated: the R2 path is the
path *inside* the bucket, so a domain swap is enough.

### Files uploaded from the admin panel

`exam-library-admin` asks where to store each upload (Cloudflare R2 or Supabase
Storage) in the upload form itself, using the same rule for keys (key = path
inside the old bucket), so nothing needs re-keying afterwards:

```
<class>/<subject>/<year>/<file>.pdf     adminService.uploadPDF
<timestamp>_<file>.pdf                  UploadForm (single paper, root)
books/<timestamp>_<file>.pdf            BookUploadForm
book-covers/<timestamp>_<file>          BookUploadForm cover / auto cover
```

Uploads are signed in the browser (`exam-library-admin/src/lib/r2Client.ts`,
WebCrypto SigV4), which requires two things:

1. `VITE_R2_*` in `exam-library-admin/.env`.
2. Bucket CORS allowing `PUT`/`DELETE` from the admin origin. Current rules:
   `GET, HEAD` from `*`, `PUT, POST, DELETE` from
   `http://127.0.0.1:3001`, `http://localhost:3001`, `https://admin.gostudy.app`.

```powershell
# read or rewrite the CORS rules
python scripts/r2/set_cors.py            # --show to only print them
```

Deleting a paper from the admin removes the R2 object when the URL is an R2 URL.
For a URL that still points at Supabase, it only deletes when the identical path
exists on R2 — so the last copy of a file can never be removed by accident.

---

## Deleting the Supabase originals

Order matters, because the Supabase project is currently read/write blocked by
the storage-quota restriction (HTTP 402):

1. R2 holds every file (`rekey.py` prints the object count).
2. In the Supabase dashboard (Storage, not the API), delete the paths listed in
   `scripts/r2/output/catalog/supabase-delete-list.txt` — or the whole
   `edusocial/` folder, which is the same set.
3. Deleting ~1.4 GB drops the project back under the 1 GB free allowance, so the
   quota restriction lifts on the next request.
4. Run `repoint-prefix.sql` (or `repoint.sql`) in the SQL editor.
5. `VITE_CATALOG_URL` can stay set: it is only used when Supabase fails.

Rows without a local copy are now resolved in one of two ways: `fetch_missing.py`
pulled the 98 downloadable catalogue entries (library is at 674 documents), and
the remaining ~101 database rows that were never EduSocial documents are dropped
by decision — they have no R2 object, so there is nothing to serve or delete.

---

## Files

| File | Purpose |
|---|---|
| `scripts/r2/publish.py` | thumbnails + catalogue + upload (dry-run by default) |
| `scripts/r2/rekey.py` | moves the bucket to the exact Supabase Storage paths |
| `scripts/r2/classify.py` | paper/book + subject/class/year rules, copied from the existing uploader |
| `scripts/r2/fetch_missing.py` | re-downloads catalogue entries missing from `downloads/edusocial-books` |
| `src/services/staticCatalog.ts` | app-side loader for `papers.json` / `books.json` |

## Costs

1.7 GB stored → within the 10 GB free tier.
~1,350 writes for the upload + ~2,300 metadata operations for the re-key → far
below 1M/month.
Reads and egress → free on R2 at any volume.
**Expected bill: $0.00.**
