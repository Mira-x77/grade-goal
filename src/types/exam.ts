export type MarkType = "interro" | "dev" | "compo";

export interface Mark {
  type: MarkType;
  value: number | null; // null = not yet taken
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
}

export interface GradingWeights {
  interro: number;
  dev: number;
  compo: number;
  locked: boolean;
}

export type RoundingMode = "exact" | "standard" | "school";

export interface ColorThresholds {
  greenBelow: number;   // distance from target where green applies
  yellowBelow: number;  // distance from target where yellow applies
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  weights: { interro: 1, dev: 1, compo: 2, locked: false },
  rounding: "standard",
  colorThresholds: { greenBelow: 0, yellowBelow: 2 },
  notifications: { targetUnreachable: true, subjectCritical: true, canSaveAverage: true },
};

export interface AppState {
  step: "onboarding" | "subjects" | "marks" | "results";
  targetAverage: number;
  subjects: Subject[];
  settings: AppSettings;
}

export type FeedbackStatus = "possible" | "risky" | "impossible";
