import type { NigerianCourse, NigerianSemester } from "../types/nigerian";
import type { GradingEngine, CourseInput, CourseResult, SystemConfig } from "./grading-engine";

// Inline types to avoid circular dependency with exam.ts
interface SubjectLike {
  creditUnits?: number;
  customAssessments?: { id: string; label: string; weight: number; value: number | null }[];
}

// Grade scale entries
const GRADE_SCALE: { min: number; max: number; letter: string; points: number }[] = [
  { min: 70, max: 100, letter: "A", points: 5 },
  { min: 60, max: 69,  letter: "B", points: 4 },
  { min: 50, max: 59,  letter: "C", points: 3 },
  { min: 45, max: 49,  letter: "D", points: 2 },
  { min: 40, max: 44,  letter: "E", points: 1 },
  { min: 0,  max: 39,  letter: "F", points: 0 },
];

const CLASSIFICATION_THRESHOLDS: { minCGPA: number; label: string }[] = [
  { minCGPA: 4.50, label: "First Class" },
  { minCGPA: 3.50, label: "Second Class Upper" },
  { minCGPA: 2.40, label: "Second Class Lower" },
  { minCGPA: 1.50, label: "Third Class" },
  { minCGPA: 1.00, label: "Pass" },
  { minCGPA: 0,    label: "Fail" },
];

export function scoreToGrade(score: number): { letter: string; points: number } {
  const entry = GRADE_SCALE.find((g) => score >= g.min && score <= g.max);
  // Fallback to F for any out-of-range value (validation should catch this first)
  return entry ?? { letter: "F", points: 0 };
}

export function computeGP(score: number, creditUnits: number): number {
  return scoreToGrade(score).points * creditUnits;
}

export function computeSemesterGPA(courses: NigerianCourse[]): number {
  if (courses.length === 0) return 0.00;
  const totalGP = courses.reduce((sum, c) => sum + computeGP(c.score, c.creditUnits), 0);
  const totalCU = courses.reduce((sum, c) => sum + c.creditUnits, 0);
  return Math.round((totalGP / totalCU) * 100) / 100;
}

export function computeCGPA(semesters: NigerianSemester[]): number {
  const allCourses = semesters.flatMap((s) => s.courses);
  if (allCourses.length === 0) return 0.00;
  // Collect all course IDs that have been replaced by a later attempt
  const replacedIds = new Set(
    allCourses
      .filter((c) => c.replacedCourseId != null)
      .map((c) => c.replacedCourseId as string)
  );
  // Exclude previous attempts — only count the latest attempt for repeated courses
  const activeCourses = allCourses.filter((c) => !replacedIds.has(c.id));
  if (activeCourses.length === 0) return 0.00;
  const totalGP = activeCourses.reduce((sum, c) => sum + computeGP(c.score, c.creditUnits), 0);
  const totalCU = activeCourses.reduce((sum, c) => sum + c.creditUnits, 0);
  return Math.round((totalGP / totalCU) * 100) / 100;
}

export function computeRequiredGPA(
  targetCGPA: number,
  completedCreditUnits: number,
  cumulativeGP: number,
  remainingCreditUnits: number
): number | null {
  if (remainingCreditUnits === 0) return null;
  const totalCU = completedCreditUnits + remainingCreditUnits;
  return (targetCGPA * totalCU - cumulativeGP) / remainingCreditUnits;
}

export function classifyDegree(cgpa: number): string {
  for (const threshold of CLASSIFICATION_THRESHOLDS) {
    if (cgpa >= threshold.minCGPA) return threshold.label;
  }
  return "Fail";
}

export function validateScore(score: number): string | null {
  if (Number.isInteger(score) && score >= 0 && score <= 100) return null;
  return `Score must be an integer between 0 and 100 (got ${score})`;
}

export function validateCreditUnits(creditUnits: number): string | null {
  if (Number.isInteger(creditUnits) && creditUnits >= 1 && creditUnits <= 6) return null;
  return `Credit units must be an integer between 1 and 6 (got ${creditUnits})`;
}

// GradingEngine implementation
const nigerianConfig: SystemConfig = {
  id: "nigerian_university",
  label: "Nigerian University",
  scoreRange: { min: 0, max: 100 },
  creditUnitRange: { min: 1, max: 6 },
  gradeScale: GRADE_SCALE.map((g) => ({
    minScore: g.min,
    maxScore: g.max,
    letter: g.letter,
    points: g.points,
  })),
  classificationThresholds: CLASSIFICATION_THRESHOLDS.map((t) => ({
    minCGPA: t.minCGPA,
    label: t.label,
  })),
};

