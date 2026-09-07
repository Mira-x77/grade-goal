import { Subject } from "@/types/exam";

/**
 * Calculate subject average under International French system (AEFE / National French standard):
 * Direct mean of all available assessment marks.
 */
export function calcFrenchSubjectAverage(
  marks: Subject["marks"],
  markStatuses?: Subject["markStatuses"]
): number | null {
  const { interro, dev, compo } = marks;

  const isExcluded = (type: "interro" | "dev" | "compo") =>
    markStatuses?.[type] === "not_done";

  const validMarks: number[] = [];
  if (interro !== null && !isExcluded("interro")) validMarks.push(interro);
  if (dev !== null && !isExcluded("dev")) validMarks.push(dev);
  if (compo !== null && !isExcluded("compo")) validMarks.push(compo);

  if (validMarks.length === 0) return null;
  return validMarks.reduce((a, b) => a + b, 0) / validMarks.length;
}

/**
 * Calculate overall yearly/trimester average for International French system
 * Sum(Subject_Avg * Coefficient) / Sum(Coefficient)
 */
export function calcFrenchYearlyAverage(subjects: Subject[]): number | null {
  let totalPoints = 0;
  let totalCoeff = 0;

  for (const sub of subjects) {
    const avg = calcFrenchSubjectAverage(sub.marks, sub.markStatuses);
    if (avg !== null) {
      totalPoints += avg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
  }

  return totalCoeff > 0 ? totalPoints / totalCoeff : null;
}

/**
 * Get International French Baccalaureate Mention & Status
 */
export function getFrenchMention(score: number): { label: string; code: string; colorClass: string } {
  if (score >= 16) return { label: "Mention Très Bien", code: "TB", colorClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" };
  if (score >= 14) return { label: "Mention Bien", code: "B", colorClass: "text-emerald-500 bg-emerald-50/50 dark:text-emerald-400" };
  if (score >= 12) return { label: "Mention Assez Bien", code: "AB", colorClass: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" };
  if (score >= 10) return { label: "Passable (Admis)", code: "P", colorClass: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" };
  if (score >= 8) return { label: "Rattrapage (2nd groupe)", code: "R", colorClass: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400" };
  return { label: "Ajourné (Non admis)", code: "F", colorClass: "text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-400" };
}

/**
 * Calculate the delta between student's score and class average
 */
export function calcDelta(
  studentAvg: number | null,
  classAvg: number | null
): number | null {
  if (studentAvg === null || classAvg === null) return null;
  return studentAvg - classAvg;
}

/**
 * Calculate percentile position within class min/max range
 * Returns 0-100 where 0 = class min, 100 = class max
 */
export function calcPercentilePosition(
  studentAvg: number | null,
  classMin: number | null,
  classMax: number | null
): number | null {
  if (studentAvg === null || classMin === null || classMax === null) return null;
  if (classMax === classMin) return 50;
  const position = ((studentAvg - classMin) / (classMax - classMin)) * 100;
  return Math.max(0, Math.min(100, Math.round(position * 10) / 10));
}

/**
 * Calculate French system yearly summary across all subjects
 */
export function calcFrenchSummary(subjects: Subject[]): {
  studentAvg: number | null;
  classAvg: number | null;
  overallDelta: number | null;
  overallPercentile: number | null;
  subjectDetails: {
    subject: Subject;
    studentAvg: number | null;
    delta: number | null;
    percentile: number | null;
  }[];
} {
  let totalStudentPoints = 0;
  let totalClassPoints = 0;
  let totalCoeff = 0;
  let totalClassCoeff = 0;
  let hasClassData = false;

  const subjectDetails = subjects.map((sub) => {
    const studentAvg = calcFrenchSubjectAverage(sub.marks, sub.markStatuses);
    const classAvg = sub.french?.classAverage ?? null;
    const delta = calcDelta(studentAvg, classAvg);
    const percentile = calcPercentilePosition(
      studentAvg,
      sub.french?.classMin ?? null,
      sub.french?.classMax ?? null
    );

    if (studentAvg !== null) {
      totalStudentPoints += studentAvg * sub.coefficient;
      totalCoeff += sub.coefficient;
    }
    if (classAvg !== null) {
      totalClassPoints += classAvg * sub.coefficient;
      totalClassCoeff += sub.coefficient;
      hasClassData = true;
    }

    return { subject: sub, studentAvg, delta, percentile };
  });

  const studentAvg = totalCoeff > 0 ? totalStudentPoints / totalCoeff : null;
  const classAvg = hasClassData && totalClassCoeff > 0 ? totalClassPoints / totalClassCoeff : null;
  const overallDelta = calcDelta(studentAvg, classAvg);

  // Overall percentile (simplified: average of subject percentiles)
  const percentiles = subjectDetails
    .map((d) => d.percentile)
    .filter((p) => p !== null) as number[];
  const overallPercentile =
    percentiles.length > 0
      ? Math.round((percentiles.reduce((a, b) => a + b, 0) / percentiles.length) * 10) / 10
      : null;

  return { studentAvg, classAvg, overallDelta, overallPercentile, subjectDetails };
}

/**
 * Track appreciation trend (average over time)
 */
export function getAppreciationTrend(subjects: Subject[]): {
  average: number | null;
  improving: boolean;
  count: number;
} {
  const scores = subjects
    .map((s) => s.french?.appreciation)
    .filter((a) => a !== null && a !== undefined) as number[];

  if (scores.length === 0) return { average: null, improving: false, count: 0 };

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Simple: compare last half vs first half
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid || 1);
  const secondHalf = scores.slice(mid);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  return { average: Math.round(average * 10) / 10, improving: secondAvg >= firstAvg, count: scores.length };
}
