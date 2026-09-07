-- ============================================================
-- System-Agnostic Schema Migration
-- Refactors database to support multiple academic systems
-- without APC-first assumptions
-- ============================================================

-- ============================================================
-- PART 1: New Normalized Tables
-- ============================================================

-- Academic systems enum
CREATE TYPE academic_system AS ENUM ('APC', 'FRENCH', 'NIGERIAN');

-- User profile with system selection
CREATE TABLE IF NOT EXISTS public.user_profile (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_system academic_system NOT NULL DEFAULT 'APC',
  student_name    TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}', -- System-specific profile data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Subjects/Courses (system-agnostic)
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  weight          NUMERIC(5,2) NOT NULL, -- Coefficient or Credit Units
  weight_type     TEXT NOT NULL CHECK (weight_type IN ('coefficient', 'credit_units')),
  metadata        JSONB NOT NULL DEFAULT '{}', -- System-specific subject data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Assessments (system-agnostic)
CREATE TABLE IF NOT EXISTS public.user_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  label           TEXT NOT NULL, -- "Interro", "CA", "Exam", etc.
  value           NUMERIC(6,2), -- Score (nullable until entered)
  max_value       NUMERIC(6,2) NOT NULL, -- 20 for APC, 100 for Nigerian
  weight          NUMERIC(5,2), -- Percentage weight (Nigerian only)
  assessment_type TEXT NOT NULL, -- "fixed" (APC) or "dynamic" (Nigerian)
  metadata        JSONB NOT NULL DEFAULT '{}', -- System-specific assessment data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semesters/Terms (Nigerian only, but available for all systems)
CREATE TABLE IF NOT EXISTS public.user_semesters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL, -- "First Semester", "Term 1", etc.
  session_label   TEXT, -- "2023/2024" (Nigerian)
  start_date      DATE,
  end_date        DATE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link subjects to semesters (optional, Nigerian uses this)
CREATE TABLE IF NOT EXISTS public.semester_subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id     UUID NOT NULL REFERENCES public.user_semesters(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  UNIQUE (semester_id, subject_id)
);

-- User settings (system-agnostic)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_value    NUMERIC(5,2), -- Target average or GPA
  settings_json   JSONB NOT NULL DEFAULT '{}', -- System-specific settings
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- PART 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS user_profile_user_id_idx ON public.user_profile(user_id);
CREATE INDEX IF NOT EXISTS user_subjects_user_id_idx ON public.user_subjects(user_id);
CREATE INDEX IF NOT EXISTS user_assessments_user_id_idx ON public.user_assessments(user_id);
CREATE INDEX IF NOT EXISTS user_assessments_subject_id_idx ON public.user_assessments(subject_id);
CREATE INDEX IF NOT EXISTS user_semesters_user_id_idx ON public.user_semesters(user_id);
CREATE INDEX IF NOT EXISTS semester_subjects_semester_id_idx ON public.semester_subjects(semester_id);
CREATE INDEX IF NOT EXISTS semester_subjects_subject_id_idx ON public.semester_subjects(subject_id);
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings(user_id);

-- ============================================================
-- PART 3: Row Level Security
-- ============================================================

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- user_profile policies
CREATE POLICY "user_profile: select own"
  ON public.user_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_profile: insert own"
  ON public.user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile: update own"
  ON public.user_profile FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile: delete own"
  ON public.user_profile FOR DELETE
  USING (auth.uid() = user_id);

-- user_subjects policies
CREATE POLICY "user_subjects: select own"
  ON public.user_subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_subjects: insert own"
  ON public.user_subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subjects: update own"
  ON public.user_subjects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subjects: delete own"
  ON public.user_subjects FOR DELETE
  USING (auth.uid() = user_id);

-- user_assessments policies
CREATE POLICY "user_assessments: select own"
  ON public.user_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_assessments: insert own"
  ON public.user_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_assessments: update own"
  ON public.user_assessments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_assessments: delete own"
  ON public.user_assessments FOR DELETE
  USING (auth.uid() = user_id);

-- user_semesters policies
CREATE POLICY "user_semesters: select own"
  ON public.user_semesters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_semesters: insert own"
  ON public.user_semesters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_semesters: update own"
  ON public.user_semesters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_semesters: delete own"
  ON public.user_semesters FOR DELETE
  USING (auth.uid() = user_id);

-- semester_subjects policies (no user_id, check via subject)
CREATE POLICY "semester_subjects: select own"
  ON public.semester_subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_subjects
      WHERE user_subjects.id = semester_subjects.subject_id
      AND user_subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "semester_subjects: insert own"
  ON public.semester_subjects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_subjects
      WHERE user_subjects.id = semester_subjects.subject_id
      AND user_subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "semester_subjects: delete own"
  ON public.semester_subjects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_subjects
      WHERE user_subjects.id = semester_subjects.subject_id
      AND user_subjects.user_id = auth.uid()
    )
  );

-- user_settings policies
CREATE POLICY "user_settings: select own"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings: insert own"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: update own"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: delete own"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PART 4: Migration Helper Functions
-- ============================================================

