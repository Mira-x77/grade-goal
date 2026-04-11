import { Subject } from "@/types/exam";

/**
 * APC (Cameroonian/French Standard) Subject Average:
 * Default: (Interro + Devoir + 2×Compo) / 4  — composition counts double
 * With 40/60 split: (0.4 * classwork_avg + 0.6 * compo)
 *   where classwork_avg = (interro + dev) / 2
 */
export function calcAPCSubjectAverage(
  marks: Subject["marks"],
  weightedSplit: boolean = false
): number | null {
  const { interro, dev, compo } = marks;
  if (interro === null && dev === null && compo === null) return null;

  if (weightedSplit) {
    // 40/60 split: classwork (interro+dev) = 40%, compo = 60%
    if (compo === null) return null;
    const classworkMarks = [interro, dev].filter((m) => m !== null) as number[];
    if (classworkMarks.length === 0) return compo;
    const classworkAvg = classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length;
    return 0.4 * classworkAvg + 0.6 * compo;
  }

  // Default: (Interro + Dev + 2×Compo) / 4 — composition weighted ×2
  let sum = 0;
  let weight = 0;
  if (interro !== null) { sum += interro * 1; weight += 1; }
  if (dev !== null)     { sum += dev * 1;     weight += 1; }
  if (compo !== null)   { sum += compo * 2;   weight += 2; }

  return weight > 0 ? sum / weight : null;
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

  // Default: (I+D+2C)/4 solving
  // Subject avg = (known_weighted_sum + x*markWeight) / totalWeight
  let subKnownSum = 0;
  let subKnownWeight = 0;
  if (targetMarkType !== "interro" && marks.interro !== null) { subKnownSum += marks.interro * 1; subKnownWeight += 1; }
  if (targetMarkType !== "dev"     && marks.dev     !== null) { subKnownSum += marks.dev * 1;     subKnownWeight += 1; }
  if (targetMarkType !== "compo"   && marks.compo   !== null) { subKnownSum += marks.compo * 2;   subKnownWeight += 2; }

  const markWeight = targetMarkType === "compo" ? 2 : 1;
  const totalWeight = subKnownWeight + markWeight;
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;
  return (neededSubjectAvg * totalWeight - subKnownSum) / markWeight;
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
