import { describe, it, expect } from "vitest";
import { Subject } from "@/types/exam";
import { analyzeTargetProgress } from "@/lib/target-advisor";

describe("Target Advisor & Goal Progress Analysis Tests", () => {
  const sampleSubjects: Subject[] = [
    { id: "1", name: "Maths", coefficient: 4, marks: { interro: 15, dev: 15, compo: 16 } },
    { id: "2", name: "Physics", coefficient: 3, marks: { interro: 14, dev: 14, compo: 14 } },
    { id: "3", name: "SVT", coefficient: 3, marks: { interro: 13, dev: 13, compo: 13 } },
  ];

  it("should detect when student is Surpassing Target", () => {
    // Current Avg = 14.5, Target = 12.0 -> Gap = +2.5 (Surpassing)
    const result = analyzeTargetProgress(sampleSubjects, 12.0, "apc");
    expect(result.status).toBe("surpassing");
    expect(result.badgeText).toContain("Surpassing");
    expect(result.gap).toBeGreaterThan(0.5);
  });

  it("should detect when student is On Track", () => {
    // Current Avg = 14.5, Target = 14.2 -> Gap = +0.3 (On Track)
    const result = analyzeTargetProgress(sampleSubjects, 14.2, "apc");
    expect(result.status).toBe("on_track");
    expect(result.badgeText).toContain("On Track");
  });

  it("should detect when student is Behind Target and recommend improvements", () => {
    // Current Avg = 14.5, Target = 17.0 -> Gap = -2.5 (Behind)
    const result = analyzeTargetProgress(sampleSubjects, 17.0, "apc");
    expect(result.status).toBe("behind");
    expect(result.badgeText).toContain("Behind Target");
    expect(result.improvements.length).toBeGreaterThan(0);
    // Subject with lowest average score (SVT at 13.0) has the largest gain potential (+1.20 pts on total avg)
    expect(result.improvements[0].subjectName).toBe("SVT");
  });

  it("should handle empty subjects list gracefully", () => {
    const result = analyzeTargetProgress([], 12.0, "apc");
    expect(result.status).toBe("no_data");
  });
});
