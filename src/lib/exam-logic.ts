import { Subject, FeedbackStatus } from "@/types/exam";

/**
 * Subject average = (Interro + Dev + 2×Compo) / 4
 * Weights: Interro=1, Dev=1, Compo=2
 */
export function calcSubjectAverage(marks: Subject["marks"]): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null && dev === null && compo === null) return null;

  let sum = 0;
  let weight = 0;
  if (interro !== null) { sum += interro * 1; weight += 1; }
  if (dev !== null) { sum += dev * 1; weight += 1; }
  if (compo !== null) { sum += compo * 2; weight += 2; }

  return weight > 0 ? sum / weight : null;
}

/**
 * Full subject average when all marks are present
 */
export function calcFullSubjectAverage(marks: Subject["marks"]): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null || dev === null || compo === null) return null;
  return (interro + dev + 2 * compo) / 4;
}

/**
 * Yearly average = sum(subject_avg × coeff) / sum(coefficients)
 */
export function calcYearlyAverage(subjects: Subject[]): number | null {
  let totalPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    const avg = calcSubjectAverage(sub.marks);
    if (avg !== null) {
      totalPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }

  return totalCoeff > 0 ? totalPoints / totalCoeff : null;
}

/**
 * For a given subject and mark type, calculate the minimum value needed
 * to reach the target yearly average. Works with ANY combination of entered marks.
 */
export function calcMinimumMarkNeeded(
  subjects: Subject[],
  targetSubjectId: string,
  targetMarkType: "interro" | "dev" | "compo",
  targetAverage: number
): number | null {
  const targetSubject = subjects.find((s) => s.id === targetSubjectId);
  if (!targetSubject) return null;
  if (targetSubject.marks[targetMarkType] !== null) return null; // already filled

  // Sum of known points from other subjects
  let knownPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    totalCoeff += sub.coefficient;
    if (sub.id === targetSubjectId) continue;
    const avg = calcSubjectAverage(sub.marks);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
    }
  }

  // For the target subject, calculate partial known marks
  const marks = { ...targetSubject.marks };
  const markWeight = targetMarkType === "compo" ? 2 : 1;

  let subKnownSum = 0;
  let subKnownWeight = 0;
  if (targetMarkType !== "interro" && marks.interro !== null) {
    subKnownSum += marks.interro * 1;
    subKnownWeight += 1;
  }
  if (targetMarkType !== "dev" && marks.dev !== null) {
    subKnownSum += marks.dev * 1;
    subKnownWeight += 1;
  }
  if (targetMarkType !== "compo" && marks.compo !== null) {
    subKnownSum += marks.compo * 2;
    subKnownWeight += 2;
  }

  const coeff = targetSubject.coefficient;
  const totalWeight = subKnownWeight + markWeight;

  const neededSubjectContribution = targetAverage * totalCoeff - knownPoints;
  const neededSubjectAvgTimesWeight = neededSubjectContribution / coeff * totalWeight;
  const x = (neededSubjectAvgTimesWeight - subKnownSum) / markWeight;

  return x;
}

/**
 * Calculate all possible required marks for a subject with multiple unknowns.
 * Returns best-case and worst-case bounds for each unknown.
 */
export function calcAllRequiredMarks(
  subjects: Subject[],
  subjectId: string,
  targetAverage: number
): { markType: string; needed: number | null; status: FeedbackStatus; label: string }[] {
  const sub = subjects.find((s) => s.id === subjectId);
  if (!sub) return [];

  const emptyMarks = (["interro", "dev", "compo"] as const).filter(
    (t) => sub.marks[t] === null
  );

  const markLabels: Record<string, string> = {
    interro: "Interro",
    dev: "Devoir",
    compo: "Composition",
  };

  return emptyMarks.map((markType) => {
    const needed = calcMinimumMarkNeeded(subjects, subjectId, markType, targetAverage);
    const status = getFeedbackStatus(needed);
    const label = markLabels[markType];

    return { markType, needed, status, label };
  });
}

/**
 * Calculate best-case and worst-case subject average for subjects with unknowns.
 * Unknown marks: pessimistic=0, optimistic=20
 */
