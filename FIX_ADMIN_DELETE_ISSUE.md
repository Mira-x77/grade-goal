# ❌ ADMIN DELETE ISSUE FOUND

## Problem
**Admin panel deletes don't work because of Row Level Security (RLS) policies.**

When you click "Delete" in admin panel:
- ✅ Admin UI removes the item
- ❌ Database keeps the item (RLS blocks delete)
- ❌ App still shows the item (database still has it)

## Root Cause
Admin panel uses `VITE_SUPABASE_ANON_KEY` which has limited permissions.
The database has RLS policies that prevent anon users from deleting records.

## Solution
Admin panel needs to use `VITE_SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.

---

## STEP 1: Get Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
2. Click "Settings" (⚙️) in left sidebar
3. Click "API"
4. Scroll to "Project API keys"
5. Find **"service_role" key** (NOT anon key)
6. Click "Reveal" and copy the long JWT token

**⚠️ WARNING:** Service role key has FULL database access - never expose it in client code!

---

## STEP 2: Add Key to Admin Panel

1. Open `exam-library-admin/.env`
2. Replace `GET_FROM_SUPABASE_DASHBOARD` with your actual service_role key
3. Save the file

Should look like:
```env
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS..."
```

---

## STEP 3: Update Supabase Client

After adding the key, I need to update the admin panel code to use service_role key for write operations.

**Files to update:**
- `exam-library-admin/src/lib/supabaseClient.ts` - Add admin client with service role
- `exam-library-admin/src/pages/Courses.tsx` - Use admin client for delete
- Other admin pages with delete/update operations

---

## Current Status

✅ Added service role key placeholder to `.env`
⏳ Waiting for you to add the actual key
⏳ Then I'll update the code to use it

---

## Quick Fix Alternative

If you don't want to use service role key, you can:
1. Disable RLS on `course_posts` table (NOT RECOMMENDED - security risk)
2. OR add RLS policy allowing authenticated admin users to delete

**Recommended:** Use service role key in admin panel (secure, proper approach)

---

## What to Do Now

1. Get service_role key from Supabase dashboard
2. Paste it in `exam-library-admin/.env` (replace `GET_FROM_SUPABASE_DASHBOARD`)
3. Tell me when done, and I'll update the code
