import { Subject, FeedbackStatus } from "@/types/exam";

/**
 * Truncate a number to 2 decimal places (floor), matching French school subject average display.
 * e.g. 14.125 → "14.12", 17.125 → "17.12"
 * Use this for SUBJECT averages only.
 */
export function fmtAvg(value: number): string {
  return (Math.floor(value * 100) / 100).toFixed(2);
}

/**
 * Round a number to 2 decimal places, for FINAL/yearly average display.
 * e.g. 12.9688 → "12.97"
 */
export function fmtFinalAvg(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

/**
 * Subject average — French/Cameroonian school formula:
 * Step 1: Moy_classe = (Interro + Dev) / 2  (average of available classwork)
 * Step 2: Moy_sem    = (Moy_classe + Compo) / 2
 *
 * If Compo missing: avg = Moy_classe
 * If both classwork missing: avg = Compo
 */
export function calcSubjectAverage(marks: Subject["marks"]): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null && dev === null && compo === null) return null;

  const classworkMarks = [interro, dev].filter((m) => m !== null) as number[];
  const moyClasse = classworkMarks.length > 0
    ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
    : null;

  if (moyClasse !== null && compo !== null) return (moyClasse + compo) / 2;
  if (moyClasse !== null) return moyClasse;
  return compo;
}

/**
 * Full subject average when all marks are present
 */
export function calcFullSubjectAverage(marks: Subject["marks"]): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null || dev === null || compo === null) return null;
  const moyClasse = (interro + dev) / 2;
  return (moyClasse + compo) / 2;
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
  // Only count subjects that have at least one mark entered
  let knownPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    if (sub.id === targetSubjectId) continue;
    const avg = calcSubjectAverage(sub.marks);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }
  // Always include the target subject's coefficient
  totalCoeff += targetSubject.coefficient;

  // For the target subject, solve for x using the two-step formula:
  // Moy_classe = avg of (interro, dev) that are present
  // Moy_sem = (Moy_classe + compo) / 2
  // We need: Moy_sem * coeff contributes to reach targetAverage
  const marks = { ...targetSubject.marks };
  const coeff = targetSubject.coefficient;
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;

  if (targetMarkType === "compo") {
    // Moy_sem = (Moy_classe + x) / 2 = neededSubjectAvg
    // x = 2 * neededSubjectAvg - Moy_classe
    const classworkMarks = [marks.interro, marks.dev].filter(m => m !== null) as number[];
    const moyClasse = classworkMarks.length > 0
      ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
      : null;
    if (moyClasse === null) return neededSubjectAvg; // no classwork, avg = compo
    return 2 * neededSubjectAvg - moyClasse;
  } else {
    // Solving for interro or dev (classwork)
    // Moy_classe = (known_classwork + x) / n_classwork
    // Moy_sem = (Moy_classe + compo) / 2 = neededSubjectAvg
    if (marks.compo !== null) {
      // Moy_classe = 2 * neededSubjectAvg - compo
      const neededMoyClasse = 2 * neededSubjectAvg - marks.compo;
      // neededMoyClasse = (other_classwork + x) / n
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork !== null) return 2 * neededMoyClasse - otherClasswork;
      return neededMoyClasse; // only this classwork mark present
    } else {
      // No compo yet — avg = Moy_classe only
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork !== null) return 2 * neededSubjectAvg - otherClasswork;
      return neededSubjectAvg;
    }
  }
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
    const moyClasse = (marks.interro! + marks.dev!) / 2;
    const avg = (moyClasse + marks.compo!) / 2;
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

  const min = (() => { const mc = (pessimistic.interro + pessimistic.dev) / 2; return (mc + pessimistic.compo) / 2; })();
  const max = (() => { const mc = (optimistic.interro + optimistic.dev) / 2; return (mc + optimistic.compo) / 2; })();

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
