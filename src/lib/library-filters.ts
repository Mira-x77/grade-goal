import { CLASS_LEVELS, LYCEE_SERIES_BY_LEVEL, buildFullClassLevel } from "@/lib/subjects-data";

/** Exact class match so "1ère C" never includes "Tle C" or bare "Tle". */

export const CLASS_TAG_PREFIX = "cls:";

export function classTag(level: string): string {
  return `${CLASS_TAG_PREFIX}${level}`;
}

export function classLevelFromTag(tag: string): string | null {
  if (!tag || !tag.startsWith(CLASS_TAG_PREFIX)) return null;
  return tag.slice(CLASS_TAG_PREFIX.length);
}

export const OFFICIAL_CLASS_LEVELS = [
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "2nde A4", "2nde CD", "2nde E", "2nde F", "2nde G",
  "1ère", "1ère A4", "1ère C", "1ère D", "1ère E", "1ère F", "1ère G",
  "Tle", "Tle A4", "Tle C", "Tle D", "Tle E", "Tle F", "Tle G",
  "CEPD", "CAP", "Primaire", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "Autre",
] as const;

export type OfficialClassLevel = (typeof OFFICIAL_CLASS_LEVELS)[number];

const OFFICIAL_SET = new Set<string>(OFFICIAL_CLASS_LEVELS);

export const OFFICIAL_EXAM_TYPES = [
  "BEPC", "CEPD", "CAP", "Baccalauréat", "Probatoire", "Concours",
  "Annales", "Composition", "Devoir", "Interro", "Exercices",
] as const;

/** Canonical subject names, in the order the library shows them. */
export const OFFICIAL_SUBJECTS = [
  "Mathématiques", "SVT", "PCT", "Français", "Anglais", "Allemand",
  "Philosophie", "Histoire", "Géographie", "ECM", "Économie",
  "Informatique", "Langues", "EPS", "Musique", "Conduite", "Général",
] as const;

export type OfficialSubject = (typeof OFFICIAL_SUBJECTS)[number];

export const SUBJECT_TAG_PREFIX = "subj:";

export function subjectTag(subject: string): string {
  return `${SUBJECT_TAG_PREFIX}${subject}`;
}

