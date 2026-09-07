# Implementation Plan: Multi-Educational System Support

## Overview

Implement the Nigerian university grading system alongside the existing APC and French systems using an adapter pattern with a shared `GradingEngine` interface. The work proceeds from core types and pure functions, through the engine registry and adapters, to UI components and persistence wiring.

## Tasks

- [x] 1. Define core types and interfaces
  - Create `src/types/nigerian.ts` with `NigerianCourse`, `NigerianSemester`, and `NigerianState` interfaces
  - Extend `GradingSystem` type in `src/types/exam.ts` to include `"nigerian_university"`
  - Add optional `nigerianState?: NigerianState` field to `AppState` in `src/types/exam.ts`
  - Create `src/lib/grading-engine.ts` with `GradingEngine`, `SystemConfig`, `GradeScaleEntry`, `ClassificationThreshold`, `CourseInput`, and `CourseResult` interfaces
  - _Requirements: 2.1, 6.1, 6.3, 7.1_

- [x] 2. Implement the Nigerian university grading engine
  - [x] 2.1 Implement pure grading functions in `src/lib/grading-nigerian.ts`
    - `scoreToGrade(score)` — maps 0–100 to letter + grade points per the 6-band scale
    - `computeGP(score, creditUnits)` — returns gradePoints × creditUnits
    - `computeSemesterGPA(courses)` — weighted mean of GP / creditUnits, rounded to 2 dp; returns 0.00 for empty list
    - `computeCGPA(semesters)` — weighted mean across all semesters, rounded to 2 dp
    - `computeRequiredGPA(targetCGPA, completedCU, cumulativeGP, remainingCU)` — returns null when remainingCU === 0
    - `classifyDegree(cgpa)` — maps CGPA to Class_Of_Degree string
    - `validateScore(score)` — returns null if 0–100, error string otherwise
    - `validateCreditUnits(cu)` — returns null if 1–6, error string otherwise
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.2, 3.4, 4.1, 4.4, 5.2, 5.6, 6.5_

  - [x]* 2.2 Write property test — Property 1: Grade scale coverage
    - **Property 1: For any integer 0–100, `scoreToGrade` returns a letter in {A,B,C,D,E,F} and non-negative points**
    - **Validates: Requirements 2.2**

  - [x]* 2.3 Write property test — Property 2: GP is credit-unit-weighted
    - **Property 2: For any valid score and creditUnits (1–6), GP === gradePoints(score) × creditUnits**
    - **Validates: Requirements 2.3**

  - [x]* 2.4 Write property test — Property 3: Semester GPA is a weighted mean
    - **Property 3: For any non-empty course list, GPA === sum(GP_i) / sum(creditUnits_i) rounded to 2 dp**
    - **Validates: Requirements 3.2**

  - [x]* 2.5 Write property test — Property 4: Empty semester GPA is zero
    - **Property 4: `computeSemesterGPA([])` returns 0.00**
    - **Validates: Requirements 3.4**

  - [x]* 2.6 Write property test — Property 5: CGPA is a weighted mean across all semesters
    - **Property 5: For any non-empty semesters, CGPA === sum(all GP) / sum(all CU) rounded to 2 dp**
    - **Validates: Requirements 4.1**

  - [x]* 2.7 Write property test — Property 6: Class of degree is monotone in CGPA
    - **Property 6: For CGPA A ≥ B, classifyDegree(A) is not lower than classifyDegree(B)**
    - **Validates: Requirements 4.4**

  - [x]* 2.8 Write property test — Property 7: Required GPA round-trip
    - **Property 7: Achieving exactly the computed requiredGPA in remaining CU yields CGPA ≈ targetCGPA (±0.005)**
    - **Validates: Requirements 5.2**

  - [x]* 2.9 Write property test — Property 8: Score validation rejects out-of-range values
    - **Property 8: `validateScore(x)` returns non-null for x < 0 or x > 100, null for 0–100**
    - **Validates: Requirements 2.4**

  - [x]* 2.10 Write property test — Property 9: Credit unit validation rejects out-of-range values
    - **Property 9: `validateCreditUnits(x)` returns non-null for x < 1 or x > 6, null for 1–6**
    - **Validates: Requirements 2.5**

  - [x]* 2.11 Write unit tests for boundary values and edge cases
    - `scoreToGrade` at boundaries: 0, 39, 40, 44, 45, 49, 50, 59, 60, 69, 70, 100
    - `computeRequiredGPA` with remainingCU === 0 returns null
    - `computeRequiredGPA` producing required GPA > 5.00
    - `classifyDegree` at each threshold boundary (4.50, 3.50, 2.40, 1.50, 1.00, 0.99)
    - _Requirements: 2.2, 2.4, 2.5, 4.4, 5.2, 5.6_

