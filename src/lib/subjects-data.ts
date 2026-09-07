/**
 * APC System — Togolese subject data
 * Based on official "Tableau de Service des Profs" document.
 *
 * Class names (stored & displayed): 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Tle
 *
 * Series:
 *   2nde  → A4, CD, E, F, G   (CD is a combined serie, not separate C and D)
 *   1ère  → A4, C, D, E, F, G
 *   Tle   → A4, C, D, E, F, G
 *
 * Subjects are stored in French (language of instruction).
 */

// ─── Class level definitions ──────────────────────────────────────────────────

export const CLASS_LEVELS = {
  college: ["6ème", "5ème", "4ème", "3ème"] as const,
  lycee:   ["2nde", "1ère", "Tle"] as const,
};

// Series per lycée level
export const LYCEE_SERIES_BY_LEVEL: Record<string, readonly string[]> = {
  "2nde": ["A4", "CD", "E", "F", "G"],
  "1ère": ["A4", "C", "D", "E", "F", "G"],
  "Tle":  ["A4", "C", "D", "E", "F", "G"],
};

// Flat deduplicated list for backward compat
export const LYCEE_SERIES = ["A4", "C", "CD", "D", "E", "F", "G"] as const;

// ─── Subject + coefficient type ───────────────────────────────────────────────

export interface SubjectDef {
  name: string;  // French name — canonical, stored in DB/localStorage
  coef: number;  // Official coefficient
}

// ─── College subjects ─────────────────────────────────────────────────────────

// 6ème & 5ème
const COLLEGE_6_5: SubjectDef[] = [
  { name: "Français",                      coef: 2 },
  { name: "Anglais",                       coef: 1 },
  { name: "Histoire-Géographie",           coef: 1 },
  { name: "Éducation Civique & Morale",    coef: 1 },
  { name: "Sciences de la Vie & la Terre", coef: 1 },
  { name: "Mathématiques",                 coef: 1 },
  { name: "Sciences Physiques & Techno",   coef: 1 },
  { name: "Éducation Physique & Sport",    coef: 1 },
  { name: "Formation Hum. Religieuse",     coef: 1 },
  { name: "Musique",                       coef: 1 },
  { name: "Enseignement Ménager",          coef: 1 },
  { name: "Ewe",                           coef: 1 },
  { name: "Dessin",                        coef: 1 },
];

// 4ème & 3ème
const COLLEGE_4_3: SubjectDef[] = [
  { name: "Français",                      coef: 3 },
  { name: "Anglais",                       coef: 2 },
  { name: "Histoire-Géographie",           coef: 2 },
  { name: "Éducation Civique & Morale",    coef: 2 },
  { name: "Sciences de la Vie & la Terre", coef: 2 },
  { name: "Mathématiques",                 coef: 3 },
  { name: "Sciences Physiques & Techno",   coef: 3 },
  { name: "Éducation Physique & Sport",    coef: 1 },
  { name: "Formation Hum. Religieuse",     coef: 1 },
  { name: "Enseignement Ménager",          coef: 1 },
  { name: "Musique",                       coef: 1 },
  { name: "Ewe",                           coef: 1 },
  { name: "Dessin",                        coef: 1 },
];

// ─── Lycée subjects by class + serie ─────────────────────────────────────────
// A4 = literary/humanities, C = maths+physics, D = biology+sciences,
// E = maths+tech, F = technical/industrial, G = economics/management
// CD (2nde only) = combined C+D sciences stream

