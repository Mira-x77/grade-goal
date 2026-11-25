# GoStudy 1.3.3 (versionCode 15)

Built 2026-11-15 from the current working tree.

## What changed since 1.3.2 (v14)

- **Profile no longer crashes** on accounts without a `settings` object
  ("Too many re-renders" loop). APC semesters are now seeded/synced in an
  effect instead of during render.
- **Collapsible filter header** on the library listing pages: the header with
  the filters can be collapsed/expanded with the chevron.
- **Library content is served from Cloudflare R2** through the published
  catalogue (`/catalog/papers.json`, `/catalog/books.json`):
  319 papers + 355 books, with Supabase still returning `402`.
- Assorted Home / library polish and safer settings reads.

## Artifacts

| File | Purpose |
|---|---|
| `GoStudy-1.3.3-v15.apk` | Side-load / direct install (signed with the release key) |
| `GoStudy-1.3.3-v15.aab` | Play Store upload |

- Package: `com.gostudy.student`
- versionCode: `15` (previous `14`)
- versionName: `1.3.3` (previous `1.3.2`)
- Signing cert SHA-256: `ce9d5ca7a621451b9ecb8a17a719eccf21f2d248c36d25b17ed392f32049ab9f`
  (identical to v14, so it updates in place)
