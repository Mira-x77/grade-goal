# Requirements Document

## Introduction

This feature extends the grade tracking application to support multiple educational systems beyond the existing APC (Togolese) and French systems. The first new system to be added is the Nigerian university (tertiary) grading system, which tracks course grades, credit units, GPA per semester, and cumulative GPA (CGPA) across a student's entire degree programme — from year 1 through graduation. The architecture must remain extensible so that additional educational systems can be added in the future without modifying existing grading logic.

## Glossary

- **Educational_System**: A named configuration representing a country's or institution's grading rules, subject structure, score ranges, and grade labels (e.g., "nigerian_university", "apc", "french").
- **Course**: A unit of academic study with a name, a credit unit load (1–6), and a score (0–100) that maps to a letter grade and grade points.
- **Credit_Units**: The weight assigned to a Course, representing its workload. Typical values are 1–6.
- **Grade_Points**: The numeric value assigned to a letter grade: A = 5, B = 4, C = 3, D = 2, E = 1, F = 0.
- **Grade_Point (GP)**: The product of a Course's Grade_Points and its Credit_Units.
- **GPA**: Grade Point Average for a single semester — the sum of all GP values divided by the sum of all Credit_Units for that semester.
- **CGPA**: Cumulative Grade Point Average — the sum of all GP values across all semesters divided by the sum of all Credit_Units across all semesters.
- **Semester**: A single academic period within a session (e.g., First Semester, Second Semester).
- **Session**: An academic year, typically identified by two calendar years (e.g., "2023/2024").
- **Class_Of_Degree**: The classification awarded at graduation based on CGPA: First Class (≥ 4.50), Second Class Upper (3.50–4.49), Second Class Lower (2.40–3.49), Third Class (1.50–2.39), Pass (1.00–1.49), Fail (< 1.00).
- **Target_CGPA**: The minimum CGPA a student aims to achieve by graduation.
- **Required_GPA**: The GPA a student must achieve across all remaining credit units to reach the Target_CGPA given their current CGPA and remaining credit units.
- **Grading_Engine**: The module responsible for computing GP, GPA, CGPA, Required_GPA, and Class_Of_Degree for a given Educational_System.
- **System_Selector**: The UI component that allows a user to choose their Educational_System.

## Requirements

### Requirement 1: Educational System Selection

**User Story:** As a student, I want to select my educational system (e.g., Nigerian University, APC, French), so that the app uses grading rules and subject structures appropriate to my context.

#### Acceptance Criteria

1. THE System_Selector SHALL present all supported Educational_Systems to the user during onboarding and in settings.
2. WHEN a user selects an Educational_System, THE App SHALL persist the selection to local storage and, if authenticated, to the user's cloud profile.
3. WHEN a user changes their Educational_System, THE App SHALL prompt the user to confirm before clearing existing course and grade data.
4. IF a user's stored Educational_System value is not recognised, THEN THE App SHALL default to the "apc" Educational_System and display a notification informing the user.
5. THE App SHALL support at minimum the following Educational_Systems: "apc", "french", and "nigerian_university".

---

### Requirement 2: Course Grade Entry

**User Story:** As a Nigerian university student, I want to enter my courses with their credit units and scores, so that the app can compute my GP, GPA, and CGPA accurately.

#### Acceptance Criteria

1. WHEN the Educational_System is "nigerian_university", THE App SHALL allow the user to add a Course with a name, a Credit_Units value (integer 1–6), and a score (integer 0–100).
2. THE Grading_Engine SHALL map each Course score to a letter grade and Grade_Points according to the following scale: 70–100 → A (5 points), 60–69 → B (4 points), 50–59 → C (3 points), 45–49 → D (2 points), 40–44 → E (1 point), 0–39 → F (0 points).
3. THE Grading_Engine SHALL compute the Grade_Point (GP) for each Course as the product of its Grade_Points and its Credit_Units.
4. IF a Course score is outside the range 0–100, THEN THE Grading_Engine SHALL reject the value and return a validation error.
5. IF a Course Credit_Units value is outside the range 1–6, THEN THE Grading_Engine SHALL reject the value and return a validation error.

---

### Requirement 3: Semester GPA Computation

**User Story:** As a Nigerian university student, I want to see my GPA for each semester, so that I can monitor my academic performance period by period.

#### Acceptance Criteria

