/**
 * dashboard.ts — System-agnostic dashboard data contract
 * 
 * CRITICAL: This is the ONLY data structure Home screen should consume.
 * NO direct access to APC/French/Nigerian raw structures allowed.
 */

export type AcademicSystem = "APC" | "FRENCH" | "NIGERIAN";

/**
 * Unified performance metric (GPA or Average)
 */
export interface PerformanceMetric {
  value: number | null;
  max: number;
  label: string;
  suffix: string;
  target: number | null;
  targetLabel: string;
}

/**
 * A segment represents a grouping of academic items
 * - APC/French: Single segment with all subjects
 * - Nigerian: Multiple segments (one per semester)
 */
export interface DashboardSegment {
  id: string;
  title: string;
  subtitle?: string;
  items: DashboardItem[];
  gpa?: number; // Nigerian: per-semester GPA
}

/**
 * An item is a subject/course with its assessments
 */
export interface DashboardItem {
  id: string;
  name: string;
  weight: number;
  weightLabel: string;
  score: number | null;
  scoreLabel: string;
  assessments: DashboardAssessment[];
  grade?: string; // Nigerian: letter grade (A/B/C/D/E/F)
  gradePoints?: number; // Nigerian: grade points (0-5)
}

/**
 * An assessment is a single evaluation (Interro, CA, Exam, etc.)
 */
export interface DashboardAssessment {
  id: string;
  label: string;
  value: number | null;
  maxValue: number;
  weight?: number; // Nigerian: percentage weight
}

/**
 * Classification/degree info (Nigerian only)
 */
export interface ClassificationInfo {
  label: string;
  color: "success" | "primary" | "warning" | "danger" | "muted";
}

/**
 * Complete dashboard data contract
 */
export interface DashboardData {
  system: AcademicSystem;
  performance: PerformanceMetric;
  segments: DashboardSegment[];
  classification?: ClassificationInfo; // Nigerian: class of degree
  hasData: boolean; // true if any assessments have been entered
  isEmpty: boolean; // true if no subjects/courses exist
}
