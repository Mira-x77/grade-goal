import { loadState } from '@/lib/storage';
import type { GradingSystem } from '@/types/exam';

export type CodeSource = 'school' | 'friend' | 'online' | 'other';

export function getGradingSystemFromState(): GradingSystem {
  try {
    const state = loadState();
    return state?.settings?.gradingSystem ?? 'apc';
  } catch {
    return 'apc';
  }
}

/** Best-effort school / institution label from profile + local state */
export function getSchoolFromProfile(metadata?: Record<string, unknown> | null): string | null {
  if (metadata) {
    const school =
      metadata.school ??
      metadata.schoolName ??
      metadata.institution ??
      metadata.college;
    if (school && String(school).trim()) return String(school).trim();
  }

  const state = loadState();
  if (!state) return null;

  const parts = [state.classLevel, state.serie, state.department, state.universityLevel].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
