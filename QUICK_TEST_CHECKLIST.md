# Quick Test Checklist ⚡

## 5-Minute Smoke Test

### Setup (30 seconds)
```bash
npm run dev
# Open http://localhost:5173
# Open DevTools (F12) → Console tab
```

### Test 1: Nigerian System (2 minutes)
1. ⚙️ Settings → Switch to "Nigerian University"
2. 🗑️ Clear all data
3. ➕ Add course: "CS 101", 3 CU
4. ➕ Add scores: CA=75, Exam=80
5. 🏠 Home → Check GPA shows (~4.0-5.0)
6. ✅ No errors in console

### Test 2: APC System (2 minutes)
1. ⚙️ Settings → Switch to "APC"
2. 🗑️ Clear all data
3. ➕ Add subject: "Math", Coeff=4
4. ➕ Add marks: I=15, D=14, C=16
5. 🏠 Home → Check average shows (~15/20)
6. ✅ No errors in console

### Test 3: System Switch (30 seconds)
1. Switch Nigerian → APC → Nigerian
2. ✅ Data preserved per system
3. ✅ No errors in console

---

## Pass/Fail Criteria

### ✅ PASS if:
- All 3 tests complete without errors
- GPA/Average displays correctly
- No blank screens
- No console errors (red text)

### ❌ FAIL if:
- Blank screen appears
- Console shows errors
- Calculations are wrong
- App crashes

---

## What to Check on Home Screen

### Nigerian System:
- [ ] Shows "Current GPA: X.XX / 5.00"
- [ ] Shows course name and credit units
- [ ] Shows course score and grade letter
- [ ] Shows class of degree (e.g., "First Class")
- [ ] Progress bar is filled

### APC System:
- [ ] Shows "Current Average: X.X/20"
- [ ] Shows subject name and coefficient
- [ ] Shows marks (I/D/C)
- [ ] Shows target comparison
- [ ] Progress bar is filled

---

## Common Issues & Quick Fixes

### Issue: Blank Screen
**Check:** Console for errors
**Fix:** Look at adapter code in `src/adapters/`

### Issue: Wrong Calculation
**Check:** `dashboard.performance.value`
**Fix:** Check adapter's `toDashboardData()` method

### Issue: "Cannot read property of undefined"
**Check:** If `dashboard` is null
**Fix:** Check adapter error handling

---

## After Testing

### If All Tests Pass ✅
1. Create `TEST_RESULTS.md` with checkmarks
2. Move to Phase 2 (Component Refactoring)
3. Follow `NEXT_STEPS.md`

### If Any Test Fails ❌
1. Note the error in console
2. Check which system failed
3. Check adapter code for that system
4. Fix and retest
5. Ask for help if stuck

---

## Full Testing

For comprehensive testing, see `MANUAL_TESTING_GUIDE.md`

Estimated time: 45-60 minutes

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Build (verify no errors)
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## Emergency Rollback

If everything breaks:

```bash
# 1. Stop dev server (Ctrl+C)
# 2. Restore backup
cp src/pages/Home.tsx.backup src/pages/Home.tsx
# 3. Restart
npm run dev
```

---

## Success = Ready for Phase 2! 🎉

Once all tests pass, you're ready to refactor other components.
