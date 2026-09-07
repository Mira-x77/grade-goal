# Fix: 63 Papers Missing from Library

## Problem
The library shows only "8 papers found" (hardcoded SAMPLE_PAPERS) instead of the expected 63 real papers from Supabase.

## Root Cause
The `exam_papers` table exists but is **empty**. The seed data has not been inserted yet.

## Solution: Run Migration 017

### Option 1: Using Supabase CLI (Recommended)
```bash
# Make sure you're in the project root
npx supabase db push
```

This will apply all pending migrations including the new `017_seed_exam_papers.sql`.

### Option 2: Manual via Supabase Dashboard
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `aaayzhvqgqptgqaxxbdh`
3. Go to **SQL Editor** (left sidebar)
4. Click "New Query"
5. Copy and paste the entire contents of `supabase/migrations/017_seed_exam_papers.sql`
6. Click "Run" (or press Ctrl+Enter)
7. You should see: "Total exam papers in database: 63"

## Verification

After running the migration:

1. **Check the console logs** in your browser DevTools (F12):
   ```
   ✅ ExamService: Successfully fetched 63 papers from Supabase
   ```

2. **Library should show**:
   ```
   63 papers found
   ```

3. **Papers breakdown**:
   - 3ème: 30 papers (BEPC + sequences + annales)
   - 1ère: 2 papers  
   - Terminale: Multiple papers across subjects
   - Other levels: Mixed

## Enhanced Debug Logging

The `examService.ts` now includes comprehensive logging:
- Supabase URL being used
- Response data structure
- Count verification  
- Helpful error messages explaining possible issues

Check your browser console to see exactly what's happening during data fetch.

## Files Modified

1. `supabase/migrations/017_seed_exam_papers.sql` - NEW: Seeds 63 papers
2. `src/services/examService.ts` - Enhanced debug logging
3. `src/pages/AuthCallback.tsx` - Fixed auth loop (redirects to /welcome instead of /auth)
4. `src/pages/AuthPage.tsx` - Made skip button more prominent

## Testing

After running the migration:
```bash
npm run dev
```

Then:
1. Navigate to `/library`
2. Open browser DevTools → Console
3. Look for log messages starting with `📥 ExamService:`
4. You should see `✅ Successfully fetched 63 papers`

## Troubleshooting

### Still showing 8 papers?
Check console logs for:
```
⚠️ Query returned ZERO papers from database
```

This means:
1. Migration didn't run → Run it manually from dashboard
2. RLS policies blocking → Check policies in Supabase dashboard
3. Wrong project → Verify `.env` has correct `VITE_SUPABASE_URL`

### Get RLS policy error?
The RLS policy in `002_exam_papers_table.sql` allows **anonymous + authenticated** read access:
```sql
CREATE POLICY "exam_papers: public read"
  ON public.exam_papers FOR SELECT
  TO authenticated, anon
  USING (true);
```

Verify this policy exists in Supabase Dashboard → Authentication → Policies.

## Next Steps

Once 63 papers are showing:
- ✅ Library filters work correctly
- ✅ Search finds real papers
- ✅ Pagination shows actual data
- ✅ No more SAMPLE_PAPERS fallback
