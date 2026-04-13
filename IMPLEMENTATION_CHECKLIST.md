# Implementation Checklist: System-Agnostic Architecture

## Phase 1: Foundation (COMPLETED ✅)

### Data Contract
- [x] Create `DashboardData` type system
- [x] Define `PerformanceMetric` interface
- [x] Define `DashboardSegment` interface
- [x] Define `DashboardItem` interface
- [x] Define `DashboardAssessment` interface
- [x] Define `ClassificationInfo` interface

### Adapter Layer
- [x] Create `AcademicSystemAdapter` interface
- [x] Implement `APCAdapter`
- [x] Implement `FrenchAdapter`
- [x] Implement `NigerianAdapter`
- [x] Create `AdapterFactory` with singleton pattern
- [x] Add system validation

### Nigerian Defaults
- [x] Create default assessment templates (CA + Exam)
- [x] Implement `createNigerianSubject()` factory
- [x] Implement `ensureNigerianAssessments()` repair function
- [x] Add JSDoc documentation

### Storage Protection
- [x] Add auto-repair in `loadState()`
- [x] Ensure backward compatibility
- [x] Test with malformed data

### Subject Creation
- [x] Update `Profile.tsx` to use `createNigerianSubject()`
- [x] Update `SubjectsSetup.tsx` to use `createNigerianSubject()`
- [x] Remove manual `customAssessments: []` initialization
- [x] Ensure all creation paths use helper

### Build Verification
- [x] TypeScript compilation successful
- [x] No type errors
- [x] No import errors
- [x] Bundle size acceptable

---

## Phase 2: UI Migration (PENDING 🔄)

### Home.tsx Refactor
- [ ] Import `getAdapter` from factory
- [ ] Replace `calcAPCYearlyAverage()` with adapter
- [ ] Replace `computeIntegratedCGPA()` with adapter
- [ ] Remove `isNigerian` branching for data access
- [ ] Use `dashboard.performance` for hero card
- [ ] Use `dashboard.segments` for subject lists
- [ ] Use `dashboard.hasData` for empty state
- [ ] Use `dashboard.isEmpty` for CTA display

### Component Updates
- [ ] Create `<PerformanceCard>` component (system-agnostic)
- [ ] Create `<SubjectCard>` component (system-agnostic)
- [ ] Create `<AssessmentList>` component (system-agnostic)
- [ ] Update `<OnboardingChecklist>` to use dashboard data
- [ ] Update `<ResultsScreen>` to use dashboard data

### Remove Direct Access
- [ ] Search for `subject.marks.interro` → Replace with adapter
- [ ] Search for `subject.marks.dev` → Replace with adapter
- [ ] Search for `subject.marks.compo` → Replace with adapter
- [ ] Search for `subject.customAssessments` → Replace with adapter
- [ ] Search for `calcAPCYearlyAverage` → Replace with adapter
- [ ] Search for `computeIntegratedCGPA` → Replace with adapter

### Empty State Handling
- [ ] Nigerian: Show "Add courses" when `isEmpty === true`
- [ ] Nigerian: Show "Enter scores" when `hasData === false`
- [ ] APC: Show "Add subjects" when `isEmpty === true`
- [ ] APC: Show "Enter marks" when `hasData === false`
- [ ] French: Same as APC

### Error Boundaries
- [ ] Add error boundary around adapter calls
- [ ] Add fallback UI for adapter failures
- [ ] Log adapter errors to console
- [ ] Show user-friendly error messages

---

## Phase 3: Testing (PENDING 🔄)

### Unit Tests
- [ ] Test `APCAdapter.toDashboardData()`
- [ ] Test `FrenchAdapter.toDashboardData()`
- [ ] Test `NigerianAdapter.toDashboardData()`
- [ ] Test `createNigerianSubject()`
- [ ] Test `ensureNigerianAssessments()`
- [ ] Test `getAdapter()` factory

### Integration Tests
- [ ] Test APC data flow: AppState → Adapter → UI
- [ ] Test French data flow: AppState → Adapter → UI
- [ ] Test Nigerian data flow: AppState → Adapter → UI
- [ ] Test system switching: APC ↔ Nigerian
- [ ] Test system switching: French ↔ Nigerian

### E2E Tests
- [ ] Nigerian fresh onboarding → Home renders
- [ ] Nigerian add course → Has default assessments
- [ ] Nigerian enter score → Home shows data
- [ ] APC fresh onboarding → Home renders
- [ ] APC enter marks → Calculations correct
- [ ] System switch → No data loss

