import { Subject, FeedbackStatus, MarkStatus } from "@/types/exam";

/**
 * Subject average — two-step Cameroonian school formula:
 * Step 1: Moy_classe = average of present classwork marks (interro, dev)
 * Step 2: Moy_sem = (Moy_classe + compo) / 2
 *
 * Marks with status "not_done" are excluded from calculation.
 */
export function calcSubjectAverage(
  marks: Subject["marks"],
  markStatuses?: Subject["markStatuses"]
): number | null {
  const { interro, dev, compo } = marks;

  // A mark is excluded if its status is "not_done"
  const isExcluded = (type: "interro" | "dev" | "compo") =>
    markStatuses?.[type] === "not_done";

  const interroVal = !isExcluded("interro") ? interro : null;
  const devVal = !isExcluded("dev") ? dev : null;
  const compoVal = !isExcluded("compo") ? compo : null;

  if (interroVal === null && devVal === null && compoVal === null) return null;

  // Compute Moy_classe from available classwork marks
  const classworkMarks: number[] = [];
  if (interroVal !== null) classworkMarks.push(interroVal);
  if (devVal !== null) classworkMarks.push(devVal);

  const hasMoyClasse = classworkMarks.length > 0;
  const moyClasse = hasMoyClasse
    ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
    : null;

  if (compoVal === null) {
    // Only classwork present
    return moyClasse;
  }
  if (moyClasse === null) {
    // Only compo present
    return compoVal;
  }
  // Both classwork and compo present
  return (moyClasse + compoVal) / 2;
}

/**
 * Full subject average when all marks are present — two-step formula
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
    const avg = calcSubjectAverage(sub.marks, sub.markStatuses);
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
 * Uses the two-step formula: Moy_sem = (Moy_classe + compo) / 2
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
    if (sub.id === targetSubjectId) continue;
    const avg = calcSubjectAverage(sub.marks, sub.markStatuses);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }
  // Always include the target subject's coefficient
  totalCoeff += targetSubject.coefficient;

  const coeff = targetSubject.coefficient;
  const marks = { ...targetSubject.marks };

  // neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;

  if (targetMarkType === "compo") {
    // Solving for compo:
    //   neededSubjectAvg = (Moy_classe + x) / 2
    //   x = 2 × neededSubjectAvg − Moy_classe
    const classworkMarks: number[] = [];
    if (marks.interro !== null) classworkMarks.push(marks.interro);
    if (marks.dev !== null) classworkMarks.push(marks.dev);

    if (classworkMarks.length === 0) {
      // No classwork at all — compo alone: return = neededSubjectAvg
      return neededSubjectAvg;
    }
    const moyClasse = classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length;
    return 2 * neededSubjectAvg - moyClasse;
  } else {
    // Solving for interro or dev (classwork):
    //   neededSubjectAvg = (Moy_classe + compo) / 2
    //   neededMoyClasse = 2 × neededSubjectAvg − compo
    //   x = 2 × neededMoyClasse − otherClasswork  (if other classwork exists)
    //   x = neededMoyClasse                        (if no other classwork)
    const compoVal = marks.compo;
    if (compoVal === null) {
      // No compo yet — only classwork will be used, avg = Moy_classe = x (or avg of x + other)
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork === null) {
        // x is the only mark — avg = x
        return neededSubjectAvg;
      }
      // avg = (otherClasswork + x) / 2 → x = 2 * neededSubjectAvg - otherClasswork
      return 2 * neededSubjectAvg - otherClasswork;
    }
    const neededMoyClasse = 2 * neededSubjectAvg - compoVal;
    const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
    if (otherClasswork === null) {
      // x is the only classwork mark → Moy_classe = x
      return neededMoyClasse;
    }
    // Moy_classe = (otherClasswork + x) / 2 → x = 2 * neededMoyClasse - otherClasswork
    return 2 * neededMoyClasse - otherClasswork;
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
 * Uses the two-step formula.
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

  const minMoyClasse = (pessimistic.interro + pessimistic.dev) / 2;
  const min = (minMoyClasse + pessimistic.compo) / 2;
  const maxMoyClasse = (optimistic.interro + optimistic.dev) / 2;
  const max = (maxMoyClasse + optimistic.compo) / 2;

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

/**
 * Subject averages — respects rounding setting
 * - "exact": full precision (up to 4dp)
 * - "standard": round to 2dp (default)
 * - "school": floor to nearest 0.25
 */
export function fmtAvg(value: number, rounding: "exact" | "standard" | "school" = "standard"): string {
  if (rounding === "exact") return value.toFixed(4).replace(/\.?0+$/, "");
  if (rounding === "school") return (Math.floor(value * 4) / 4).toFixed(2);
  // standard: truncate (floor) to 2dp — matches school report style
  return (Math.floor(value * 100) / 100).toFixed(2);
}

/**
 * Final/yearly average — respects rounding setting
 */
export function fmtFinalAvg(value: number, rounding: "exact" | "standard" | "school" = "standard"): string {
  if (rounding === "exact") return value.toFixed(4).replace(/\.?0+$/, "");
  if (rounding === "school") return (Math.floor(value * 4) / 4).toFixed(2);
  // standard: round to 2dp
  return (Math.round(value * 100) / 100).toFixed(2);
}

/** Read the current rounding setting from localStorage */
export function getRounding(): "exact" | "standard" | "school" {
  try {
    const raw = localStorage.getItem("scoretarget_state");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.settings?.rounding ?? "standard";
  } catch { return "standard"; }
}
