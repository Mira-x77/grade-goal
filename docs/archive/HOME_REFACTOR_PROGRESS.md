# Home.tsx Refactor Progress

## Status: IN PROGRESS (40% Complete)

## Completed Changes

### ✅ Phase 1: Core Adapter Integration (DONE)
- [x] Import getAdapter and DashboardData types
- [x] Create dashboard variable using adapter
- [x] Extract performance metrics from dashboard
- [x] Replace direct calculations with adapter values
- [x] Update dependency arrays in useEffects
- [x] Maintain backward compatibility for legacy features

### ✅ Phase 2: Hero Card Updates (DONE)
- [x] Nigerian hero card uses dashboard.performance
- [x] APC/French hero card uses dashboard.performance
- [x] Empty state uses dashboard values
- [x] No marks state uses dashboard values
- [x] Progress bar calculations use adapter values
- [x] Target display uses adapter values

### ✅ Phase 3: Nudge System Updates (DONE)
- [x] at_risk nudge uses adapter values
- [x] bad_score nudge uses adapter values
- [x] Nudge thresholds scale with system (5 vs 20)

### ✅ Phase 4: Build Verification (DONE)
- [x] Build passes with all changes
- [x] No TypeScript errors
- [x] No runtime errors expected

## Remaining Work (60%)

### ⏳ Phase 5: Data Access Cleanup (NEXT)
- [ ] Remove unused `currentAvg` calculation (keep for simulator only)
- [ ] Update all remaining direct data access
- [ ] Verify all `isNigerian` checks are UI-only

### ⏳ Phase 6: Component Integration
- [ ] Update ResultsScreen to accept DashboardData
- [ ] Update OnboardingChecklist to use dashboard.hasData
- [ ] Update mark entry flow validation
- [ ] Update edit marks sheet

### ⏳ Phase 7: Testing
- [ ] Test Nigerian system (fresh onboarding)
- [ ] Test Nigerian system (add course + score)
- [ ] Test APC system (fresh onboarding)
- [ ] Test APC system (add subject + marks)
- [ ] Test French system (class comparison)
- [ ] Test system switching

### ⏳ Phase 8: Performance Verification
- [ ] Verify no performance regressions
- [ ] Check bundle size impact
- [ ] Verify memory usage

## Key Architectural Changes

### Before (APC-First):
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

### After (Adapter-Based):
```typescript
const dashboard = appState ? getAdapter(gradingSystem).toDashboardData(appState) : null;
const performance = dashboard?.performance;
const heroValue = performance?.value ?? null;
const heroMax = performance?.max ?? 20;
const heroTarget = performance?.target ?? null;
```

## Benefits Achieved

1. ✅ System-agnostic data access
2. ✅ Single source of truth (adapter)
3. ✅ Consistent performance metrics
4. ✅ Easier to add new systems
5. ✅ Better type safety
6. ✅ Cleaner code

## Backward Compatibility

### Maintained for:
- Strategy simulator (uses legacy calculations)
- Performance alerts (uses legacy calculations)
- Mark entry flow (operates on AppState directly)
- Edit marks sheet (operates on AppState directly)

### Reason:
These features need direct access to raw data for their specific calculations. They will be refactored in Phase 2 (other components).

## Next Steps

1. Continue refactoring remaining data access points
2. Update child components (ResultsScreen, OnboardingChecklist)
3. Test all three systems thoroughly
4. Move to Phase 2 (other components)

## Estimated Time Remaining

- Phase 5-6: 4-6 hours
- Phase 7: 2-3 hours
- Phase 8: 1-2 hours

Total: 7-11 hours

## Risk Assessment

### Low Risk:
- Build passes
- No breaking changes to UI
- Backward compatible

### Medium Risk:
- Need to test all systems manually
- Edge cases may exist

### Mitigation:
- Incremental changes
- Build after each change
- Keep backup (Home.tsx.backup)
- Can rollback instantly if needed
