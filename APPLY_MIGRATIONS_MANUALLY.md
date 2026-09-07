# Apply Migrations Manually

Since the `exec_sql` RPC function doesn't exist in your Supabase project, you need to apply migrations through the Supabase Dashboard.

## Steps to Apply Migrations

### 1. Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: **aaayzhvqgqptgqaxxbdh**
3. Click **SQL Editor** in the left sidebar

### 2. Apply Migration 013 (Downloads Column)
1. Click **New Query**
2. Open file: `supabase/migrations/013_add_downloads_column.sql`
3. Copy ALL the contents
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

**Status:** ✅ Already applied! (Columns exist and working)

### 3. Fix code redemption (`redeemed_by` column missing)

If redeeming a premium code fails with **`column "redeemed_by" of relation "subscription_codes" does not exist`**:

1. Click **New Query** in SQL Editor
2. Open `supabase/migrations/015_subscription_codes_redemption_columns.sql`
3. Copy all contents, paste, **Run**

Then ensure migration **014** is applied (functions `check_premium_status` and `use_subscription_code`).

### 4. Apply Migration 010 (Download Quota System)
1. Click **New Query**
2. Open file: `supabase/migrations/010_download_quota_system.sql`
3. Copy ALL the contents
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

**This migration creates:**
- `user_download_quotas` table
- `check_premium_status()` function
- `increment_download_with_quota()` function  
- `get_download_quota_status()` function
- `get_current_month_year()` function

### 5. Verify Migration Success

Run this query in SQL Editor:

```sql
-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%download%'
ORDER BY routine_name;

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_download_quotas'
) as quota_table_exists;

-- Test the function
SELECT * FROM get_download_quota_status('test-device-id');
```

Expected results:
- Should see 4-5 functions with 'download' in the name
- `quota_table_exists` should be `true`
- Function test should return quota information

## Why Manual Application?

The anon key doesn't have permission to execute DDL statements (CREATE TABLE, CREATE FUNCTION, etc.). These operations require:
- Service role key (not recommended to expose)
- OR direct access through Supabase Dashboard (recommended)

## After Migration

Once applied, the app will:
1. ✅ Track download counts for papers and books
2. ✅ Enforce monthly download quotas (5 for free users)
3. ✅ Allow unlimited downloads for premium users
4. ✅ Show quota status in the UI

## Testing

After applying migrations:
1. Download a paper in the app
2. Check browser console for: `✅ Download count incremented`
3. Verify in database:
   ```sql
   SELECT * FROM user_download_quotas ORDER BY updated_at DESC LIMIT 5;
   SELECT id, title, downloads FROM exam_papers WHERE downloads > 0;
   ```
