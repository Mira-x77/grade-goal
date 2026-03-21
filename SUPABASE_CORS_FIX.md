# Supabase CORS Configuration for Downloads

## Problem
"Network error" when downloading PDFs in the app (works on PC browser but not in mobile app).

## Root Cause
Supabase Storage bucket needs CORS configuration to allow downloads from Capacitor apps.

## Solution

### Step 1: Configure CORS in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `aaayzhvqgqptgqaxxbdh`
3. Go to **Storage** → **Configuration** → **CORS**
4. Add CORS policy:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["Content-Length", "Content-Type"],
  "maxAgeSeconds": 3600
}
```

### Step 2: Alternative - Use Supabase CLI

If you have Supabase CLI installed:

```bash
supabase storage update-cors exam-papers --allowed-origins "*" --allowed-methods "GET,HEAD"
```

### Step 3: Verify Bucket is Public

1. Go to **Storage** → **Buckets**
2. Click on `exam-papers` bucket
3. Ensure "Public bucket" is enabled
4. Check "File size limit" is sufficient (at least 10MB)

### Step 4: Test CORS

Run this in browser console:

```javascript
fetch('https://aaayzhvqgqptgqaxxbdh.supabase.co/storage/v1/object/public/exam-papers/test.pdf', {
  method: 'GET',
  mode: 'cors'
})
.then(r => console.log('CORS OK:', r.status))
.catch(e => console.error('CORS Error:', e));
```

## Code Changes Made

### Updated downloadService.ts
- Better error handling
- Removed hash verification (was causing issues)
- Clearer error messages

### Updated integrity.ts
- Added CORS mode to fetch
- Better error handling for network issues
- Progress tracking improvements

## Testing

1. Open app on mobile device
2. Navigate to Library
3. Click on a paper
4. Click "Download" button
5. Should see progress bar
6. File should save to device

## Troubleshooting

### Still getting "Network error"?

1. **Check internet connection**: Ensure device has internet
2. **Check Supabase status**: Visit https://status.supabase.com
3. **Check bucket permissions**: Ensure bucket is public
4. **Check file URL**: Verify URL is accessible in browser
5. **Check app permissions**: Ensure app has storage permissions

### Error: "Failed to fetch"

This usually means CORS is not configured. Follow Step 1 above.

### Error: "Insufficient storage"

Device doesn't have enough space. Free up storage and try again.

### Downloads work on PC but not mobile

This is a CORS issue. Mobile apps use different origins than browsers.
Configure CORS to allow all origins (`*`) as shown in Step 1.

## Security Note

Using `allowedOrigins: ["*"]` allows downloads from any origin.
This is safe for public files like exam papers.

If you want to restrict to specific domains:
```json
{
  "allowedOrigins": [
    "capacitor://localhost",
    "http://localhost",
    "https://yourdomain.com"
  ]
}
```

## Files Modified

- `src/services/downloadService.ts` - Improved error handling
- `src/lib/integrity.ts` - Added CORS support to fetch
