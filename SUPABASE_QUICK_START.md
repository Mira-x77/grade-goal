# Supabase Quick Start (5 Minutes)

✅ **NO CREDIT CARD REQUIRED!**

## What You'll Get
- 1GB free storage
- 2GB bandwidth/month
- ~50-100 exam papers capacity
- Perfect for getting started!

## Quick Setup (5 minutes)

### 1. Sign Up (1 minute)
🔗 **https://supabase.com/dashboard/sign-up**
- Use GitHub (fastest) or Google
- Or email/password

### 2. Create Project (2 minutes)
- Click "New Project"
- Name: `score-target`
- Password: (create & save it)
- Region: Choose closest
- Wait ~2 minutes ☕

### 3. Create Bucket (1 minute)
- Storage → Create bucket
- Name: `exam-papers`
- ✅ **Check "Public bucket"** (important!)
- Click Create

### 4. Get Credentials (30 seconds)
- Settings → API
- Copy these 2 values:
  1. **Project URL**: `https://xxxxx.supabase.co`
  2. **anon public key**: `eyJhbGci...`

### 5. Update .env (30 seconds)
Replace these lines in your `.env` file:

```env
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SUPABASE_BUCKET=exam-papers
```

### 6. Restart & Test
```bash
npm run dev
```

Then:
1. Open admin panel: http://localhost:5173/admin
2. Upload a test PDF
3. Check Supabase dashboard → Storage
4. Success! 🎉

## That's It!

Your app now uses Supabase with:
- ✅ 1GB free storage
- ✅ 2GB bandwidth/month
- ✅ No credit card needed
- ✅ Automatic CDN delivery

## Need More Details?

See `SUPABASE_SETUP.md` for:
- Detailed step-by-step instructions
- Troubleshooting guide
- Security notes
- Upgrade options

## Troubleshooting

**"Access Denied"**
→ Make sure bucket is set to public (Step 3)

**"Invalid credentials"**
→ Double-check URL and key in `.env`, restart server

**Files not appearing**
→ Verify bucket name is exactly `exam-papers`

## Why Supabase?

| Feature | Supabase | Firebase | R2 |
|---------|----------|----------|-----|
| Credit Card | ❌ No | ⚠️ Yes | ⚠️ Yes |
| Free Storage | 1GB | 5GB | 10GB |
| Free Bandwidth | 2GB/mo | 1GB/day | Unlimited |
| Setup Time | 5 min | 10 min | 12 min |

Perfect for getting started without a credit card!
