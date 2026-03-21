# 🚀 Quick Start - Admin Panel

## Start Admin Panel
```bash
cd exam-library-admin
npm run dev
```
Opens at: http://localhost:3001

## Upload a Paper (Step-by-Step)

### 1. Click "Upload" Tab
The form has these fields:

### 2. Select PDF File
- Click "Choose File"
- Select a PDF (max 50MB)
- File name appears when selected

### 3. Fill Form Fields

#### Title (Required)
Example: "Épreuve de Mathématiques - Bac 2024"

#### Subject (Required - Dropdown)
Options:
- Mathématiques
- Physique
- Chimie
- SVT
- Français
- Anglais
- Histoire
- Géographie
- Philosophie
- Informatique

#### Class Level (Required - Dropdown)
Options:
- Sixième (Collège - equivalent to 6ème)
- Cinquième (Collège - equivalent to 5ème)
- Quatrième (Collège - equivalent to 4ème)
- Troisième (Collège - equivalent to 3ème)
- Seconde (Lycée - equivalent to 2nde)
- Première (Lycée - shows Series dropdown)
- Terminale (Lycée - shows Series dropdown)

#### Series (Required for Première and Terminale only)
Only appears when Première or Terminale selected
Options:
- A
- C
- D
- E

Result: Combines to "Première C" or "Terminale D"

#### Year (Required)
Default: Current year
Range: 2000-2027

#### Exam Type (Required - Dropdown)
Options:
- Baccalauréat
- Composition
- Devoir
- Interro

#### Session (Required - Dropdown)
Options:
- 1st Semester
- 2nd Semester
- Annual

#### Tags (Optional)
Comma-separated
Example: "algebra, equations, functions"

#### Description (Optional)
Free text description

### 4. Click "Upload Exam Paper"

### 5. Watch Progress
```
[████████░░░░░░░░░░░░] 30% - Uploading PDF...
[████████████░░░░░░░░] 60% - Generating preview...
[████████████████░░░░] 80% - Saving to database...
[████████████████████] 100% - Upload complete!
```

### 6. Verify Success
- Form resets automatically
- Click "Library" tab to see uploaded paper
- Check browser console for logs

## Example Uploads

### Example 1: Collège (No Series)
```
Title: Composition de Mathématiques
Subject: Mathématiques
Class Level: Sixième
Year: 2024
Exam Type: Composition
Session: 1st Semester
```
Result: class_level = "Sixième"

### Example 2: Lycée with Series
```
Title: Épreuve de Physique
Subject: Physique
Class Level: Première
Series: C
Year: 2024
Exam Type: Composition
Session: Annual
```
Result: class_level = "Première C"

### Example 3: Baccalauréat
```
Title: Baccalauréat Mathématiques Série D
Subject: Mathématiques
Class Level: Terminale
Series: D
Year: 2024
Exam Type: Baccalauréat
Session: Annual
```
Result: class_level = "Terminale D"

## Console Logs (Success)
```
📤 Uploading PDF to Supabase Storage: ...
✅ PDF uploaded successfully: https://aaayzhvqgqptgqaxxbdh.supabase.co/...
📝 Inserting into database: {
  title: "...",
  subject: "Mathématiques",
  class_level: "1ère C",
  ...
}
✅ Database insert successful: [{
  id: "abc123...",
  ...
}]
```

## View Uploaded Papers

### In Admin Panel
1. Click "Library" tab
2. See all uploaded papers with previews
3. Search by title, subject, or class
4. Click "View" to open PDF
5. Click "Download" to save PDF
6. Click "Delete" to remove paper

### In Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select project: aaayzhvqgqptgqaxxbdh
3. Table Editor → exam_papers
4. See all rows with data
5. Storage → exam-papers bucket
6. See all uploaded files

### In Phone App
1. Open app
2. Go to Library section
3. Papers should appear
4. Filter by class level
5. Download and view offline

## Common Issues

### ❌ "Failed to upload"
- Check internet connection
- Verify .env file has correct credentials
- Check file is PDF and under 50MB

### ❌ Series dropdown doesn't appear
- Make sure you selected "Première" or "Terminale"
- Refresh page if needed

### ❌ Papers don't appear in phone app
- Pull to refresh in app
- Check phone app .env matches admin .env
- Verify internet connection on phone
- Check Supabase project ID is same

### ❌ Preview generation fails
- Non-critical - upload still succeeds
- Check pdf.worker.min.mjs exists in public/
- Check browser console for error

## Tips

✓ Use descriptive titles
✓ Always select correct class level (Sixième, Première, etc.)
✓ For Première and Terminale, always select series
✓ Use consistent subject names
✓ Add relevant tags for better search
✓ Check console logs after each upload
✓ Verify in Library tab before closing

## Support

If issues persist:
1. Check all console logs
2. Verify Supabase credentials
3. Test with small PDF first
4. Check Supabase dashboard
5. Restart admin panel
