import { Subject } from "@/types/exam";

/**
 * APC (Cameroonian/French Standard) Subject Average:
 * Step 1: Moy_classe = (Interro + Dev) / 2  (or just the one present if only one)
 * Step 2: Moy_sem    = (Moy_classe + Compo) / 2
 *
 * If Compo is missing: avg = Moy_classe
 * If both Interro and Dev are missing: avg = Compo
 *
 * With 40/60 split: (0.4 * classwork_avg + 0.6 * compo)
 */
export function calcAPCSubjectAverage(
  marks: Subject["marks"],
  weightedSplit: boolean = false
): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null && dev === null && compo === null) return null;

  if (weightedSplit) {
    if (compo === null) return null;
    const classworkMarks = [interro, dev].filter((m) => m !== null) as number[];
    if (classworkMarks.length === 0) return compo;
    const classworkAvg = classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length;
    return 0.4 * classworkAvg + 0.6 * compo;
  }

  // Step 1: Moy_classe = average of available classwork marks (interro + dev)
  const classworkMarks = [interro, dev].filter((m) => m !== null) as number[];
  const moyClasse = classworkMarks.length > 0
    ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
    : null;

  // Step 2: Moy_sem = (Moy_classe + Compo) / 2
  if (moyClasse !== null && compo !== null) return (moyClasse + compo) / 2;
  if (moyClasse !== null) return moyClasse;
  return compo; // only compo present
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
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit);
    if (avg !== null) {
      totalPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }

  return totalCoeff > 0 ? totalPoints / totalCoeff : null;
}

/**
 * Calculate the minimum mark needed in a given slot to reach targetAverage (APC system)
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
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
    }
  }

  const coeff = targetSubject.coefficient;
  const marks = { ...targetSubject.marks };

  if (weightedSplit) {
    // 40/60 split solving
    const otherClasswork = [
      targetMarkType !== "interro" ? marks.interro : null,
      targetMarkType !== "dev" ? marks.dev : null,
    ].filter((m) => m !== null) as number[];

    const compoVal = targetMarkType !== "compo" ? marks.compo : null;

    const neededContrib = (targetAverage * totalCoeff - knownPoints) / coeff;

    if (targetMarkType === "compo") {
      // Solving for compo in: 0.4 * classwork + 0.6 * x = needed
      const classworkAvg = otherClasswork.length > 0
        ? otherClasswork.reduce((a, b) => a + b, 0) / otherClasswork.length
        : 10;
      return (neededContrib - 0.4 * classworkAvg) / 0.6;
    } else {
      // Solving for interro or dev in classwork part
      if (compoVal === null) return null;
      // 0.4 * ((known + x) / n) + 0.6 * compo = needed
      const n = otherClasswork.length + 1;
      const knownSum = otherClasswork.reduce((a, b) => a + b, 0);
      return ((neededContrib - 0.6 * compoVal) / 0.4) * n - knownSum;
    }
  }

  // Default: two-step formula solving
  // Moy_classe = avg(interro, dev); Moy_sem = (Moy_classe + compo) / 2
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;

  if (targetMarkType === "compo") {
    const classworkMarks = [marks.interro, marks.dev].filter(m => m !== null) as number[];
    const moyClasse = classworkMarks.length > 0
      ? classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length
      : null;
    if (moyClasse === null) return neededSubjectAvg;
    return 2 * neededSubjectAvg - moyClasse;
  } else {
    if (marks.compo !== null) {
      const neededMoyClasse = 2 * neededSubjectAvg - marks.compo;
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork !== null) return 2 * neededMoyClasse - otherClasswork;
      return neededMoyClasse;
    } else {
      const otherClasswork = targetMarkType === "interro" ? marks.dev : marks.interro;
      if (otherClasswork !== null) return 2 * neededSubjectAvg - otherClasswork;
      return neededSubjectAvg;
    }
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
    .map((s) => ({ subject: s, avg: calcAPCSubjectAverage(s.marks, weightedSplit) }))
    .filter((x) => x.avg !== null && x.avg < 7) as { subject: Subject; avg: number }[];
}