1. THE Grading_Engine SHALL organise Courses into Semesters, each identified by a Session label and a semester name (e.g., "First Semester", "Second Semester").
2. THE Grading_Engine SHALL compute the GPA for a Semester as the sum of all GP values for that Semester divided by the sum of all Credit_Units for that Semester, rounded to two decimal places.
3. WHEN a user adds, edits, or removes a Course in a Semester, THE Grading_Engine SHALL recompute the GPA for that Semester immediately.
4. IF a Semester contains no Courses, THEN THE Grading_Engine SHALL return a GPA of 0.00 for that Semester.
5. THE App SHALL display the GPA for each Semester alongside the list of Courses in that Semester.

---

### Requirement 4: Cumulative GPA (CGPA) Computation

**User Story:** As a Nigerian university student, I want to see my CGPA across all semesters, so that I can track my overall academic standing throughout my degree programme.

#### Acceptance Criteria

1. THE Grading_Engine SHALL compute the CGPA as the sum of all GP values across all Semesters divided by the sum of all Credit_Units across all Semesters, rounded to two decimal places.
2. WHEN a user adds, edits, or removes any Course in any Semester, THE Grading_Engine SHALL recompute the CGPA immediately.
3. THE App SHALL display the current CGPA prominently on the student's dashboard.
4. THE Grading_Engine SHALL derive the current Class_Of_Degree from the CGPA using the following thresholds: CGPA ≥ 4.50 → First Class, 3.50–4.49 → Second Class Upper, 2.40–3.49 → Second Class Lower, 1.50–2.39 → Third Class, 1.00–1.49 → Pass, < 1.00 → Fail.
5. THE App SHALL display the current Class_Of_Degree alongside the CGPA.

---

### Requirement 5: Target CGPA and Required GPA Calculation

**User Story:** As a Nigerian university student, I want to set a target CGPA and see the GPA I need in my remaining semesters, so that I can plan my studies to achieve my desired class of degree.

#### Acceptance Criteria

1. WHEN the Educational_System is "nigerian_university", THE App SHALL allow the user to set a Target_CGPA value in the range 0.00–5.00.
2. THE Grading_Engine SHALL compute the Required_GPA as: ((Target_CGPA × total_credit_units) − cumulative_GP) / remaining_credit_units, where total_credit_units is the sum of completed and remaining credit units.
3. WHEN a user sets or updates the Target_CGPA or the remaining credit units, THE Grading_Engine SHALL recompute the Required_GPA immediately.
4. THE App SHALL display the Required_GPA to the user alongside the Target_CGPA.
5. IF the Required_GPA exceeds 5.00, THEN THE App SHALL indicate that the Target_CGPA is unachievable given the student's current CGPA and remaining credit units.
6. IF the remaining credit units are zero, THEN THE Grading_Engine SHALL not compute a Required_GPA and SHALL display the student's final CGPA and Class_Of_Degree instead.

---

### Requirement 6: Multi-System Architecture

**User Story:** As a developer, I want the grading system to be extensible, so that new educational systems can be added without modifying existing grading logic.

#### Acceptance Criteria

1. THE Grading_Engine SHALL implement a common interface that each Educational_System adapter must satisfy, including methods for: computing a course or subject score, computing a period-level average (e.g., GPA or term average), and computing a cumulative average (e.g., CGPA or overall average).
2. WHEN a new Educational_System is registered, THE App SHALL make it available in the System_Selector without changes to the core application logic.
3. THE App SHALL store Educational_System-specific configuration (grade scale, score range, credit unit range, classification thresholds) in a dedicated configuration object per system, separate from shared application logic.
4. FOR ALL Educational_Systems, THE Grading_Engine SHALL produce consistent output types regardless of the underlying calculation method (round-trip property: serialising and deserialising a grading result SHALL produce an equivalent object).
5. THE Grading_Engine SHALL validate that a given score is within the valid range for the active Educational_System before performing any calculation.

---

### Requirement 7: Data Persistence for Nigerian University System

**User Story:** As a Nigerian university student, I want my course grades and settings to be saved and synced across devices, so that I don't lose my academic records.

#### Acceptance Criteria

1. WHEN the Educational_System is "nigerian_university", THE App SHALL persist all Courses (with name, Credit_Units, score, letter grade, and GP), Semester structure, Session labels, CGPA, Target_CGPA, and remaining credit units as part of the user's app state.
2. WHEN an authenticated user's app state is loaded, THE App SHALL restore the Educational_System selection and all associated Course, Semester, and CGPA data.
3. THE App SHALL include the Educational_System identifier in the serialised app state, so that the correct Grading_Engine is activated on load.
4. IF the Educational_System stored in a user's cloud profile differs from the locally stored value, THEN THE App SHALL prompt the user to choose which value to keep.
