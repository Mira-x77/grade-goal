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

export interface AppState {
  step: "onboarding" | "subjects" | "marks" | "results";
  targetAverage: number;
  subjects: Subject[];
}

export type FeedbackStatus = "possible" | "risky" | "impossible";
