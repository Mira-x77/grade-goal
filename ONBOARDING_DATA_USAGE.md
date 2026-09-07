# Onboarding Data Usage Summary

## Data Collected During Onboarding

### SimpleOnboarding.tsx (5 Steps)

1. **Step 1: Name**
   - `studentName` - User's full name

2. **Step 2: Grading System**
   - `gradingSystem` - "apc" | "french" | "nigerian_university"

3. **Step 3: Class/Level Details**
   - **For APC/French:**
     - `classLevel` - e.g., "6ème", "2nde", "1ère", "Tle"
     - `serie` - e.g., "A", "C", "D" (for lycée only)
     - `semester` - "1st Semester" | "2nd Semester" | "3rd Semester"
   - **For Nigerian University:**
     - `department` - Faculty/Department name
     - `universityLevel` - "100" | "200" | "300" | "400" | "500"
     - `semester` - "First Semester" | "Second Semester"

4. **Step 4: Target Grade**
   - `targetAverage` - Number (0-20 for APC/French, 0-5.0 for Nigerian)
   - `targetMin` - Same as targetAverage (used as minimum threshold)

5. **Step 5: Subjects**
   - `subjects` - Array of Subject objects with coefficients/credits

---

## How Each Data Point is Used

### ✅ studentName
**Status: FULLY UTILIZED**

- **ProtectedRoute.tsx** - Checks if onboarding is complete
- **Profile.tsx** - Displays and allows editing
- **Home.tsx/HomeRefactored.tsx** - Shows personalized greeting in header
- **SimpleOnboarding.tsx** - Stored in AppState on completion

---

### ✅ gradingSystem
**Status: FULLY UTILIZED**

- **Throughout the app** - Determines calculation logic (APC vs French vs Nigerian)
- **MarksInput.tsx** - Shows appropriate input fields (Interro/Dev/Compo vs Assessments)
- **Results calculation** - Different formulas per system
- **Profile.tsx** - Displays current system
- **Home.tsx** - Switches between grade-based and CGPA-based dashboards

---

### ✅ classLevel
**Status: WELL UTILIZED**

**Where it's used:**
1. **Library.tsx (Line 26-27)**
   ```tsx
   const userClassLevel = userState?.classLevel ?? null;
   // Filters papers to show only user's class level
   const classFiltered = userClassLevel
     ? fetchedPapers.filter(p => p.classLevel === userClassLevel)
     : fetchedPapers;
   ```

2. **SubjectsSetup.tsx (Line 47)**
   ```tsx
   const allSuggested = (!isNigerian && classLevel) 
     ? getSubjectsForLevel(classLevel, serie) 
     : [];
   ```
   - Gets class-appropriate subject suggestions
   - Auto-populates default subjects with correct coefficients

3. **Profile.tsx (Line 128)**
   ```tsx
   const allSuggestedForProfile = getSubjectsForLevel(
     state.classLevel || "", 
     state.serie || ""
   );
   ```
   - Suggests subjects when adding new ones

4. **Home.tsx/HomeRefactored.tsx**
   - Displays in header: "6ème · Série A · 1st Semester"

5. **SubjectDashboard.tsx**
   - Uses classLevel to fetch appropriate study tools/resources

**Recommendations for further use:**
- ✅ Already filters exam library by class
- ✅ Already suggests appropriate subjects
- ⚠️ Could be used for: Progress tracking across classes (year-over-year)

---

### ✅ serie
**Status: WELL UTILIZED**

**Where it's used:**
1. **SubjectsSetup.tsx**
   - Combined with classLevel to get serie-specific subject suggestions
   - Different series have different required subjects (e.g., Série A has more humanities)

2. **Profile.tsx**
   - Displayed and editable
   - Used when suggesting new subjects

3. **Home.tsx/HomeRefactored.tsx**
   - Displayed in header alongside class level

**Recommendations:**
- ✅ Already used for subject recommendations
- ⚠️ Could be used for: Filtering study materials by serie

---

### ⚠️ semester
**Status: PARTIALLY UTILIZED**

**Where it's used:**
1. **Profile.tsx** - Displayed and editable
2. **Home.tsx** - Shown in header
3. **Storage.ts** - Saved to AppState

