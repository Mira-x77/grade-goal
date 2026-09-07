# Next Steps: Completing the Refactor

## Current Status: 40% Complete ✅

Home.tsx has been successfully refactored to use adapters. All performance data now comes from the adapter layer, making the UI truly system-agnostic.

---

## Immediate Next Steps (This Week)

### 1. Manual Testing (2-3 hours) ⏳ CRITICAL

You need to manually test all three systems to verify the refactor works:

#### Nigerian System:
```bash
# Test flow:
1. Open app in dev mode: npm run dev
2. Go to Settings → Switch to Nigerian University system
3. Clear all data (or use fresh profile)
4. Complete onboarding:
   - Set target GPA (e.g., 4.50)
   - Add a course (e.g., "Computer Science 101", 3 CU)
5. Go to Home screen
   - ✅ Should show "Current GPA: 0.00 / 5.00"
   - ✅ Should show course in "Courses" section
6. Add assessment score:
   - Click + button
   - Select course
   - Enter CA score (e.g., 75/100)
   - Enter Exam score (e.g., 80/100)
7. Go back to Home
   - ✅ Should show updated GPA
   - ✅ Should show course score and grade
   - ✅ Should show class of degree
```

#### APC System:
```bash
# Test flow:
1. Switch to APC system
2. Clear all data
3. Complete onboarding:
   - Set target average (e.g., 16/20)
   - Add subjects (e.g., "Math", coeff 4)
4. Go to Home screen
   - ✅ Should show "Current Average: —/20"
5. Add marks:
   - Click + button
   - Select subject
   - Enter Interro (e.g., 15/20)
   - Enter Devoir (e.g., 14/20)
   - Enter Compo (e.g., 16/20)
6. Go back to Home
   - ✅ Should show calculated average
   - ✅ Should show progress bar
   - ✅ Should show performance alerts if below target
```

#### French System:
```bash
# Test flow:
1. Switch to French system
2. Follow same flow as APC
3. Verify class comparison card works
```

#### System Switching:
```bash
# Test flow:
1. Create data in Nigerian system
2. Switch to APC system
3. ✅ Should show empty state (data is system-specific)
4. Create data in APC system
5. Switch back to Nigerian
6. ✅ Should show Nigerian data (preserved)
```

### 2. Fix Any Issues Found (1-2 hours)

If testing reveals issues:
- Check adapter logic in `src/adapters/`
- Check data transformation in `toDashboardData()`
- Check UI rendering in `Home.tsx`
- Build and test again

### 3. Document Test Results (30 minutes)

Create `TEST_RESULTS.md`:
```markdown
# Test Results

## Nigerian System
- [ ] Fresh onboarding works
- [ ] Add course works
- [ ] Enter scores works
- [ ] GPA calculation correct
- [ ] Class of degree correct

## APC System
- [ ] Fresh onboarding works
- [ ] Add subject works
- [ ] Enter marks works
- [ ] Average calculation correct
- [ ] Performance alerts work

## French System
- [ ] Fresh onboarding works
- [ ] Class comparison works

## System Switching
- [ ] Data preserved per system
- [ ] No data leakage
```

---

## Phase 2: Component Refactoring (Next Week)

### Priority 1: ResultsScreen Component (2-3 hours)

**Current State:**
```typescript
// ResultsScreen.tsx
<ResultsScreen
  subjects={appState.subjects}
  targetAverage={appState.targetMin}
  onBack={...}
/>
```

**Target State:**
```typescript
// ResultsScreen.tsx
<ResultsScreen
  dashboard={dashboard}
  onBack={...}
/>
```

**Changes Needed:**
1. Update ResultsScreen props to accept `DashboardData`
2. Remove direct subject access
3. Use `dashboard.segments` and `dashboard.items`
4. Test with all systems

### Priority 2: OnboardingChecklist Component (1-2 hours)

**Current State:**
```typescript
// OnboardingChecklist.tsx
done: (appState?.subjects?.length ?? 0) > 0
```

**Target State:**
```typescript
// OnboardingChecklist.tsx
done: !dashboard.isEmpty
```

**Changes Needed:**
1. Accept `dashboard` prop
2. Use `dashboard.hasData` and `dashboard.isEmpty`
3. Remove system-specific checks
4. Test with all systems

### Priority 3: SubjectsSetup Component (2-3 hours)

**Current State:**
```typescript
// SubjectsSetup.tsx
if (isNigerian) {
  // Create Nigerian subject
} else {
  // Create APC/French subject
}
```

**Target State:**
```typescript
// SubjectsSetup.tsx
const adapter = getAdapter(gradingSystem);
const newSubject = adapter.createSubject(name, weight);
```

**Changes Needed:**
1. Add `createSubject()` method to adapters
2. Remove `isNigerian` checks
3. Use adapter for subject creation
4. Test with all systems

### Priority 4: Profile Component (2-3 hours)

**Current State:**
```typescript
// Profile.tsx
{isNigerian ? (
  <NigerianGPADisplay cgpa={cgpa} />
) : (
  <APCAverageDisplay avg={avg} />
)}
```

**Target State:**
```typescript
// Profile.tsx
<PerformanceDisplay performance={dashboard.performance} />
```

