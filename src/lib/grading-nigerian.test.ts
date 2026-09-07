import { describe, it, expect } from "vitest";
import {
  scoreToGrade,
  computeGP,
  computeSemesterGPA,
  computeCGPA,
  computeRequiredGPA,
  classifyDegree,
  validateScore,
  validateCreditUnits,
} from "./grading-nigerian";
import type { NigerianCourse, NigerianSemester } from "../types/nigerian";

// ─── scoreToGrade ────────────────────────────────────────────────────────────

describe("scoreToGrade", () => {
  it("returns F for score 0", () => {
    expect(scoreToGrade(0)).toMatchObject({ letter: "F", points: 0 });
  });

  it("returns F for score 39 (top of F band)", () => {
    expect(scoreToGrade(39)).toMatchObject({ letter: "F", points: 0 });
  });

  it("returns E for score 40 (bottom of E band)", () => {
    expect(scoreToGrade(40)).toMatchObject({ letter: "E", points: 1 });
  });

  it("returns E for score 44 (top of E band)", () => {
    expect(scoreToGrade(44)).toMatchObject({ letter: "E", points: 1 });
  });

  it("returns D for score 45 (bottom of D band)", () => {
    expect(scoreToGrade(45)).toMatchObject({ letter: "D", points: 2 });
  });

  it("returns D for score 49 (top of D band)", () => {
    expect(scoreToGrade(49)).toMatchObject({ letter: "D", points: 2 });
  });

  it("returns C for score 50 (bottom of C band)", () => {
    expect(scoreToGrade(50)).toMatchObject({ letter: "C", points: 3 });
  });

  it("returns C for score 59 (top of C band)", () => {
    expect(scoreToGrade(59)).toMatchObject({ letter: "C", points: 3 });
  });

  it("returns B for score 60 (bottom of B band)", () => {
    expect(scoreToGrade(60)).toMatchObject({ letter: "B", points: 4 });
  });

  it("returns B for score 69 (top of B band)", () => {
    expect(scoreToGrade(69)).toMatchObject({ letter: "B", points: 4 });
  });

  it("returns A for score 70 (bottom of A band)", () => {
    expect(scoreToGrade(70)).toMatchObject({ letter: "A", points: 5 });
  });

  it("returns A for score 100 (maximum)", () => {
    expect(scoreToGrade(100)).toMatchObject({ letter: "A", points: 5 });
  });
});

// ─── computeGP ───────────────────────────────────────────────────────────────

describe("computeGP", () => {
  it("computes GP as gradePoints × creditUnits", () => {
    // score 70 → A → 5 points; 5 × 3 = 15
    expect(computeGP(70, 3)).toBe(15);
  });

  it("computes GP for F grade (0 × creditUnits = 0)", () => {
    expect(computeGP(30, 4)).toBe(0);
  });

  it("computes GP for E grade (1 × 2 = 2)", () => {
    expect(computeGP(42, 2)).toBe(2);
  });
});

// ─── computeSemesterGPA ──────────────────────────────────────────────────────

const makeCourse = (
  score: number,
  creditUnits: number,
  id = "c1"
): NigerianCourse => {
  const { letter, points: gradePoints } = scoreToGrade(score);
  return {
    id,
    name: "Course",
    creditUnits,
    score,
    letter,
    gradePoints,
    gp: gradePoints * creditUnits,
  };
};

describe("computeSemesterGPA", () => {
  it("returns 0.00 for an empty course list", () => {
    expect(computeSemesterGPA([])).toBe(0.0);
  });

  it("computes GPA for a single course", () => {
    // score 70 → 5 pts, 3 CU → GP 15; GPA = 15/3 = 5.00
    const courses = [makeCourse(70, 3)];
    expect(computeSemesterGPA(courses)).toBe(5.0);
  });

  it("computes weighted GPA for multiple courses", () => {
    // Course A: score 70 → 5 pts × 3 CU = 15 GP
    // Course B: score 50 → 3 pts × 2 CU = 6 GP
    // Total GP = 21, Total CU = 5 → GPA = 4.20
    const courses = [makeCourse(70, 3, "a"), makeCourse(50, 2, "b")];
    expect(computeSemesterGPA(courses)).toBe(4.2);
  });

  it("rounds GPA to 2 decimal places", () => {
    // score 60 → 4 pts × 3 CU = 12 GP
    // score 45 → 2 pts × 2 CU = 4 GP
    // Total GP = 16, Total CU = 5 → GPA = 3.20
    const courses = [makeCourse(60, 3, "a"), makeCourse(45, 2, "b")];
    expect(computeSemesterGPA(courses)).toBe(3.2);
  });
});

