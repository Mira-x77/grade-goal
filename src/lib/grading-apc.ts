import { Subject } from "@/types/exam";

/**
 * APC Subject Average — two-step APC school formula:
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
  let rawAvg: number;
  if (compoVal === null) rawAvg = moyClasse!;
  else if (moyClasse === null) rawAvg = compoVal;
  else rawAvg = (moyClasse + compoVal) / 2;

  // Official Togolese school report card software truncates Moy.sem to 2 decimal places
  return Math.floor(rawAvg * 100) / 100;
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

  // A mark is excluded if its status is "not_done" or if it is already filled
  const isExcluded = (type: "interro" | "dev" | "compo") =>
    targetSubject.markStatuses?.[type] === "not_done";

  if (targetSubject.marks[targetMarkType] !== null || isExcluded(targetMarkType)) {
    return null;
  }

  // Known points from active subjects (only subjects with at least one valid mark)
  let knownPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    if (sub.id === targetSubjectId) continue;
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit, sub.markStatuses);
    if (avg !== null) {
      knownPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }

  // Always include the target subject's coefficient
  totalCoeff += targetSubject.coefficient;

  const coeff = targetSubject.coefficient;
  const marks = { ...targetSubject.marks };
  const neededSubjectAvg = (targetAverage * totalCoeff - knownPoints) / coeff;

  if (weightedSplit) {
    // 40/60 split solving
    const otherClasswork: number[] = [];
    if (targetMarkType !== "interro" && marks.interro !== null && targetSubject.markStatuses?.interro !== "not_done") {
      otherClasswork.push(marks.interro);
    }
    if (targetMarkType !== "dev" && marks.dev !== null && targetSubject.markStatuses?.dev !== "not_done") {
      otherClasswork.push(marks.dev);
    }

    const compoVal = targetMarkType !== "compo" && targetSubject.markStatuses?.compo !== "not_done" ? marks.compo : null;

    if (targetMarkType === "compo") {
      if (otherClasswork.length === 0) return neededSubjectAvg;
      const moyClasse = otherClasswork.reduce((a, b) => a + b, 0) / otherClasswork.length;
      return (neededSubjectAvg - 0.4 * moyClasse) / 0.6;
    } else {
      if (compoVal === null) return null;
      const n = otherClasswork.length + 1;
      const knownSum = otherClasswork.reduce((a, b) => a + b, 0);
      return ((neededSubjectAvg - 0.6 * compoVal) / 0.4) * n - knownSum;
    }
  }

  // Default two-step formula solving
  if (targetMarkType === "compo") {
    // neededSubjectAvg = (Moy_classe + x) / 2  →  x = 2 * neededSubjectAvg - Moy_classe
    const classworkMarks: number[] = [];
    if (marks.interro !== null && targetSubject.markStatuses?.interro !== "not_done") {
      classworkMarks.push(marks.interro);
    }
    if (marks.dev !== null && targetSubject.markStatuses?.dev !== "not_done") {
      classworkMarks.push(marks.dev);
    }
    if (classworkMarks.length === 0) return neededSubjectAvg;
    const moyClasse = classworkMarks.reduce((a, b) => a + b, 0) / classworkMarks.length;
    return 2 * neededSubjectAvg - moyClasse;
  } else {
    // Solving for interro or dev
    const compoVal = targetSubject.markStatuses?.compo !== "not_done" ? marks.compo : null;
    const otherType = targetMarkType === "interro" ? "dev" : "interro";
    const otherClasswork = targetSubject.markStatuses?.[otherType] !== "not_done" ? marks[otherType] : null;

    if (compoVal === null) {
      if (otherClasswork === null) return neededSubjectAvg;
      return 2 * neededSubjectAvg - otherClasswork;
    }
    const neededMoyClasse = 2 * neededSubjectAvg - compoVal;
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

export type SubjectCategory = "littéraire" | "scientifique" | "secondaire" | "autre";

/**
 * Categorize subject based on explicitly set category or standard subject name heuristics
 */
