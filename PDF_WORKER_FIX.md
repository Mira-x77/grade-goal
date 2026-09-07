# PDF.js Worker Fix

## Problem
PDF.js worker couldn't load from CDN, causing error:
```
Failed to fetch dynamically imported module: http://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js
```

## Solution
Copied PDF.js worker to public folder and configured it to load locally.

## Changes Made

1. **Created public folder** in admin panel
   ```
   exam-library-admin/public/
   ```

2. **Copied worker file**
   ```
   node_modules/pdfjs-dist/build/pdf.worker.min.mjs
   → public/pdf.worker.min.mjs
   ```

3. **Updated pdf-preview-generator.ts**
   ```typescript
   pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
   ```

4. **Updated vite.config.ts**
   Added optimizeDeps for pdfjs-dist

## Testing

1. Admin panel running on http://localhost:3000
2. Main app running on http://localhost:8081
3. Upload a PDF through admin panel
4. Preview should generate automatically
5. Check library for preview image

## Next Steps

1. Run SQL to add preview_url column:
   ```sql
   ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS preview_url TEXT;
   ```

2. Upload a test PDF through admin panel

3. Verify preview image appears in library

## Files Modified
- `exam-library-admin/src/lib/pdf-preview-generator.ts`
- `exam-library-admin/vite.config.ts`
- `exam-library-admin/public/pdf.worker.min.mjs` (new)