- [x] 3. Checkpoint — Ensure all grading engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create APC and French engine adapters and the engine registry
  - [x] 4.1 Create `src/lib/grading-apc-adapter.ts` wrapping existing APC logic to satisfy `GradingEngine`
    - Implement `config`, `validateScore`, `computeCourseResult`, `computePeriodAverage`, `computeCumulativeAverage`
    - _Requirements: 6.1, 6.2_

  - [x] 4.2 Create `src/lib/grading-french-adapter.ts` wrapping existing French logic to satisfy `GradingEngine`
    - Implement the same interface methods for the French system
    - _Requirements: 6.1, 6.2_

  - [x] 4.3 Create `src/lib/grading-engine-registry.ts` with `GRADING_ENGINES` record and `getEngine(systemId)` function
    - Register `apcEngine`, `frenchEngine`, and `nigerianEngine`
    - `getEngine` falls back to `"apc"` for unrecognised system IDs
    - _Requirements: 1.4, 1.5, 6.2_

  - [x]* 4.4 Write unit tests for the engine registry
    - `getEngine("nigerian_university")` returns the Nigerian engine
    - `getEngine("unknown_system")` falls back to the APC engine
    - _Requirements: 1.4, 6.2_

- [x] 5. Implement the Nigerian university dashboard UI
  - [x] 5.1 Create `src/components/NigerianDashboard.tsx`
    - Session/semester tree with per-semester GPA display
    - CGPA and Class of Degree badge
    - Target CGPA input (0.00–5.00) and Required GPA display
    - "Target unachievable" indicator when Required GPA > 5.00
    - Final CGPA/Class display when remaining credit units === 0
    - _Requirements: 3.5, 4.3, 4.5, 5.1, 5.4, 5.5, 5.6_

  - [x] 5.2 Create course entry form within `NigerianDashboard`
    - Fields: course name, credit units (1–6), score (0–100)
    - Inline validation messages for out-of-range score and credit units
    - Triggers immediate GPA/CGPA recomputation on add/edit/remove
    - _Requirements: 2.1, 2.4, 2.5, 3.3, 4.2_

  - [ ]* 5.3 Write snapshot/component tests for NigerianDashboard
    - Renders CGPA, Class of Degree, and semester list
    - Shows "Target unachievable" when Required GPA > 5.00
    - Shows final CGPA when remaining credit units === 0
    - _Requirements: 3.5, 4.3, 4.5, 5.4, 5.5, 5.6_

- [x] 6. Extend the System Selector and onboarding flow
  - [x] 6.1 Extract a shared `SystemSelectorCard` component (if not already extracted) and add the `nigerian_university` option
    - Display all three systems: APC, French, Nigerian University
    - _Requirements: 1.1, 1.5_

  - [x] 6.2 Add a confirmation prompt when the user changes their educational system
    - Warn that existing course/grade data will be cleared
    - _Requirements: 1.3_

  - [ ]* 6.3 Write component tests for the System Selector
    - All three systems are rendered during onboarding
    - Confirmation prompt appears on system change
    - _Requirements: 1.1, 1.3, 1.5_

- [x] 7. Wire persistence and state management
  - [x] 7.1 Update `loadState` / `saveState` (localStorage) to serialise and deserialise `nigerianState`
    - Include `gradingSystem` identifier in serialised state
    - On malformed `nigerianState`, reset to default empty state
    - _Requirements: 7.1, 7.2, 7.3_

  - [x]* 7.2 Write property test — Property 10: NigerianState serialisation round-trip
    - **Property 10: For any valid `NigerianState`, JSON serialise → deserialise produces a structurally equivalent object**
    - **Validates: Requirements 6.4, 7.1**

  - [x] 7.3 Update cloud sync functions (`saveAppStateToCloud` / `loadAppStateFromCloud`) to include `nigerianState`
    - Persist `gradingSystem` and `nigerianState` in `user_app_state.state_json`
    - _Requirements: 1.2, 7.2, 7.3_

  - [x] 7.4 Implement system conflict resolution prompt
    - When cloud `gradingSystem` differs from local value on login, prompt user to choose which to keep
    - _Requirements: 7.4_

  - [ ]* 7.5 Write integration tests for persistence
    - `AppState` with `nigerianState` survives a localStorage round-trip
    - Cloud sync functions correctly save and restore Nigerian state
    - Conflict resolution prompt appears when cloud and local systems differ
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** with a minimum of 100 iterations per property
- Existing `grading-apc.ts` and `grading-french.ts` are wrapped, not modified
