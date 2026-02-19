export type MarkType = "interro" | "dev" | "compo";

export type GradingSystem = "apc" | "french";

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

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
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

export interface AppState {
  step: "onboarding" | "subjects" | "marks" | "results";
  targetAverage: number;
  subjects: Subject[];
  settings: AppSettings;
}

export type FeedbackStatus = "possible" | "risky" | "impossible";
