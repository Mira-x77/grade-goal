# 📊 Grading Systems Comparison

## Summary

The app supports 3 grading systems:
1. **APC (Togolese)** - `gradingSystem: "apc"`
2. **French (AEFE)** - `gradingSystem: "french"`
3. **Nigerian University** - `gradingSystem: "nigerian_university"`

---

## Features Comparison

| Feature | APC | French | Nigerian |
|---------|-----|--------|----------|
| **Scale** | 0-20 | 0-20 | 0-5 GPA |
| **Assessments** | 3 fixed | 3 fixed | Custom unlimited |
| **Assessment Names** | Interro, Devoir, Compo | Interrogation/TP, DS, Épreuve/Compo | User-defined |
| **Weighted Split** | ✅ YES (40/60) | ❌ NO | ❌ NO |
| **Class Data** | ❌ NO | ✅ YES | ❌ NO |
| **Mentions/Classification** | ❌ NO | ✅ YES | ✅ YES |
| **Semesters** | ❌ NO | ❌ NO | ✅ YES |
| **Credit Units** | ❌ NO | ❌ NO | ✅ YES |
| **CGPA Calculation** | ❌ NO | ❌ NO | ✅ YES |
| **Degree Classification** | ❌ NO | ❌ NO | ✅ YES |

---

## 1. APC (Togolese) System

### Unique Features

#### ✅ Weighted Split (40/60)
**What:** Toggle between two calculation modes
- **Standard:** Average of all marks equally
- **Weighted:** 40% classwork (interro+devoir), 60% exam (compo)

**Code:**
```typescript
settings: {
  gradingSystem: "apc",
  apcWeightedSplit: true  // ← UNIQUE TO APC
}
```

**Calculation:**
```typescript
// Standard mode
average = (interro + devoir + compo) / 3

// Weighted split mode (40/60)
classwork = (interro + devoir) / 2
average = (classwork * 0.4) + (compo * 0.6)
```

**Why unique:** Matches Togolese educational policy where exams (compo) carry more weight

**UI Location:**
- Settings → Grading System → "40/60 Classwork/Exam Split" toggle

---

## 2. French (AEFE) System

### Unique Features

#### ✅ Mentions (Academic Honors)
**What:** Official recognition levels based on average

| Average | Mention | Translation |
|---------|---------|-------------|
| 16-20 | Très Bien | Excellent |
| 14-16 | Bien | Good |
| 12-14 | Assez Bien | Fairly Good |
| 10-12 | Passable | Pass |
| 8-10 | Rattrapage | Resit/Makeup |
| 0-8 | Échec | Fail |

**Code:**
```typescript
export function getFrenchMention(avg: number): { 
  code: string; 
  label: string; 
  color: string 
} {
  if (avg >= 16) return { code: "TB", label: "Très Bien", color: "primary" };
  if (avg >= 14) return { code: "B", label: "Bien", color: "secondary" };
  if (avg >= 12) return { code: "AB", label: "Assez Bien", color: "accent" };
  if (avg >= 10) return { code: "P", label: "Passable", color: "warning" };
  if (avg >= 8) return { code: "R", label: "Rattrapage", color: "danger" };
  return { code: "E", label: "Échec", color: "muted" };
}
```

**UI Display:**
- Shows on Home dashboard: "16.5/20 (TB)"
- Shows per subject: "Math: 17.2/20 (TB)"

#### ✅ Class Data (Ranking)
**What:** Compare student performance to class average

**Data stored:**
```typescript
subject: {
  classData: {
    classAvg: 12.5,      // Class average
    classMax: 18.0,      // Highest in class
    classMin: 6.0,       // Lowest in class
    percentile: 85,      // Student's percentile rank
  }
}
```

**UI:**
- Settings → Class Data section
- Shows delta: "+2.5 above class avg"
- Shows ranking: "85th percentile"

**Why unique:** French education emphasizes comparative performance and class standing

---

## 3. Nigerian University System

### Unique Features

#### ✅ Custom Assessments
**What:** Unlimited, user-defined assessment types

