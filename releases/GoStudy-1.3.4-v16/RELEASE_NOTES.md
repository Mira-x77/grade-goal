# GoStudy 1.3.4 (versionCode 16)

Built 2026-11-23 from the current working tree.

## What changed since 1.3.3 (v15)

- **Recovered library PDFs** that lived outside the usual folders:
  129 new papers + 62 new books. The published catalogue is now
  **395 papers + 415 books** (was 319 + 355).
- **Smarter classification**:
  - BAC 1 / Probatoire is filed under Première (`1ère`), plain BAC / BAC II /
    Terminale under `Tle`.
  - `série C`, `Série C4`, `1ereD`, `TLED` and multi-série titles now resolve to
    the real série (`Tle C`, `1ère C`, `1ère D`, …).
  - Multi-subject papers appear under every subject (`HIST-GEO`, `HG`,
    `Hist-Géo`, `hist geo` → Histoire + Géographie).
  - Multi-class papers appear under every listed class filter.
  - Non-exam documents (2027 authorisation lists, circulars, contracts,
    brochures, CVs, printer test pages, off-curriculum books) are excluded.
- **Filters**: a legacy coarse class tag (`1ère`) no longer duplicates the
  precise one (`cls:1ère D`), so documents are listed once under the right
  série.
- **Smaller install**: the previous release APK is no longer bundled inside the
  new APK (13.8 MB instead of 27.7 MB).
- **Actus/feed works from R2**: the news feed now falls back to
  `catalog/feed.json` on R2 when the Supabase table cannot be read, instead of
  showing English sample courses. Five real GoStudy posts (promo images under
  `feed/`) are published there. Supabase still wins when it answers.

## Artifacts

| File | Purpose |
|---|---|
| `GoStudy-1.3.4-v16.apk` | Side-load / direct install (signed with the release key) |
| `GoStudy-1.3.4-v16.aab` | Play Store upload |

- Package: `com.gostudy.student`
- versionCode: `16` (previous `15`)
- versionName: `1.3.4` (previous `1.3.3`)
- minSdk 24, targetSdk 36
- Signing cert SHA-256: `ce9d5ca7a621451b9ecb8a17a719eccf21f2d248c36d25b17ed392f32049ab9f`
  (identical to v15, so it updates in place)