const LYCEE: Record<string, SubjectDef[]> = {

  // ══════════════ 2nde ══════════════

  "2nde_A4": [
    { name: "Français",                      coef: 4 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 3 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 1 },
    { name: "Mathématiques",                 coef: 2 },
    { name: "Physique-Chimie",               coef: 1 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Espagnol",                      coef: 2 },
    { name: "Allemand",                      coef: 2 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "2nde_CD": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 2 },
    { name: "Mathématiques",                 coef: 4 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Espagnol",                      coef: 1 },
    { name: "Allemand",                      coef: 1 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "2nde_E": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 5 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Technologie",                   coef: 3 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
  ],

  "2nde_F": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Physique-Chimie",               coef: 2 },
    { name: "Technologie Industrielle",      coef: 4 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
  ],

  "2nde_G": [
    { name: "Français",                      coef: 3 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Économie",                      coef: 3 },
    { name: "Comptabilité",                  coef: 3 },
    { name: "Droit",                         coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
  ],

  // ══════════════ 1ère ══════════════

  "1ère_A4": [
    { name: "Français",                      coef: 4 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 3 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 1 },
    { name: "Mathématiques",                 coef: 2 },
    { name: "Physique-Chimie",               coef: 1 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Espagnol",                      coef: 2 },
    { name: "Allemand",                      coef: 2 },
    { name: "Philosophie",                   coef: 3 },
    { name: "Dessin",                        coef: 1 },
  ],

  "1ère_C": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Sciences de la Vie & la Terre", coef: 1 },
    { name: "Mathématiques",                 coef: 5 },
    { name: "Physique-Chimie",               coef: 4 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "1ère_D": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 4 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "1ère_E": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 5 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Technologie",                   coef: 4 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],

  "1ère_F": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Physique-Chimie",               coef: 2 },
    { name: "Technologie Industrielle",      coef: 5 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],

  "1ère_G": [
    { name: "Français",                      coef: 3 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Économie",                      coef: 3 },
    { name: "Comptabilité",                  coef: 4 },
    { name: "Droit",                         coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],

  // ══════════════ Tle ══════════════

  "Tle_A4": [
    { name: "Français",                      coef: 3 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 3 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 1 },
    { name: "Mathématiques",                 coef: 2 },
    { name: "Physique-Chimie",               coef: 1 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Espagnol",                      coef: 2 },
    { name: "Allemand",                      coef: 2 },
    { name: "Philosophie",                   coef: 4 },
    { name: "Dessin",                        coef: 1 },
  ],

  "Tle_C": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Sciences de la Vie & la Terre", coef: 1 },
    { name: "Mathématiques",                 coef: 5 },
    { name: "Physique-Chimie",               coef: 4 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "Tle_D": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 2 },
    { name: "Sciences de la Vie & la Terre", coef: 4 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Musique",                       coef: 1 },
    { name: "Enseignement Ménager",          coef: 1 },
    { name: "Philosophie",                   coef: 2 },
    { name: "Dessin",                        coef: 1 },
  ],

  "Tle_E": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 5 },
    { name: "Physique-Chimie",               coef: 3 },
    { name: "Technologie",                   coef: 4 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],

  "Tle_F": [
    { name: "Français",                      coef: 2 },
    { name: "Anglais",                       coef: 2 },
    { name: "Histoire-Géographie",           coef: 1 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Physique-Chimie",               coef: 2 },
    { name: "Technologie Industrielle",      coef: 5 },
    { name: "Dessin Technique",              coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],

  "Tle_G": [
    { name: "Français",                      coef: 3 },
    { name: "Anglais",                       coef: 3 },
    { name: "Histoire-Géographie",           coef: 2 },
    { name: "Éducation Civique & Morale",    coef: 1 },
    { name: "Mathématiques",                 coef: 3 },
    { name: "Économie",                      coef: 3 },
    { name: "Comptabilité",                  coef: 4 },
    { name: "Droit",                         coef: 2 },
    { name: "Éducation Physique & Sport",    coef: 1 },
    { name: "Formation Hum. Religieuse",     coef: 1 },
    { name: "Philosophie",                   coef: 2 },
  ],
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getSubjectDefsForLevel(classLevel: string, serie?: string): SubjectDef[] {
  if (classLevel === "6ème" || classLevel === "5ème") return COLLEGE_6_5;
  if (classLevel === "4ème" || classLevel === "3ème") return COLLEGE_4_3;

  if (serie) {
    const key = `${classLevel}_${serie}`;
    if (LYCEE[key]) return LYCEE[key];
  }

  // Fallback: all unique lycée subject names with coef 1
  const all = new Set<string>();
  Object.values(LYCEE).forEach(defs => defs.forEach(d => all.add(d.name)));
  return Array.from(all).sort().map(name => ({ name, coef: 1 }));
}

/** Subject names only — for the add-subject modal list */
export function getSubjectsForLevel(classLevel: string, serie?: string): readonly string[] {
  return getSubjectDefsForLevel(classLevel, serie).map(d => d.name);
}

/** Default Subject objects with correct coefficients — auto-populated at onboarding */
export function getDefaultSubjectsForLevel(classLevel: string, serie?: string) {
  return getSubjectDefsForLevel(classLevel, serie).map(def => ({
    id: crypto.randomUUID(),
    name: def.name,
    coefficient: def.coef,
    marks: { interro: null as null, dev: null as null, compo: null as null },
  }));
}

// Subjects are stored in French — no translation needed. Kept for backward compat.
export function translateSubject(name: string, _language: string): string {
  return name;
}
