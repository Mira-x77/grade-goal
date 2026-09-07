# Free Storage Alternatives (No Credit Card Required)

Since both Firebase Storage and Cloudflare R2 now require credit cards, here are truly free alternatives:

## Option 1: Supabase Storage (RECOMMENDED) ⭐

**Free Tier:**
- 1GB storage (free forever)
- 2GB bandwidth/month
- No credit card required
- Easy setup

**Setup:**
1. Sign up: https://supabase.com/dashboard/sign-up
2. Create new project (takes ~2 minutes to provision)
3. Go to Storage → Create bucket → Name: `exam-papers`
4. Make bucket public
5. Get project URL and anon key from Settings → API

**Pros:**
- No credit card needed
- Simple API (similar to Firebase)
- Good free tier for starting out
- PostgreSQL database included

**Cons:**
- 1GB storage (vs 5-10GB on paid services)
- 2GB bandwidth/month (vs unlimited)

---

## Option 2: Backblaze B2

**Free Tier:**
- 10GB storage
- 1GB bandwidth/day
- No credit card for free tier

**Setup:**
1. Sign up: https://www.backblaze.com/b2/sign-up.html
2. Create bucket
3. Get API credentials

**Pros:**
- Generous free tier
- S3-compatible API
- No credit card

**Cons:**
- More complex setup
- Less documentation

---

## Option 3: Self-Hosted Solution

Host PDFs on your own server or use a simple file hosting service.

**Options:**
- **GitHub Releases** (free, 2GB per file limit)
- **Netlify** (100GB bandwidth/month free)
- **Vercel** (100GB bandwidth/month free)
- **Your own VPS** (if you have one)

**Pros:**
- Completely free
- Full control

**Cons:**
- Not designed for this use case
- Manual file management
- May violate terms of service

---

## Option 4: Temporary Solution - Local Storage Only

For development/testing, you can temporarily disable cloud storage and only use local device storage.

**How it works:**
- Admin uploads PDFs to a local folder
- PDFs are manually copied to a public URL (GitHub, Google Drive, etc.)
- App downloads from those URLs
- No cloud storage service needed

**Pros:**
- Zero cost
- Works immediately
- Good for testing

**Cons:**
- Manual process
- Not scalable
- No analytics

---

## My Recommendation

### For Development/Testing:
**Use Supabase** - It's the easiest no-credit-card option with a decent free tier.

### For Production:
You'll eventually need a credit card for any serious storage service. Consider:
1. **Firebase Storage** - Best integration, 5GB free
2. **Cloudflare R2** - Unlimited bandwidth, 10GB free
3. **Backblaze B2** - Good middle ground

### Immediate Solution:
Let me set up **Supabase Storage** for you - it takes 5 minutes and requires no credit card!

---

## Supabase Quick Setup

1. **Sign up**: https://supabase.com/dashboard/sign-up (use GitHub/Google)
2. **Create project**: 
   - Name: `score-target`
   - Database password: (save this)
   - Region: Choose closest to you
   - Wait 2 minutes for provisioning
3. **Create storage bucket**:
   - Storage → New bucket
   - Name: `exam-papers`
   - Public bucket: ✅ Yes
4. **Get credentials**:
   - Settings → API
   - Copy: Project URL and anon (public) key
5. **Update .env**:
   ```env
   VITE_STORAGE_PROVIDER=supabase
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SUPABASE_BUCKET=exam-papers
   ```

Would you like me to implement Supabase storage adapter for you?