export function subjectFromTag(tag: string): string | null {
  if (!tag || !tag.startsWith(SUBJECT_TAG_PREFIX)) return null;
  return tag.slice(SUBJECT_TAG_PREFIX.length);
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function normClassText(s: string): string {
  let n = stripAccents(s || "").toLowerCase();
  n = n.replace(/g[\s-]?lome|grand lome/g, " ");
  n = n.replace(/\bg[\s-]?l\b/g, " ");
  n = n.replace(/\bgeo(?:graphie)?\b|\bgeographie\b/g, " ");
  n = n.replace(/\banglais\b|\benglish\b/g, " ");
  n = n.replace(/\bcomposition\b|\bdevoir\b|\binterro\b|\bannales\b/g, " ");
  n = n.replace(/\b\d+\s*(er|e|eme|nd)?\s*(semestre|trimestre)\b/g, " ");
  n = n.replace(/\bsemestre\b|\btrimestre\b/g, " ");
  n = n.replace(/[^a-z0-9]+/g, " ");
  return n.replace(/\s+/g, " ").trim();
}

const UNIVERSAL_CLASS_VALUES = new Set([
  "all", "toutes", "tous", "toutes les classes", "toutes classes", "toutes series",
]);

function isUniversalClass(value: string | null | undefined): boolean {
  return UNIVERSAL_CLASS_VALUES.has((value ?? "").trim().toLowerCase());
}

function splitStoredClassField(stored: string | null | undefined): string[] {
  if (!stored) return [];
  return stored
    .split(/\s*(?:,|\/|;|\||&|\bet\b)\s*/i)
    .map((p) => p.trim())
    .map((p) => (isUniversalClass(p) ? "All" : p))
    .filter((p) => p === "All" || OFFICIAL_SET.has(p));
}

function seriesFromFollow(follow: string, cycle: "1ère" | "Tle" | "2nde"): string[] {
  const f = ` ${follow} `;
  const out: string[] = [];

  if (cycle === "2nde") {
    if (/\ba4\b/.test(f) || /\ba\b/.test(f)) out.push("2nde A4");
    if (/\bcd\b/.test(f)) out.push("2nde CD");
    else {
      if (/\bc\b/.test(f) && /\bd\b/.test(f)) out.push("2nde CD");
    }
    if (/\be\b/.test(f)) out.push("2nde E");
    if (/\bf\b/.test(f)) out.push("2nde F");
    if (/\bg\b/.test(f)) out.push("2nde G");
    return [...new Set(out)];
  }

  if (/\bcd\b/.test(f)) {
    out.push(`${cycle} C`, `${cycle} D`);
  }
  if (/\ba4\b/.test(f) || /\ba\b/.test(f)) out.push(`${cycle} A4`);
  if (/\bc\d*\b/.test(f)) out.push(`${cycle} C`);
  if (/\bd\b/.test(f)) out.push(`${cycle} D`);
  if (/\be\b/.test(f)) out.push(`${cycle} E`);
  if (/\bf\b/.test(f)) out.push(`${cycle} F`);
  if (/\bg\b/.test(f)) out.push(`${cycle} G`);
  return [...new Set(out)];
}

/** Classes named in a title/filename, never mixing 1ère with Tle. */
export function parseMentionedClassLevels(text: string): string[] {
  const n = normClassText(text);
  if (!n) return [];
  const out = new Set<string>();

  const compact: Array<[RegExp, string]> = [
    [/\b1erec\d*\b/, "1ère C"],
    [/\b1ered\d*\b/, "1ère D"],
    [/\b1ereg\d*\b/, "1ère G"],
    [/\b1erea4\b|\b1erea\b/, "1ère A4"],
    [/\btlec\d*\b/, "Tle C"],
    [/\btled\d*\b/, "Tle D"],
    [/\btlea4\b|\btlea\b/, "Tle A4"],
    [/\btleg\b/, "Tle G"],
  ];
  for (const [re, level] of compact) {
    if (re.test(n)) out.add(level);
  }

  const windows: Array<[RegExp, "1ère" | "Tle" | "2nde"]> = [
    [/\b(?:1ere|premieres|premiere|1re|1e)\b\s*([a-z0-9 ]{0,56})/g, "1ère"],
    // "1 A C D" / "1 a c d" — grade 1ère plus several séries
    [/\b1\b\s+((?:a4|a|c|d|e|f|g)(?:\s+(?:a4|a|c|d|e|f|g))+)/g, "1ère"],
    [/\b(?:tle|terminale|terminal)\b\s*([a-z0-9 ]{0,56})/g, "Tle"],
    [/\b(?:2nde|seconde)\b\s*([a-z0-9 ]{0,56})/g, "2nde"],
  ];

  for (const [re, cycle] of windows) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let any = false;
    while ((m = re.exec(n))) {
      any = true;
      const follow = (m[1] || "").split(
        /\b(?:1ere|premieres|premiere|1re|1e|tle|terminale|terminal|2nde|seconde)\b/,
      )[0];
      for (const level of seriesFromFollow(follow, cycle)) out.add(level);
    }
    if (any && cycle !== "2nde" && /scientif/.test(n)) {
      out.add(`${cycle} C`);
      out.add(`${cycle} D`);
    }
  }

  return [...out].filter((l) => OFFICIAL_SET.has(l));
}

export type ClassTaggedPaper = {
  class_level?: string | null;
  classLevel?: string | null;
  class_levels?: string[] | null;
  classLevels?: string[] | null;
  title?: string | null;
  file_name?: string | null;
  fileName?: string | null;
  description?: string | null;
  subject?: string | null;
  subjects?: string[] | null;
  tags?: string[] | null;
};

export function collectPaperClassLevels(paper: ClassTaggedPaper): string[] {
  const levels = new Set<string>();
  for (const array of [paper.class_levels, paper.classLevels]) {
    for (const value of array ?? []) {
      if (isUniversalClass(value)) levels.add("All");
      else if (OFFICIAL_SET.has(value)) levels.add(value);
    }
  }
  for (const p of splitStoredClassField(paper.class_level ?? paper.classLevel ?? null)) {
    levels.add(p);
  }
  // `cls:` tags are authoritative. Older rows also carry a bare legacy class
  // tag ("1ère") next to the precise one ("cls:1ère D"); only fall back to the
  // bare tag when there is no `cls:` tag at all, so a 1ère D document is not
  // also listed as plain 1ère.
  const taggedLevels: string[] = [];
  const bareLevels: string[] = [];
  for (const tag of paper.tags ?? []) {
    const fromTag = classLevelFromTag(tag);
    if (fromTag && OFFICIAL_SET.has(fromTag)) taggedLevels.push(fromTag);
    else if (OFFICIAL_SET.has(tag)) bareLevels.push(tag);
  }
  for (const level of taggedLevels.length ? taggedLevels : bareLevels) {
    levels.add(level);
  }
  const blob = [paper.title, paper.file_name, paper.fileName, paper.description]
    .filter(Boolean)
    .join(" ");
  for (const p of parseMentionedClassLevels(blob)) levels.add(p);
  return [...levels];
}

