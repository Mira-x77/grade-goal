import { describe, expect, it } from "vitest";
import {
  parseMentionedClassLevels,
  paperMatchesClassFilter,
  collectPaperClassLevels,
  collectPaperSubjects,
  parseMentionedSubjects,
  paperMatchesSubjectFilter,
  uniqueSubjectsFromPapers,
  canonicalSubject,
  subjectTag,
  mergeSubjectTags,
} from "./library-filters";

describe("parseMentionedClassLevels", () => {
  it("splits Premiere A D C into 1ère series without Tle", () => {
    const levels = parseMentionedClassLevels("Premiere A D C annales 2024");
    expect(levels).toEqual(expect.arrayContaining(["1ère A4", "1ère C", "1ère D"]));
    expect(levels.some((l) => l.startsWith("Tle"))).toBe(false);
  });

  it("keeps Tle C and Tle D together without 1ère", () => {
    const levels = parseMentionedClassLevels("devoir Tle C D maths");
    expect(levels).toEqual(expect.arrayContaining(["Tle C", "Tle D"]));
    expect(levels.some((l) => l.startsWith("1ère"))).toBe(false);
  });

  it("maps 1ere scientifique to C and D", () => {
    const levels = parseMentionedClassLevels("Collection HKA 1ère scientifique");
    expect(levels).toEqual(expect.arrayContaining(["1ère C", "1ère D"]));
  });

  it("does not treat NDT-D1 as série D", () => {
    const levels = parseMentionedClassLevels("1èreC4_NDT-D1 Décembre 2024");
    expect(levels).toContain("1ère C");
    expect(levels).not.toContain("1ère D");
  });

  it("maps 1 a c d onto 1ère A4, C and D", () => {
    const levels = parseMentionedClassLevels("1 a c d physique 2024");
    expect(levels).toEqual(expect.arrayContaining(["1ère A4", "1ère C", "1ère D"]));
    expect(levels.some((l) => l.startsWith("Tle"))).toBe(false);
  });

  it("maps 1ère A C D onto those three séries", () => {
    const levels = parseMentionedClassLevels("1ère A C D annales");
    expect(levels).toEqual(expect.arrayContaining(["1ère A4", "1ère C", "1ère D"]));
  });

  it("does not copy Tle A D onto 1ère in a mixed title", () => {
    const levels = parseMentionedClassLevels("Épreuves maths 2nd, 1ère, Tle A, D");
    expect(levels).toEqual(expect.arrayContaining(["Tle A4", "Tle D"]));
    expect(levels).not.toContain("1ère A4");
    expect(levels).not.toContain("1ère D");
  });
});

describe("paperMatchesClassFilter", () => {
  it("shows a 1ère D stored paper in 1ère C when title names C and D", () => {
    const paper = {
      class_level: "1ère D",
      title: "Annales 1ère C et D mathématiques",
      tags: [],
    };
    expect(paperMatchesClassFilter(paper, "1ère C")).toBe(true);
    expect(paperMatchesClassFilter(paper, "1ère D")).toBe(true);
    expect(paperMatchesClassFilter(paper, "Tle C")).toBe(false);
  });

  it("shows a 1 A C D title in 1ère A4, C and D", () => {
    const paper = {
      class_level: "1ère C",
      title: "1 A C D Physique Chimie",
      tags: [],
    };
    expect(paperMatchesClassFilter(paper, "1ère A4")).toBe(true);
    expect(paperMatchesClassFilter(paper, "1ère C")).toBe(true);
    expect(paperMatchesClassFilter(paper, "1ère D")).toBe(true);
    expect(paperMatchesClassFilter(paper, "1ère E")).toBe(false);
  });

  it("shows every 1ère série when the filter is the cycle only", () => {
    const paper = {
      class_level: "1ère C",
      title: "Devoir 1ère C",
      tags: [],
    };
    expect(paperMatchesClassFilter(paper, "1ère")).toBe(true);
    expect(paperMatchesClassFilter(paper, "Tle")).toBe(false);
  });
});

describe("collectPaperClassLevels", () => {
  it("reads cls tags", () => {
    const levels = collectPaperClassLevels({
      class_level: "1ère C",
      tags: ["cls:1ère D", "maths"],
      title: "Devoir",
    });
    expect(levels).toEqual(expect.arrayContaining(["1ère C", "1ère D"]));
  });

  it("reads the class_levels array published by the catalogue", () => {
    const levels = collectPaperClassLevels({
      class_level: "Tle A4, Tle C, Tle D",
      class_levels: ["Tle A4", "Tle C", "Tle D"],
      title: "BAC BLANC UEMOA 2026",
      tags: [],
    });
    expect(levels).toEqual(expect.arrayContaining(["Tle A4", "Tle C", "Tle D"]));
    expect(levels.some((l) => l.startsWith("1ère"))).toBe(false);
  });

  it("ignores a legacy bare class tag when a cls tag exists", () => {
    const levels = collectPaperClassLevels({
      class_level: "1ère D",
      class_levels: ["1ère D"],
      title: "EXERCICES CORRIGÉS - PHYSIQUE 1ereD",
      file_name: "0183 - EXERCICES CORRIGES - PHYSIQUE 1ereD.pdf",
      tags: ["edusocial", "Revision", "1ère", "cls:1ère D", "subj:PCT"],
    });
    expect(levels).toEqual(["1ère D"]);
  });
});

