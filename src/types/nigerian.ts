export interface NigerianCourse {
  id: string;
  name: string;
  creditUnits: number;   // 1–6
  score: number;         // 0–100
  letter: string;        // computed: A/B/C/D/E/F
  gradePoints: number;   // computed: 5/4/3/2/1/0
  gp: number;            // computed: gradePoints × creditUnits
  isRepeated?: boolean;          // true if this is a repeat attempt
  replacedCourseId?: string;     // id of the previous attempt this replaces
}

export interface NigerianSemester {
  id: string;
  name: string;          // e.g. "First Semester"
  sessionLabel: string;  // e.g. "2023/2024"
  courses: NigerianCourse[];
  gpa: number;           // computed
  archived?: boolean;    // true = locked read-only past semester
}

export interface NigerianState {
  semesters: NigerianSemester[];
  cgpa: number;                  // computed
  classOfDegree: string;         // computed
  targetCGPA: number | null;     // user-set, 0.00–5.00
  remainingCreditUnits: number;  // user-set
  activeSemesterId?: string;     // id of the current active semester
}
