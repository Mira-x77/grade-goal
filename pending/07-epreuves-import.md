# 7. Import epreuvesetcorriges.com (blocked: free account + size)

**Type:** content import
**Status:** Paused — needs a site account; size likely exceeds the R2 free tier
**Depends on:** [1. Move PDFs to Cloudflare R2](01-move-pdfs-to-r2.md)

## Goal

Mirror the free document library at <https://epreuvesetcorriges.com> so the
Go Study app can offer BEPC / BAC / CAP / CEP / BTS / licence papers from all
francophone countries, not just the EduSocial collection.

## Blocker 1 — every download requires a login

The site says *"Ici tout est gratuit"* but Joomla's EDocman sends every
`/<doc>/download` request to `index.php?option=com_users&view=login`. Verified
with a fresh cookie jar, a browser `Referer`, and a normal UA. Guessable
`/media/com_edocman/document/*.pdf` paths return HTML, not the file.

Needs: a free account, with credentials in `scripts/epreuves/.env`
(`EPREUVES_LOGIN` / `EPREUVES_PASSWORD`, git-ignored).

## Blocker 2 — size

Inventory so far: **11,242 documents**, and the crawl was still incomplete
(DNS dropped mid-run, several Bénin categories returned 0).

| Country | Documents |
|---|---|
| Bénin | 10,620 |
| Burkina Faso | 298 |
| Cameroun | 274 |
| Côte d'Ivoire | 26 |
| Guinée | 24 |

Bénin collège 3ème/4ème/5ème alone are ~2,300 documents each. At a realistic
1 MB average that is **>10 GB**, before the 1.7 GB EduSocial library — so a full
mirror does **not** fit R2's 10 GB free tier. A scoped import (examens only, or
one country) is the realistic option.

## What is built

| File | Purpose |
|---|---|
| `scripts/epreuves/inventory.py` | resumable crawler: sitemap → paginated category pages → `inventory.json` |
| `scripts/epreuves/download.py` | Joomla login (handles the random CSRF field), then resumable download into `downloads/epreuves-et-corriges/<country>/<section>/<id>-<slug>.pdf` |
| `scripts/epreuves/README.md` | runbook, robots.txt notes, cost warning |
| `scripts/epreuves/.env.example` | credential template |

`inventory.json` currently holds 11,242 rows; `scripts/epreuves/output/inventory-state.json`
holds the per-category offset so the crawl can continue.

## To resume

```powershell
# 1. finish the inventory (safe to repeat)
python scripts/epreuves/inventory.py

# 2. account credentials in scripts/epreuves/.env

# 3. smoke test, then decide scope before the long run
python scripts/epreuves/download.py --limit 20
python scripts/epreuves/download.py
```

## Open decision

Scope of the import: all countries, Bénin only, or examens-only
(BEPC / BAC / CAP / CEP / BTS) to stay inside the R2 free tier.

## Done when

- [ ] Account credentials in `scripts/epreuves/.env`
- [ ] Inventory finishes without DNS/timeout gaps
- [ ] Scope decided and measured in GB
- [ ] PDFs downloaded, names deduplicated, catalogue rows generated
- [ ] Only the chosen subset uploaded to R2