describe("paperMatchesClassFilter with All", () => {
  it("puts a general paper in every class filter", () => {
    const paper = {
      class_level: "All",
      class_levels: ["All"],
      title: "COMPO DU 3E TRIMESTRE PLATEAUX-EST MATHS",
      tags: [],
    };
    expect(paperMatchesClassFilter(paper, "6ème")).toBe(true);
    expect(paperMatchesClassFilter(paper, "Tle D")).toBe(true);
    expect(paperMatchesClassFilter(paper, "CEPD")).toBe(true);
  });

  it("does not leak a 3ème-only paper into Tle", () => {
    const paper = {
      class_level: "3ème",
      class_levels: ["3ème"],
      title: "BEPC 2026 ÉPREUVE HISTO-GEO",
      tags: [],
    };
    expect(paperMatchesClassFilter(paper, "3ème")).toBe(true);
    expect(paperMatchesClassFilter(paper, "Tle")).toBe(false);
  });
});

describe("parseMentionedSubjects", () => {
  it("expands HG into Histoire and Géographie", () => {
    expect(parseMentionedSubjects("BEPC 2026 ÉPREUVE HISTO-GEO")).toEqual(
      expect.arrayContaining(["Histoire", "Géographie"]),
    );
  });

  it("expands Hist-Géo and hist geo too", () => {
    expect(parseMentionedSubjects("Hist-Géo 1ère Cahier")).toEqual(
      expect.arrayContaining(["Histoire", "Géographie"]),
    );
    expect(parseMentionedSubjects("hist geo 3e")).toEqual(
      expect.arrayContaining(["Histoire", "Géographie"]),
    );
  });

  it("reads several named subjects", () => {
    const subjects = parseMentionedSubjects(
      "BAC BLANC 2026 SUJET CORRIGÉ ; ALL, HG, PHIL",
    );
    expect(subjects).toEqual(
      expect.arrayContaining(["Allemand", "Histoire", "Géographie", "Philosophie"]),
    );
  });

  it("keeps PCT for physique-chimie", () => {
    expect(parseMentionedSubjects("Exercices corrigés chimie 1ère D")).toContain("PCT");
  });
});

describe("canonicalSubject", () => {
  it("maps aliases onto the official spelling", () => {
    expect(canonicalSubject("maths")).toBe("Mathématiques");
    expect(canonicalSubject("ANG")).toBe("Anglais");
    expect(canonicalSubject("Général")).toBe("Général");
    expect(canonicalSubject("inconnu")).toBeNull();
  });
});

describe("collectPaperSubjects", () => {
  it("reads the subjects array", () => {
    const subjects = collectPaperSubjects({
      class_level: "Tle",
      subjects: ["Histoire", "Géographie"],
      subject: "Histoire, Géographie",
      title: "BAC BLANC UEMOA 2026 H-G",
      tags: [],
    });
    expect(subjects).toEqual(["Histoire", "Géographie"]);
  });

  it("reads subj: tags", () => {
    const subjects = collectPaperSubjects({
      subject: "Général",
      tags: [subjectTag("Mathématiques"), "edusocial"],
      title: "Devoir",
    });
    expect(subjects).toContain("Mathématiques");
  });

  it("never invents a subject for an untagged document", () => {
    const subjects = collectPaperSubjects({
      subject: "",
      title: "Document sans sujet",
      tags: [],
    });
    expect(subjects).toEqual([]);
  });
});

describe("paperMatchesSubjectFilter", () => {
  const multi = {
    class_level: "Tle A4, Tle C, Tle D",
    subjects: ["Histoire", "Géographie"],
    subject: "Histoire, Géographie",
    exam_type: "Baccalauréat",
    title: "BAC BLANC UEMOA 2026 SUJET CORRIGÉ H-G",
    tags: [],
  };

  it("shows a two-subject paper under both subjects", () => {
    expect(paperMatchesSubjectFilter(multi, "Histoire")).toBe(true);
    expect(paperMatchesSubjectFilter(multi, "Géographie")).toBe(true);
  });

  it("hides it from unrelated subjects", () => {
    expect(paperMatchesSubjectFilter(multi, "Mathématiques")).toBe(false);
    expect(paperMatchesSubjectFilter(multi, "PCT")).toBe(false);
  });

  it("treats an untagged document as Général", () => {
    const untagged = { subject: "", title: "Document", tags: [] };
    expect(paperMatchesSubjectFilter(untagged, "Général")).toBe(true);
    expect(paperMatchesSubjectFilter(untagged, "SVT")).toBe(false);
  });

  it("returns everything when no subject is selected", () => {
    expect(paperMatchesSubjectFilter(multi, undefined)).toBe(true);
    expect(paperMatchesSubjectFilter(multi, "")).toBe(true);
  });
});

describe("uniqueSubjectsFromPapers", () => {
  it("lists each subject once, in official order", () => {
    const subjects = uniqueSubjectsFromPapers([
      { subjects: ["Géographie", "Histoire"], title: "", tags: [] },
      { subjects: ["Géographie"], title: "", tags: [] },
      { subjects: ["Mathématiques"], title: "", tags: [] },
    ]);
    expect(subjects).toEqual(["Mathématiques", "Histoire", "Géographie"]);
  });
});

describe("mergeSubjectTags", () => {
  it("replaces old subj tags and keeps the rest", () => {
    const tags = mergeSubjectTags(
      ["edusocial", subjectTag("Anglais"), "cls:Tle D"],
      ["Histoire", "Géographie"],
    );
    expect(tags).toContain("edusocial");
    expect(tags).toContain("cls:Tle D");
    expect(tags).toContain(subjectTag("Histoire"));
    expect(tags).toContain(subjectTag("Géographie"));
    expect(tags).not.toContain(subjectTag("Anglais"));
  });
});
