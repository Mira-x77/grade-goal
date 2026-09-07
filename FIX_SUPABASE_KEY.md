# CRITICAL: Your Supabase Anon Key is Corrupted

## Problem
Your `.env` file contains a **corrupted** Supabase anon key with invalid characters:
```
"iss�:"supabase"  ← should be "iss":"supabase"
```

This is why:
- ❌ Database queries fail with empty error messages
- ❌ Library shows 0 papers (even if database has 63)
- ❌ All Supabase operations fail silently

## Solution: Get Fresh Credentials

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select project: `aaayzhvqgqptgqaxxbdh`

### Step 2: Get API Keys
1. Click **Settings** (gear icon, bottom left)
2. Click **API** in the sidebar
3. Under "Project API keys" section, you'll see:
   - **Project URL** (starts with `https://aaayzhvqgqptgqaxxbdh.supabase.co`)
   - **anon/public key** (long JWT token starting with `eyJ...`)

### Step 3: Update .env File
Replace the contents of `.env` with the fresh values:

```env
VITE_SUPABASE_PROJECT_ID="aaayzhvqgqptgqaxxbdh"
VITE_SUPABASE_URL="[PASTE PROJECT URL HERE]"
VITE_SUPABASE_ANON_KEY="[PASTE ANON KEY HERE]"

# App URL for deep linking and sharing
VITE_APP_URL="https://gostudy.app"
```

**IMPORTANT:** 
- Copy the key **exactly** from dashboard
- Don't add extra spaces or line breaks
- Make sure quotes are straight quotes (`"`) not smart quotes (`"` or `"`)

### Step 4: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 5: Verify Connection
Open browser console and check for:
```
✅ ExamService: Successfully fetched [NUMBER] papers from Supabase
```

## What Happened?

The anon key likely got corrupted during:
- Copy/paste from dashboard
- Text editor encoding issues
- Special characters in file

## After Fixing

Once the key is correct:
1. **If database has 63 papers** → They will show immediately
2. **If database is empty** → Run migration 017 (see FIX_63_PAPERS.md)

## Test Connection After Fix

Run this to verify:
```bash
node check-database-now.js
```

Should see:
```
✅ TOTAL PAPERS IN DATABASE: [number]
```

Not:
```
❌ COUNT ERROR: { message: '' }
```
