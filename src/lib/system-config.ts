/**
 * system-config.ts — Single source of truth for all educational system configurations.
 * NO imports from grading files — all compute logic is inlined to avoid circular deps.
 */

// ── SubjectData ───────────────────────────────────────────────────────────────

export interface SubjectData {
  id: string;
  name: string;
  weight: number;
  fixedScores?: Record<string, number | null>;
  dynamicAssessments?: { id: string; label: string; weight: number; value: number | null }[];
}

// ── SystemSchema ──────────────────────────────────────────────────────────────

export interface SystemSchema {
  id: string;
  label: string;
  scoreRange: { min: number; max: number };
  scoreDisplay: string;
  averageLabel: string;
  averageDisplay: string;
  averageMax: number;
  emptyStateValue: string;
  subjectWeightType: "coefficient" | "credit_units";
  subjectWeightLabel: string;
  subjectWeightDefault: number;
  subjectWeightRange: { min: number; max: number };
  assessmentModel: "fixed" | "dynamic";
  fixedAssessments?: { key: string; label: string; weight: number; maxScore: number }[];
  targetLabel: string;
  targetMax: number;
  targetStep: number;
  features: {
    library: boolean;
    simulator: boolean;
    frenchClassView: boolean;
    performanceAlerts: boolean;
  };
  computeSubjectScore: (subject: SubjectData) => number | null;
  computeOverallScore: (subjects: SubjectData[]) => number | null;
}

// ── Inlined APC grade logic (no external imports) ────────────────────────────

function apcSubjectScore(subject: SubjectData): number | null {
  const interro = subject.fixedScores?.interro ?? null;
  const dev = subject.fixedScores?.dev ?? null;
  const compo = subject.fixedScores?.compo ?? null;
  if (interro === null && dev === null && compo === null) return null;
  const totalWeight = (interro !== null ? 1 : 0) + (dev !== null ? 1 : 0) + (compo !== null ? 2 : 0);
  if (totalWeight === 0) return null;
  const sum = (interro !== null ? interro * 1 : 0)
            + (dev !== null ? dev * 1 : 0)
            + (compo !== null ? compo * 2 : 0);
  return sum / totalWeight;
}

function apcOverallScore(subjects: SubjectData[]): number | null {
  let totalPoints = 0;
  let totalWeight = 0;
  for (const s of subjects) {
    const avg = apcSubjectScore(s);
    if (avg !== null) {
      totalPoints += avg * s.weight;
      totalWeight += s.weight;
    }
  }
  return totalWeight > 0 ? totalPoints / totalWeight : null;
}

// ── Inlined Nigerian grade logic (no external imports) ───────────────────────

const NIGERIAN_GRADE_SCALE = [
  { min: 70, max: 100, points: 5 },
  { min: 60, max: 69,  points: 4 },
  { min: 50, max: 59,  points: 3 },
  { min: 45, max: 49,  points: 2 },
  { min: 40, max: 44,  points: 1 },
  { min: 0,  max: 39,  points: 0 },
];

function nigerianGradePoints(score: number): number {
  return NIGERIAN_GRADE_SCALE.find(g => score >= g.min && score <= g.max)?.points ?? 0;
}

function nigerianSubjectScore(subject: SubjectData): number | null {
  const assessments = subject.dynamicAssessments;
  if (!assessments || assessments.length === 0) return null;
  const filled = assessments.filter(a => a.value !== null);
  if (filled.length === 0) return null;
  const totalWeight = filled.reduce((s, a) => s + a.weight, 0);
  if (totalWeight === 0) return null;
  return filled.reduce((s, a) => s + a.value! * a.weight, 0) / totalWeight;
}

function nigerianOverallScore(subjects: SubjectData[]): number | null {
  const scoreable = subjects.filter(s => {
    const score = nigerianSubjectScore(s);
    return score !== null && (s.weight ?? 0) > 0;
  });
  if (scoreable.length === 0) return null;
  const totalGP = scoreable.reduce((sum, s) => {
    const score = nigerianSubjectScore(s)!;
    return sum + nigerianGradePoints(Math.round(score)) * s.weight;
  }, 0);
  const totalCU = scoreable.reduce((sum, s) => sum + s.weight, 0);
  return Math.round((totalGP / totalCU) * 100) / 100;
}

