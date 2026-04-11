/**
 * APCAdapter.ts — APC system adapter
 * 
 * Converts APC (Togolese) academic data to unified dashboard format
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import { DashboardData, DashboardSegment, DashboardItem, DashboardAssessment } from "@/types/dashboard";
import { AppState, Subject } from "@/types/exam";
import { calcAPCSubjectAverage, calcAPCYearlyAverage } from "@/lib/grading-apc";

export class APCAdapter implements AcademicSystemAdapter {
  readonly systemId = "APC" as const;

  toDashboardData(appState: AppState): DashboardData {
    const subjects = appState.subjects ?? [];
    const weightedSplit = appState.settings?.apcWeightedSplit ?? false;
    const targetMin = appState.targetMin ?? appState.targetAverage ?? 16;

    // Compute current average
    const currentAvg = subjects.length > 0
      ? calcAPCYearlyAverage(subjects, weightedSplit)
      : null;

    // Check if any data exists
    const hasData = subjects.some(s =>
      s.marks.interro !== null || s.marks.dev !== null || s.marks.compo !== null
    );

    // Convert subjects to dashboard items
    const items: DashboardItem[] = subjects.map(subject => this.subjectToDashboardItem(subject, weightedSplit));

    // Single segment for APC (no semester breakdown)
    const segments: DashboardSegment[] = subjects.length > 0 ? [{
      id: "main",
      title: "All Subjects",
      items,
    }] : [];

    return {
      system: "APC",
      performance: {
        value: currentAvg,
        max: 20,
        label: "Current Average",
        suffix: "/20",
        target: targetMin,
        targetLabel: `Target: ${targetMin}–20`,
      },
      segments,
      hasData,
      isEmpty: subjects.length === 0,
    };
  }

  private subjectToDashboardItem(subject: Subject, weightedSplit: boolean): DashboardItem {
    const assessments: DashboardAssessment[] = [
      {
        id: "interro",
        label: "Interro",
        value: subject.marks.interro,
        maxValue: 20,
      },
      {
        id: "dev",
        label: "Devoir",
        value: subject.marks.dev,
        maxValue: 20,
      },
      {
        id: "compo",
        label: "Compo",
        value: subject.marks.compo,
        maxValue: 20,
      },
    ];

    const score = calcAPCSubjectAverage(subject.marks, weightedSplit);

    return {
      id: subject.id,
      name: subject.name,
      weight: subject.coefficient,
      weightLabel: `Coeff ${subject.coefficient}`,
      score,
      scoreLabel: score !== null ? `${score.toFixed(1)}/20` : "—/20",
      assessments,
    };
  }
}