export function formatPaperClassLabel(paper: ClassTaggedPaper): string {
  const levels = collectPaperClassLevels(paper);
  if (levels.length) return levels.join(" · ");
  return paper.class_level || paper.classLevel || "";
}

export function mergeClassTags(existing: string[] | null | undefined, levels: string[]): string[] {
  const tags = [...(existing ?? [])].filter((t) => !t.startsWith(CLASS_TAG_PREFIX));
  const unique = [...new Set(levels.filter((l) => OFFICIAL_SET.has(l)))];
  return [...tags, ...unique.map(classTag)];
}

/** True if this paper belongs in the selected class filter. */
export function classLevelMatches(
  stored: string | null | undefined,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  if (!stored) return false;
  if (stored === filter) return true;
  return splitStoredClassField(stored).includes(filter);
}

export const ONBOARDING_CLASS_CYCLES = [
  ...CLASS_LEVELS.college,
  ...CLASS_LEVELS.lycee,
] as const;

export function splitOnboardingClassFilter(filter: string): {
  cycle: string;
  serie: string | null;
} {
  const trimmed = (filter || "").trim();
  const cycles = [...ONBOARDING_CLASS_CYCLES].sort((a, b) => b.length - a.length);
  for (const cycle of cycles) {
    if (trimmed === cycle) return { cycle, serie: null };
    if (trimmed.startsWith(`${cycle} `)) {
      const serie = trimmed.slice(cycle.length).trim();
      return { cycle, serie: serie || null };
    }
  }
  return { cycle: trimmed, serie: null };
}

export function composeOnboardingClassFilter(
  cycle: string,
  serie?: string | null,
): string {
  return buildFullClassLevel(cycle, serie);
}

export function seriesForCycle(cycle: string): readonly string[] {
  return LYCEE_SERIES_BY_LEVEL[cycle] ?? [];
}

export function paperMatchesClassFilter(
  paper: ClassTaggedPaper,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  const levels = collectPaperClassLevels(paper);
  // A catalogue row with no class ("All") is general revision material and
  // belongs in every class filter.
  if (levels.includes("All")) return true;
  if (levels.includes(filter)) return true;
  const { cycle, serie } = splitOnboardingClassFilter(filter);
  if (serie) return false;
  return levels.some((level) => level === cycle || level.startsWith(`${cycle} `));
}

export function uniqueClassLevelsFromPapers(papers: ClassTaggedPaper[]): string[] {
  const present = new Set<string>();
  for (const p of papers) {
    for (const level of collectPaperClassLevels(p)) present.add(level);
  }
  return OFFICIAL_CLASS_LEVELS.filter((level) => present.has(level));
}

/* ------------------------------------------------------------------------- */
/* Subjects — same multi-value convention as classes                          */
/* ------------------------------------------------------------------------- */

const SUBJECT_SET = new Set<string>(OFFICIAL_SUBJECTS);

/** Lower-case alias -> canonical subject. Mirrors scripts/r2/classify.py. */
const SUBJECT_ALIASES: Array<[RegExp, OfficialSubject]> = [
  [/\bmaths?\b|\bmathematiques?\b|\bmath\b/, "Mathématiques"],
  [/\bsvt\b|sciences? de la vie|sciences? naturelles?|biologie/, "SVT"],
  [/\bpct\b|sciences? physiques?|\bphysique\b|\bchimie\b|\bpc\b/, "PCT"],
  [/\bfrancais\b|\blitterature\b|\bpoesie\b|\bpoetique\b|\bgrammaire\b|\borthographe\b|\blecture\b/, "Français"],
  [/\banglais\b|\benglish\b|\bang\b|\bangl\b/, "Anglais"],
  [/\ballemand\b|\ball\b/, "Allemand"],
  [/\bphil(?:o(?:sophie)?)?\b/, "Philosophie"],
  [/\bhistoire\b|\bhisto\b/, "Histoire"],
  [/\bgeo(?:graphie)?\b/, "Géographie"],
  [/\becm\b|\bedhc\b|civique|morale/, "ECM"],
  [/\beconomie\b|\beco\b|\bcompta\b|\bcomptabilite\b|\bdroit\b|\bgestion\b/, "Économie"],
  [/\binformatique\b|\binfo\b|\btic\b/, "Informatique"],
  [/\bewe\b|\bkabye\b|\barabe\b|\blangues?\b/, "Langues"],
  [/\beps\b|\bsport\b/, "EPS"],
  [/\bmusique\b/, "Musique"],
  [/conduite/, "Conduite"],
];

