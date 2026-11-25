import { loadState } from "@/lib/storage";

/** Subject/course names from the student's profile — works for APC, French, and Nigerian systems. */
export function getAppSubjectNames(): string[] {
  const state = loadState();
  if (!state?.subjects?.length) return [];

  const names = state.subjects
    .map((s) => s.name?.trim())
    .filter((name): name is string => !!name);

  return [...new Set(names)];
}
