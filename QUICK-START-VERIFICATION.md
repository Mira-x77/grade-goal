# Quick Start: Verify the Library Repair

## TL;DR - What To Do Right Now

### 1. Start the app:
```bash
npm run dev
```

### 2. Open browser (the app should open automatically), press F12, click Console tab

### 3. Type this and press Enter:
```javascript
debugTools.fullDiagnostic()
```

### 4. Read the output. You should see:
```
✅ Supabase papers: 63
✅ examService papers: 63  ← This should be 63, NOT 8
```

### 5. If it shows 8 instead of 63, run this:
```javascript
debugTools.clearAllCaches()
```
Then reload the page (Ctrl+R or Cmd+R).

### 6. Navigate to the Library/Papers section in the app.

### 7. You should see 63 papers, not 8.

---

## Expected Results

✅ **Success looks like**:
- Library shows 63 papers
- Console says "Fetched 63 papers from Supabase"
- Filters work (can filter by class, subject, year)
- Papers show proper metadata (title, class, subject, year)
- Download indicators display

❌ **Failure looks like**:
- Library still shows only 8 papers
- Console says "returning sample papers"
- debugTools shows "examService papers: 8"

---

## If It Fails

### Option 1: Nuclear cache clear
```javascript
// In browser console:
debugTools.clearAllCaches();
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Option 2: Try Incognito/Private mode
Fresh browser window with no cache.

### Option 3: Check Network tab
F12 → Network → Filter "exam_papers" → Reload page → Check if request returns 63 items.

---

## What Was Fixed

1. **Enhanced logging** - Can now see exactly what data flows through the app
2. **Fixed filter logic** - No accidental filtering hiding papers  
3. **Debug tools** - Can diagnose issues from browser console
4. **Migration file** - Documented database schema and RLS

---

## Admin Dashboard

The admin dashboard was already working correctly.
No changes were needed there.

To verify:
```bash
cd exam-library-admin
npm run dev
```
Navigate to Papers section → Should show 63 papers.

---

## Success = 63 Papers Showing

When you see 63 papers in the Library, the repair is complete. ✅

---

## Questions?

If verification fails:
1. Run `debugTools.fullDiagnostic()` 
2. Copy/paste the full console output
3. Check browser console for red error messages
4. Note which browser you're using

The output will show exactly where the issue is.
