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
  computeCGPA,
  classifyDegree,
} from "@/lib/grading-nigerian";

export class NigerianAdapter implements AcademicSystemAdapter {
  readonly systemId = "NIGERIAN" as const;

  toDashboardData(appState: AppState): DashboardData {
    const subjects = appState.subjects ?? [];
    const rawTarget = appState.targetMin ?? appState.targetAverage ?? 3.0;
    const targetMin = rawTarget > 5 ? 3.0 : rawTarget;
    const nigerianState = appState.nigerianState;
    const semesterCount = (nigerianState?.semesters ?? []).length;

    // ── Semester-based mode: use active semester if one exists ──
    if (nigerianState && nigerianState.semesters.length > 0) {
      const activeSemId = nigerianState.activeSemesterId;
      const activeSem = activeSemId
        ? nigerianState.semesters.find(s => s.id === activeSemId)
        : nigerianState.semesters[nigerianState.semesters.length - 1]; // default to last

      const cgpa = computeCGPA(nigerianState.semesters);
      const currentGPA = activeSem ? activeSem.gpa : cgpa;
      const degreeClass = classifyDegree(cgpa);
      const hasData = (activeSem?.courses.length ?? 0) > 0;

      return {
        system: "NIGERIAN",
        performance: {
          value: hasData ? (semesterCount > 1 ? cgpa : currentGPA) : null,
          max: 5,
          label: semesterCount > 1 ? "Current CGPA" : "Current GPA",
          suffix: "",
          target: targetMin > 0 ? targetMin : null,
          targetLabel: targetMin > 0 ? `Target: ${targetMin.toFixed(2)}` : "",
        },
        segments: [],
        classification: this.getClassificationInfo(degreeClass),
        hasData,
        isEmpty: (activeSem?.courses.length ?? 0) === 0,
      };
    }

    // ── Integrated mode: use subjects with customAssessments ──
    const repairedSubjects = subjects.map(s => ({
      ...s,
      creditUnits: s.creditUnits ?? s.coefficient ?? 1,
      customAssessments: s.customAssessments ?? [],
    }));

    const cgpa = computeIntegratedCGPA(repairedSubjects);
    const degreeClass = classifyDegree(cgpa ?? 0);
    const hasData = repairedSubjects.some(s =>
      s.customAssessments && s.customAssessments.some(a => a.value !== null)
    );

    const items: DashboardItem[] = repairedSubjects.map(subject => this.subjectToDashboardItem(subject));
    const segments: DashboardSegment[] = repairedSubjects.length > 0 ? [{
      id: "main", title: "Courses", items,
    }] : [];

    return {
      system: "NIGERIAN",
      performance: {
        value: cgpa,
        max: 5,
        label: "Current GPA",
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
