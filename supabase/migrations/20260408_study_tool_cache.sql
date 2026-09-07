-- Cache for AI-generated study tool content
-- Keyed by subject + class_level so we generate once and reuse

CREATE TABLE IF NOT EXISTS public.study_tool_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT NOT NULL,
  class_level   TEXT NOT NULL,
  content       JSONB NOT NULL,  -- { topQuestions, keyTopics, cheatSheet, stepBySolutions, practiceTests, weakSpots }
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject, class_level)
);

-- Anyone can read (content is not user-specific)
ALTER TABLE public.study_tool_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read study tool cache" ON public.study_tool_cache FOR SELECT USING (true);
CREATE POLICY "Service role can upsert study tool cache" ON public.study_tool_cache FOR ALL USING (true);