// ─── computeCGPA ─────────────────────────────────────────────────────────────

const makeSemester = (
  courses: NigerianCourse[],
  id = "s1"
): NigerianSemester => ({
  id,
  name: "Semester",
  sessionLabel: "2023/2024",
  courses,
  gpa: computeSemesterGPA(courses),
});

describe("computeCGPA", () => {
  it("returns 0.00 for no semesters", () => {
    expect(computeCGPA([])).toBe(0.0);
  });

  it("returns 0.00 for semesters with no courses", () => {
    expect(computeCGPA([makeSemester([])])).toBe(0.0);
  });

  it("computes CGPA across a single semester", () => {
    const courses = [makeCourse(70, 3, "a"), makeCourse(50, 2, "b")];
    const semesters = [makeSemester(courses)];
    // GP = 15 + 6 = 21, CU = 5 → 4.20
    expect(computeCGPA(semesters)).toBe(4.2);
  });

  it("computes CGPA as weighted mean across multiple semesters", () => {
    // Semester 1: score 70 × 3 CU → GP 15
    // Semester 2: score 40 × 3 CU → GP 3
    // Total GP = 18, Total CU = 6 → CGPA = 3.00
    const s1 = makeSemester([makeCourse(70, 3)], "s1");
    const s2 = makeSemester([makeCourse(40, 3)], "s2");
    expect(computeCGPA([s1, s2])).toBe(3.0);
  });
});

// ─── computeRequiredGPA ──────────────────────────────────────────────────────

describe("computeRequiredGPA", () => {
  it("returns null when remainingCreditUnits is 0", () => {
    expect(computeRequiredGPA(4.5, 60, 240, 0)).toBeNull();
  });

  it("computes required GPA correctly", () => {
    // target 4.5, completed 60 CU, cumulative GP 240, remaining 20 CU
    // total CU = 80; needed total GP = 4.5 × 80 = 360
    // required GP in remaining = 360 - 240 = 120; per CU = 120/20 = 6.00
    expect(computeRequiredGPA(4.5, 60, 240, 20)).toBe(6.0);
  });

  it("can return a value greater than 5.00 (unachievable target)", () => {
    const result = computeRequiredGPA(5.0, 100, 100, 10);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(5.0);
  });

  it("returns a value ≤ 5.00 for an achievable target", () => {
    // target 3.0, completed 10 CU, cumulative GP 20, remaining 10 CU
    // total CU = 20; needed total GP = 60; required = (60-20)/10 = 4.00
    const result = computeRequiredGPA(3.0, 10, 20, 10);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThanOrEqual(5.0);
    expect(result).toBe(4.0);
  });
});

// ─── classifyDegree ──────────────────────────────────────────────────────────

describe("classifyDegree", () => {
  it("returns First Class for CGPA 4.50", () => {
    expect(classifyDegree(4.5)).toBe("First Class");
  });

  it("returns First Class for CGPA 5.00", () => {
    expect(classifyDegree(5.0)).toBe("First Class");
  });

  it("returns Second Class Upper for CGPA 3.50", () => {
    expect(classifyDegree(3.5)).toBe("Second Class Upper");
  });

  it("returns Second Class Upper for CGPA 4.49", () => {
    expect(classifyDegree(4.49)).toBe("Second Class Upper");
  });

  it("returns Second Class Lower for CGPA 2.40", () => {
    expect(classifyDegree(2.4)).toBe("Second Class Lower");
  });

  it("returns Second Class Lower for CGPA 3.49", () => {
    expect(classifyDegree(3.49)).toBe("Second Class Lower");
  });

  it("returns Third Class for CGPA 1.50", () => {
    expect(classifyDegree(1.5)).toBe("Third Class");
  });

  it("returns Third Class for CGPA 2.39", () => {
    expect(classifyDegree(2.39)).toBe("Third Class");
  });

  it("returns Pass for CGPA 1.00", () => {
    expect(classifyDegree(1.0)).toBe("Pass");
  });

  it("returns Pass for CGPA 1.49", () => {
    expect(classifyDegree(1.49)).toBe("Pass");
  });

  it("returns Fail for CGPA 0.99", () => {
    expect(classifyDegree(0.99)).toBe("Fail");
  });

  it("returns Fail for CGPA 0.00", () => {
    expect(classifyDegree(0.0)).toBe("Fail");
  });
});

