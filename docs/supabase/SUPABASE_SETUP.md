# Supabase Storage Setup Guide

✅ **NO CREDIT CARD REQUIRED!**

Supabase offers 1GB free storage with 2GB bandwidth/month - perfect for getting started with your exam library.

## Step 1: Create Supabase Account (2 minutes)

1. Go to: **https://supabase.com/dashboard/sign-up**
2. Sign up using:
   - GitHub account (recommended - fastest)
   - Google account
   - Or email/password
3. Verify your email if using email signup

## Step 2: Create New Project (2 minutes)

1. Click **"New Project"**
2. Fill in project details:
   - **Name**: `score-target` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free (already selected)
3. Click **"Create new project"**
4. Wait ~2 minutes for project to provision (grab a coffee ☕)

## Step 3: Create Storage Bucket (1 minute)

1. In your project dashboard, click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"**
3. Configure bucket:
   - **Name**: `exam-papers`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: 50 MB (default is fine)
   - **Allowed MIME types**: Leave empty (allows all types)
4. Click **"Create bucket"**

## Step 4: Get Your Credentials (1 minute)

1. Click **"Settings"** in the left sidebar (gear icon)
2. Click **"API"** under Project Settings
3. You'll see two important values:

   **Project URL** (looks like):
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **anon public key** (looks like):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjc0ODAwMCwiZXhwIjoxOTQ4MzI0MDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890
   ```

4. **Copy both values** - you'll need them in the next step

## Step 5: Update .env File (1 minute)

Open your `.env` file and update these lines:

```env
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_BUCKET=exam-papers
```

Replace:
- `https://your-project.supabase.co` with your actual Project URL
- `your-anon-key-here` with your actual anon public key

## Step 6: Restart Dev Server

```bash
npm run dev
```

## Step 7: Test It! (2 minutes)

1. Open your app: http://localhost:5173
2. Go to admin panel: http://localhost:5173/admin
3. Upload a test PDF
4. Check Supabase dashboard → Storage → exam-papers
5. You should see your uploaded file!
6. Try downloading it in the mobile app

## ✅ Setup Complete!

You now have:
- ✅ 1GB free storage
- ✅ 2GB bandwidth/month
- ✅ No credit card required
- ✅ Automatic backups
- ✅ CDN delivery
- ✅ PostgreSQL database (bonus!)

## Verification Checklist

- [ ] Supabase account created
- [ ] Project created and provisioned
- [ ] Storage bucket `exam-papers` created
- [ ] Bucket is set to **public**
- [ ] Project URL copied
- [ ] Anon key copied
- [ ] `.env` file updated
- [ ] `VITE_STORAGE_PROVIDER=supabase` set
- [ ] Dev server restarted
- [ ] Test upload successful
- [ ] Test download successful

## What You Get (Free Tier)

| Feature | Free Tier |
|---------|-----------|
| Storage | 1 GB |
| Bandwidth | 2 GB/month |
| Database | 500 MB |
| API Requests | Unlimited |
| Auth Users | Unlimited |
| Realtime | Unlimited |
| Edge Functions | 500K invocations/month |

## Storage Capacity

With 1GB storage, you can store approximately:
- **50-100 exam papers** (assuming 10-20MB per PDF)
- Perfect for getting started!
- Upgrade to Pro ($25/month) for 100GB if you need more

## Troubleshooting

### "Access Denied" when uploading
- Make sure bucket is set to **public**
- Go to Storage → exam-papers → Settings → Make public

### "Invalid credentials" error
- Double-check Project URL in `.env`
- Double-check anon key in `.env`
- Make sure there are no extra spaces
- Restart dev server after changing `.env`

### Files not appearing in bucket
- Check bucket name is exactly `exam-papers`
- Verify `VITE_SUPABASE_BUCKET=exam-papers` in `.env`
- Check browser console for error messages

### "Bucket not found" error
- Make sure you created the bucket in Step 3
- Verify bucket name matches `.env` configuration
- Bucket names are case-sensitive

### CORS errors
- Supabase handles CORS automatically for public buckets
- If issues persist, check bucket is set to public

## Security Notes

- ✅ Anon key is safe to expose (it's public)
- ✅ Public bucket allows read access only
- ✅ Write access requires authentication (admin only)
- ✅ Files are served via CDN
- ✅ Automatic SSL/HTTPS

## Monitoring Usage

Check your usage in Supabase dashboard:
1. Go to **Settings** → **Usage**
2. View storage and bandwidth usage
3. Get alerts when approaching limits

## Upgrade Path

When you outgrow the free tier:
- **Pro Plan**: $25/month
  - 100 GB storage
  - 200 GB bandwidth
  - Daily backups
  - Priority support

## Need Help?

- **Supabase Docs**: https://supabase.com/docs/guides/storage
- **Community**: https://github.com/supabase/supabase/discussions
- **Discord**: https://discord.supabase.com

## Next Steps

Your exam library is now using Supabase! You can:
1. Upload exam papers through the admin panel
2. Download them in the mobile app
3. Everything works offline with local caching
4. Monitor usage in Supabase dashboard

Enjoy your free 1GB storage! 🎉