export const nigerianEngine: GradingEngine = {
  config: nigerianConfig,

  validateScore,

  validateCreditUnits,

  computeCourseResult(score: number, creditUnits?: number): CourseResult {
    const { letter, points } = scoreToGrade(score);
    const gradePoint = creditUnits !== undefined ? points * creditUnits : undefined;
    return { letter, points, gradePoint };
  },

  computePeriodAverage(courses: CourseInput[]): number | null {
    if (courses.length === 0) return 0;
    const totalGP = courses.reduce((sum, c) => sum + (scoreToGrade(c.score).points * (c.creditUnits ?? 1)), 0);
    const totalCU = courses.reduce((sum, c) => sum + (c.creditUnits ?? 1), 0);
    return Math.round((totalGP / totalCU) * 100) / 100;
  },

  computeCumulativeAverage(periods: CourseInput[][]): number | null {
    const all = periods.flat();
    if (all.length === 0) return 0;
    const totalGP = all.reduce((sum, c) => sum + (scoreToGrade(c.score).points * (c.creditUnits ?? 1)), 0);
    const totalCU = all.reduce((sum, c) => sum + (c.creditUnits ?? 1), 0);
    return Math.round((totalGP / totalCU) * 100) / 100;
  },
};

// ── Integrated mode helpers ───────────────────────────────────────────────────

/**
 * Compute a weighted score (0–100) from a subject's custom assessments.
 * Returns null if no assessments have values yet.
 */
export function computeIntegratedSubjectScore(subject: SubjectLike): number | null {
  const assessments = subject.customAssessments;
  if (!assessments || assessments.length === 0) return null;
  const filled = assessments.filter((a) => a.value !== null);
  if (filled.length === 0) return null;

  // Use TOTAL weight of all assessments as denominator — missing ones count as 0
  const totalWeight = assessments.reduce((s, a) => s + a.weight, 0);
  if (totalWeight === 0) return null;

  // Only sum the filled ones; unfilled contribute 0 to the weighted sum
  const weightedSum = filled.reduce((s, a) => {
    const maxScore = (a as any).maxScore ?? 100;
    const normalized = (a.value! / maxScore) * 100;
    return s + (normalized * a.weight);
  }, 0);
  return weightedSum / totalWeight;
}

/**
 * Compute CGPA from a list of subjects in integrated mode.
 * Each subject needs creditUnits and a computable score.
 */
export function computeIntegratedCGPA(subjects: SubjectLike[]): number | null {
  const scoreable = subjects.filter((s) => {
    const score = computeIntegratedSubjectScore(s);
    return score !== null && (s.creditUnits ?? 0) > 0;
  });
  if (scoreable.length === 0) return null;
  const totalGP = scoreable.reduce((sum, s) => {
    const score = computeIntegratedSubjectScore(s)!;
    const cu = s.creditUnits ?? 1;
    return sum + computeGP(Math.round(score), cu);
  }, 0);
  const totalCU = scoreable.reduce((sum, s) => sum + (s.creditUnits ?? 1), 0);
  return Math.round((totalGP / totalCU) * 100) / 100;
}

/**
 * Compute the best possible CGPA if all unfilled assessments score 100/100.
 * Returns null if no subjects have credit units.
 */
export function computeBestPossibleCGPA(subjects: SubjectLike[]): number | null {
  const eligible = subjects.filter(s => (s.creditUnits ?? 0) > 0);
  if (eligible.length === 0) return null;
  const totalGP = eligible.reduce((sum, s) => {
    const cu = s.creditUnits ?? 1;
    // Simulate all unfilled assessments as 100
    const assessments = (s.customAssessments ?? []).map(a => ({
      ...a,
      value: a.value !== null ? a.value : 100,
    }));
    const totalWeight = assessments.reduce((w, a) => w + a.weight, 0);
    if (totalWeight === 0) return sum + computeGP(100, cu);
    const weightedSum = assessments.reduce((w, a) => w + a.value! * a.weight, 0);
    const bestScore = weightedSum / totalWeight;
    return sum + computeGP(Math.round(bestScore), cu);
  }, 0);
  const totalCU = eligible.reduce((sum, s) => sum + (s.creditUnits ?? 1), 0);
  return Math.round((totalGP / totalCU) * 100) / 100;
}
export function defaultNigerianAssessments(): { id: string; label: string; weight: number; value: number | null }[] {
  return [
    { id: crypto.randomUUID(), label: "CA", weight: 30, value: null },
    { id: crypto.randomUUID(), label: "Exam", weight: 70, value: null },
  ];
}