// ─── validateScore ───────────────────────────────────────────────────────────

describe("validateScore", () => {
  it("returns null for score 0 (minimum valid)", () => {
    expect(validateScore(0)).toBeNull();
  });

  it("returns null for score 100 (maximum valid)", () => {
    expect(validateScore(100)).toBeNull();
  });

  it("returns null for score 50 (mid-range)", () => {
    expect(validateScore(50)).toBeNull();
  });

  it("returns error string for score -1", () => {
    expect(validateScore(-1)).not.toBeNull();
  });

  it("returns error string for score 101", () => {
    expect(validateScore(101)).not.toBeNull();
  });

  it("returns error string for non-integer score (50.5)", () => {
    expect(validateScore(50.5)).not.toBeNull();
  });
});

// ─── validateCreditUnits ─────────────────────────────────────────────────────

describe("validateCreditUnits", () => {
  it("returns null for credit units 1 (minimum valid)", () => {
    expect(validateCreditUnits(1)).toBeNull();
  });

  it("returns null for credit units 6 (maximum valid)", () => {
    expect(validateCreditUnits(6)).toBeNull();
  });

  it("returns null for credit units 3 (mid-range)", () => {
    expect(validateCreditUnits(3)).toBeNull();
  });

  it("returns error string for credit units 0", () => {
    expect(validateCreditUnits(0)).not.toBeNull();
  });

  it("returns error string for credit units 7", () => {
    expect(validateCreditUnits(7)).not.toBeNull();
  });

  it("returns error string for non-integer credit units (2.5)", () => {
    expect(validateCreditUnits(2.5)).not.toBeNull();
  });
});

// ─── Property-Based Tests ────────────────────────────────────────────────────

import * as fc from "fast-check";
import type { NigerianState } from "../types/nigerian";

// ── Property 1: Grade scale coverage ─────────────────────────────────────────
// Feature: multi-educational-system-support, Property 1
// Validates: Requirements 2.2

