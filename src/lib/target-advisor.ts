/**
 * Target Advisor Module
 * Calculates progress relative to the user's onboarding end-of-year goal.
 * Detects whether the user is:
 * - Surpassing their goal
 * - On track to achieve their goal
 * - Behind target (needs improvement)
 * Provides actionable recommendations on what subjects to improve.
 */

import { Subject, GradingSystem } from "@/types/exam";
import { calcYearlyAverage } from "./exam-logic";
import { calcAPCYearlyAverage, calcAPCSubjectAverage } from "./grading-apc";

export interface SubjectImprovementAdvice {
  subjectId: string;
  subjectName: string;
  coefficient: number;
  currentAvg: number | null;
  neededGain: number;
  impactOnTotalAvg: number;
  reason: string;
}

export interface TargetProgressAnalysis {
  status: "surpassing" | "on_track" | "behind" | "no_data";
  currentAvg: number | null;
  targetMin: number;
  gap: number; // positive if surpassing, negative if behind
  badgeText: string;
  badgeVariant: "emerald" | "blue" | "amber" | "muted";
  headline: string;
  summary: string;
  improvements: SubjectImprovementAdvice[];
}

export function analyzeTargetProgress(
  subjects: Subject[],
  targetMin: number,
  gradingSystem: GradingSystem = "apc",
  weightedSplit: boolean = false
): TargetProgressAnalysis {
  if (!subjects || subjects.length === 0) {
    return {
      status: "no_data",
      currentAvg: null,
      targetMin,
      gap: 0,
      badgeText: "No Subjects",
      badgeVariant: "muted",
      headline: "Add your subjects to start tracking",
      summary: "Enter your marks to get personalized end-of-year predictions.",
      improvements: [],
    };
  }

  // Calculate current average based on system
  const currentAvg = gradingSystem === "apc"
    ? calcAPCYearlyAverage(subjects, weightedSplit)
    : calcYearlyAverage(subjects);

  if (currentAvg === null) {
    return {
      status: "no_data",
      currentAvg: null,
      targetMin,
      gap: 0,
      badgeText: "No Marks Logged",
      badgeVariant: "muted",
      headline: "Log your first marks to see predictions",
      summary: `Your end-of-year target is ${targetMin.toFixed(1)}/20. Enter test or exam marks to calculate progress.`,
      improvements: [],
    };
  }

  const gap = currentAvg - targetMin;
  const totalCoeff = subjects.reduce((sum, s) => sum + s.coefficient, 0);

  let status: "surpassing" | "on_track" | "behind";
  let badgeText: string;
  let badgeVariant: "emerald" | "blue" | "amber";
  let headline: string;
  let summary: string;

  if (gap >= 0.5) {
    status = "surpassing";
    badgeText = "🌟 Surpassing Target";
    badgeVariant = "emerald";
    headline = "Outstanding Performance!";
    summary = `Your current average of ${currentAvg.toFixed(2)}/20 is surpassing your end-of-year goal of ${targetMin.toFixed(2)}/20 by +${gap.toFixed(2)} points.`;
  } else if (gap >= -0.5) {
    status = "on_track";
    badgeText = "✅ On Track";
    badgeVariant = "blue";
    headline = "You're On Track!";
    summary = `Your current average of ${currentAvg.toFixed(2)}/20 is on target for your end-of-year goal of ${targetMin.toFixed(2)}/20.`;
  } else {
    status = "behind";
    badgeText = "⚠️ Behind Target";
    badgeVariant = "amber";
    headline = "Needs Improvement";
    summary = `Your current average of ${currentAvg.toFixed(2)}/20 is ${Math.abs(gap).toFixed(2)} points below your end-of-year goal of ${targetMin.toFixed(2)}/20.`;
  }

  // Calculate high-impact improvements (focus on subjects with high coefficient & lowest score)
  const improvements: SubjectImprovementAdvice[] = subjects
    .map((sub) => {
      const avg = gradingSystem === "apc"
        ? calcAPCSubjectAverage(sub.marks, weightedSplit, sub.markStatuses)
        : calcAPCSubjectAverage(sub.marks, false, sub.markStatuses);
      
      const val = avg ?? 0;
      const targetGap = Math.max(0, targetMin - val);
      const impactOnTotalAvg = (targetGap * sub.coefficient) / (totalCoeff || 1);

      let reason = "";
      if (avg === null) {
        reason = `No marks logged yet (Coef ${sub.coefficient}).`;
      } else if (val < 10) {
        reason = `Below passing mark (${val.toFixed(2)}/20, Coef ${sub.coefficient}).`;
      } else if (val < targetMin) {
        reason = `Currently ${val.toFixed(2)}/20 (below your target of ${targetMin.toFixed(1)}/20).`;
      } else {
        reason = `Solid score (${val.toFixed(2)}/20).`;
      }

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        coefficient: sub.coefficient,
        currentAvg: avg,
        neededGain: Math.round(targetGap * 10) / 10,
        impactOnTotalAvg: Math.round(impactOnTotalAvg * 100) / 100,
        reason,
      };
    })
    .filter((item) => item.currentAvg === null || item.currentAvg < targetMin)
    .sort((a, b) => b.impactOnTotalAvg - a.impactOnTotalAvg)
    .slice(0, 3); // Top 3 recommended areas for improvement

  return {
    status,
    currentAvg,
    targetMin,
    gap,
    badgeText,
    badgeVariant,
    headline,
    summary,
    improvements,
  };
}
