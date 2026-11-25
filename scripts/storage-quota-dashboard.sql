-- Run in Supabase Dashboard → SQL Editor (read-only).
-- File Storage objects live in storage.objects. Database size is separate
-- (Database → Reports). Backups are Database → Backups.

-- 1) Storage by bucket
SELECT
  bucket_id,
  COUNT(*) AS files,
  ROUND(SUM(COALESCE((metadata->>'size')::bigint, 0)) / 1024.0 / 1024.0, 1) AS mb
FROM storage.objects
GROUP BY bucket_id
ORDER BY mb DESC;

-- 2) Largest 40 files
SELECT
  bucket_id,
  name,
  ROUND(COALESCE((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) AS mb,
  created_at
FROM storage.objects
ORDER BY COALESCE((metadata->>'size')::bigint, 0) DESC
LIMIT 40;

-- 3) APKs in storage
SELECT bucket_id, name,
  ROUND(COALESCE((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) AS mb
FROM storage.objects
WHERE name ILIKE '%.apk' OR bucket_id = 'app-updates'
ORDER BY mb DESC;

-- 4) Preview / PNG dumps (often leftover after failed uploads)
SELECT bucket_id, name,
  ROUND(COALESCE((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) AS mb
FROM storage.objects
WHERE name ILIKE 'preview_%' OR name ILIKE 'previews/%'
ORDER BY mb DESC
LIMIT 50;

-- 5) Duplicate papers by content hash (same PDF stored twice in the table)
SELECT content_hash, COUNT(*) AS copies, SUM(file_size) AS total_bytes
FROM public.exam_papers
WHERE content_hash IS NOT NULL
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY copies DESC, total_bytes DESC;

-- 6) Same for books
SELECT content_hash, COUNT(*) AS copies, SUM(file_size) AS total_bytes
FROM public.library_books
WHERE content_hash IS NOT NULL
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY copies DESC, total_bytes DESC;
