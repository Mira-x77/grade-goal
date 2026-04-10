import type { NigerianState } from "./nigerian";

export type MarkType = "interro" | "dev" | "compo";

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
  value: number | null; // score 0–100
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
  step: "onboarding" | "subjects" | "marks" | "results";
  targetAverage: number;   // kept for backward compat — use targetMin going forward
  targetMin: number;       // minimum of the target range (user-set)
  subjects: Subject[];
  settings: AppSettings;
  studentName?: string;
  classLevel?: string;
  serie?: string;
  semester?: string;
  department?: string;      // Nigerian: department/faculty
  universityLevel?: string; // Nigerian: 100/200/300/400/500
  savedStrategy?: SavedStrategy;
  nigerianState?: NigerianState; // only populated when gradingSystem === "nigerian_university"
}

export type FeedbackStatus = "possible" | "risky" | "impossible";