**Changes Needed:**
1. Use adapter for data display
2. Remove system-specific branching
3. Create unified components
4. Test with all systems

---

## Phase 3: Backend Deployment (Week After Next)

### Step 1: Local Testing (2-3 hours)

```bash
# Test migration locally
1. Backup your local database
2. Run migration: supabase db reset
3. Test data transformation
4. Verify all systems work
5. Test auto-migration
```

### Step 2: Staging Deployment (2-3 hours)

```bash
# Deploy to staging
1. Deploy migration to staging
2. Test with real data
3. Monitor for errors
4. Verify data consistency
```

### Step 3: Production Deployment (4-6 hours)

```bash
# Gradual rollout
1. Deploy migration to production
2. Enable hybrid service (feature flag OFF)
3. Monitor migration success
4. Enable for 1% of users
5. Monitor for 24 hours
6. Gradually increase to 100%
```

---

## Phase 4: Testing (Following Week)

### Unit Tests (4-6 hours)

```typescript
// Example: APCAdapter.test.ts
describe('APCAdapter', () => {
  it('should convert APC data to dashboard format', () => {
    const adapter = new APCAdapter();
    const appState = createMockAPCState();
    const dashboard = adapter.toDashboardData(appState);
    
    expect(dashboard.system).toBe('APC');
    expect(dashboard.performance.value).toBeCloseTo(15.5);
    expect(dashboard.segments).toHaveLength(1);
  });
});
```

### Integration Tests (3-4 hours)

```typescript
// Example: adapter-integration.test.ts
describe('Adapter Integration', () => {
  it('should work with all systems', () => {
    // Test APC
    // Test French
    // Test Nigerian
  });
});
```

### E2E Tests (3-4 hours)

```typescript
// Example: home.e2e.test.ts
describe('Home Screen', () => {
  it('should display Nigerian GPA correctly', () => {
    // Navigate to home
    // Verify GPA display
    // Verify course list
  });
});
```

---

## Phase 5: Monitoring & Documentation (Final Week)

### Monitoring (2-3 hours)

1. Set up error tracking (Sentry)
2. Set up performance monitoring
3. Set up migration tracking
4. Create dashboards

### Documentation (2-3 hours)

1. Update API documentation
2. Write migration guide
3. Write troubleshooting guide
4. Create architecture diagrams

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Foundation | 2 weeks | ✅ DONE |
| Home.tsx | 2 hours | ✅ DONE |
| Testing | 2-3 hours | ⏳ NEXT |
| Components | 8-12 hours | ⏳ PENDING |
| Backend | 8-12 hours | ⏳ PENDING |
| Testing | 10-14 hours | ⏳ PENDING |
| Monitoring | 4-6 hours | ⏳ PENDING |
| **TOTAL** | **3-4 weeks** | **40% DONE** |

---

## Success Criteria

### Must Have:
- ✅ Build passes
- ✅ Home.tsx uses adapters
- ⏳ All systems work correctly
- ⏳ No data loss
- ⏳ Performance acceptable

### Nice to Have:
- ⏳ Comprehensive tests
- ⏳ Monitoring in place
- ⏳ Documentation complete

---

## Risk Mitigation

### If Testing Fails:
1. Check adapter logic
2. Check data transformation
3. Check UI rendering
4. Rollback to Home.tsx.backup if needed

### If Backend Fails:
1. Rollback migration
2. Fix issues
3. Test locally again
4. Redeploy

### If Performance Degrades:
1. Profile adapter overhead
2. Optimize calculations
3. Add caching if needed

---

## Questions to Answer

### Before Moving Forward:
1. ✅ Does Home.tsx build? YES
2. ⏳ Does Nigerian system work? NEEDS TESTING
3. ⏳ Does APC system work? NEEDS TESTING
4. ⏳ Does French system work? NEEDS TESTING
5. ⏳ Does system switching work? NEEDS TESTING

### Before Backend Deployment:
1. ⏳ Does migration work locally?
2. ⏳ Does auto-migration work?
3. ⏳ Is data preserved?
4. ⏳ Are there any edge cases?

### Before Production:
1. ⏳ Are tests passing?
2. ⏳ Is monitoring in place?
3. ⏳ Is rollback plan ready?
4. ⏳ Is documentation complete?

---

## Contact Points

### If You Get Stuck:
1. Check `CRITICAL_GAPS_AUDIT.md` for known issues
2. Check `PHASE_1_HOME_REFACTOR.md` for implementation details
3. Check `SESSION_SUMMARY.md` for what was done
4. Check adapter implementations in `src/adapters/`

### If You Find Bugs:
1. Document in `TEST_RESULTS.md`
2. Check adapter logic first
3. Check data transformation second
4. Check UI rendering third

---

## Final Notes

The hard part is done. Home.tsx now uses adapters, and the foundation is solid. The remaining work is:
1. Testing (verify it works)
2. Component refactoring (repeat the pattern)
3. Backend deployment (gradual rollout)
4. Testing & monitoring (ensure quality)

You're 40% done. The next 60% is straightforward if you follow this plan systematically.

**Start with manual testing. Everything else depends on that.**
