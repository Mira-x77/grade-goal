# Admin Panel Access

The admin panel **no longer has a sign-in page** — opening
`http://localhost:3001` (or `http://127.0.0.1:3001`) goes straight to the
Dashboard. There is nothing to create or remember.

The panel runs under a fixed local identity (`admin@gostudy.app`, used only for
attribution when generating subscription codes) and talks to Supabase with the
service-role key from `exam-library-admin/.env`, so make sure that key is set:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_SERVICE_ROLE_KEY=...   # required for admin reads/writes
```

Old `/login` links (bookmarks, previous logout button) redirect to `/`.

> The panel is intended as a local/operator tool. Before hosting it publicly,
> move the service-role key and the R2 upload signing behind a server-side
> endpoint (Cloudflare Worker), since both are embedded in the browser bundle.

## Your Supabase Project
- **Project ID**: aaayzhvqgqptgqaxxbdh
- **URL**: https://aaayzhvqgqptgqaxxbdh.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
- **Storage bucket**: `exam-papers` (R2 mirrors the same layout)

## Troubleshooting

**Dashboard shows 0 papers / empty lists**
- The admin reads the R2 catalogue when Supabase is restricted, so it should show
  319 papers / 355 books. If it shows zeros, check that
  `VITE_R2_PUBLIC_URL` (or `VITE_CATALOG_URL`) is set and that
  `<public base>/catalog/papers.json` returns 200.
- Storage/PostgREST still return `402 exceed_storage_size_quota` until the
  project is upgraded; the amber banner in the panel explains which features that
  affects.
- Check that `VITE_SUPABASE_SERVICE_ROLE_KEY` is present and the dev server was
  restarted after editing `.env`.

**Can't access Supabase dashboard**
- Make sure you're logged into Supabase, then use the direct link above.
