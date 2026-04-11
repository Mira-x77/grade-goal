/**
 * NigerianAdapter.ts — Nigerian University system adapter
 * 
 * Converts Nigerian academic data to unified dashboard format
 * Handles both semester-based and integrated (subject-based) models
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import {
  DashboardData,
  DashboardSegment,
  DashboardItem,
  DashboardAssessment,
  ClassificationInfo,
} from "@/types/dashboard";
import { AppState, Subject } from "@/types/exam";
import {
  scoreToGrade,
  computeIntegratedSubjectScore,
  computeIntegratedCGPA,
  classifyDegree,
} from "@/lib/grading-nigerian";

export class NigerianAdapter implements AcademicSystemAdapter {
  readonly systemId = "NIGERIAN" as const;

  toDashboardData(appState: AppState): DashboardData {
    const subjects = appState.subjects ?? [];
    const targetMin = appState.targetMin ?? 5;

    // Compute CGPA from integrated subjects (customAssessments model)
    const cgpa = computeIntegratedCGPA(subjects) ?? 0;
    const degreeClass = classifyDegree(cgpa);

    // Check if any data exists
    const hasData = subjects.some(s =>
      s.customAssessments && s.customAssessments.some(a => a.value !== null)
    );

    // Convert subjects to dashboard items
    const items: DashboardItem[] = subjects.map(subject => this.subjectToDashboardItem(subject));

    // Single segment for integrated model
    const segments: DashboardSegment[] = subjects.length > 0 ? [{
      id: "main",
      title: "Courses",
      items,
    }] : [];

    return {
      system: "NIGERIAN",
      performance: {
        value: cgpa,
        max: 5,
        label: "Current GPA",
        suffix: "/ 5.00",
        target: targetMin > 0 ? targetMin : null,
        targetLabel: targetMin > 0 ? `Target: ${targetMin.toFixed(2)} / 5.00` : "",
      },
      segments,
      classification: this.getClassificationInfo(degreeClass),
      hasData,
      isEmpty: subjects.length === 0,
    };
  }

  private subjectToDashboardItem(subject: Subject): DashboardItem {
    // Ensure customAssessments exists (defensive)
    const customAssessments = subject.customAssessments ?? [];

    const assessments: DashboardAssessment[] = customAssessments.map(a => ({
      id: a.id,
      label: a.label,
      value: a.value,
      maxValue: 100,
      weight: a.weight,
    }));

    const score = computeIntegratedSubjectScore(subject);
    const { letter, points } = score !== null ? scoreToGrade(Math.round(score)) : { letter: "—", points: 0 };
    const creditUnits = subject.creditUnits ?? subject.coefficient ?? 0;

    return {
      id: subject.id,
      name: subject.name,
      weight: creditUnits,
      weightLabel: `${creditUnits} CU`,
      score,
      scoreLabel: score !== null ? `${score.toFixed(1)}/100` : "—/100",
      assessments,
      grade: letter,
      gradePoints: points,
    };
  }

  private getClassificationInfo(degreeClass: string): ClassificationInfo {
    const colorMap: Record<string, ClassificationInfo["color"]> = {
      "First Class": "success",
      "Second Class Upper": "primary",
      "Second Class Lower": "warning",
      "Third Class": "warning",
      "Pass": "muted",
      "Fail": "danger",
    };

    return {
      label: degreeClass,
      color: colorMap[degreeClass] ?? "muted",
    };
  }
}