### Edge Case Tests
- [ ] Empty subjects array → No crash
- [ ] Null assessment values → No crash
- [ ] Missing customAssessments → Auto-repaired
- [ ] Invalid grading system → Error handled
- [ ] Partial data → Graceful degradation

---

## Phase 4: Documentation (PENDING 🔄)

### Code Documentation
- [ ] Add JSDoc to all adapter methods
- [ ] Add JSDoc to dashboard types
- [ ] Add inline comments for complex logic
- [ ] Add examples in adapter files

### User Documentation
- [ ] Update README with architecture overview
- [ ] Document adapter pattern
- [ ] Document how to add new systems
- [ ] Create migration guide for contributors

### Developer Guide
- [ ] Document data flow diagram
- [ ] Document adapter interface contract
- [ ] Document testing strategy
- [ ] Document rollback procedures

---

## Phase 5: Optimization (FUTURE 🔮)

### Performance
- [ ] Add adapter result caching
- [ ] Memoize dashboard data transformations
- [ ] Lazy load adapters
- [ ] Profile render performance

### Code Quality
- [ ] Add ESLint rule: no direct `subject.marks` access
- [ ] Add ESLint rule: no direct `subject.customAssessments` access
- [ ] Add pre-commit hook for adapter usage
- [ ] Add CI check for system-agnostic code

### Scalability
- [ ] Add adapter plugin system
- [ ] Support dynamic adapter loading
- [ ] Support custom grading systems
- [ ] Support multi-tenant configurations

---

## Success Metrics

### Immediate (Phase 1)
- [x] Build succeeds
- [x] No TypeScript errors
- [x] Nigerian subjects have default assessments
- [x] Old data auto-repaired

### Short-term (Phase 2)
- [ ] Home.tsx uses adapters
- [ ] No direct system data access
- [ ] Nigerian Home screen works
- [ ] All systems render correctly

### Long-term (Phase 3-5)
- [ ] 100% test coverage for adapters
- [ ] Zero system-specific UI code
- [ ] New system added in <1 hour
- [ ] Performance within 10% of baseline

---

## Risk Assessment

### Low Risk (Completed)
- ✅ Adapter layer (not yet used by UI)
- ✅ Nigerian defaults (only improves stability)
- ✅ Storage protection (only fixes bugs)

### Medium Risk (Pending)
- ⚠️ Home.tsx refactor (large file, many dependencies)
- ⚠️ Component updates (affects user experience)
- ⚠️ System switching (complex state management)

### High Risk (Future)
- 🔴 Removing old calculation functions (breaking change)
- 🔴 Changing data structures (migration required)
- 🔴 Performance regressions (needs profiling)

---

## Rollback Strategy

### Phase 1 (Current)
- Safe to keep all changes
- No breaking changes introduced
- Only improvements to stability

### Phase 2 (If needed)
1. Revert Home.tsx changes
2. Keep adapter layer (unused, no impact)
3. Keep Nigerian defaults (improves stability)
4. Keep storage protection (fixes bugs)

### Phase 3+ (If needed)
1. Revert to Phase 2 state
2. Investigate test failures
3. Fix issues incrementally
4. Re-deploy with fixes

---

## Timeline Estimate

### Phase 1: Foundation
- **Status**: ✅ COMPLETED
- **Time**: 2-3 hours
- **Complexity**: Medium

### Phase 2: UI Migration
- **Status**: 🔄 PENDING
- **Estimate**: 4-6 hours
- **Complexity**: High
- **Blockers**: None

### Phase 3: Testing
- **Status**: 🔄 PENDING
- **Estimate**: 3-4 hours
- **Complexity**: Medium
- **Blockers**: Phase 2 completion

### Phase 4: Documentation
- **Status**: 🔄 PENDING
- **Estimate**: 2-3 hours
- **Complexity**: Low
- **Blockers**: Phase 2-3 completion

### Phase 5: Optimization
- **Status**: 🔮 FUTURE
- **Estimate**: 4-8 hours
- **Complexity**: High
- **Blockers**: Phase 2-4 completion

**Total Estimate**: 15-24 hours for complete implementation

---

## Next Immediate Action

**Priority 1**: Migrate Home.tsx to use adapter layer

**Steps**:
1. Import `getAdapter` from factory
2. Call `adapter.toDashboardData(appState)` at top of component
3. Replace all direct data access with `dashboard.*` properties
4. Test Nigerian Home screen renders correctly
5. Test APC/French still work
6. Commit changes

**Expected Outcome**: Nigerian Home screen shows empty state instead of blank screen
