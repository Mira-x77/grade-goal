export const CLASS_LEVELS = {
  college: ["Sixième", "Cinquième", "Quatrième", "Troisième"] as const,
  lycee: ["Seconde", "Première", "Terminale"] as const,
};

export const LYCEE_SERIES = ["A", "C", "D", "E", "F", "G"] as const;

export const COLLEGE_SUBJECTS = [
  "French",
  "Mathematics",
  "English",
  "Second Foreign Language",
  "History & Geography",
  "Civic Education",
  "Physics & Chemistry",
  "SVT (Biology)",
  "Technology",
  "Art",
  "Music",
] as const;

export const LYCEE_SUBJECTS: Record<string, readonly string[]> = {
  A: ["French / Literature", "Philosophy", "History", "Geography", "English", "Second Foreign Language", "Civic Education", "Mathematics", "Physical Education"],
  C: ["Mathematics", "Physics", "Chemistry", "Computer Science", "Biology", "French", "English", "Philosophy", "History & Geography", "Physical Education"],
  D: ["Biology", "Chemistry", "Physics", "Mathematics", "French", "English", "Philosophy", "History & Geography", "Physical Education"],
  E: ["Mathematics", "Physics", "Electrical Technology", "Mechanical Technology", "Technical Drawing", "Computer Science", "French", "English", "Philosophy", "Physical Education"],
  F: ["Mechanical Technology", "Electrical Technology", "Electronics", "Technical Drawing", "Mathematics", "Physics", "Computer Science", "French", "English", "Physical Education"],
  G: ["Accounting", "Economics", "Business Studies", "Management", "Marketing", "Mathematics", "Computer Science", "French", "English", "Physical Education"],
};

/**
 * French translations for subject names.
 * Keys are the canonical English subject names stored in the database / localStorage.
 * Values are the French display names shown in the UI when language === "fr".
 */
export const SUBJECT_TRANSLATIONS_FR: Record<string, string> = {
  // College
  "French": "Français",
  "Mathematics": "Mathématiques",
  "English": "Anglais",
  "Second Foreign Language": "Deuxième Langue Vivante",
  "History & Geography": "Histoire-Géographie",
  "Civic Education": "Éducation Civique",
  "Physics & Chemistry": "Physique-Chimie",
  "SVT (Biology)": "SVT (Biologie)",
  "Technology": "Technologie",
  "Art": "Arts Plastiques",
  "Music": "Musique",
  // Lycée shared
  "Philosophy": "Philosophie",
  "Physical Education": "EPS",
  "Computer Science": "Informatique",
  "Biology": "Biologie",
  "Chemistry": "Chimie",
  "Physics": "Physique",
  "History": "Histoire",
  "Geography": "Géographie",
  // Série A
  "French / Literature": "Français / Littérature",
  "Civic Education": "Éducation Civique",
  // Série E/F
  "Electrical Technology": "Technologie Électrique",
  "Mechanical Technology": "Technologie Mécanique",
  "Technical Drawing": "Dessin Technique",
  "Electronics": "Électronique",
  // Série G
  "Accounting": "Comptabilité",
  "Economics": "Économie",
  "Business Studies": "Commerce",
  "Management": "Gestion",
  "Marketing": "Marketing",
};

/**
 * Returns the translated display name for a subject.
 * Falls back to the original name if no translation exists.
 */
export function translateSubject(name: string, language: string): string {
  if (language !== "fr") return name;
  return SUBJECT_TRANSLATIONS_FR[name] ?? name;
}

export function getSubjectsForLevel(classLevel: string, serie?: string): readonly string[] {
  if (CLASS_LEVELS.college.includes(classLevel as any)) {
    return COLLEGE_SUBJECTS;
  }
  if (serie && LYCEE_SUBJECTS[serie]) {
    return LYCEE_SUBJECTS[serie];
  }
  // Return all unique lycée subjects if no serie specified
  const all = new Set<string>();
  Object.values(LYCEE_SUBJECTS).forEach((subs) => subs.forEach((s) => all.add(s)));
  return Array.from(all).sort();
}