export function getSubjectCategory(subjectName: string, category?: string): SubjectCategory {
  if (category && ["littéraire", "scientifique", "secondaire", "autre"].includes(category.toLowerCase())) {
    return category.toLowerCase() as SubjectCategory;
  }

  const name = subjectName.toLowerCase();
  if (/math|physique|chimie|svt|informatique|technologie|ti\b|science/.test(name)) {
    return "scientifique";
  }
  if (/français|francais|anglais|english|histo|géo|geo|histoire|géographie|ecm|philo|philosophie|allemand|espagnol|litté/.test(name)) {
    return "littéraire";
  }
  if (/dessin|musique|eps|sport|catéchèse|catechese|art/.test(name)) {
    return "secondaire";
  }
  return "autre";
}

export interface GroupAverage {
  category: SubjectCategory;
  label: string;
  average: number | null;
  totalPoints: number;
  totalCoeff: number;
  subjectCount: number;
}

/**
 * Calculate weighted averages for subject categories (Matières Scientifiques, Littéraires, etc.)
 */
export function calcAPCGroupAverages(
  subjects: Subject[],
  weightedSplit: boolean = false
): GroupAverage[] {
  const groups: Record<SubjectCategory, { label: string; points: number; coeff: number; count: number }> = {
    scientifique: { label: "Matières Scientifiques", points: 0, coeff: 0, count: 0 },
    littéraire: { label: "Matières Littéraires", points: 0, coeff: 0, count: 0 },
    secondaire: { label: "Matières Secondaires", points: 0, coeff: 0, count: 0 },
    autre: { label: "Autres Matières", points: 0, coeff: 0, count: 0 },
  };

  for (const sub of subjects) {
    const cat = getSubjectCategory(sub.name, sub.category);
    const avg = calcAPCSubjectAverage(sub.marks, weightedSplit, sub.markStatuses);
    if (avg !== null) {
      groups[cat].points += avg * sub.coefficient;
      groups[cat].coeff += sub.coefficient;
      groups[cat].count += 1;
    }
  }

  return (Object.keys(groups) as SubjectCategory[])
    .filter((cat) => groups[cat].count > 0)
    .map((cat) => ({
      category: cat,
      label: groups[cat].label,
      average: groups[cat].coeff > 0 ? groups[cat].points / groups[cat].coeff : null,
      totalPoints: groups[cat].points,
      totalCoeff: groups[cat].coeff,
      subjectCount: groups[cat].count,
    }));
}

/**
 * Calculate annual average from 1st and 2nd Semester averages
 */
export function calcAPCAnnualAverage(s1Avg: number | null, s2Avg: number | null): number | null {
  if (s1Avg !== null && s2Avg !== null) return (s1Avg + s2Avg) / 2;
  return s1Avg ?? s2Avg ?? null;
}

/**
 * Calculate minimum 2nd Semester average required to reach a target Annual average
 */
export function calcAPCNeededS2Average(s1Avg: number, targetAnnual: number): number {
  return 2 * targetAnnual - s1Avg;
}

/**
 * Get official Togolese / Francophone teacher appreciation remark and color badge
 */
export function getAPCTeacherAppreciation(score: number): { label: string; colorClass: string } {
  if (score >= 16) return { label: "Très bien", colorClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" };
  if (score >= 14) return { label: "Bien", colorClass: "text-emerald-500 bg-emerald-50/50 dark:text-emerald-400" };
  if (score >= 12) return { label: "Assez-bien", colorClass: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" };
  if (score >= 10) return { label: "Passable", colorClass: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" };
  if (score >= 8) return { label: "Insuffisant", colorClass: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400" };
  if (score >= 5) return { label: "Faible", colorClass: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" };
  return { label: "Très faible", colorClass: "text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-400" };
}

