# Bulk upload: GoStudy_Organized_Exams

## One-time setup (Supabase SQL)

Ensure `app_config` and `exam_papers` exist. Run migrations if needed.

## Upload from desktop folder (recommended)

1. Put PDFs in `Desktop\GoStudy_Organized_Exams` (class → subject → year → session → file.pdf).
2. Set keys in `exam-library-admin/.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
3. **Dry-run** (check mapping, no upload):
   ```bash
   node scripts/upload-gostudy-organized.mjs
   ```
4. **Upload for real** (includes preview thumbnails):
   ```bash
   node scripts/upload-gostudy-organized.mjs --execute
   ```

5. **Backfill previews** for papers already uploaded without thumbnails:
   ```bash
   node scripts/backfill-paper-previews.mjs              # dry-run
   node scripts/backfill-paper-previews.mjs --execute --system=apc
   ```

The script normalizes messy folder names (e.g. `1ere_G`, `Premières_G`) → app values (`1ère G`, `2nde CD`, `6ème`).

## Find papers in admin after upload

1. Start admin: `cd exam-library-admin && npm run dev` → http://127.0.0.1:3001
2. **Papers** (sidebar) — lists all rows; search by title, sort by class/subject/year.
3. **Upload** (sidebar) → **APC** tab — for the 2 skipped files or new PDFs later.
4. **Dashboard** — total paper count should reflect new uploads.

### Last bulk run (GoStudy_Organized_Exams)

- **77 uploaded** to Supabase (`system: apc`)
- **2 skipped** (no class in folder/filename — upload manually):
  - `Examen_Blanc_N1/.../SVT_2eme_Semestre_2014pdf.pdf`
  - `Non_spécifié/.../Analyse_Financière_et_RAMBAUX_TD_2024-2025pdf.pdf`

## Find papers in the mobile app

1. Student profile must match **class + série** (e.g. 1ère + G).
2. **Library** shows papers for that class/série automatically.
3. Use filters (subject, year, exam type) to narrow down.

## Class levels used (must match profile)

| Collège | Lycée base | Séries (2nde) | Séries (1ère / Tle) |
|---------|------------|---------------|---------------------|
| 6ème–3ème | 2nde, 1ère, Tle | A4, CD, E, F, G | A4, C, D, E, F, G |

DB stores combined values: `1ère G`, `Tle C`, `2nde CD`, etc.
