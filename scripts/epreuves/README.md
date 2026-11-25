# epreuvesetcorriges.com importer

Bulk import of the free document library at
<https://epreuvesetcorriges.com> (Joomla + EDocman, francophone West Africa:
BEPC, BAC, CAP, CEP, BTS, licence, 6ème → terminale).

## The one blocker: an account is required

The site advertises "Ici tout est gratuit", but **every `/download` URL
redirects guests to the Joomla login page** (`com_users&view=login`). No
document can be fetched anonymously — this was verified with and without a
session cookie, and with a browser Referer.

So the flow is:

1. Create a free account on the site (normal registration form).
2. Put the credentials in `scripts/epreuves/.env` (git-ignored):

   ```ini
   EPREUVES_LOGIN=you@example.com
   EPREUVES_PASSWORD=...
   ```

3. Run the two scripts.

## Scripts

| File | What it does |
|---|---|
| `inventory.py` | crawls the sitemap + paginated category pages, writes `inventory.json` (one row per document) |
| `download.py` | signs in once, then downloads every document into `downloads/epreuves-et-corriges/<country>/<section>/<id>-<slug>.pdf` |

```powershell
python scripts/epreuves/inventory.py          # count + list (no login needed)
python scripts/epreuves/download.py --limit 20   # smoke test
python scripts/epreuves/download.py              # everything, resumable
```

`download.py` skips files already on disk, retries three times, waits 1.5 s
between requests, and writes `scripts/epreuves/output/download-state.json` so a
stop/restart loses nothing.

## Structure on disk

```
downloads/epreuves-et-corriges/
  benin/college/3eme/43735-histoire-geographie-3eme-....pdf
  benin/examens/bac/....pdf
  togo/examens/bepc/....pdf
```

The folder comes from the URL path, so the country / section / class grouping
matches the site and can be reused by the R2 catalogue later.

## Cost / size note

Documents run from a few hundred KB to several MB. A full mirror is likely a
few GB — check the total in `inventory.json` before uploading to R2, whose free
tier is 10 GB and already holds ~1.7 GB of the EduSocial library.

## Politeness

`robots.txt` only disallows `/administrator/`, `/bin/`, `/cache/`, `/cli/`,
`/includes/`, `/installation/`, `/language/`, `/layouts/`, `/libraries/`,
`/logs/`, `/tmp/`. The scripts stay out of all of those, identify themselves,
run single-threaded with a delay, and never touch the login/admin area.
