-- ============================================================
-- User Cloud Persistence
-- Stores all user-scoped app data (subjects, marks, settings,
-- history, streak) linked to auth.users.id
-- ============================================================

-- Main app state table (one row per user)
CREATE TABLE IF NOT EXISTS public.user_app_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_json  JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Mark history table (one row per entry)
CREATE TABLE IF NOT EXISTS public.user_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  mark_type   TEXT NOT NULL CHECK (mark_type IN ('interro', 'dev', 'compo')),
  value       NUMERIC(5,2) NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Streak table (one row per user)
CREATE TABLE IF NOT EXISTS public.user_streak (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  best_streak     INTEGER NOT NULL DEFAULT 0,
  total_entries   INTEGER NOT NULL DEFAULT 0,
  last_entry_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_app_state_user_id_idx ON public.user_app_state(user_id);
CREATE INDEX IF NOT EXISTS user_history_user_id_idx   ON public.user_history(user_id);
CREATE INDEX IF NOT EXISTS user_history_date_idx      ON public.user_history(date DESC);
CREATE INDEX IF NOT EXISTS user_streak_user_id_idx    ON public.user_streak(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streak    ENABLE ROW LEVEL SECURITY;

-- user_app_state policies
CREATE POLICY "user_app_state: select own"
  ON public.user_app_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_app_state: insert own"
  ON public.user_app_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_app_state: update own"
  ON public.user_app_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_app_state: delete own"
  ON public.user_app_state FOR DELETE
  USING (auth.uid() = user_id);

-- user_history policies
CREATE POLICY "user_history: select own"
  ON public.user_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_history: insert own"
  ON public.user_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_history: delete own"
  ON public.user_history FOR DELETE
  USING (auth.uid() = user_id);

-- user_streak policies
CREATE POLICY "user_streak: select own"
  ON public.user_streak FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_streak: insert own"
  ON public.user_streak FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_streak: update own"
  ON public.user_streak FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Upsert helper functions (SECURITY DEFINER not needed —
-- called as authenticated user, RLS handles access)
-- ============================================================

-- Upsert app state
CREATE OR REPLACE FUNCTION upsert_user_app_state(
  p_user_id   UUID,
  p_state     JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_app_state (user_id, state_json, updated_at)
  VALUES (p_user_id, p_state, now())
  ON CONFLICT (user_id)
  DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = now();
END;
$$;

-- Upsert streak
CREATE OR REPLACE FUNCTION upsert_user_streak(
  p_user_id       UUID,
  p_current       INTEGER,
  p_best          INTEGER,
  p_total         INTEGER,
  p_last_date     DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_streak (user_id, current_streak, best_streak, total_entries, last_entry_date, updated_at)
  VALUES (p_user_id, p_current, p_best, p_total, p_last_date, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak  = EXCLUDED.current_streak,
    best_streak     = EXCLUDED.best_streak,
    total_entries   = EXCLUDED.total_entries,
    last_entry_date = EXCLUDED.last_entry_date,
    updated_at      = now();
END;
$$;
