# Phase 1: Complete Home.tsx Refactor

## Goal
Refactor Home.tsx to use adapters while maintaining 100% feature parity.

## Current Home.tsx Analysis

### File Stats:
- **Lines**: 1,791
- **Components**: 5 inline components
- **State variables**: 20+
- **Handlers**: 10+
- **Sheets/Modals**: 8

### Key Features to Preserve:
1. ✅ Hero card (performance display)
2. ✅ Empty states
3. ✅ Onboarding checklist
4. ✅ Subject/course cards
5. ✅ Recent activity
6. ✅ Mark entry flow (APC + Nigerian)
7. ✅ Results sheet
8. ✅ Edit marks sheet
9. ✅ Strategy card (APC/French)
10. ✅ Performance alerts (APC/French)
11. ✅ Nigerian semester management
12. ✅ Premium nudges
13. ✅ Subscription sheets
14. ✅ Product tour
15. ✅ Sticky header with mini progress bar

### System-Specific Features:
- **APC/French**: Interro/Dev/Compo marks, Strategy simulator, Performance alerts
- **Nigerian**: Custom assessments (CA/Exam), Semester management, GPA/CGPA, Class of degree

## Refactor Strategy

### Approach: Surgical Replacement
Instead of rewriting the entire file, I'll:
1. Keep all UI components intact
2. Replace data access with adapter calls
3. Remove `isNigerian` checks for data (keep for UI features)
4. Test incrementally

### Key Changes:

#### Before (APC-First):
```typescript
const currentAvg = hasData
  ? gradingSystem === "apc"
    ? calcAPCYearlyAverage(appState!.subjects, weightedSplit)
    : calcYearlyAverage(appState!.subjects)
  : null;

const nigerianCGPA = isNigerian
  ? (computeIntegratedCGPA(appState?.subjects ?? []) ?? 0)
  : 0;
```

#### After (Adapter-Based):
```typescript
const dashboard = appState ? getAdapter(gradingSystem).toDashboardData(appState) : null;
const performance = dashboard?.performance;
const heroValue = performance?.value ?? null;
```

## Implementation Plan

### Step 1: Add Adapter Integration (Lines 1-100)
- [ ] Import getAdapter
- [ ] Create dashboard variable
- [ ] Extract performance metrics

### Step 2: Update Hero Card (Lines 700-800)
- [ ] Use dashboard.performance for display
- [ ] Keep system-specific UI (Nigerian vs APC/French)
- [ ] Test rendering

### Step 3: Update Subject Cards (Lines 900-1100)
- [ ] Use dashboard.segments for data
- [ ] Use dashboard.items for subjects
- [ ] Keep system-specific formatting

### Step 4: Update Onboarding Checklist (Lines 800-900)
- [ ] Use dashboard.hasData
- [ ] Use dashboard.isEmpty
- [ ] Keep system-specific steps

### Step 5: Update Mark Entry (Lines 1200-1400)
- [ ] Keep existing flow (works with AppState)
- [ ] No changes needed (operates on AppState directly)

### Step 6: Update Results Sheet (Lines 1500-1700)
- [ ] Pass dashboard data to ResultsScreen
- [ ] Update ResultsScreen component separately

### Step 7: Test All Systems
- [ ] Nigerian: Fresh onboarding → Home renders
- [ ] Nigerian: Add course → Enter score → Display correct
- [ ] APC: Fresh onboarding → Home renders
- [ ] APC: Add subject → Enter marks → Display correct
- [ ] French: Class comparison works
- [ ] System switching works

## Estimated Time: 8-12 hours

### Breakdown:
- Analysis & planning: 1 hour ✅ DONE
- Adapter integration: 2-3 hours
- Hero card update: 1-2 hours
- Subject cards update: 2-3 hours
- Testing: 2-3 hours
- Bug fixes: 1-2 hours

## Risk Mitigation

### Backup Strategy:
- ✅ Original Home.tsx backed up to Home.tsx.backup
- Can rollback instantly if issues arise

### Testing Strategy:
- Test after each major change
- Keep build passing at all times
- Verify all three systems work

### Rollback Triggers:
- Build fails
- Any system stops working
- Data loss occurs
- Performance degrades significantly

## Success Criteria

### Must Have:
- ✅ Build passes
- ✅ Nigerian Home screen works (no blank screen)
- ✅ APC Home screen works (calculations correct)
- ✅ French Home screen works (class comparison intact)
- ✅ All features functional
- ✅ No data loss
- ✅ Performance acceptable

### Nice to Have:
- Cleaner code
- Better type safety
- Easier to maintain
- Faster rendering

## Next Steps

1. Create modified Home.tsx with adapter integration
2. Test build
3. Test each system manually
4. Fix any issues
5. Move to Phase 2 (other components)