**vs APC/French (fixed 3):**
```typescript
// APC/French: Fixed 3 assessments
marks: {
  interro: 15,
  dev: 12,
  compo: 14
}

// Nigerian: Custom unlimited
customAssessments: [
  { id: "1", label: "Test 1", value: 75, weight: 15 },
  { id: "2", label: "Test 2", value: 80, weight: 15 },
  { id: "3", label: "Assignment", value: 85, weight: 10 },
  { id: "4", label: "Midterm", value: 70, weight: 20 },
  { id: "5", label: "Final Exam", value: 88, weight: 40 },
]
```

**Why unique:** Nigerian universities have varied assessment structures per course

#### ✅ Credit Units
**What:** Courses weighted by credit hours (not coefficient)

```typescript
subject: {
  creditUnits: 3,  // ← Nigerian
  coefficient: 3,  // ← APC/French
}
```

**Calculation:**
```typescript
// GPA = Σ(Grade Points × Credit Units) / Σ(Credit Units)
GPA = (4.0 * 3 + 3.5 * 2 + 5.0 * 4) / (3 + 2 + 4) = 4.22
```

#### ✅ Letter Grades
**What:** Scores convert to letter grades with grade points

| Score | Grade | Points |
|-------|-------|--------|
| 70-100 | A | 5.0 |
| 60-69 | B | 4.0 |
| 50-59 | C | 3.0 |
| 45-49 | D | 2.0 |
| 40-44 | E | 1.0 |
| 0-39 | F | 0.0 |

#### ✅ Semesters & CGPA
**What:** Multiple semesters with cumulative GPA

```typescript
nigerianState: {
  semesters: [
    {
      id: "sem1",
      name: "First Semester 2023/2024",
      gpa: 4.2,
      archived: true,
      courses: [...]
    },
    {
      id: "sem2",
      name: "Second Semester 2023/2024",
      gpa: 4.5,
      archived: true,
      courses: [...]
    }
  ],
  cgpa: 4.35,  // Cumulative across all semesters
}
```

**Calculation:**
```typescript
// CGPA = weighted average of all semester GPAs
CGPA = Σ(Semester GPA × Semester Credit Units) / Σ(Credit Units)
```

#### ✅ Degree Classification
**What:** Final honors based on CGPA

| CGPA | Classification |
|------|----------------|
| 4.50-5.00 | First Class |
| 3.50-4.49 | Second Class Upper |
| 2.40-3.49 | Second Class Lower |
| 1.50-2.39 | Third Class |
| 1.00-1.49 | Pass |
| 0.00-0.99 | Fail |

**Why unique:** Nigerian universities award degree classifications for graduation honors

---

## What APC Has That Others Don't

### 1. ✅ Weighted Split (40/60)
- **Feature:** Toggle between equal weighting and 40/60 classwork/exam split
- **Used by:** Only APC system
- **Why:** Matches Togolese education policy
- **Code:** `settings.apcWeightedSplit: boolean`

### 2. ✅ Simple 3-Assessment Model
- **Feature:** Fixed 3 assessments (interro, devoir, compo)
- **Used by:** APC and French
- **Nigerian uses:** Custom unlimited assessments
- **Why:** Standardized across Togolese schools

### 3. ✅ Performance Alerts
- **Feature:** Warnings when coefficient ≥3 subjects fall below 7/20
- **Used by:** APC (enabled by default)
- **Code:** `getPerformanceAlerts(subjects, weightedSplit)`
- **Why:** Early intervention for critical subjects

---

## What French Has That APC Doesn't

### 1. ❌ Mentions (Academic Honors)
APC shows raw score (16.5/20)
French shows mention (16.5/20 TB - Très Bien)

### 2. ❌ Class Data & Ranking
APC has no class comparison
French tracks: class avg, percentile, delta from class

### 3. ❌ AEFE International Standards
French follows international French education standards
APC follows Togolese national standards

---

## What Nigerian Has That APC Doesn't

### 1. ❌ Custom Assessments
APC has fixed 3 assessments
Nigerian has unlimited custom assessments

### 2. ❌ Credit Units
APC uses coefficient (1-10)
Nigerian uses credit units (1-6 typically)

