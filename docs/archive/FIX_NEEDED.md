# URGENT FIX NEEDED - Supabase Integration

## THE PROBLEM
Admin panel successfully uploads PDFs to Supabase (storage + database), but main app shows "0 papers found" even though data exists in database.

## WHAT'S CONFIRMED WORKING
1. ✅ Admin uploads PDF to Supabase Storage bucket `exam-papers`
2. ✅ Admin saves metadata to Supabase `exam_papers` table
3. ✅ Data exists in database (confirmed via SQL query)
4. ✅ Main app connects to Supabase
5. ✅ Main app queries database without errors

## WHAT'S NOT WORKING
❌ Main app returns empty array from Supabase query despite data existing

## LIKELY ROOT CAUSE
**Row Level Security (RLS) policies are blocking the SELECT query**

The anon key cannot read from `exam_papers` table even though policies were created.

## THE FIX

### Option 1: Disable RLS (Quick Test)
Run in Supabase SQL Editor:
```sql
ALTER TABLE exam_papers DISABLE ROW LEVEL SECURITY;
```

If papers appear in app after this, RLS is the issue. Then re-enable and fix policies.

### Option 2: Fix RLS Policies (Proper Solution)
Run in Supabase SQL Editor:
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON exam_papers;
DROP POLICY IF EXISTS "Allow public insert" ON exam_papers;
DROP POLICY IF EXISTS "Allow public update" ON exam_papers;

-- Create correct policies
CREATE POLICY "Enable read for all" ON exam_papers
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Enable insert for all" ON exam_papers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for all" ON exam_papers
  FOR UPDATE TO anon, authenticated
  USING (true);
```

### Option 3: Grant Direct Permissions
Run in Supabase SQL Editor:
```sql
-- Grant table permissions to anon role
GRANT SELECT ON exam_papers TO anon;
GRANT INSERT ON exam_papers TO anon;
GRANT UPDATE ON exam_papers TO anon;
```

## VERIFICATION STEPS

1. **Test in Supabase SQL Editor:**
   ```sql
   -- This should return data
   SELECT * FROM exam_papers;
   ```

2. **Test with anon role:**
   ```sql
   SET ROLE anon;
   SELECT * FROM exam_papers;
   RESET ROLE;
   ```
   If this returns 0 rows, RLS is blocking it.

3. **Check in main app:**
   - Go to http://localhost:8080/
   - Click Library tab
   - Papers should appear

## SUPABASE CREDENTIALS
- Project ID: `aaayzhvqgqptgqaxxbdh`
- URL: `https://aaayzhvqgqptgqaxxbdh.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo`
- Bucket: `exam-papers`
- Table: `exam_papers`

## CONFIRMED DATA IN DATABASE
```sql
-- This row exists:
id: 680c74c0-c60c-4a08-a8a6-9afd9de4b89e
title: llll
subject: ml
class_level: Form 1
year: 2026
```

## KEY FILES
- **Main App Query:** `src/services/examService.ts` (line 60-75)
- **Admin Upload:** `exam-library-admin/src/App-fresh.tsx` (line 85-105)
- **Main App Config:** `.env`
- **Admin Config:** `exam-library-admin/.env`

## SERVERS
- Admin: http://localhost:3000/ (working)
- Main App: http://localhost:8080/ (not showing papers)

## NEXT AGENT INSTRUCTIONS
1. Run Option 1 SQL to disable RLS temporarily
2. If papers appear, run Option 2 SQL to fix policies properly
3. If papers still don't appear, run Option 3 SQL to grant direct permissions
4. Verify papers show in main app Library tab
5. Done!

## NO CONSOLE DEBUGGING NEEDED
User does not want to check browser console. Fix must work by running SQL commands in Supabase dashboard only.
