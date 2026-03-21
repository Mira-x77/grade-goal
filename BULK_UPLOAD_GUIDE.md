# Bulk Upload Guide for Exam Papers

This guide explains how to use the bulk upload script to automatically upload multiple PDF files to your exam library.

## Prerequisites

1. Node.js installed
2. PDF files ready to upload
3. Supabase credentials configured in `.env`

## Step 1: Prepare Your PDF Files

### Naming Convention

Name your PDF files following this pattern:
```
Subject_ClassLevel_Series_Year_ExamType_Session.pdf
```

### Examples:

**Without Series (Sixième to Seconde):**
```
Mathematiques_Sixieme_2023_Composition_1stSemester.pdf
Physique_Troisieme_2022_Devoir_2ndSemester.pdf
Francais_Seconde_2024_Interro_Annual.pdf
```

**With Series (Première and Terminale):**
```
Mathematiques_Terminale_A_2023_Baccalaureat_Annual.pdf
Physique_Premiere_C_2022_Composition_1stSemester.pdf
Philosophie_Terminale_D_2024_Devoir_2ndSemester.pdf
```

### Valid Values:

**Subjects:**
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

**Class Levels:**
- Sixième, Cinquième, Quatrième, Troisième (Collège)
- Seconde, Première, Terminale (Lycée)

**Series (only for Première and Terminale):**
- A, C, D, E

**Exam Types:**
- Baccalauréat
- Composition
- Devoir
- Interro

**Sessions:**
- 1stSemester
- 2ndSemester
- Annual

## Step 2: Organize Your Files

1. Create a folder called `exam-papers` in your project root:
```bash
mkdir exam-papers
```

2. Copy all your PDF files into this folder

3. Verify filenames follow the naming convention

## Step 3: Run the Upload Script

```bash
node bulk-upload-papers.js
```

## What the Script Does

1. ✅ Scans the `exam-papers` folder for PDF files
2. ✅ Parses each filename to extract metadata
3. ✅ Calculates content hash for integrity
4. ✅ Uploads PDF to Supabase Storage
5. ✅ Creates database record with metadata
6. ✅ Shows progress and summary

## Output Example

```
🚀 Bulk Upload Script for Exam Papers

📁 Scanning folder: ./exam-papers

Found 3 PDF file(s)

────────────────────────────────────────────────────────────

📄 Processing: Mathematiques_Terminale_A_2023_Baccalaureat_Annual.pdf
   Subject: Mathématiques
   Class: Terminale A
   Year: 2023
   Type: Baccalauréat
   Session: Annual
   ⬆️  Uploading to storage...
   ✅ Uploaded to storage
   💾 Creating database record...
   ✅ Database record created (ID: abc123)
   🎉 Successfully uploaded!

────────────────────────────────────────────────────────────

📊 Upload Summary:
   Total files: 3
   ✅ Successful: 3
   ❌ Failed: 0

✨ Done!
```

## Troubleshooting

### Error: "Invalid filename format"
- Check that your filename follows the exact pattern
- Use underscores (_) to separate parts
- Don't use spaces in filenames

### Error: "Upload failed"
- Check your Supabase credentials in `.env`
- Verify the `exam-papers` storage bucket exists
- Check file size (max 50MB per file)

### Error: "Database error"
- Verify your database schema matches the expected structure
- Check RLS policies allow inserts
- Ensure all required fields are provided

## Manual Upload Alternative

If you prefer to upload files manually, use the admin panel:

1. Start the admin panel:
```bash
cd exam-library-admin
npm run dev
```

2. Navigate to http://localhost:5173
3. Login with admin credentials
4. Go to "Upload" page
5. Fill in the form and upload each PDF

## Tips

- Start with a small batch (5-10 files) to test
- Keep a backup of your original PDFs
- Use consistent naming for easier management
- The script skips preview generation (can be added later via admin panel)
