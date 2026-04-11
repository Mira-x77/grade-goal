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