// ── APC config ────────────────────────────────────────────────────────────────

const apcConfig: SystemSchema = {
  id: "apc",
  label: "APC (Togolese Standard)",
  scoreRange: { min: 0, max: 20 },
  scoreDisplay: "/20",
  averageLabel: "Average",
  averageDisplay: "/20",
  averageMax: 20,
  emptyStateValue: "—",
  subjectWeightType: "coefficient",
  subjectWeightLabel: "Coeff",
  subjectWeightDefault: 1,
  subjectWeightRange: { min: 1, max: 10 },
  assessmentModel: "fixed",
  fixedAssessments: [
    { key: "interro", label: "Interro", weight: 1, maxScore: 20 },
    { key: "dev",     label: "Devoir",  weight: 1, maxScore: 20 },
    { key: "compo",   label: "Compo",   weight: 2, maxScore: 20 },
  ],
  targetLabel: "Target Average",
  targetMax: 20,
  targetStep: 0.5,
  features: { library: true, simulator: true, frenchClassView: false, performanceAlerts: true },
  computeSubjectScore: apcSubjectScore,
  computeOverallScore: apcOverallScore,
};

// ── French config ─────────────────────────────────────────────────────────────

const frenchConfig: SystemSchema = {
  ...apcConfig,
  id: "french",
  label: "French System",
  features: { ...apcConfig.features, frenchClassView: true },
};

// ── Nigerian Integrated config ────────────────────────────────────────────────

const nigerianIntegratedConfig: SystemSchema = {
  id: "nigerian_integrated",
  label: "Nigerian University (Integrated)",
  scoreRange: { min: 0, max: 100 },
  scoreDisplay: "/100",
  averageLabel: "GPA",
  averageDisplay: "/5.00",
  averageMax: 5,
  emptyStateValue: "0.00 GPA",
  subjectWeightType: "credit_units",
  subjectWeightLabel: "CU",
  subjectWeightDefault: 3,
  subjectWeightRange: { min: 1, max: 6 },
  assessmentModel: "dynamic",
  targetLabel: "Target GPA",
  targetMax: 5,
  targetStep: 0.05,
  features: { library: false, simulator: false, frenchClassView: false, performanceAlerts: false },
  computeSubjectScore: nigerianSubjectScore,
  computeOverallScore: nigerianOverallScore,
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const SYSTEM_CONFIGS: Record<string, SystemSchema> = {
  apc: apcConfig,
  french: frenchConfig,
  nigerian_integrated: nigerianIntegratedConfig,
};

export function getSystemConfig(id: string): SystemSchema {
  return SYSTEM_CONFIGS[id] ?? SYSTEM_CONFIGS.apc;
}

export function resolveSystemConfigId(
  gradingSystem: string,
  nigerianMode?: "dashboard" | "integrated"
): string {
  if (gradingSystem === "nigerian_university" && nigerianMode === "integrated") {
    return "nigerian_integrated";
  }
  return gradingSystem;
}

export function subjectToSubjectData(subject: {
  id: string;
  name: string;
  coefficient: number;
  creditUnits?: number;
  marks: { interro: number | null; dev: number | null; compo: number | null };
  customAssessments?: { id: string; label: string; weight: number; value: number | null }[];
}): SubjectData {
  return {
    id: subject.id,
    name: subject.name,
    weight: subject.creditUnits ?? subject.coefficient,
    fixedScores: {
      interro: subject.marks.interro,
      dev: subject.marks.dev,
      compo: subject.marks.compo,
    },
    dynamicAssessments: subject.customAssessments?.map(a => ({
      id: a.id,
      label: a.label,
      weight: a.weight,
      value: a.value,
    })),
  };
}

export function formatOverallScore(score: number | null, config: SystemSchema): string {
  if (score === null) return config.emptyStateValue;
  return config.id === "nigerian_integrated" ? score.toFixed(2) : score.toFixed(1);
}