export function calcSubjectBounds(marks: Subject["marks"]): { min: number; max: number } | null {
  const hasAnyMark = marks.interro !== null || marks.dev !== null || marks.compo !== null;
  const hasAllMarks = marks.interro !== null && marks.dev !== null && marks.compo !== null;

  if (hasAllMarks) {
    const avg = (marks.interro! + marks.dev! + 2 * marks.compo!) / 4;
    return { min: avg, max: avg };
  }

  if (!hasAnyMark) return null;

  const pessimistic = {
    interro: marks.interro ?? 0,
    dev: marks.dev ?? 0,
    compo: marks.compo ?? 0,
  };
  const optimistic = {
    interro: marks.interro ?? 20,
    dev: marks.dev ?? 20,
    compo: marks.compo ?? 20,
  };

  const min = (pessimistic.interro + pessimistic.dev + 2 * pessimistic.compo) / 4;
  const max = (optimistic.interro + optimistic.dev + 2 * optimistic.compo) / 4;

  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/**
 * Get feedback status based on required mark
 */
export function getFeedbackStatus(requiredMark: number | null): FeedbackStatus {
  if (requiredMark === null) return "possible";
  if (requiredMark <= 0) return "possible"; // already safe
  if (requiredMark <= 16) return "possible";
  if (requiredMark <= 20) return "risky";
  return "impossible";
}

/**
 * Get predicted range based on current marks
 */
export function getPredictedRange(subjects: Subject[]): { min: number; max: number } | null {
  const pessimisticSubjects = subjects.map((s) => ({
    ...s,
    marks: {
      interro: s.marks.interro ?? 8,
      dev: s.marks.dev ?? 8,
      compo: s.marks.compo ?? 8,
    },
  }));

  const optimisticSubjects = subjects.map((s) => ({
    ...s,
    marks: {
      interro: s.marks.interro ?? 18,
      dev: s.marks.dev ?? 18,
      compo: s.marks.compo ?? 18,
    },
  }));

  const min = calcYearlyAverage(pessimisticSubjects);
  const max = calcYearlyAverage(optimisticSubjects);

  if (min === null || max === null) return null;
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/**
 * Get absolute bounds (0 and 20 for unknowns)
 */
export function getAbsoluteBounds(subjects: Subject[]): { min: number; max: number } | null {
  const worst = subjects.map((s) => ({
    ...s,
    marks: {
      interro: s.marks.interro ?? 0,
      dev: s.marks.dev ?? 0,
      compo: s.marks.compo ?? 0,
    },
  }));

  const best = subjects.map((s) => ({
    ...s,
    marks: {
      interro: s.marks.interro ?? 20,
      dev: s.marks.dev ?? 20,
      compo: s.marks.compo ?? 20,
    },
  }));

  const min = calcYearlyAverage(worst);
  const max = calcYearlyAverage(best);

  if (min === null || max === null) return null;
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/**
 * Rank subjects by impact = coefficient × remaining empty mark weight
 */
export function rankSubjectsByImpact(subjects: Subject[]): { subject: Subject; impact: number; emptyMarkType: string | null }[] {
  return subjects
    .map((sub) => {
      let emptyWeight = 0;
      let firstEmpty: string | null = null;
      if (sub.marks.interro === null) { emptyWeight += 1; if (!firstEmpty) firstEmpty = "interro"; }
      if (sub.marks.dev === null) { emptyWeight += 1; if (!firstEmpty) firstEmpty = "dev"; }
      if (sub.marks.compo === null) { emptyWeight += 2; if (!firstEmpty) firstEmpty = "compo"; }
      return { subject: sub, impact: sub.coefficient * emptyWeight, emptyMarkType: firstEmpty };
    })
    .filter((x) => x.impact > 0)
    .sort((a, b) => b.impact - a.impact);
}

/**
 * Get "already safe" label for marks that need < 0
 */
export function getMarkLabel(needed: number | null): string {
  if (needed === null) return "—";
  if (needed <= 0) return "Already safe ✅";
  if (needed > 20) return "Target unreachable ❌";
  return `Need ${needed.toFixed(1)}/20`;
}

/**
 * Simulate yearly average with hypothetical marks
 */
export function simulateYearlyAverage(
  subjects: Subject[],
  overrides: { subjectId: string; markType: "interro" | "dev" | "compo"; value: number }[]
): number | null {
  const simSubjects = subjects.map((s) => {
    const subOverrides = overrides.filter((o) => o.subjectId === s.id);
    const marks = { ...s.marks };
    for (const o of subOverrides) {
      marks[o.markType] = o.value;
    }
    return { ...s, marks };
  });
  return calcYearlyAverage(simSubjects);
}
