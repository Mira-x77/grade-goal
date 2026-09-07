# Admin Upload Form - Cameroon Education System Integration

## Problem Identified
The admin panel's upload form (Test.tsx) was using text inputs instead of dropdowns, making it difficult to ensure consistent data entry matching the Cameroon education system.

## Changes Made

### 1. Updated Test.tsx Form Structure
**File**: `exam-library-admin/src/Test.tsx`

#### Added Dropdown Options
- **Class Levels**: 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Tle
- **Series**: A, C, D, E (only shown for 1ère and Tle)
- **Subjects**: Mathématiques, Physique, Chimie, SVT, Français, Anglais, Histoire, Géographie, Philosophie, Informatique
- **Exam Types**: Baccalauréat, Probatoire, BEPC, Composition, Devoir, Interro
- **Sessions**: 1er Trimestre, 2ème Trimestre, 3ème Trimestre, Annuel

#### Key Features
1. **Dynamic Series Selection**: Series dropdown only appears when 1ère or Tle is selected
2. **Combined Class Level**: When series is selected, it combines with class level (e.g., "1ère C", "Tle D")
3. **Enhanced Logging**: Added console logs to track database insertion
4. **Better Validation**: Dropdowns ensure only valid values are submitted

### 2. Form Data Structure
```typescript
const [formData, setFormData] = useState({
  title: '',
  subject: '',
  class_level: '',
  series: '',  // NEW: For 1ère and Tle
  year: new Date().getFullYear(),
  exam_type: '',
  session: '',
  tags: '',
  description: ''
});
```

### 3. Database Insert Logic
The form now:
- Combines `class_level` and `series` when applicable (e.g., "1ère" + "C" = "1ère C")
- Logs all data being inserted for debugging
- Returns inserted data to verify success

## How to Use

### Starting the Admin Panel
```bash
cd exam-library-admin
npm run dev
```
The admin panel will run on http://localhost:3001

### Uploading a Paper
1. Click "Upload" tab
2. Select PDF file
3. Fill in the form:
   - **Title**: Full descriptive title (e.g., "Épreuve de Mathématiques - Bac 2024")
   - **Subject**: Select from dropdown
   - **Class Level**: Select from dropdown
   - **Series**: Only appears for 1ère and Tle - select A, C, D, or E
   - **Year**: Enter year (2000-2027)
   - **Exam Type**: Select from dropdown
   - **Session**: Select from dropdown
   - **Tags**: Optional comma-separated tags
   - **Description**: Optional description
4. Click "Upload Exam Paper"

### Verification
After upload:
1. Check browser console for logs:
   - "📤 Uploading PDF to Supabase Storage"
   - "✅ PDF uploaded successfully"
   - "📝 Inserting into database"
   - "✅ Database insert successful"
2. Switch to "Library" tab to see uploaded paper
3. Check phone app to verify paper appears

## Database Schema
Papers are stored in Supabase `exam_papers` table with:
- `class_level`: Combined value (e.g., "6ème", "1ère C", "Tle D")
- `subject`: Subject name
- `exam_type`: Exam type
- `session`: Session/trimester
- `year`: Year as integer
- `file_url`: Public URL to PDF
- `preview_url`: Public URL to preview image
- `file_size`: Size in bytes
- `downloads`: Download count (starts at 0)

## Troubleshooting

### Papers Not Appearing in Phone App
1. Check browser console for database insert errors
2. Verify Supabase credentials in `.env` file
3. Check that RLS is disabled in Supabase
4. Verify phone app is using same Supabase project

### Upload Fails
1. Check file is PDF format
2. Verify file size is under 50MB
3. Check Supabase storage bucket exists and is public
4. Verify internet connection

## Testing Instructions

### 1. Start the Admin Panel
```bash
cd exam-library-admin
npm run dev
```
Open http://localhost:3001 in your browser

### 2. Test Upload with Different Class Levels

#### Test Case 1: Collège (No Series)
- Class Level: 6ème
- Subject: Mathématiques
- Exam Type: Composition
- Session: 1er Trimestre
- Year: 2024
- Expected Result: `class_level` = "6ème"

#### Test Case 2: Lycée with Series (1ère)
- Class Level: 1ère
- Series: C (dropdown should appear)
- Subject: Physique
- Exam Type: Probatoire
- Session: Annuel
- Year: 2024
- Expected Result: `class_level` = "1ère C"

#### Test Case 3: Lycée with Series (Tle)
- Class Level: Tle
- Series: D (dropdown should appear)
- Subject: Mathématiques
- Exam Type: Baccalauréat
- Session: Annuel
- Year: 2024
- Expected Result: `class_level` = "Tle D"

### 3. Verify in Browser Console
After each upload, check console for:
```
📤 Uploading PDF to Supabase Storage: ...
✅ PDF uploaded successfully: https://...
📝 Inserting into database: { title: ..., class_level: ... }
✅ Database insert successful: [{ id: ..., ... }]
```

### 4. Verify in Phone App
1. Open the app on your phone
2. Go to Library section
3. Check that uploaded papers appear
4. Verify class level displays correctly (e.g., "1ère C", "Tle D")
5. Test filtering by class level

### 5. Verify in Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Table Editor → exam_papers
4. Verify new rows appear with correct data
5. Check Storage → exam-papers bucket for uploaded files

## Common Issues and Solutions

### Issue: Series dropdown doesn't appear
**Solution**: Make sure you selected "1ère" or "Tle" as class level

### Issue: Upload succeeds but paper doesn't appear in phone app
**Possible Causes**:
1. Phone app is using cached data - pull to refresh
2. Phone app .env has different Supabase credentials
3. Network issue on phone - check internet connection

**Debug Steps**:
1. Check browser console for "✅ Database insert successful"
2. Verify in Supabase dashboard that row was created
3. Check phone app console logs (if using dev build)
4. Verify phone app .env matches admin .env

### Issue: Preview generation fails
**Solution**: This is non-critical. Upload will still succeed, just without preview image. Check:
1. pdf.worker.min.mjs exists in exam-library-admin/public/
2. Browser console for specific error message

## Next Steps
1. Test uploading papers with different class levels ✓
2. Verify papers appear correctly in phone app
3. Test series selection for 1ère and Tle classes ✓
4. Confirm filtering works in phone app
5. Build and test Android APK with new uploads
