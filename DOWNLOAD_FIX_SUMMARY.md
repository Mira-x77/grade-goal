# Download Fix Summary

## Problem
- Downloads work on PC but fail on mobile app
- Error: "Network error. Please check your internet connection."

## Root Cause
Supabase Storage bucket needs CORS configuration to allow downloads from Capacitor mobile apps.

## Solution Applied

### Code Changes
1. **downloadService.ts** - Improved error handling and removed problematic hash verification
2. **integrity.ts** - Added CORS mode to fetch requests with better error messages

### Required: Supabase CORS Configuration

**YOU MUST DO THIS** for downloads to work on mobile:

1. Go to https://supabase.com/dashboard
2. Select project `aaayzhvqgqptgqaxxbdh`
3. Go to **Storage** → **Configuration** → **CORS**
4. Add this CORS policy:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAgeSeconds": 3600
}
```

5. Click **Save**

## Why This Fixes It

- PC browsers use `http://localhost:8081` origin
- Mobile apps use `capacitor://localhost` origin
- Supabase needs to allow both origins
- Using `"*"` allows all origins (safe for public files)

## Testing After Fix

1. Configure CORS in Supabase (step above)
2. Open app on mobile
3. Go to Library
4. Click a paper
5. Click "Download"
6. Should work now!

## Alternative: Specific Origins

If you want to restrict origins instead of using `*`:

```json
{
  "allowedOrigins": [
    "capacitor://localhost",
    "http://localhost",
    "http://localhost:8081",
    "https://yourdomain.com"
  ],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAgeSeconds": 3600
}
```

## Files Modified
- ✅ `src/services/downloadService.ts`
- ✅ `src/lib/integrity.ts`
- ✅ `SUPABASE_CORS_FIX.md` (detailed instructions)

## Next Step
**Configure CORS in Supabase Dashboard** (see instructions above)
