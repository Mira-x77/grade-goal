/**
 * NigerianAdapter.ts — Nigerian University system adapter
 *
 * Single source of truth: state.subjects[].customAssessments
 *
 * - Live GPA is always computed from customAssessments (integrated mode)
 * - Archived semesters store a snapshot in nigerianState.semesters[].courses
 * - CGPA = weighted average of archived semester GPAs + current integrated GPA
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
  computeSemesterGPA,
  classifyDegree,
} from "@/lib/grading-nigerian";

export class NigerianAdapter implements AcademicSystemAdapter {
  readonly systemId = "NIGERIAN" as const;

  toDashboardData(appState: AppState): DashboardData {
    const subjects = appState.subjects ?? [];
    const rawTarget = appState.targetMin ?? appState.targetAverage ?? 3.0;
    const targetMin = rawTarget > 5 ? 3.0 : rawTarget;
    const nigerianState = appState.nigerianState;

    // ── Always use integrated mode for live GPA ──
    const repairedSubjects = subjects.map(s => ({
      ...s,
      creditUnits: s.creditUnits ?? s.coefficient ?? 1,
      customAssessments: s.customAssessments ?? [],
    }));

    const currentGPA = computeIntegratedCGPA(repairedSubjects);
    const hasData = repairedSubjects.some(s =>
      s.customAssessments && s.customAssessments.some(a => a.value !== null)
    );

    // ── CGPA: combine archived semester GPAs with current GPA ──
    const archivedSemesters = (nigerianState?.semesters ?? []).filter(s => s.archived && s.courses.length > 0);
    const hasMultipleSemesters = archivedSemesters.length > 0;

    let cgpa: number | null = currentGPA;
    let label = "Current GPA";

    if (hasMultipleSemesters) {
      // Weighted average: archived semester GPs + current semester GP
      const archivedTotalGP = archivedSemesters.reduce((sum, sem) => {
        const totalCU = sem.courses.reduce((s, c) => s + c.creditUnits, 0);
        return sum + sem.gpa * totalCU;
      }, 0);
      const archivedTotalCU = archivedSemesters.reduce((sum, sem) =>
        sum + sem.courses.reduce((s, c) => s + c.creditUnits, 0), 0);

      const currentTotalCU = repairedSubjects.reduce((s, sub) => s + sub.creditUnits, 0);
      const currentGP = (currentGPA ?? 0) * currentTotalCU;

      const totalGP = archivedTotalGP + currentGP;
      const totalCU = archivedTotalCU + currentTotalCU;
      cgpa = totalCU > 0 ? Math.round((totalGP / totalCU) * 100) / 100 : currentGPA;
      label = "Current CGPA";
    }

    const degreeClass = classifyDegree(cgpa ?? 0);
    const items: DashboardItem[] = repairedSubjects.map(s => this.subjectToDashboardItem(s));
    const segments: DashboardSegment[] = repairedSubjects.length > 0 ? [{ id: "main", title: "Courses", items }] : [];

    return {
      system: "NIGERIAN",
      performance: {
        value: hasData ? cgpa : null,
        max: 5,
        label,
        suffix: "",
        target: targetMin > 0 ? targetMin : null,
        targetLabel: targetMin > 0 ? `Target: ${targetMin.toFixed(2)}` : "",
      },
      segments,
      classification: this.getClassificationInfo(degreeClass),
      hasData,
      isEmpty: repairedSubjects.length === 0,
    };
  }

  private subjectToDashboardItem(subject: Subject): DashboardItem {
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
    return { label: degreeClass, color: colorMap[degreeClass] ?? "muted" };
  }
}