### 3. ❌ Letter Grades
APC shows numeric scores only
Nigerian shows: 75/100 (B - 4.0 GP)

### 4. ❌ Semester System
APC has single-year view
Nigerian tracks multiple semesters with CGPA

### 5. ❌ Degree Classification
APC has no classification
Nigerian shows: "First Class" / "Second Class Upper" etc.

### 6. ❌ GPA Scale
APC uses 0-20 scale
Nigerian uses 0-5.0 GPA scale

---

## Should We Add Missing Features to APC?

### Consider Adding:

#### 1. ✅ Mentions/Classifications (Like French)
**Benefit:** Recognize achievement levels
**Implementation:** Add APC-specific mentions:
- 18-20: Très Bien
- 16-18: Bien
- 14-16: Assez Bien
- 12-14: Passable
- 10-12: Rattrapage
- 0-10: Insuffisant

**Code:**
```typescript
export function getAPCMention(avg: number) {
  if (avg >= 18) return { code: "TB", label: "Très Bien" };
  if (avg >= 16) return { code: "B", label: "Bien" };
  if (avg >= 14) return { code: "AB", label: "Assez Bien" };
  if (avg >= 12) return { code: "P", label: "Passable" };
  if (avg >= 10) return { code: "R", label: "Rattrapage" };
  return { code: "I", label: "Insuffisant" };
}
```

#### 2. ❓ Class Data (Like French)
**Benefit:** Compare performance to peers
**Downside:** Requires additional data entry
**Decision:** Optional feature - ask user if they want to track class data

#### 3. ❌ Custom Assessments (Like Nigerian)
**Not needed:** APC uses standardized 3-assessment model
**Why not:** Would complicate the simple APC interface

#### 4. ❌ Semesters (Like Nigerian)
**Not needed:** APC typically uses yearly system
**Why not:** Would require major restructuring

---

## Current Feature Matrix

| Feature | APC | French | Nigerian |
|---------|-----|--------|----------|
| **Weighted Split** | ✅ Unique | ❌ | ❌ |
| **Mentions/Classification** | ❌ | ✅ Unique | ✅ Unique |
| **Class Data** | ❌ | ✅ Unique | ❌ |
| **Custom Assessments** | ❌ | ❌ | ✅ Unique |
| **Credit Units** | ❌ | ❌ | ✅ Unique |
| **Semesters** | ❌ | ❌ | ✅ Unique |
| **Performance Alerts** | ✅ | ✅ | ❌ |

---

## Recommendations

### High Priority (Add to APC):
1. ✅ **Mentions/Classifications** - Low effort, high value
2. ✅ **Better visualizations** - Match French/Nigerian polish

### Medium Priority (Consider):
3. ❓ **Class Data (Optional)** - Let users opt-in
4. ❓ **Multi-year history** - Archive old years

### Low Priority (Not needed):
5. ❌ **Custom Assessments** - APC model is standardized
6. ❌ **Semester System** - APC uses yearly system

---

## Files to Check

### APC-specific:
- `src/adapters/APCAdapter.ts` - APC adapter
- `src/lib/grading-apc.ts` - APC calculations
- `src/pages/Settings.tsx` - Weighted split toggle

### French-specific:
- `src/adapters/FrenchAdapter.ts` - French adapter
- `src/lib/grading-french.ts` - French calculations, mentions
- `src/components/FrenchClassView.tsx` - Class data UI

### Nigerian-specific:
- `src/adapters/NigerianAdapter.ts` - Nigerian adapter
- `src/lib/grading-nigerian.ts` - Nigerian calculations
- `src/types/nigerian.ts` - Nigerian types

---

## Summary

**APC's Unique Feature:** ✅ Weighted Split (40/60)
- Only APC has this
- Toggles between equal weighting and exam-focused weighting
- Matches Togolese education policy

**What APC is Missing:**
- Mentions/Classifications (French has)
- Class Data/Ranking (French has)
- Custom Assessments (Nigerian has)
- Semester System (Nigerian has)

**Should add to APC:**
- ✅ Mentions/Classifications (easy win)
- ❓ Class Data (optional)
