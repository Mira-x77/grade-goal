import { describe, it, expect } from "vitest";
import { Subject } from "@/types/exam";
import {
  calcAPCSubjectAverage,
  calcAPCYearlyAverage,
  calcAPCMinimumMark,
  calcAPCGroupAverages,
  calcAPCAnnualAverage,
  calcAPCNeededS2Average,
  getAPCTeacherAppreciation,
} from "@/lib/grading-apc";

describe("APC Cameroonian/Togolese Report Card Calculation Tests", () => {
  // Official Semester 1 Data from Report Card
  const s1Subjects: Subject[] = [
    { id: "1", name: "Catéchèse", coefficient: 1, category: "autre", marks: { interro: 19.5, dev: 20, compo: 14.5 } },
    { id: "2", name: "Français", coefficient: 2, marks: { interro: 15, dev: 13, compo: 12 } },
    { id: "3", name: "Anglais", coefficient: 2, marks: { interro: 17, dev: 17, compo: 17 } },
    { id: "4", name: "Histo-Géo", coefficient: 2, marks: { interro: 9, dev: 15, compo: 16 } },
    { id: "5", name: "ECM", coefficient: 2, marks: { interro: 16, dev: 15, compo: 17 } },
    { id: "6", name: "Philosophie", coefficient: 1, marks: { interro: 10, dev: 12, compo: 11 } },
    { id: "7", name: "Mathématiques", coefficient: 4, marks: { interro: 4, dev: 10, compo: 7 } },
    { id: "8", name: "Sciences Physiques", coefficient: 3, marks: { interro: 10, dev: 8, compo: 7 } },
    { id: "9", name: "SVT", coefficient: 3, marks: { interro: 12, dev: 18, compo: 18 } },
    { id: "10", name: "Dessin", coefficient: 1, marks: { interro: 11, dev: 13.5, compo: 16 } },
    { id: "11", name: "Musique", coefficient: 1, marks: { interro: 10, dev: 19, compo: 19 } },
    { id: "12", name: "EPS", coefficient: 1, marks: { interro: null, dev: 15, compo: 18 } },
    { id: "13", name: "Allemand*", coefficient: 1, category: "secondaire", marks: { interro: 11, dev: 16, compo: 14 } },
  ];

  it("should calculate exact subject averages for Semester 1", () => {
    // Catéchèse: Moy_classe = (19.5+20)/2 = 19.75, Moy_sem = (19.75+14.5)/2 = 17.125
    expect(calcAPCSubjectAverage(s1Subjects[0].marks)).toBeCloseTo(17.125);

    // Français: Moy_classe = (15+13)/2 = 14, Moy_sem = (14+12)/2 = 13.0
    expect(calcAPCSubjectAverage(s1Subjects[1].marks)).toBeCloseTo(13.0);

    // Mathématiques: Moy_classe = (4+10)/2 = 7, Moy_sem = (7+7)/2 = 7.0
    expect(calcAPCSubjectAverage(s1Subjects[6].marks)).toBeCloseTo(7.0);

    // Sciences Physiques: Moy_classe = (10+8)/2 = 9, Moy_sem = (9+7)/2 = 8.0
    expect(calcAPCSubjectAverage(s1Subjects[7].marks)).toBeCloseTo(8.0);

    // EPS (no Interro): Moy_classe = 15, Moy_sem = (15+18)/2 = 16.5
    expect(calcAPCSubjectAverage(s1Subjects[11].marks)).toBeCloseTo(16.5);
  });

  it("should calculate Semester 1 overall average matching report card (12.97)", () => {
    const s1Avg = calcAPCYearlyAverage(s1Subjects);
    expect(s1Avg).not.toBeNull();
    expect(Math.round(s1Avg! * 100) / 100).toBe(12.97);
  });

  it("should calculate category group averages correctly for Semester 1", () => {
    const groupAvgs = calcAPCGroupAverages(s1Subjects);
    
    const scientific = groupAvgs.find((g) => g.category === "scientifique");
    expect(scientific).toBeDefined();
    expect(Math.round(scientific!.average! * 100) / 100).toBe(10.15);

    const literary = groupAvgs.find((g) => g.category === "littéraire");
    expect(literary).toBeDefined();
    expect(Math.round(literary!.average! * 100) / 100).toBe(14.61);

    const secondary = groupAvgs.find((g) => g.category === "secondaire");
    expect(secondary).toBeDefined();
    expect(Math.round(secondary!.average! * 100) / 100).toBe(15.28);
  });

  it("should calculate Annual Average from S1 and S2 matching report card (11.84)", () => {
    const s1Avg = 12.97;
    const s2Avg = 10.71;
    const annual = calcAPCAnnualAverage(s1Avg, s2Avg);
    expect(Math.round(annual! * 100) / 100).toBe(11.84);
  });

  it("should calculate minimum required S2 average given S1 average", () => {
    const s1Avg = 12.97;
    const targetAnnual = 10.0; // Promotion threshold
    const neededS2 = calcAPCNeededS2Average(s1Avg, targetAnnual);
    expect(neededS2).toBeCloseTo(7.03);
  });

  it("should return correct teacher appreciation remarks", () => {
    expect(getAPCTeacherAppreciation(17.12).label).toBe("Très bien");
    expect(getAPCTeacherAppreciation(14.12).label).toBe("Bien");
    expect(getAPCTeacherAppreciation(13.0).label).toBe("Assez-bien");
    expect(getAPCTeacherAppreciation(11.0).label).toBe("Passable");
    expect(getAPCTeacherAppreciation(9.0).label).toBe("Insuffisant");
    expect(getAPCTeacherAppreciation(7.0).label).toBe("Faible");
    expect(getAPCTeacherAppreciation(3.0).label).toBe("Très faible");
  });

  it("should calculate minimum required mark without total coefficient inflation bug", () => {
    // Unentered subjects with null marks
    const testSubjects: Subject[] = [
      { id: "1", name: "Maths", coefficient: 4, marks: { interro: 10, dev: 10, compo: null } },
      { id: "2", name: "Physics", coefficient: 3, marks: { interro: 10, dev: 10, compo: 10 } },
      { id: "3", name: "English", coefficient: 2, marks: { interro: null, dev: null, compo: null } }, // Empty subject
    ];

    // Target average = 10.0 across active subjects (Maths + Physics = 7 coef)
    const neededCompo = calcAPCMinimumMark(testSubjects, "1", "compo", 10.0);
    expect(neededCompo).toBeCloseTo(10.0);
  });
});
