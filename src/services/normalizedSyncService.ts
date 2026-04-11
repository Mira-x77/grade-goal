/**
 * Normalized Sync Service
 * Handles data persistence with the new system-agnostic Supabase schema
 * 
 * ARCHITECTURE:
 * - Frontend: Works with AppState (legacy format)
 * - Backend: Stores in normalized tables (system-agnostic)
 * - This service: Transforms between the two
 */

import { supabase } from '@/integrations/supabase/client';
import { AppState, Subject, CustomAssessment } from '@/types/exam';
import { getAdapter } from '@/adapters/AdapterFactory';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormalizedProfile {
  id: string;
  user_id: string;
  academic_system: 'APC' | 'FRENCH' | 'NIGERIAN';
  student_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface NormalizedSubject {
  id: string;
  user_id: string;
  name: string;
  weight: number;
  weight_type: 'coefficient' | 'credit_units';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface NormalizedAssessment {
  id: string;
  user_id: string;
  subject_id: string;
  label: string;
  value: number | null;
  max_value: number;
  weight: number | null;
  assessment_type: 'fixed' | 'dynamic';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface NormalizedSettings {
  id: string;
  user_id: string;
  target_value: number | null;
  settings_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Transform: AppState → Normalized ─────────────────────────────────────────

export async function saveAppStateNormalized(userId: string, state: AppState): Promise<void> {
  const gradingSystem = state.settings?.gradingSystem ?? 'apc';
  const isNigerian = gradingSystem === 'nigerian_university';
  
  // 1. Upsert profile
  const profileResult = await withTimeout(supabase
    .from('user_profile')
    .upsert({
      user_id: userId,
      academic_system: gradingSystem === 'nigerian_university' ? 'NIGERIAN' 
                     : gradingSystem === 'french' ? 'FRENCH' 
                     : 'APC',
      student_name: state.studentName ?? null,
      metadata: {
        classLevel: state.classLevel,
        serie: state.serie,
        semester: state.semester,
        department: state.department,
        universityLevel: state.universityLevel,
      },
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
  );

  // If table doesn't exist, throw error to trigger fallback
  if (profileResult.error?.code === 'PGRST205') {
    throw new Error('Normalized schema tables do not exist');
  }
  if (profileResult.error) throw profileResult.error;

  // 2. Upsert settings
  await withTimeout(supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      target_value: state.targetMin ?? state.targetAverage ?? null,
      settings_json: state.settings ?? {},
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
  );

  // 3. Get existing subjects to map IDs
  const { data: existingSubjects } = await withTimeout(supabase
    .from('user_subjects')
    .select('id, name')
    .eq('user_id', userId)
  );

  const subjectIdMap = new Map<string, string>();
  existingSubjects?.forEach(s => subjectIdMap.set(s.name, s.id));

  // 4. Upsert subjects
  const subjects = state.subjects ?? [];
  for (const subject of subjects) {
    const { data: upsertedSubject } = await withTimeout(supabase
      .from('user_subjects')
      .upsert({
        id: subjectIdMap.get(subject.name), // Use existing ID if available
        user_id: userId,
        name: subject.name,
        weight: isNigerian ? (subject.creditUnits ?? subject.coefficient) : subject.coefficient,
        weight_type: isNigerian ? 'credit_units' : 'coefficient',
        metadata: { originalId: subject.id },
      }, {
        onConflict: 'user_id,name',
        ignoreDuplicates: false
      })
      .select('id')
      .single()
    );

    if (!upsertedSubject) continue;
    const subjectId = upsertedSubject.id;

    // 5. Delete old assessments for this subject
    await withTimeout(supabase
      .from('user_assessments')
      .delete()
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
    );

    // 6. Insert new assessments
    if (isNigerian && subject.customAssessments) {
      // Nigerian: dynamic assessments
      const assessments = subject.customAssessments.map(a => ({
        user_id: userId,
        subject_id: subjectId,
        label: a.label,
        value: a.value,
        max_value: 100,
        weight: a.weight,
        assessment_type: 'dynamic' as const,
        metadata: { originalId: a.id },
      }));
      
      if (assessments.length > 0) {
        await withTimeout(supabase
          .from('user_assessments')
          .insert(assessments)
        );
      }
    } else {
      // APC/French: fixed assessments
      const assessments = [
        {
          user_id: userId,
          subject_id: subjectId,
          label: 'Interro',
          value: subject.marks.interro,
          max_value: 20,
          weight: null,
          assessment_type: 'fixed' as const,
          metadata: {},
        },
        {
          user_id: userId,
          subject_id: subjectId,
          label: 'Devoir',
          value: subject.marks.dev,
          max_value: 20,
          weight: null,
          assessment_type: 'fixed' as const,
          metadata: {},
        },
        {
          user_id: userId,
          subject_id: subjectId,
          label: 'Compo',
          value: subject.marks.compo,
          max_value: 20,
          weight: null,
          assessment_type: 'fixed' as const,
          metadata: {},
        },
      ];

      await withTimeout(supabase
        .from('user_assessments')
        .insert(assessments)
      );
    }
  }

  // 7. Delete subjects that no longer exist
  const currentSubjectNames = subjects.map(s => s.name);
  if (existingSubjects && existingSubjects.length > 0) {
    const subjectsToDelete = existingSubjects
      .filter(s => !currentSubjectNames.includes(s.name))
      .map(s => s.id);
    
    if (subjectsToDelete.length > 0) {
      await withTimeout(supabase
        .from('user_subjects')
        .delete()
        .in('id', subjectsToDelete)
      );
    }
  }
}

// ─── Transform: Normalized → AppState ─────────────────────────────────────────

export async function loadAppStateNormalized(userId: string): Promise<AppState | null> {
  // 1. Load all data in parallel
  const [profileRes, subjectsRes, assessmentsRes, settingsRes] = await Promise.all([
    withTimeout(supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    ),
    withTimeout(supabase
      .from('user_subjects')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    ),
    withTimeout(supabase
      .from('user_assessments')
      .select('*')
      .eq('user_id', userId)
    ),
    withTimeout(supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    ),
  ]);

  // If table doesn't exist, throw error to trigger fallback
  if (profileRes.error?.code === 'PGRST205') {
    throw new Error('Normalized schema tables do not exist');
  }

  if (profileRes.error) throw profileRes.error;
  if (subjectsRes.error) throw subjectsRes.error;
  if (assessmentsRes.error) throw assessmentsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const profile = profileRes.data as NormalizedProfile | null;
  const subjects = subjectsRes.data as NormalizedSubject[] | null;
  const assessments = assessmentsRes.data as NormalizedAssessment[] | null;
  const settings = settingsRes.data as NormalizedSettings | null;

  if (!profile) return null;

  // 2. Group assessments by subject
  const assessmentsBySubject = new Map<string, NormalizedAssessment[]>();
  assessments?.forEach(a => {
    if (!assessmentsBySubject.has(a.subject_id)) {
      assessmentsBySubject.set(a.subject_id, []);
    }
    assessmentsBySubject.get(a.subject_id)!.push(a);
  });

  // 3. Determine grading system
  const gradingSystem = profile.academic_system === 'NIGERIAN' ? 'nigerian_university'
                      : profile.academic_system === 'FRENCH' ? 'french'
                      : 'apc';
  const isNigerian = gradingSystem === 'nigerian_university';

  // 4. Transform subjects
  const transformedSubjects: Subject[] = (subjects ?? []).map(subject => {
    const subjectAssessments = assessmentsBySubject.get(subject.id) ?? [];
    
    if (isNigerian) {
      // Nigerian: customAssessments
      const customAssessments: CustomAssessment[] = subjectAssessments.map(a => ({
        id: a.metadata.originalId ?? crypto.randomUUID(),
        label: a.label,
        weight: a.weight ?? 0,
        value: a.value,
      }));

      return {
        id: subject.metadata.originalId ?? crypto.randomUUID(),
        name: subject.name,
        coefficient: subject.weight,
        creditUnits: subject.weight,
        customAssessments,
        marks: { interro: null, dev: null, compo: null },
      };
    } else {
      // APC/French: marks
      const marks = {
        interro: subjectAssessments.find(a => a.label === 'Interro')?.value ?? null,
        dev: subjectAssessments.find(a => a.label === 'Devoir')?.value ?? null,
        compo: subjectAssessments.find(a => a.label === 'Compo')?.value ?? null,
      };

      return {
        id: subject.metadata.originalId ?? crypto.randomUUID(),
        name: subject.name,
        coefficient: subject.weight,
        marks,
      };
    }
  });

  // 5. Construct AppState
  const appState: AppState = {
    step: 'results',
    targetAverage: settings?.target_value ?? 16,
    targetMin: settings?.target_value ?? 16,
    subjects: transformedSubjects,
    settings: {
      ...(settings?.settings_json ?? {}),
      gradingSystem,
    },
    studentName: profile.student_name ?? undefined,
    classLevel: profile.metadata.classLevel,
    serie: profile.metadata.serie,
    semester: profile.metadata.semester,
    department: profile.metadata.department,
    universityLevel: profile.metadata.universityLevel,
  };

  return appState;
}

// ─── Migration: Old JSONB → New Normalized ────────────────────────────────────

export async function migrateUserToNormalized(userId: string): Promise<void> {
  const { error } = await withTimeout(supabase.rpc('migrate_user_state_to_normalized', {
    p_user_id: userId,
  }));
  
  if (error) throw error;
}

// ─── Check if user has been migrated ──────────────────────────────────────────

export async function isUserMigrated(userId: string): Promise<boolean> {
  try {
    const { data, error } = await withTimeout(supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    );

    // If table doesn't exist (PGRST205), user is not migrated
    if (error?.code === 'PGRST205') {
      return false;
    }

    if (error) throw error;
    return !!data;
  } catch (error) {
    // If any error occurs (including table not found), assume not migrated
    console.warn('Error checking migration status, assuming not migrated:', error);
    return false;
  }
}
