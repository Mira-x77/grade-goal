/**
 * nigerian-defaults.ts — Default assessment templates for Nigerian system
 * 
 * CRITICAL: Ensures Nigerian subjects are NEVER created without assessment structure
 */

import { CustomAssessment } from "@/types/exam";

/**
 * Default assessment template for Nigerian courses
 * Standard: 30% CA (Continuous Assessment) + 70% Exam
 */
export const DEFAULT_NIGERIAN_ASSESSMENTS: Omit<CustomAssessment, "id">[] = [
  {
    label: "CA",
    weight: 30,
    value: null,
  },
  {
    label: "Exam",
    weight: 70,
    value: null,
  },
];

/**
 * Create a new Nigerian subject with default assessments
 */
export function createNigerianSubject(name: string, creditUnits: number = 1): {
  id: string;
  name: string;
  coefficient: number;
  creditUnits: number;
  customAssessments: CustomAssessment[];
  marks: { interro: null; dev: null; compo: null };
} {
  return {
    id: crypto.randomUUID(),
    name,
    coefficient: creditUnits, // Keep for backward compat
    creditUnits,
    customAssessments: DEFAULT_NIGERIAN_ASSESSMENTS.map(a => ({
      ...a,
      id: crypto.randomUUID(),
    })),
    marks: { interro: null, dev: null, compo: null },
  };
}

/**
 * Ensure a subject has valid assessment structure
 * Repairs subjects that were created without assessments
 */
export function ensureNigerianAssessments(subject: any): any {
  if (!subject.customAssessments || subject.customAssessments.length === 0) {
    return {
      ...subject,
      customAssessments: DEFAULT_NIGERIAN_ASSESSMENTS.map(a => ({
        ...a,
        id: crypto.randomUUID(),
      })),
    };
  }
  return subject;
}
