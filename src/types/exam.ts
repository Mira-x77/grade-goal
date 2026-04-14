import type { NigerianState } from "./nigerian";

export type MarkType = "interro" | "dev" | "compo";

export type MarkStatus = "done" | "not_done" | "unknown";

export type GradingSystem = "apc" | "french" | "nigerian_university";

export interface Mark {
  type: MarkType;
  value: number | null;
}

export interface FrenchSubjectData {
  classAverage: number | null;
  classMin: number | null;
  classMax: number | null;
  appreciation: number | null; // 1-5 sentiment scale
}

export interface CustomAssessment {
  id: string;
  label: string;
  weight: number;   // percentage weight (e.g. 30 for 30%)
  value: number | null; // score entered by student
  maxScore?: number;    // what the score is tracked over (default 100)
}

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
  creditUnits?: number;        // Nigerian: credit units (1–6), replaces coefficient semantically
  customAssessments?: CustomAssessment[]; // Nigerian: dynamic assessments
  marks: {
    interro: number | null;
    dev: number | null;
    compo: number | null;
  };
  markStatuses?: {
    interro: MarkStatus;
    dev: MarkStatus;
    compo: MarkStatus;
  };
  french?: FrenchSubjectData;
}

export interface GradingWeights {
  interro: number;
  dev: number;
  compo: number;
  locked: boolean;
}

export type RoundingMode = "exact" | "standard" | "school";

export interface ColorThresholds {
  greenBelow: number;
  yellowBelow: number;
}

export interface NotificationSettings {
  targetUnreachable: boolean;
  subjectCritical: boolean;
  canSaveAverage: boolean;
}

export interface AppSettings {
  weights: GradingWeights;
  rounding: RoundingMode;
  colorThresholds: ColorThresholds;
  notifications: NotificationSettings;
  gradingSystem: GradingSystem;
  apcWeightedSplit: boolean; // 40/60 classwork/exam split toggle
  accentColor?: string;      // persisted accent color for cross-device sync
}

export const DEFAULT_SETTINGS: AppSettings = {
  weights: { interro: 1, dev: 1, compo: 2, locked: false },
  rounding: "standard",
  colorThresholds: { greenBelow: 0, yellowBelow: 2 },
  notifications: { targetUnreachable: true, subjectCritical: true, canSaveAverage: true },
  gradingSystem: "apc",
  apcWeightedSplit: false,
};

export interface StrategyMark {
  subjectId: string;
  subjectName: string;
  markType: "interro" | "dev" | "compo";
  targetValue: number;
}

export interface SavedStrategy {
  savedAt: string;
  simulatedAverage: number;
  marks: StrategyMark[];
}

export interface AppState {
  step: "onboarding" | "subjects" | "marks";
  targetAverage: number;   // kept for backward compat — use targetMin going forward
  targetMin: number;       // minimum of the target range (user-set)
  subjects: Subject[];
  settings: AppSettings;
  studentName?: string;
  classLevel?: string;
  serie?: string;
  semester?: string;       // current active semester label (APC)
  department?: string;      // Nigerian: department/faculty
  universityLevel?: string; // Nigerian: 100/200/300/400/500
  savedStrategy?: SavedStrategy;
  nigerianState?: NigerianState; // only populated when gradingSystem === "nigerian_university"
  // Multi-semester history for APC/French
  apcSemesters?: ApcSemester[];
  activeApcSemesterId?: string;
}

/** A single archived or active APC/French semester snapshot */
export interface ApcSemester {
  id: string;
  label: string;           // e.g. "1st Semester"
  academicYear?: string;   // e.g. "2023/2024"
  classLevel?: string;
  serie?: string;
  subjects: Subject[];
  targetMin: number;
  archived: boolean;       // true = locked read-only
  archivedAt?: string;     // ISO date
}

export type FeedbackStatus = "possible" | "risky" | "impossible";
