# Admin Upload Issue - Root Cause Found

## Problem Identified ✅

The admin panel is configured to use **Supabase Storage** (correct), but the `adminService.ts` is trying to write metadata to **Firebase Firestore** (wrong).

### What's Happening:

1. ✅ PDF uploads to Supabase Storage successfully
2. ❌ Then tries to write metadata to Firestore (which doesn't exist/isn't configured)
3. ❌ Upload fails with Firestore error

### Evidence:

**exam-library-admin/.env**:
```
VITE_STORAGE_PROVIDER=supabase  ← Correct
VITE_SUPABASE_URL=https://aaayzhvqgqptgqaxxbdh.supabase.co
VITE_SUPABASE_BUCKET=exam-papers
```

**exam-library-admin/src/services/adminService.ts**:
```typescript
import { db } from '../lib/firebase';  ← Wrong! Using Firestore
import { collection, doc, setDoc } from 'firebase/firestore';

async createPaper(paper: NewExamPaper): Promise<string> {
  const paperRef = doc(collection(db, PAPERS_COLLECTION));  ← Firestore
  await setDoc(paperRef, paperData);  ← This fails!
}
```

## Solution

The admin service needs to be updated to use **Supabase database** instead of Firestore.

### Option 1: Quick Fix - Use Supabase Directly

Update `adminService.ts` to use Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

async createPaper(paper: NewExamPaper): Promise<string> {
  const { data, error } = await supabase
    .from('exam_papers')
    .insert({
      title: paper.title,
      subject: paper.subject,
      class_level: paper.classLevel,
      year: paper.year,
      exam_type: paper.examType,
      session: paper.session,
      file_url: paper.fileUrl,
      file_name: paper.fileName,
      file_size: paper.fileSize,
      file_size_formatted: formatBytes(paper.fileSize),
      content_hash: paper.contentHash,
      tags: paper.tags,
      description: paper.description,
      downloads: 0,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}
```

### Option 2: Create Database Adapter (Better)

Create a database adapter similar to storage adapter to support both Firebase and Supabase.

## Immediate Action Required

1. Update `adminService.ts` to use Supabase database
2. Remove Firestore imports
3. Update all CRUD operations (create, update, delete, get)
4. Test upload flow

## Files to Modify

1. **exam-library-admin/src/services/adminService.ts** - Replace Firestore with Supabase
2. **exam-library-admin/src/lib/firebase.ts** - May need to check if Firestore is initialized

## Expected Behavior After Fix

1. User fills upload form
2. PDF uploads to Supabase Storage ✅
3. Metadata writes to Supabase database ✅
4. Success message shown ✅
5. Paper appears in main app ✅

---

Would you like me to implement the fix now?
