# 🚀 Start Here - Exam Library Storage Setup

## You Need Storage (No Credit Card!)

Your exam library needs cloud storage for PDF files. Since you don't have a credit card, use **Supabase** (it's free!).

## Quick Setup (5 Minutes)

### Step 1: Sign Up
🔗 **https://supabase.com/dashboard/sign-up**
- Use GitHub or Google (fastest)

### Step 2: Create Project
- Click "New Project"
- Name: `score-target`
- Wait 2 minutes ☕

### Step 3: Create Storage Bucket
- Storage → Create bucket
- Name: `exam-papers`
- ✅ **Make it public!**

### Step 4: Get Credentials
- Settings → API
- Copy:
  1. Project URL
  2. anon public key

### Step 5: Update .env
Open `.env` and replace these lines:

```env
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
VITE_SUPABASE_BUCKET=exam-papers
```

### Step 6: Restart
```bash
npm run dev
```

### Step 7: Test
1. Open: http://localhost:5173/admin
2. Upload a test PDF
3. Done! 🎉

## What You Get (Free)
- ✅ 1GB storage (~50-100 PDFs)
- ✅ 2GB bandwidth/month
- ✅ No credit card needed
- ✅ Automatic CDN delivery

## Need Help?

**Quick Guide**: `SUPABASE_QUICK_START.md` (5 min read)
**Detailed Guide**: `SUPABASE_SETUP.md` (with troubleshooting)
**All Options**: `FREE_STORAGE_ALTERNATIVES.md`

## Already Have Credit Card?

You can use Firebase (5GB) or Cloudflare R2 (10GB unlimited bandwidth) instead.
See `STORAGE_ADAPTER_GUIDE.md` for all options.

---

**TL;DR**: Sign up at supabase.com, create project, create bucket, copy credentials to `.env`, restart server. Done in 5 minutes!
