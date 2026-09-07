-- ============================================================
-- CREATE NORMALIZED SCHEMA TABLES
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Academic systems enum
DO $$ BEGIN
  CREATE TYPE academic_system AS ENUM ('APC', 'FRENCH', 'NIGERIAN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User profile with system selection
CREATE TABLE IF NOT EXISTS public.user_profile (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_system academic_system NOT NULL DEFAULT 'APC',
  student_name    TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Subjects/Courses (system-agnostic)
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  weight          NUMERIC(5,2) NOT NULL,
  weight_type     TEXT NOT NULL CHECK (weight_type IN ('coefficient', 'credit_units')),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Assessments (system-agnostic)
CREATE TABLE IF NOT EXISTS public.user_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.user_subjects(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  value           NUMERIC(6,2),
  max_value       NUMERIC(6,2) NOT NULL,
  weight          NUMERIC(5,2),
  assessment_type TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semesters/Terms (Nigerian only, but available for all systems)
CREATE TABLE IF NOT EXISTS public.user_semesters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  session_label   TEXT,
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
  target_value    NUMERIC(5,2),
  settings_json   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- INDEXES
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
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_profile: select own" ON public.user_profile;
DROP POLICY IF EXISTS "user_profile: insert own" ON public.user_profile;
DROP POLICY IF EXISTS "user_profile: update own" ON public.user_profile;
DROP POLICY IF EXISTS "user_profile: delete own" ON public.user_profile;

DROP POLICY IF EXISTS "user_subjects: select own" ON public.user_subjects;
DROP POLICY IF EXISTS "user_subjects: insert own" ON public.user_subjects;
DROP POLICY IF EXISTS "user_subjects: update own" ON public.user_subjects;
DROP POLICY IF EXISTS "user_subjects: delete own" ON public.user_subjects;

DROP POLICY IF EXISTS "user_assessments: select own" ON public.user_assessments;
DROP POLICY IF EXISTS "user_assessments: insert own" ON public.user_assessments;
DROP POLICY IF EXISTS "user_assessments: update own" ON public.user_assessments;
DROP POLICY IF EXISTS "user_assessments: delete own" ON public.user_assessments;

DROP POLICY IF EXISTS "user_semesters: select own" ON public.user_semesters;
DROP POLICY IF EXISTS "user_semesters: insert own" ON public.user_semesters;
DROP POLICY IF EXISTS "user_semesters: update own" ON public.user_semesters;
DROP POLICY IF EXISTS "user_semesters: delete own" ON public.user_semesters;

DROP POLICY IF EXISTS "semester_subjects: select own" ON public.semester_subjects;
DROP POLICY IF EXISTS "semester_subjects: insert own" ON public.semester_subjects;
DROP POLICY IF EXISTS "semester_subjects: delete own" ON public.semester_subjects;

DROP POLICY IF EXISTS "user_settings: select own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: insert own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: update own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: delete own" ON public.user_settings;

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

-- semester_subjects policies
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
-- MIGRATION HELPER FUNCTION
-- ============================================================

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
-- TRIGGERS FOR updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON public.user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subjects_updated_at ON public.user_subjects;
CREATE TRIGGER update_user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_assessments_updated_at ON public.user_assessments;
CREATE TRIGGER update_user_assessments_updated_at
  BEFORE UPDATE ON public.user_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_semesters_updated_at ON public.user_semesters;
CREATE TRIGGER update_user_semesters_updated_at
  BEFORE UPDATE ON public.user_semesters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_semesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

GRANT EXECUTE ON FUNCTION migrate_user_state_to_normalized(UUID) TO authenticated;

-- ============================================================
-- DONE!
-- ============================================================

SELECT 'Normalized schema tables created successfully!' AS status;
