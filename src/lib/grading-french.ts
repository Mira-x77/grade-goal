import { Subject, FrenchSubjectData } from "@/types/exam";
import { calcSubjectAverage } from "@/lib/exam-logic";

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
  let hasClassData = false;

  const subjectDetails = subjects.map((sub) => {
    const studentAvg = calcSubjectAverage(sub.marks);
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
    if (classAvg !== null && studentAvg !== null) {
      totalClassPoints += classAvg * sub.coefficient;
      hasClassData = true;
    }

    return { subject: sub, studentAvg, delta, percentile };
  });

  const studentAvg = totalCoeff > 0 ? totalStudentPoints / totalCoeff : null;
  const classAvg = hasClassData && totalCoeff > 0 ? totalClassPoints / totalCoeff : null;
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
