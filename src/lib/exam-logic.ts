import { Subject, FeedbackStatus } from "@/types/exam";

/**
 * Subject average = (Interro + Dev + 2×Compo) / 4
 * Weights: Interro=1, Dev=1, Compo=2
 */
export function calcSubjectAverage(marks: Subject["marks"]): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null && dev === null && compo === null) return null;

  // Use available marks only, weighted
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
 * to reach the target yearly average.
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

  // Known weight and sum in this subject (excluding target mark)
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

  // targetAverage = (knownPoints + ((subKnownSum + x * markWeight) / (subKnownWeight + markWeight)) * coeff) / totalCoeff
  // Solve for x:
  // targetAverage * totalCoeff = knownPoints + ((subKnownSum + x * markWeight) / (subKnownWeight + markWeight)) * coeff
  // (targetAverage * totalCoeff - knownPoints) * (subKnownWeight + markWeight) / coeff = subKnownSum + x * markWeight
  // x = ((targetAverage * totalCoeff - knownPoints) * (subKnownWeight + markWeight) / coeff - subKnownSum) / markWeight

  const coeff = targetSubject.coefficient;
  const totalWeight = subKnownWeight + markWeight;

  const neededSubjectContribution = targetAverage * totalCoeff - knownPoints;
  const neededSubjectAvgTimesWeight = neededSubjectContribution / coeff * totalWeight;
  const x = (neededSubjectAvgTimesWeight - subKnownSum) / markWeight;

  return x;
}

/**
 * Get feedback status based on required mark
 */
export function getFeedbackStatus(requiredMark: number | null): FeedbackStatus {
  if (requiredMark === null) return "possible";
  if (requiredMark <= 16) return "possible";
  if (requiredMark <= 20) return "risky";
  return "impossible";
}

/**
 * Get predicted range based on current marks
 */
export function getPredictedRange(subjects: Subject[]): { min: number; max: number } | null {
  // Simulate: for empty marks, use pessimistic (8) and optimistic (18) values
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
