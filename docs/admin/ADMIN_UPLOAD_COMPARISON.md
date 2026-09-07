# Admin Upload Form - Before vs After

## BEFORE (Text Inputs)
```
┌─────────────────────────────────────┐
│ Title: [________________]           │
│ Subject: [________________]         │  ❌ Free text - inconsistent data
│ Class Level: [________________]     │  ❌ Could type "1ere C" or "1ère C" or "1C"
│ Year: [2024]                        │  ✓ OK
│ Exam Type: [________________]       │  ❌ Could type "Bac" or "Baccalauréat"
│ Session: [________________]         │  ❌ Could type "Trimestre 1" or "1er Trimestre"
└─────────────────────────────────────┘
```

**Problems:**
- Inconsistent data entry
- Typos and variations
- Hard to filter in app
- No validation

## AFTER (Dropdowns)
```
┌─────────────────────────────────────┐
│ Title: [________________]           │
│                                     │
│ Subject: [▼ Mathématiques      ]    │  ✓ Consistent values
│   Options: Mathématiques, Physique, │
│   Chimie, SVT, Français, Anglais,   │
│   Histoire, Géographie, etc.        │
│                                     │
│ Class Level: [▼ 1ère           ]    │  ✓ Standard class names
│   Options: 6ème, 5ème, 4ème, 3ème,  │
│   2nde, 1ère, Tle                   │
│                                     │
│ Series: [▼ C                   ]    │  ✓ Only shows for 1ère/Tle
│   Options: A, C, D, E               │  ✓ Auto-combines to "1ère C"
│   (Only visible for 1ère and Tle)   │
│                                     │
│ Year: [2024]                        │  ✓ OK
│                                     │
│ Exam Type: [▼ Baccalauréat     ]    │  ✓ Standard exam types
│   Options: Baccalauréat, Probatoire,│
│   BEPC, Composition, Devoir, Interro│
│                                     │
│ Session: [▼ Annuel             ]    │  ✓ Standard sessions
│   Options: 1er Trimestre,           │
│   2ème Trimestre, 3ème Trimestre,   │
│   Annuel                            │
└─────────────────────────────────────┘
```

**Benefits:**
- ✓ Consistent data format
- ✓ No typos possible
- ✓ Easy filtering in app
- ✓ Matches Cameroon education system
- ✓ Auto-combines class + series

## Data Flow Example

### Upload: 1ère C Mathématiques
```
User Input:
├─ Class Level: "1ère"
├─ Series: "C"
└─ Subject: "Mathématiques"

↓ Form Processing

Combined:
└─ class_level: "1ère C"

↓ Database Insert

Supabase exam_papers table:
{
  "id": "abc123",
  "title": "Épreuve de Mathématiques",
  "subject": "Mathématiques",
  "class_level": "1ère C",  ← Combined value
  "exam_type": "Probatoire",
  "session": "Annuel",
  "year": 2024,
  ...
}

↓ Phone App Reads

Library Display:
┌──────────────────────┐
│ 📄 Mathématiques     │
│ 1ère C • 2024        │  ← Shows combined class level
│ Probatoire • Annuel  │
└──────────────────────┘
```

## Series Logic

### When Series Dropdown Appears
```javascript
const showSeriesSelect = 
  formData.class_level === '1ère' || 
  formData.class_level === 'Tle';
```

### Class Levels WITHOUT Series
- 6ème → Stored as "6ème"
- 5ème → Stored as "5ème"
- 4ème → Stored as "4ème"
- 3ème → Stored as "3ème"
- 2nde → Stored as "2nde"

### Class Levels WITH Series
- 1ère + A → Stored as "1ère A"
- 1ère + C → Stored as "1ère C"
- 1ère + D → Stored as "1ère D"
- 1ère + E → Stored as "1ère E"
- Tle + A → Stored as "Tle A"
- Tle + C → Stored as "Tle C"
- Tle + D → Stored as "Tle D"
- Tle + E → Stored as "Tle E"

## Database Schema Match

### Admin Form → Database
```
Form Field          Database Column      Type
─────────────────────────────────────────────────
title            →  title               text
subject          →  subject             text
class_level      →  class_level         text
series           →  (combined above)    -
year             →  year                integer
exam_type        →  exam_type           text
session          →  session             text
tags             →  tags                text[]
description      →  description         text
file             →  file_url            text
                 →  file_name           text
                 →  file_size           integer
                 →  preview_url         text
                 →  downloads           integer (0)
```

## Validation Rules

### Required Fields
- ✓ PDF file
- ✓ Title
- ✓ Subject (from dropdown)
- ✓ Class Level (from dropdown)
- ✓ Series (if 1ère or Tle selected)
- ✓ Year (2000-2027)
- ✓ Exam Type (from dropdown)
- ✓ Session (from dropdown)

### Optional Fields
- Tags (comma-separated)
- Description

### File Validation
- Must be PDF format
- Max size: 50MB
- Generates preview automatically

## Success Indicators

### Browser Console
```
✅ Successful Upload Sequence:
1. 📤 Uploading PDF to Supabase Storage: ...
2. ✅ PDF uploaded successfully: https://...
3. 📝 Inserting into database: { ... }
4. ✅ Database insert successful: [{ id: ... }]
5. Upload complete!
```

### Admin Panel UI
```
Progress Bar:
[████████████████████] 100%
✓ Upload complete!

Library Tab:
Shows newly uploaded paper with preview
```

### Phone App
```
Library Section:
New paper appears in list
Correct class level displayed
Filtering works correctly
```
