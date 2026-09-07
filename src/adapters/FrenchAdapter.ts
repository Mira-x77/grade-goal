/**
 * FrenchAdapter.ts — International French system adapter (AEFE / National French standard)
 * 
 * Converts French academic data to unified dashboard format with:
 * - Direct weighted mean calculation
 * - International Baccalaureate Mentions (Très Bien, Bien, Assez Bien, Passable, Rattrapage)
 * - Class average delta & percentile ranking
 */

import { AcademicSystemAdapter } from "./AcademicSystemAdapter";
import { DashboardData, DashboardSegment, DashboardItem, DashboardAssessment } from "@/types/dashboard";
import { AppState, Subject } from "@/types/exam";
import { calcFrenchSubjectAverage, calcFrenchYearlyAverage, getFrenchMention } from "@/lib/grading-french";

export class FrenchAdapter implements AcademicSystemAdapter {
  readonly systemId = "AEFE" as const;

  toDashboardData(appState: AppState): DashboardData {
    const subjects = appState.subjects ?? [];
    const targetMin = appState.targetMin ?? appState.targetAverage ?? 16;

    // Compute current overall average under International French AEFE rules
    const currentAvg = subjects.length > 0 ? calcFrenchYearlyAverage(subjects) : null;
    const mention = currentAvg !== null ? getFrenchMention(currentAvg) : undefined;

    // Check if any data exists
    const hasData = subjects.some(
      (s) => s.marks.interro !== null || s.marks.dev !== null || s.marks.compo !== null
    );

    // Convert subjects to dashboard items
    const items: DashboardItem[] = subjects.map((subject) => this.subjectToDashboardItem(subject));

    const segments: DashboardSegment[] =
      subjects.length > 0
        ? [
            {
              id: "aefe_main",
              title: "Matières du Bulletin AEFE",
              items,
            },
          ]
        : [];

    return {
      system: "AEFE",
      performance: {
        value: currentAvg,
        max: 20,
        label: mention?.label ?? "",
        suffix: "/20",
        target: targetMin,
        targetLabel: `Objectif: ${targetMin}–20`,
      },
      segments,
      hasData,
      isEmpty: subjects.length === 0,
    };
  }

  private subjectToDashboardItem(subject: Subject): DashboardItem {
    const assessments: DashboardAssessment[] = [
      {
        id: "interro",
        label: "Interrogation / TP",
        value: subject.marks.interro,
        maxValue: 20,
      },
      {
        id: "dev",
        label: "Devoir Surveillé (DS)",
        value: subject.marks.dev,
        maxValue: 20,
      },
      {
        id: "compo",
        label: "Épreuve / Compo",
        value: subject.marks.compo,
        maxValue: 20,
      },
    ];

    const score = calcFrenchSubjectAverage(subject.marks, subject.markStatuses);
    const subMention = score !== null ? getFrenchMention(score) : undefined;

    return {
      id: subject.id,
      name: subject.name,
      weight: subject.coefficient,
      weightLabel: `Coeff ${subject.coefficient}`,
      score,
      scoreLabel: score !== null ? `${score.toFixed(1)}/20 (${subMention?.code || ""})` : "—/20",
      assessments,
    };
  }
}
