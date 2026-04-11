export interface GradeScaleEntry {
  minScore: number;
  maxScore: number;
  letter: string;
  points: number;
}

export interface ClassificationThreshold {
  minCGPA: number;
  label: string;
}

export interface SystemConfig {
  id: string;
  label: string;
  scoreRange: { min: number; max: number };
  creditUnitRange?: { min: number; max: number };
  gradeScale: GradeScaleEntry[];
  classificationThresholds?: ClassificationThreshold[];
}

export interface CourseInput {
  score: number;
  creditUnits?: number;
  coefficient?: number;
}

export interface CourseResult {
  letter: string;
  points: number;      // grade points (e.g. 5 for A)
  gradePoint?: number; // GP = points × creditUnits (Nigerian only)
}

export interface GradingEngine {
  config: SystemConfig;
  /** Validate a raw score; returns null if valid, error string if invalid */
  validateScore(score: number): string | null;
  /** Validate credit units; returns null if valid, error string if invalid */
  validateCreditUnits?(creditUnits: number): string | null;
  /** Compute a single-course/subject result */
  computeCourseResult(score: number, creditUnits?: number): CourseResult;
  /** Compute a period-level average (semester GPA or term average) */
  computePeriodAverage(courses: CourseInput[]): number | null;
  /** Compute a cumulative average (CGPA or overall average) */
  computeCumulativeAverage(periods: CourseInput[][]): number | null;
}
