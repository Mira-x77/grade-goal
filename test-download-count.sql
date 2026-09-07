-- Test script to verify download counting functions exist and work

-- Check if increment_download_with_quota function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%download%'
ORDER BY routine_name;

-- Check if user_download_quotas table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_download_quotas'
) as table_exists;

-- Check exam_papers table has downloads column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'exam_papers' 
  AND column_name = 'downloads';

-- Check library_books table has downloads column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'library_books' 
  AND column_name = 'downloads';

-- Test increment_download_with_quota function (dry run - won't actually increment)
-- SELECT * FROM increment_download_with_quota('test-device-id', NULL, NULL);