function normSubjectText(s: string): string {
  return stripAccents(s || "")
    .toLowerCase()
    .replace(/\bserie[s]?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a free-form value ("HG", "Maths", "Général") onto a canonical subject. */
export function canonicalSubject(value: string): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  if (SUBJECT_SET.has(trimmed)) return trimmed;
  const n = normSubjectText(trimmed);
  for (const [pattern, subject] of SUBJECT_ALIASES) {
    if (pattern.test(n)) return subject;
  }
  if (/\bhg\b|\bh[\s./-]*g\b|hist(?:oire|o)?[\s./-]*geo/.test(n)) return "Histoire";
  return null;
}

/** Subjects named in a title/filename ("HG" = Histoire + Géographie). */
export function parseMentionedSubjects(text: string): string[] {
  const n = normSubjectText(text);
  if (!n) return [];
  const found = new Set<string>();
  for (const [pattern, subject] of SUBJECT_ALIASES) {
    if (pattern.test(n)) found.add(subject);
  }
  if (/\bhg\b|\bh[\s./-]*g\b|hist(?:oire|o)?[\s./-]*geo/.test(n)) {
    found.add("Histoire");
    found.add("Géographie");
  }
  return SUBJECT_ORDER.filter((s) => found.has(s));
}

const SUBJECT_ORDER = [...OFFICIAL_SUBJECTS];

function splitStoredSubjectField(stored: string | null | undefined): string[] {
  if (!stored) return [];
  return stored
    .split(/\s*(?:,|;|\||\/|&|\bet\b)\s*/i)
    .map((p) => canonicalSubject(p))
    .filter((p): p is string => Boolean(p));
}

export function collectPaperSubjects(paper: ClassTaggedPaper): string[] {
  const subjects = new Set<string>();
  for (const array of [paper.subjects]) {
    for (const value of array ?? []) {
      const canonical = canonicalSubject(value);
      if (canonical) subjects.add(canonical);
    }
  }
  for (const value of splitStoredSubjectField(paper.subject ?? null)) subjects.add(value);
  for (const tag of paper.tags ?? []) {
    const fromTag = subjectFromTag(tag);
    const canonical = canonicalSubject(fromTag ?? tag);
    if (canonical && (fromTag || SUBJECT_SET.has(tag.replace(/^subj:/, "")))) {
      subjects.add(canonical);
    }
  }
  const blob = [paper.title, paper.file_name, paper.fileName, paper.description]
    .filter(Boolean)
    .join(" ");
  for (const subject of parseMentionedSubjects(blob)) subjects.add(subject);
  return SUBJECT_ORDER.filter((s) => subjects.has(s));
}

export function formatPaperSubjectLabel(paper: ClassTaggedPaper): string {
  const subjects = collectPaperSubjects(paper);
  if (subjects.length) return subjects.join(" · ");
  return paper.subject || "";
}

export function mergeSubjectTags(existing: string[] | null | undefined, subjects: string[]): string[] {
  const tags = [...(existing ?? [])].filter((t) => !t.startsWith(SUBJECT_TAG_PREFIX));
  const unique = [...new Set(subjects.filter((s) => SUBJECT_SET.has(s)))];
  return [...tags, ...unique.map(subjectTag)];
}

/** True if this paper belongs in the selected subject filter. */
export function paperMatchesSubjectFilter(
  paper: ClassTaggedPaper,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  const subjects = collectPaperSubjects(paper);
  if (subjects.length === 0) {
    // Untagged documents are general material, not invisible.
    return filter === "Général";
  }
  return subjects.includes(filter);
}

export function uniqueSubjectsFromPapers(papers: ClassTaggedPaper[]): string[] {
  const present = new Set<string>();
  for (const p of papers) {
    for (const subject of collectPaperSubjects(p)) present.add(subject);
  }
  return SUBJECT_ORDER.filter((subject) => present.has(subject));
}
