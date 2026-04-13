import { Subject } from "@/types/exam";

/**
 * APC Subject Average — two-step Cameroonian school formula:
 * Step 1: Moy_classe = average of present classwork marks (interro, dev)
 *         respecting markStatuses ("not_done" marks are excluded)
 * Step 2: Moy_sem = (Moy_classe + compo) / 2
 *
 * With 40/60 split: (0.4 * Moy_classe + 0.6 * compo)
 */
export function calcAPCSubjectAverage(
  marks: Subject["marks"],
  weightedSplit: boolean = false,
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

  const moyClasse =
    classworkMarks.length > 0
      ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
      : null;

  if (weightedSplit) {
    // 40/60 split: classwork = 40%, compo = 60%
    if (compoVal === null) return null; // need compo for this mode
    if (moyClasse === null) return compoVal; // only compo
    return 0.4 * moyClasse + 0.6 * compoVal;
  }

  // Default two-step formula
  if (compoVal === null) return moyClasse;   // only classwork
  if (moyClasse === null) return compoVal;   // only compo
  return (moyClasse + compoVal) / 2;
}

/**
 * APC Yearly/Semester Average = sum(subject_avg × coeff) / sum(coeff)
 */
export function calcAPCYearlyAverage(
  subjects: Subject[],
  weightedSplit: boolean = false
): number | null {
  let totalPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit, sub.markStatuses);
    if (avg !== null) {
      totalPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }

  return totalCoeff > 0 ? totalPoints / totalCoeff : null;
}

/**
 * Calculate the minimum mark needed in a given slot to reach targetAverage (APC system)
 * Uses the two-step formula algebra.
 */
export function calcAPCMinimumMark(
  subjects: Subject[],
  targetSubjectId: string,
  targetMarkType: "interro" | "dev" | "compo",
  targetAverage: number,
  weightedSplit: boolean = false
): number | null {
  const targetSubject = subjects.find((s) => s.id === targetSubjectId);
  if (!targetSubject) return null;
  if (targetSubject.marks[targetMarkType] !== null) return null;

  // Known points from other subjects
  let knownPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    totalCoeff += sub.coefficient;
    if (sub.id === targetSubjectId) continue;
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit, sub.markStatuses);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
    }
  }

  const coeff = targetSubject.coefficient;
  const marks = { ...targetSubject.marks };
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;

  if (weightedSplit) {
    // 40/60 split solving
    const otherClasswork = [
      targetMarkType !== "interro" ? marks.interro : null,
      targetMarkType !== "dev" ? marks.dev : null,
    ].filter((m) => m !== null) as number[];

    const compoVal = targetMarkType !== "compo" ? marks.compo : null;

    if (targetMarkType === "compo") {
      // 0.4 * Moy_classe + 0.6 * x = neededSubjectAvg
      const moyClasse =
        otherClasswork.length > 0
          ? otherClasswork.reduce((a, b) => a + b, 0) / otherClasswork.length
          : 10;
      return (neededSubjectAvg - 0.4 * moyClasse) / 0.6;
    } else {
      // Solving for interro or dev in classwork part
      if (compoVal === null) return null;
      // 0.4 * ((knownSum + x) / n) + 0.6 * compo = neededSubjectAvg
      const n = otherClasswork.length + 1;
      const knownSum = otherClasswork.reduce((a, b) => a + b, 0);
      return ((neededSubjectAvg - 0.6 * compoVal) / 0.4) * n - knownSum;
    }
  }

  // Default two-step formula solving
  if (targetMarkType === "compo") {
    // neededSubjectAvg = (Moy_classe + x) / 2  →  x = 2 * neededSubjectAvg - Moy_classe
    const classworkMarks: number[] = [];
    if (marks.interro !== null) classworkMarks.push(marks.interro);
    if (marks.dev !== null) classworkMarks.push(marks.dev);
    if (classworkMarks.length === 0) return neededSubjectAvg;
    const moyClasse = classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length;
    return 2 * neededSubjectAvg - moyClasse;
  } else {
    // Solving for interro or dev
    const compoVal = marks.compo;
    if (compoVal === null) {
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork === null) return neededSubjectAvg;
      return 2 * neededSubjectAvg - otherClasswork;
    }
    const neededMoyClasse = 2 * neededSubjectAvg - compoVal;
    const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
    if (otherClasswork === null) return neededMoyClasse;
    return 2 * neededMoyClasse - otherClasswork;
  }
}

/**
 * Performance alerts: subjects with coeff >= 3 and avg < 7
 */
export function getPerformanceAlerts(
  subjects: Subject[],
  weightedSplit: boolean = false
): { subject: Subject; avg: number }[] {
  return subjects
    .filter((s) => s.coefficient >= 3)
    .map((s) => ({ subject: s, avg: calcAPCSubjectAverage(s.marks, weightedSplit, s.markStatuses) }))
    .filter((x) => x.avg !== null && x.avg < 7) as { subject: Subject; avg: number }[];
}