describe("Property 1: Grade scale coverage", () => {
  it("scoreToGrade returns a valid letter and non-negative points for any integer 0–100", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const result = scoreToGrade(score);
        expect(["A", "B", "C", "D", "E", "F"]).toContain(result.letter);
        expect(result.points).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: GP is credit-unit-weighted ────────────────────────────────────
// Feature: multi-educational-system-support, Property 2
// Validates: Requirements 2.3

describe("Property 2: GP is credit-unit-weighted", () => {
  it("computeGP(score, cu) === gradePoints(score) × cu for any valid score and creditUnits", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 6 }),
        (score, creditUnits) => {
          const { points } = scoreToGrade(score);
          expect(computeGP(score, creditUnits)).toBe(points * creditUnits);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Semester GPA is a weighted mean ───────────────────────────────
// Feature: multi-educational-system-support, Property 3
// Validates: Requirements 3.2

describe("Property 3: Semester GPA is a weighted mean", () => {
  it("computeSemesterGPA equals sum(GP_i)/sum(CU_i) rounded to 2dp for any non-empty course list", () => {
    const courseArb = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      score: fc.integer({ min: 0, max: 100 }),
      creditUnits: fc.integer({ min: 1, max: 6 }),
    }).map(({ id, name, score, creditUnits }) => {
      const { letter, points: gradePoints } = scoreToGrade(score);
      return { id, name, score, creditUnits, letter, gradePoints, gp: gradePoints * creditUnits };
    });

    fc.assert(
      fc.property(fc.array(courseArb, { minLength: 1, maxLength: 20 }), (courses) => {
        const totalGP = courses.reduce((s, c) => s + computeGP(c.score, c.creditUnits), 0);
        const totalCU = courses.reduce((s, c) => s + c.creditUnits, 0);
        const expected = Math.round((totalGP / totalCU) * 100) / 100;
        expect(computeSemesterGPA(courses)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Empty semester GPA is zero ────────────────────────────────────
// Feature: multi-educational-system-support, Property 4
// Validates: Requirements 3.4

describe("Property 4: Empty semester GPA is zero", () => {
  it("computeSemesterGPA([]) returns 0.00", () => {
    expect(computeSemesterGPA([])).toBe(0.00);
  });
});

// ── Property 5: CGPA is a weighted mean across all semesters ─────────────────
// Feature: multi-educational-system-support, Property 5
// Validates: Requirements 4.1

describe("Property 5: CGPA is a weighted mean across all semesters", () => {
  it("computeCGPA equals sum(all GP)/sum(all CU) rounded to 2dp for any non-empty semesters", () => {
    const courseArb = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      score: fc.integer({ min: 0, max: 100 }),
      creditUnits: fc.integer({ min: 1, max: 6 }),
    }).map(({ id, name, score, creditUnits }) => {
      const { letter, points: gradePoints } = scoreToGrade(score);
      return { id, name, score, creditUnits, letter, gradePoints, gp: gradePoints * creditUnits };
    });

    const semesterArb = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      sessionLabel: fc.string(),
      courses: fc.array(courseArb, { minLength: 1, maxLength: 10 }),
    }).map(({ id, name, sessionLabel, courses }) => ({
      id, name, sessionLabel, courses,
      gpa: computeSemesterGPA(courses),
    }));

    fc.assert(
      fc.property(fc.array(semesterArb, { minLength: 1, maxLength: 5 }), (semesters) => {
        const allCourses = semesters.flatMap((s) => s.courses);
        const totalGP = allCourses.reduce((s, c) => s + computeGP(c.score, c.creditUnits), 0);
        const totalCU = allCourses.reduce((s, c) => s + c.creditUnits, 0);
        const expected = Math.round((totalGP / totalCU) * 100) / 100;
        expect(computeCGPA(semesters)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 6: Class of degree is monotone in CGPA ──────────────────────────
// Feature: multi-educational-system-support, Property 6
// Validates: Requirements 4.4

const DEGREE_RANK: Record<string, number> = {
  "First Class": 5,
  "Second Class Upper": 4,
  "Second Class Lower": 3,
  "Third Class": 2,
  "Pass": 1,
  "Fail": 0,
};

describe("Property 6: Class of degree is monotone in CGPA", () => {
  it("classifyDegree(A) >= classifyDegree(B) whenever A >= B", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 5, noNaN: true }),
        fc.float({ min: 0, max: 5, noNaN: true }),
        (a, b) => {
          const higher = Math.max(a, b);
          const lower = Math.min(a, b);
          const rankHigher = DEGREE_RANK[classifyDegree(higher)] ?? -1;
          const rankLower = DEGREE_RANK[classifyDegree(lower)] ?? -1;
          expect(rankHigher).toBeGreaterThanOrEqual(rankLower);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Required GPA round-trip ──────────────────────────────────────
// Feature: multi-educational-system-support, Property 7
// Validates: Requirements 5.2

describe("Property 7: Required GPA round-trip", () => {
  it("achieving exactly requiredGPA in remaining CU yields CGPA ≈ targetCGPA (±0.005)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 5, noNaN: true }),
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (targetCGPA, completedCU, remainingCU) => {
          // cumulativeGP must be in [0, completedCU * 5]
          const maxCumulativeGP = completedCU * 5;
          const cumulativeGP = Math.floor(Math.random() * (maxCumulativeGP + 1));
          const requiredGPA = computeRequiredGPA(targetCGPA, completedCU, cumulativeGP, remainingCU);
          if (requiredGPA === null || requiredGPA > 5.00 || requiredGPA < 0) return;
          const resultingCGPA = (cumulativeGP + requiredGPA * remainingCU) / (completedCU + remainingCU);
          const rounded = Math.round(resultingCGPA * 100) / 100;
          expect(Math.abs(rounded - Math.round(targetCGPA * 100) / 100)).toBeLessThanOrEqual(0.005);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: Score validation rejects out-of-range values ─────────────────
// Feature: multi-educational-system-support, Property 8
// Validates: Requirements 2.4

describe("Property 8: Score validation rejects out-of-range values", () => {
  it("validateScore returns non-null for integers < 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (score) => {
        expect(validateScore(score)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("validateScore returns non-null for integers > 100", () => {
    fc.assert(
      fc.property(fc.integer({ min: 101, max: 10000 }), (score) => {
        expect(validateScore(score)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("validateScore returns null for integers 0–100", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        expect(validateScore(score)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 9: Credit unit validation rejects out-of-range values ────────────
// Feature: multi-educational-system-support, Property 9
// Validates: Requirements 2.5

describe("Property 9: Credit unit validation rejects out-of-range values", () => {
  it("validateCreditUnits returns non-null for integers < 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: 0 }), (cu) => {
        expect(validateCreditUnits(cu)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("validateCreditUnits returns non-null for integers > 6", () => {
    fc.assert(
      fc.property(fc.integer({ min: 7, max: 10000 }), (cu) => {
        expect(validateCreditUnits(cu)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("validateCreditUnits returns null for integers 1–6", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (cu) => {
        expect(validateCreditUnits(cu)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: NigerianState serialisation round-trip ──────────────────────
// Feature: multi-educational-system-support, Property 10
// Validates: Requirements 6.4, 7.1

describe("Property 10: NigerianState serialisation round-trip", () => {
  it("JSON.stringify → JSON.parse produces a structurally equivalent NigerianState", () => {
    const courseArb = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      score: fc.integer({ min: 0, max: 100 }),
      creditUnits: fc.integer({ min: 1, max: 6 }),
    }).map(({ id, name, score, creditUnits }) => {
      const { letter, points: gradePoints } = scoreToGrade(score);
      return { id, name, score, creditUnits, letter, gradePoints, gp: gradePoints * creditUnits };
    });

    const semesterArb = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      sessionLabel: fc.string(),
      courses: fc.array(courseArb, { minLength: 0, maxLength: 5 }),
    }).map(({ id, name, sessionLabel, courses }) => ({
      id, name, sessionLabel, courses,
      gpa: computeSemesterGPA(courses),
    }));

    const stateArb = fc.record({
      semesters: fc.array(semesterArb, { minLength: 0, maxLength: 4 }),
      cgpa: fc.float({ min: 0, max: 5, noNaN: true }),
      classOfDegree: fc.constantFrom("First Class", "Second Class Upper", "Second Class Lower", "Third Class", "Pass", "Fail"),
      targetCGPA: fc.oneof(fc.constant(null), fc.float({ min: 0, max: 5, noNaN: true })),
      remainingCreditUnits: fc.integer({ min: 0, max: 200 }),
    });

    fc.assert(
      fc.property(stateArb, (state: NigerianState) => {
        const serialised = JSON.stringify(state);
        const deserialised: NigerianState = JSON.parse(serialised);

        expect(deserialised.semesters.length).toBe(state.semesters.length);
        state.semesters.forEach((sem, i) => {
          expect(deserialised.semesters[i].courses.length).toBe(sem.courses.length);
        });
        expect(deserialised.cgpa).toBe(state.cgpa);
        expect(deserialised.targetCGPA).toBe(state.targetCGPA);
        expect(deserialised.remainingCreditUnits).toBe(state.remainingCreditUnits);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Repeated course handling ──────────────────────────────────────────────────

describe("computeCGPA with repeated courses", () => {
  it("excludes replaced course attempts from CGPA calculation", () => {
    // Original attempt: score 40 (E, 1 pt) × 3 CU = GP 3
    // Repeat attempt: score 70 (A, 5 pt) × 3 CU = GP 15, replacedCourseId = original id
    const original = makeCourse(40, 3, "original-id");
    const repeat = { ...makeCourse(70, 3, "repeat-id"), isRepeated: true, replacedCourseId: "original-id" };
    const semester = makeSemester([original, repeat]);
    // Only repeat counts: GP 15, CU 3 → CGPA 5.00
    expect(computeCGPA([semester])).toBe(5.00);
  });

  it("includes all courses when none are repeated", () => {
    const courses = [makeCourse(70, 3, "a"), makeCourse(50, 2, "b")];
    const semester = makeSemester(courses);
    // GP = 15 + 6 = 21, CU = 5 → 4.20
    expect(computeCGPA([semester])).toBe(4.20);
  });
});