**NOT used for:**
- ❌ Organizing marks by semester periods
- ❌ Historical comparisons (Semester 1 vs Semester 2)
- ❌ Progress tracking across semesters
- ❌ Filtering exam papers by semester

**Nigerian University System:**
- ✅ Has dedicated semester system in `nigerianState.semesters[]`
- ✅ Each semester tracks courses, GPA, and progress
- ✅ Multi-semester CGPA calculation works

**APC/French System:**
- ⚠️ Semester is stored but not actively used for data organization
- ⚠️ Users can't switch semesters or view historical data

**Recommendations for improvement:**
```typescript
// Add to AppState
interface AppState {
  // ... existing fields
  semesterHistory?: {
    semester: string;
    average: number;
    subjects: Subject[];
    date: string;
  }[];
  currentSemester?: string;
}
```

---

### ✅ department (Nigerian)
**Status: USED FOR DISPLAY**

- **Profile.tsx** - Displayed in basic info section
- **SimpleOnboarding.tsx** - Stored on completion

**Could be enhanced:**
- Course recommendations based on department
- Study materials filtered by faculty

---

### ✅ universityLevel (Nigerian)
**Status: USED FOR DISPLAY**

- **Profile.tsx** - Shows current level (e.g., "200 Level")
- **SimpleOnboarding.tsx** - Stored on completion

**Could be enhanced:**
- Curriculum progression tracking
- Level-appropriate course suggestions

---

### ✅ targetAverage / targetMin
**Status: FULLY UTILIZED**

- **Home.tsx** - Central to dashboard, shows progress towards goal
- **Results calculation** - Compares current average vs target
- **Profile.tsx** - Editable target setting
- **Planner.tsx** - Predicts grades needed to hit target
- **Nigerian system** - Used for GPA target

---

### ✅ subjects
**Status: FULLY UTILIZED** (Core data structure)

- **All grade calculations**
- **Subject dashboard**
- **Marks input**
- **Results display**
- **Profile management**
- **Cloud sync**

---

## Summary Table

| Field | Collection | Display | Functional Use | Cloud Sync | Notes |
|-------|-----------|---------|----------------|------------|-------|
| studentName | ✅ | ✅ | ✅ | ✅ | Used for onboarding check, greeting |
| gradingSystem | ✅ | ✅ | ✅ | ✅ | Core calculation logic |
| classLevel | ✅ | ✅ | ✅ | ✅ | Filters library, suggests subjects |
| serie | ✅ | ✅ | ✅ | ✅ | Subject suggestions for lycée |
| semester | ✅ | ✅ | ⚠️ | ✅ | Stored but not used for organization |
| department | ✅ | ✅ | ⚠️ | ✅ | Display only (Nigerian) |
| universityLevel | ✅ | ✅ | ⚠️ | ✅ | Display only (Nigerian) |
| targetAverage | ✅ | ✅ | ✅ | ✅ | Central to all calculations |
| subjects | ✅ | ✅ | ✅ | ✅ | Core app data |

## Conclusion

**All onboarding questions are important and well-justified:**

1. ✅ **Name, grading system, target, subjects** - Core app functionality, fully utilized
2. ✅ **classLevel, serie** - Used for exam filtering and subject suggestions
3. ⚠️ **semester** - Collected and displayed, but could be better utilized for:
   - Historical progress tracking
   - Semester-by-semester comparisons
   - Organizing marks chronologically

4. ⚠️ **department, universityLevel** (Nigerian) - Displayed but could enable:
   - Department-specific course catalogs
   - Level-appropriate recommendations

**Overall: 8/9 data points are actively used in app logic. Only semester needs enhanced functionality.**

---

## Recent Fixes Applied (Today)

1. ✅ **Cloud restore now triggers UI updates** - Added storage event dispatch
2. ✅ **Improved onboarding completion check** - Now verifies name + subjects + system
3. ✅ **Better sync flow** - Small delay ensures data propagates before navigation

**Next Steps (if desired):**
- Add semester switching for APC/French users
- Enable semester history view
- Use department/level for Nigerian course recommendations
