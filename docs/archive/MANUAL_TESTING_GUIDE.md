# Manual Testing Guide: Verify All Systems Work

## Prerequisites

1. Make sure you have the latest code
2. Make sure the build passes: `npm run build`
3. Start the dev server: `npm run dev`

---

## Test 1: Nigerian University System ✅

### Step 1: Switch to Nigerian System

1. Open the app in your browser (usually http://localhost:5173)
2. If you have existing data, go to **Settings** (gear icon)
3. Find **"Academic System"** or **"Grading System"**
4. Select **"Nigerian University"**
5. You should see a confirmation or the UI should update

### Step 2: Clear Data (Fresh Start)

**Option A: Use Settings**
1. Go to **Settings**
2. Look for **"Clear All Data"** or **"Reset App"**
3. Confirm the action

**Option B: Use Browser DevTools**
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Local Storage** → Your domain
4. Delete the `scoreTargetState` key
5. Refresh the page

### Step 3: Complete Onboarding

1. You should see the onboarding screen
2. Enter your name (e.g., "Test User")
3. Select your level (e.g., "100 Level")
4. Set target GPA (e.g., "4.50")
5. Click **Continue** or **Next**

### Step 4: Add a Course

1. You should be on the **Planner** or **Subjects Setup** screen
2. Click **"Add Course"** or **"+"**
3. Enter course details:
   - Name: "Computer Science 101"
   - Credit Units: 3
4. Click **Save** or **Add**
5. The course should appear in your list

### Step 5: Go to Home Screen

1. Navigate to **Home** (house icon in bottom nav)
2. **✅ VERIFY:**
   - You see "Current GPA: 0.00 / 5.00"
   - You see your course listed under "Courses"
   - You see an onboarding checklist
   - No blank screen
   - No errors in console (F12 → Console tab)

### Step 6: Add Assessment Scores

1. Click the **"+"** button (floating action button)
2. Select **"Computer Science 101"**
3. You should see assessment entry screen
4. Enter scores:
   - CA (Continuous Assessment): 75/100
   - Exam: 80/100
5. Click **Save**

### Step 7: Verify GPA Calculation

1. Go back to **Home** screen
2. **✅ VERIFY:**
   - GPA is updated (should be around 4.00-5.00)
   - Course shows score (should show ~77.5 or weighted average)
   - Course shows grade letter (should show "A" or "B")
   - Progress bar is filled
   - Class of degree is shown (e.g., "First Class")

### Step 8: Check Results Screen

1. Click on the GPA card (the big card at top)
2. **✅ VERIFY:**
   - Results sheet opens from bottom
   - Shows "GPA Breakdown"
   - Shows CGPA (same as home)
   - Shows class of degree
   - Shows course with assessments
   - Shows CA and Exam scores
   - Can close the sheet

### Step 9: Add Another Course

1. Go to **Planner**
2. Add another course:
   - Name: "Mathematics 102"
   - Credit Units: 4
3. Go to **Home**
4. Add scores for this course:
   - CA: 60/100
   - Exam: 70/100
5. **✅ VERIFY:**
   - GPA recalculates (should be lower now)
   - Both courses show in list
   - Progress bar updates

---

## Test 2: APC System ✅

### Step 1: Switch to APC System

1. Go to **Settings**
2. Change **"Academic System"** to **"APC"**
3. **✅ VERIFY:**
   - UI updates
   - Nigerian data is hidden (system-specific)

### Step 2: Clear Data

1. Clear all data (same as Nigerian test)
2. Refresh the page

### Step 3: Complete Onboarding

1. Enter your name
2. Select your class (e.g., "Terminale")
3. Select your series (e.g., "C" or "D")
4. Set target average (e.g., "16/20")
5. Click **Continue**

### Step 4: Add Subjects

1. Go to **Planner**
2. Add a subject:
   - Name: "Mathematics"
   - Coefficient: 4
3. Add another subject:
   - Name: "Physics"
   - Coefficient: 3
4. Click **Save** or **Done**

### Step 5: Go to Home Screen

1. Navigate to **Home**
2. **✅ VERIFY:**
   - You see "Current Average: —/20" (no marks yet)
   - You see subjects listed
   - You see onboarding checklist
   - No blank screen
   - No errors in console

### Step 6: Add Marks

1. Click the **"+"** button
2. Select **"Mathematics"**
3. You should see mark type selector (Interro, Devoir, Compo)
4. Select **"Interro"**
5. Enter score: 15/20
6. Click **Save**
7. It should auto-advance to next mark type
8. Enter **Devoir**: 14/20
9. Enter **Compo**: 16/20

### Step 7: Verify Average Calculation

1. Go back to **Home**
2. **✅ VERIFY:**
   - Average is calculated (should be around 15/20)
   - Progress bar is filled
   - Subject shows marks (I: 15, D: 14, C: 16)
   - Target comparison shows (e.g., "Target: 16-20")

### Step 8: Add Marks for Second Subject

1. Click **"+"** again
2. Select **"Physics"**
3. Enter marks:
   - Interro: 12/20
   - Devoir: 13/20
   - Compo: 14/20
4. **✅ VERIFY:**
   - Average recalculates (weighted by coefficient)
   - Both subjects show in list
   - Progress bar updates

### Step 9: Check Performance Alerts

1. If your average is below target (e.g., 14.5 when target is 16):
2. **✅ VERIFY:**
   - You see a red/orange alert card
   - It shows which subjects are below threshold
   - Alert is dismissible

### Step 10: Check Results Screen

1. Click on the average card
2. **✅ VERIFY:**
   - Results sheet opens
   - Shows detailed breakdown
   - Shows all subjects with marks
   - Shows coefficients
   - Shows weighted average
   - Can edit marks

### Step 11: Test Strategy Simulator

1. Go to **Simulator** (chart icon or link)
2. Set target scores for upcoming marks
3. Save strategy
4. Go back to **Home**
5. **✅ VERIFY:**
   - Strategy card appears
   - Shows projected average
   - Can edit or delete strategy

---

## Test 3: French System ✅

### Step 1: Switch to French System

1. Go to **Settings**
2. Change **"Academic System"** to **"French"**
3. Clear data and refresh

### Step 2: Follow Same Flow as APC

1. Complete onboarding
2. Add subjects (same as APC)
3. Add marks (same as APC)
4. **✅ VERIFY:**
   - Everything works like APC
   - Class comparison card appears
   - Shows your rank vs class average

### Step 3: Check Class Comparison

1. On **Home** screen, scroll to subjects carousel
2. **✅ VERIFY:**
   - You see "Class Ranking" card
   - Shows your position
   - Shows class average
   - Can expand to see details

---

## Test 4: System Switching ✅

### Step 1: Create Data in Nigerian System

1. Switch to **Nigerian University**
2. Add 2 courses with scores
3. Note your GPA (e.g., 4.25)

### Step 2: Switch to APC System

1. Go to **Settings** → Change to **APC**
2. **✅ VERIFY:**
   - Home shows empty state (no subjects)
   - Nigerian data is NOT shown
   - No errors in console

### Step 3: Create Data in APC System

1. Add 2 subjects with marks
2. Note your average (e.g., 15.5/20)

### Step 4: Switch Back to Nigerian

1. Go to **Settings** → Change to **Nigerian University**
2. **✅ VERIFY:**
   - Your Nigerian courses are still there
   - GPA is still 4.25 (preserved)
   - APC data is NOT shown
   - No data loss

### Step 5: Switch Back to APC

1. Go to **Settings** → Change to **APC**
2. **✅ VERIFY:**
   - Your APC subjects are still there
   - Average is still 15.5/20 (preserved)
   - Nigerian data is NOT shown
   - No data loss

---

## Test 5: Edge Cases ✅

### Test 5.1: Empty State

1. Clear all data
2. Go to **Home**
3. **✅ VERIFY:**
   - Shows friendly empty state
   - Shows mascot or illustration
   - Shows "Get Started" CTA
   - No blank screen
   - No errors

### Test 5.2: Partial Data

1. Add subjects but NO marks
2. Go to **Home**
3. **✅ VERIFY:**
   - Shows "—/20" or "0.00/5.00"
   - Shows "No marks yet" message
   - Shows subjects in list
   - No errors

### Test 5.3: Single Subject

1. Add only 1 subject with marks
2. **✅ VERIFY:**
   - Average/GPA calculates correctly
   - No division by zero errors
   - UI renders properly

### Test 5.4: Many Subjects

1. Add 10+ subjects with marks
2. **✅ VERIFY:**
   - List scrolls properly
   - Performance is acceptable
   - Calculations are correct
   - No UI glitches

---

## Test 6: Premium Features ✅

### Test 6.1: Premium Nudges

1. Enter a low mark (e.g., 8/20 or 50/100)
2. **✅ VERIFY:**
   - Premium nudge appears after a delay
   - Shows contextual message
   - Can dismiss
   - Can open premium sheet

### Test 6.2: Premium Sheets

1. Click **Crown** icon (if visible)
2. **✅ VERIFY:**
   - Premium intro sheet opens
   - Can navigate through sheets
   - Can select plans
   - Can close without errors

---

## Test 7: Mark Entry Flow ✅

### Test 7.1: Nigerian Mark Entry

1. Click **"+"** button
2. Select a course
3. **✅ VERIFY:**
   - Shows assessment entry screen
   - Shows CA and Exam fields
   - Shows weight percentages
   - Can enter scores
   - Validates input (0-100)
   - Can save

### Test 7.2: APC Mark Entry

1. Click **"+"** button
2. Select a subject
3. **✅ VERIFY:**
   - Shows mark type selector (I/D/C)
   - Can switch between types
   - Shows existing marks
   - Validates input (0-20)
   - Auto-advances to next type
   - Can save

### Test 7.3: Edit Marks

1. On **Home**, click results card
2. Click **"Edit Marks"** button
3. **✅ VERIFY:**
   - Edit sheet opens
   - Shows all subjects/courses
   - Can modify marks
   - Can modify coefficients/credit units
   - Saves correctly
   - Recalculates average/GPA

---

## Test 8: Recent Activity ✅

1. Add several marks over time
2. Go to **Home**
3. **✅ VERIFY:**
   - Recent activity section appears
   - Shows last 5 entries
   - Shows subject name, mark type, value, date
   - Can expand to see all
   - Sorted by date (newest first)

---

## Test 9: Onboarding Checklist ✅

1. Fresh start (clear data)
2. Complete onboarding partially
3. Go to **Home**
4. **✅ VERIFY:**
   - Checklist appears
   - Shows progress (e.g., 2/5 complete)
   - Incomplete items are clickable
   - Completed items show checkmark
   - Updates as you complete tasks

---

## Test 10: Console Errors ✅

Throughout ALL tests above:

1. Keep browser DevTools open (F12)
2. Watch the **Console** tab
3. **✅ VERIFY:**
   - No red errors
   - No "undefined" errors
   - No "null" errors
   - No adapter errors
   - Only warnings are acceptable (e.g., browserslist)

---

## Test Results Template

Copy this to `TEST_RESULTS.md`:

```markdown
# Test Results - [Date]

## Nigerian System
- [ ] Fresh onboarding works
- [ ] Add course works
- [ ] Enter scores works
- [ ] GPA calculation correct
- [ ] Class of degree correct
- [ ] Results screen works
- [ ] No console errors

## APC System
- [ ] Fresh onboarding works
- [ ] Add subject works
- [ ] Enter marks works
- [ ] Average calculation correct
- [ ] Performance alerts work
- [ ] Strategy simulator works
- [ ] Results screen works
- [ ] No console errors

## French System
- [ ] Fresh onboarding works
- [ ] Class comparison works
- [ ] No console errors

## System Switching
- [ ] Data preserved per system
- [ ] No data leakage
- [ ] No console errors

## Edge Cases
- [ ] Empty state works
- [ ] Partial data works
- [ ] Single subject works
- [ ] Many subjects work

## Premium Features
- [ ] Nudges work
- [ ] Premium sheets work

## Mark Entry
- [ ] Nigerian entry works
- [ ] APC entry works
- [ ] Edit marks works

## Other Features
- [ ] Recent activity works
- [ ] Onboarding checklist works

## Overall
- [ ] No blank screens
- [ ] No crashes
- [ ] Performance acceptable
- [ ] UI renders correctly

## Issues Found
[List any issues here]

## Notes
[Any additional observations]
```

---

## What to Do If You Find Issues

### Issue: Blank Screen

1. Check browser console for errors
2. Check if `dashboard` is null
3. Check if adapter is throwing errors
4. Check `src/adapters/[System]Adapter.ts`

### Issue: Wrong Calculation

1. Check adapter's `toDashboardData()` method
2. Check if raw data is correct
3. Check if formula is correct
4. Compare with old calculation

### Issue: UI Not Updating

1. Check if state is updating
2. Check if `dashboard` is recalculating
3. Check if useEffect dependencies are correct
4. Check if component is re-rendering

### Issue: Console Errors

1. Read the error message carefully
2. Check the file and line number
3. Check if it's in adapter code
4. Check if it's in Home.tsx
5. Fix and test again

---

## Quick Test Script

If you want to test quickly, run this flow:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:5173

# 3. Quick Nigerian Test (2 minutes)
- Switch to Nigerian
- Clear data
- Add 1 course
- Add scores
- Check GPA shows

# 4. Quick APC Test (2 minutes)
- Switch to APC
- Clear data
- Add 1 subject
- Add marks
- Check average shows

# 5. Quick Switch Test (1 minute)
- Switch between systems
- Verify data preserved

# Total: 5 minutes for smoke test
```

---

## Success Criteria

All tests pass = ✅ Ready to move to Phase 2 (Component Refactoring)

Any test fails = ⚠️ Fix issues first, then retest

---

## Need Help?

If you get stuck:
1. Check console errors first
2. Check `src/adapters/` code
3. Check `src/pages/Home.tsx` around line 400-600
4. Check `SESSION_SUMMARY.md` for what changed
5. Ask for help with specific error message

---

## Time Estimate

- Full testing: 30-45 minutes
- Quick smoke test: 5 minutes
- Documenting results: 10 minutes
- Total: 45-60 minutes

**Start with the quick smoke test, then do full testing if that passes.**
