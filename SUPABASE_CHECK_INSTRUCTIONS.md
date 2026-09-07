# 🔍 How to Check Your 63 PDFs in Supabase

## Quick Check - Go to Supabase Dashboard

1. **Open**: https://supabase.com/dashboard
2. **Login** to your project
3. **Select project**: `aaayzhvqgqptgqaxxbdh`

---

## Check Your Tables

### Option 1: Table Editor

1. Go to **Table Editor** (left sidebar)
2. Check these tables:

#### 📄 `exam_papers` table
- Click on `exam_papers`
- **Count the rows** - how many papers do you see?
- This is for **past exam papers** (Library tab in app)

#### 📚 `library_books` table
- Click on `library_books`  
- **Count the rows** - how many books do you see?
- This is for **books** (Books tab in app)

---

## Which Table Has Your 63 PDFs?

### If they're in `exam_papers`:
Your PDFs should show in the **Library** tab (📄 icon)

### If they're in `library_books`:
Your PDFs should show in the **Books** tab (📚 icon)

### If NEITHER has 63 PDFs:
Your PDFs might be:
- ❌ Not uploaded yet
- ❌ In Supabase Storage (not database)
- ❌ In a different project

---

## Common Issues & Fixes

### Issue 1: PDFs in Storage, Not in Database ⚠️

**Check**:
1. Go to **Storage** (left sidebar)
2. Look for buckets like:
   - `exam-papers`
   - `library-books`
   - `pdfs`
3. Count files in bucket

**Problem**: Files in storage but not in database = App won't see them!

**Fix**: Need to add database records pointing to storage files

---

### Issue 2: Wrong System Filter 🎯

**Check your grading system**:
- Open app → Profile → Check: APC / French / Nigerian?

**The Problem**:
```typescript
// Library filters by your system!
if (gradingSystem === 'apc') {
  // Only shows papers with system: 'apc'
}
```

**Fix**: Papers must have correct `system` field:
- `"apc"` - for Togolese/West African
- `"french"` - for French system
- `"nigerian_university"` - for Nigerian

---

### Issue 3: Class Level Filter 📚

**Check your class level**:
- Open app → Profile → Check: 3ème? Terminale? 100 Level?

**The Problem**:
```typescript
// Library filters by your class!
result = result.filter(p => p.classLevel === userClassLevel);
```

**Fix**: 
- Papers must have matching `class_level` field
- OR app needs to show ALL levels (remove filter)

---

## Quick SQL Queries to Run in Supabase

### Count Papers by System:
```sql
SELECT system, COUNT(*) as count
FROM exam_papers
GROUP BY system;
```

### Count Papers by Class Level:
```sql
SELECT class_level, COUNT(*) as count
FROM exam_papers
GROUP BY class_level;
```

### Count Books by Category:
```sql
SELECT category, COUNT(*) as count
FROM library_books
GROUP BY category;
```

### See ALL Papers (no filter):
```sql
SELECT id, title, subject, class_level, system, year
FROM exam_papers
ORDER BY created_at DESC
LIMIT 20;
```

---

## Tell Me What You Find:

1. **How many rows in `exam_papers`?** _____
2. **How many rows in `library_books`?** _____
3. **Which system are your PDFs tagged with?** (apc / french / nigerian)
4. **Which class levels do you see?** (3ème, Terminale, 100, etc.)
5. **What's YOUR current class level in the app?** _____
6. **What's YOUR current grading system in the app?** _____

---

## Based on Your Answers, I'll Fix:

### If filters are too strict:
✅ Update app to show ALL papers regardless of class/system

### If papers missing system tag:
✅ Update database to add correct system tags

### If papers in wrong table:
✅ Move them to correct table

### If PDFs only in storage:
✅ Create database records for them

---

**Fill in the blanks above and share, then I'll know exactly how to fix it!** 🚀
