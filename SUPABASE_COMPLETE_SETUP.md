# Complete Supabase Setup - Step by Step

## Current Status
- Project ID: `aaayzhvqgqptgqaxxbdh`
- Project URL: `https://aaayzhvqgqptgqaxxbdh.supabase.co`
- Anon Key: `sb_publishable_LUrbSa1VJkrlfC_m8arz1Q_dCQQAKOa`

## Step 1: Create Storage Bucket (2 minutes)

1. Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/storage/buckets

2. Click **"Create a new bucket"**

3. Fill in:
   - Name: `exam-papers`
   - ✅ Check "Public bucket"
   - Click "Create bucket"

## Step 2: Set Up Storage Policies (3 minutes)

1. Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/sql/new

2. Copy and paste this SQL:

```sql
-- Allow anyone to upload files to exam-papers bucket
CREATE POLICY "Allow public uploads" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'exam-papers');

-- Allow anyone to view/download files from exam-papers bucket
CREATE POLICY "Allow public downloads" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'exam-papers');

-- Allow anyone to delete files from exam-papers bucket
CREATE POLICY "Allow public deletes" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'exam-papers');
```

3. Click **"Run"** button

4. You should see: "Success. No rows returned"

## Step 3: Verify Configuration Files

Your `.env` files are already configured:

**Main app** (`.env`):
```
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://aaayzhvqgqptgqaxxbdh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_LUrbSa1VJkrlfC_m8arz1Q_dCQQAKOa
VITE_SUPABASE_BUCKET=exam-papers
```

**Admin panel** (`exam-library-admin/.env`):
```
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://aaayzhvqgqptgqaxxbdh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_LUrbSa1VJkrlfC_m8arz1Q_dCQQAKOa
VITE_SUPABASE_BUCKET=exam-papers
```

✅ Both files are already correct!

## Step 4: Start Both Servers

Open TWO terminal windows:

**Terminal 1 - Main App:**
```bash
cd C:\Users\mira\Documents\grade-goal
npm run dev
```
Wait for: "Local: http://localhost:8081/"

**Terminal 2 - Admin Panel:**
```bash
cd C:\Users\mira\Documents\grade-goal\exam-library-admin
npm run dev
```
Wait for: "Local: http://localhost:5173/"

## Step 5: Test Upload in Admin Panel

1. Open browser: http://localhost:5173/

2. You'll see a login page - use your Firebase email/password to login

3. After login, click **"Upload"** in the sidebar

4. Fill in the form:
   - Select a PDF file
   - Title: "Test Paper"
   - Subject: "Mathematics"
   - Class Level: "Form 1"
   - Year: 2024
   - Exam Type: "Mock"
   - Session: "November"
   - Tags: test
   - Description: Test upload

5. Click **"Upload Paper"**

6. You should see: "✅ Paper uploaded successfully!"

## Step 6: Verify Upload in Supabase

1. Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/storage/buckets/exam-papers

2. You should see your uploaded PDF file in the folder structure

## Step 7: View Paper in Main App

1. Open browser: http://localhost:8081/

2. Click the **"Library"** tab at the bottom

3. You should see your uploaded paper in the grid

4. Click on the paper card to see details

5. Click **"Download"** to download it to your device

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Solution:** Make sure you ran the SQL policies in Step 2

Go back to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/storage/policies

You should see 3 policies:
- Allow public uploads
- Allow public downloads  
- Allow public deletes

If they're not there, run the SQL from Step 2 again.

### Error: "Bucket not found"

**Solution:** Make sure the bucket name is exactly `exam-papers` (lowercase, with hyphen)

### Admin panel won't load

**Solution:** 
1. Check terminal for errors
2. Make sure port 5173 is not in use
3. Try: `npm run dev -- --port 5174`

### Main app won't load

**Solution:**
1. Check terminal for errors
2. Make sure port 8081 is not in use
3. Restart the dev server

### Papers not showing in app

**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Make sure you're connected to WiFi
4. Refresh the page

## Success Checklist

- [ ] Supabase bucket `exam-papers` created
- [ ] Bucket is set to public
- [ ] SQL policies created (3 policies)
- [ ] Both `.env` files configured
- [ ] Main app running on port 8081
- [ ] Admin panel running on port 5173
- [ ] Can login to admin panel
- [ ] Can upload PDF in admin panel
- [ ] PDF appears in Supabase Storage
- [ ] PDF appears in main app Library tab
- [ ] Can download PDF in main app

## Next Steps

Once everything works:
1. Upload more exam papers through admin panel
2. Test filtering and search in main app
3. Test offline mode (disconnect WiFi, papers should still show from cache)
4. Test download and open PDF functionality

## Need Help?

If you're still stuck, tell me:
1. Which step failed?
2. What error message do you see?
3. Screenshot of the error (if possible)

I'll help you fix it!
