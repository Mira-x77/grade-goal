/**
 * nigerian-defaults.ts — Default assessment templates for Nigerian system
 * 
 * CRITICAL: Ensures Nigerian subjects are NEVER created without assessment structure
 */

import { CustomAssessment } from "@/types/exam";

/**
 * Default assessment template for Nigerian courses
 * Exam: 70% (1 item) + CA: 30% (1 item by default)
 */
export const DEFAULT_NIGERIAN_ASSESSMENTS: Omit<CustomAssessment, "id">[] = [
  { label: "Exam", weight: 70, value: null },
  { label: "CA 1", weight: 30, value: null },
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
    coefficient: creditUnits,
    creditUnits,
    customAssessments: [
      { id: `exam_${crypto.randomUUID()}`, label: "Exam", weight: 70, value: null },
      { id: crypto.randomUUID(), label: "CA 1", weight: 30, value: null },
    ],
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
