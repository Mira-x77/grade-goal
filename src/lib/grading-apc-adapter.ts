import type { GradingEngine, SystemConfig, CourseInput, CourseResult } from "./grading-engine";
import { calcAPCSubjectAverage, calcAPCYearlyAverage } from "./grading-apc";

const apcConfig: SystemConfig = {
  id: "apc",
  label: "APC (Togolese Standard)",
  scoreRange: { min: 0, max: 20 },
  gradeScale: [
    { minScore: 16, maxScore: 20, letter: "A", points: 4 },
    { minScore: 14, maxScore: 15.99, letter: "B", points: 3 },
    { minScore: 12, maxScore: 13.99, letter: "C", points: 2 },
    { minScore: 10, maxScore: 11.99, letter: "D", points: 1 },
    { minScore: 0,  maxScore: 9.99,  letter: "F", points: 0 },
  ],
};

function scoreToLetter(score: number): { letter: string; points: number } {
  for (const entry of apcConfig.gradeScale) {
    if (score >= entry.minScore && score <= entry.maxScore) {
      return { letter: entry.letter, points: entry.points };
    }
  }
  return { letter: "F", points: 0 };
}

export const apcEngine: GradingEngine = {
  config: apcConfig,

  validateScore(score: number): string | null {
    if (score >= 0 && score <= 20) return null;
    return `Score must be between 0 and 20 (got ${score})`;
  },

  computeCourseResult(score: number, _creditUnits?: number): CourseResult {
    const { letter, points } = scoreToLetter(score);
    return { letter, points };
  },

  computePeriodAverage(courses: CourseInput[]): number | null {
    if (courses.length === 0) return null;
    // Map CourseInput to Subject-like objects for calcAPCYearlyAverage
    const subjects = courses.map((c, i) => ({
      id: String(i),
      name: "",
      coefficient: c.coefficient ?? 1,
      marks: { interro: null, dev: null, compo: c.score },
    }));
    return calcAPCYearlyAverage(subjects as any);
  },

  computeCumulativeAverage(periods: CourseInput[][]): number | null {
    const all = periods.flat();
    return this.computePeriodAverage(all);
  },
};