-- Function to migrate old JSONB state to new normalized schema
CREATE OR REPLACE FUNCTION migrate_user_state_to_normalized(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_state JSONB;
  v_system TEXT;
  v_subject JSONB;
  v_subject_id UUID;
  v_assessment JSONB;
BEGIN
  -- Get old state
  SELECT state_json INTO v_state
  FROM public.user_app_state
  WHERE user_id = p_user_id;

  IF v_state IS NULL THEN
    RETURN;
  END IF;

  -- Determine system
  v_system := COALESCE(v_state->'settings'->>'gradingSystem', 'apc');
  
  -- Insert profile
  INSERT INTO public.user_profile (user_id, academic_system, student_name, metadata)
  VALUES (
    p_user_id,
    CASE 
      WHEN v_system = 'nigerian_university' THEN 'NIGERIAN'::academic_system
      WHEN v_system = 'french' THEN 'FRENCH'::academic_system
      ELSE 'APC'::academic_system
    END,
    v_state->>'studentName',
    jsonb_build_object(
      'classLevel', v_state->>'classLevel',
      'serie', v_state->>'serie',
      'semester', v_state->>'semester',
      'department', v_state->>'department',
      'universityLevel', v_state->>'universityLevel'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert settings
  INSERT INTO public.user_settings (user_id, target_value, settings_json)
  VALUES (
    p_user_id,
    COALESCE((v_state->>'targetMin')::NUMERIC, (v_state->>'targetAverage')::NUMERIC),
    COALESCE(v_state->'settings', '{}'::JSONB)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert subjects and assessments
  FOR v_subject IN SELECT * FROM jsonb_array_elements(COALESCE(v_state->'subjects', '[]'::JSONB))
  LOOP
    -- Insert subject
    INSERT INTO public.user_subjects (user_id, name, weight, weight_type, metadata)
    VALUES (
      p_user_id,
      v_subject->>'name',
      COALESCE((v_subject->>'creditUnits')::NUMERIC, (v_subject->>'coefficient')::NUMERIC, 1),
      CASE WHEN v_subject->>'creditUnits' IS NOT NULL THEN 'credit_units' ELSE 'coefficient' END,
      jsonb_build_object('originalId', v_subject->>'id')
    )
    ON CONFLICT (user_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_subject_id;

    -- Insert assessments based on system
    IF v_system = 'nigerian_university' AND v_subject->'customAssessments' IS NOT NULL THEN
      -- Nigerian: dynamic assessments
      FOR v_assessment IN SELECT * FROM jsonb_array_elements(v_subject->'customAssessments')
      LOOP
        INSERT INTO public.user_assessments (
          user_id, subject_id, label, value, max_value, weight, assessment_type
        )
        VALUES (
          p_user_id,
          v_subject_id,
          v_assessment->>'label',
          (v_assessment->>'value')::NUMERIC,
          100,
          (v_assessment->>'weight')::NUMERIC,
          'dynamic'
        );
      END LOOP;
    ELSE
      -- APC/French: fixed assessments (interro, dev, compo)
      INSERT INTO public.user_assessments (
        user_id, subject_id, label, value, max_value, assessment_type
      )
      VALUES
        (p_user_id, v_subject_id, 'Interro', (v_subject->'marks'->>'interro')::NUMERIC, 20, 'fixed'),
        (p_user_id, v_subject_id, 'Devoir', (v_subject->'marks'->>'dev')::NUMERIC, 20, 'fixed'),
        (p_user_id, v_subject_id, 'Compo', (v_subject->'marks'->>'compo')::NUMERIC, 20, 'fixed');
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- PART 5: Updated RPC Functions
-- ============================================================

-- Keep old function for backward compatibility during transition
-- (Will be deprecated after full migration)

-- New function: Get complete user data in normalized format
CREATE OR REPLACE FUNCTION get_user_data_normalized(p_user_id UUID)
RETURNS TABLE (
  profile JSONB,
  subjects JSONB,
  assessments JSONB,
  semesters JSONB,
  settings JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT row_to_json(p.*) FROM public.user_profile p WHERE p.user_id = p_user_id) AS profile,
    (SELECT jsonb_agg(row_to_json(s.*)) FROM public.user_subjects s WHERE s.user_id = p_user_id) AS subjects,
    (SELECT jsonb_agg(row_to_json(a.*)) FROM public.user_assessments a WHERE a.user_id = p_user_id) AS assessments,
    (SELECT jsonb_agg(row_to_json(sem.*)) FROM public.user_semesters sem WHERE sem.user_id = p_user_id) AS semesters,
    (SELECT row_to_json(set.*) FROM public.user_settings set WHERE set.user_id = p_user_id) AS settings;
END;
$$;

-- ============================================================
-- PART 6: Triggers for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_assessments_updated_at
  BEFORE UPDATE ON public.user_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_semesters_updated_at
  BEFORE UPDATE ON public.user_semesters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 7: Comments for Documentation
-- ============================================================

COMMENT ON TABLE public.user_profile IS 'User profile with academic system selection';
COMMENT ON TABLE public.user_subjects IS 'System-agnostic subjects/courses';
COMMENT ON TABLE public.user_assessments IS 'System-agnostic assessments (marks, scores, evaluations)';
COMMENT ON TABLE public.user_semesters IS 'Semesters/terms (optional, used by Nigerian system)';
COMMENT ON TABLE public.semester_subjects IS 'Links subjects to semesters';
COMMENT ON TABLE public.user_settings IS 'User settings and preferences';

COMMENT ON COLUMN public.user_subjects.weight IS 'Coefficient (APC/French) or Credit Units (Nigerian)';
COMMENT ON COLUMN public.user_subjects.weight_type IS 'Indicates whether weight is coefficient or credit_units';
COMMENT ON COLUMN public.user_assessments.assessment_type IS 'fixed (APC: interro/dev/compo) or dynamic (Nigerian: custom)';
COMMENT ON COLUMN public.user_assessments.weight IS 'Percentage weight for dynamic assessments (Nigerian only)';

-- ============================================================
-- PART 8: Grant Permissions
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_semesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

GRANT EXECUTE ON FUNCTION migrate_user_state_to_normalized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_data_normalized(UUID) TO authenticated;
