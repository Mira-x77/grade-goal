-- ============================================================
-- ALL SUPABASE TABLES, RLS POLICIES & MIGRATIONS FOR GOSTUDY / SCORE TARGET
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rvkkrxdqlvtitwhicgbc/sql/new
-- ============================================================

-- 1. EXAM PAPERS TABLE
CREATE TABLE IF NOT EXISTS public.exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  year INTEGER NOT NULL,
  exam_type TEXT NOT NULL,
  session TEXT,
  system TEXT DEFAULT 'apc',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_size_formatted TEXT,
  content_hash TEXT,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  preview_url TEXT,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_papers_class_level ON public.exam_papers(class_level);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON public.exam_papers(subject);
CREATE INDEX IF NOT EXISTS idx_exam_papers_year ON public.exam_papers(year DESC);
CREATE INDEX IF NOT EXISTS idx_exam_papers_downloads ON public.exam_papers(downloads DESC);

ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public read access to exam_papers" ON public.exam_papers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public insert to exam_papers" ON public.exam_papers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public update to exam_papers" ON public.exam_papers FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_papers TO anon, authenticated, service_role;


-- 2. LIBRARY BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.library_books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  author            TEXT,
  subject           TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT 'General',
  system            TEXT NOT NULL DEFAULT 'all',
  class_level       TEXT,
  description       TEXT,
  cover_url         TEXT,
  file_url          TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  file_size_formatted TEXT NOT NULL DEFAULT '',
  content_hash      TEXT NOT NULL DEFAULT '',
  tags              TEXT[] DEFAULT '{}',
  downloads         INTEGER NOT NULL DEFAULT 0,
  published_year    INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_books_system_idx   ON public.library_books(system);
CREATE INDEX IF NOT EXISTS library_books_subject_idx  ON public.library_books(subject);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_books: public read" ON public.library_books;
CREATE POLICY "library_books: public read" ON public.library_books FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO anon, authenticated, service_role;


-- 3. SUBSCRIPTION CODES TABLE
CREATE TABLE IF NOT EXISTS public.subscription_codes (
    code TEXT PRIMARY KEY,
    duration_months INTEGER NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_by_device_id TEXT,
    used_by TEXT,
    used_at TIMESTAMPTZ,
    redeemed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to subscription_codes" ON public.subscription_codes;
CREATE POLICY "Allow public access to subscription_codes" ON public.subscription_codes FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_codes TO anon, authenticated, service_role;


-- 4. USER DOWNLOAD QUOTAS TABLE
CREATE TABLE IF NOT EXISTS public.user_download_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  device_id TEXT NOT NULL,
  month_year TEXT NOT NULL,
  downloads_used INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 5,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, month_year)
);

ALTER TABLE public.user_download_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to user_download_quotas" ON public.user_download_quotas;
CREATE POLICY "Allow public access to user_download_quotas" ON public.user_download_quotas FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_download_quotas TO anon, authenticated, service_role;


-- 5. USER CLOUD PERSISTENCE TABLES
CREATE TABLE IF NOT EXISTS public.user_app_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_json  JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.user_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  mark_type   TEXT NOT NULL,
  value       NUMERIC(5,2) NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_app_state: allow all" ON public.user_app_state;
CREATE POLICY "user_app_state: allow all" ON public.user_app_state FOR ALL USING (true);

DROP POLICY IF EXISTS "user_history: allow all" ON public.user_history;
CREATE POLICY "user_history: allow all" ON public.user_history FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_state TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_history TO anon, authenticated, service_role;


-- 6. APP UPDATES TABLE
CREATE TABLE IF NOT EXISTS public.app_updates (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(50) NOT NULL,
    version_code INTEGER NOT NULL,
    apk_file_path VARCHAR(255) NOT NULL,
    apk_file_size BIGINT NOT NULL,
    release_notes TEXT NOT NULL,
    bug_fixes TEXT,
    new_features TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    min_supported_version INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to app_updates" ON public.app_updates;
CREATE POLICY "Allow public access to app_updates" ON public.app_updates FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_updates TO anon, authenticated, service_role;


-- 7. RPC FUNCTIONS & STORED PROCEDURES
CREATE OR REPLACE FUNCTION get_current_month_year()
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(now(), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION check_premium_status(p_device_id TEXT)
RETURNS TABLE (
  has_premium BOOLEAN,
  expires_at TIMESTAMPTZ,
  downloads_used INTEGER,
  quota_limit INTEGER,
  can_download BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
  v_current_month TEXT;
  v_quota_record RECORD;
  v_premium_active BOOLEAN := false;
  v_premium_expires TIMESTAMPTZ;
BEGIN
  v_current_month := get_current_month_year();
  
  SELECT 
    CASE 
      WHEN sc.is_used AND (sc.used_by = p_device_id OR sc.used_by_device_id = p_device_id) AND 
           (sc.created_at + (sc.duration_months || ' months')::INTERVAL) > now()
      THEN true ELSE false 
    END,
    sc.created_at + (sc.duration_months || ' months')::INTERVAL
  INTO v_premium_active, v_premium_expires
  FROM subscription_codes sc
  WHERE (sc.used_by = p_device_id OR sc.used_by_device_id = p_device_id)
    AND sc.is_used = true
    AND (sc.created_at + (sc.duration_months || ' months')::INTERVAL) > now()
  ORDER BY sc.created_at DESC
  LIMIT 1;
  
  SELECT * INTO v_quota_record
  FROM user_download_quotas
  WHERE device_id = p_device_id AND month_year = v_current_month;
  
  IF NOT FOUND THEN
    INSERT INTO user_download_quotas (
      device_id, month_year, downloads_used, quota_limit, is_premium, premium_expires_at
    ) VALUES (
      p_device_id, v_current_month, 0, 
      CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
      COALESCE(v_premium_active, false), v_premium_expires
    )
    RETURNING * INTO v_quota_record;
  ELSE
    IF v_quota_record.is_premium != COALESCE(v_premium_active, false) THEN
      UPDATE user_download_quotas 
      SET 
        is_premium = COALESCE(v_premium_active, false),
        quota_limit = CASE WHEN v_premium_active THEN 999999 ELSE 5 END,
        premium_expires_at = v_premium_expires,
        updated_at = now()
      WHERE device_id = p_device_id AND month_year = v_current_month
      RETURNING * INTO v_quota_record;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    COALESCE(v_premium_active, false) as has_premium,
    v_premium_expires as expires_at,
    v_quota_record.downloads_used as downloads_used,
    v_quota_record.quota_limit as quota_limit,
    (v_quota_record.downloads_used < v_quota_record.quota_limit) as can_download;
END;
$$;

CREATE OR REPLACE FUNCTION get_download_quota_status(p_device_id TEXT)
RETURNS TABLE (
  downloads_used INTEGER,
  quota_limit INTEGER,
  downloads_remaining INTEGER,
  has_premium BOOLEAN,
  premium_expires_at TIMESTAMPTZ,
  month_year TEXT,
  can_download BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
  v_status RECORD;
BEGIN
  SELECT * INTO v_status FROM check_premium_status(p_device_id);
  
  RETURN QUERY SELECT 
    v_status.downloads_used,
    v_status.quota_limit,
    GREATEST(0, v_status.quota_limit - v_status.downloads_used) as downloads_remaining,
    v_status.has_premium,
    v_status.expires_at,
    get_current_month_year() as month_year,
    v_status.can_download;
END;
$$;

CREATE OR REPLACE FUNCTION increment_downloads(paper_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.exam_papers
    SET downloads = downloads + 1
    WHERE id = paper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_premium_status(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_download_quota_status(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_current_month_year() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION increment_downloads(UUID) TO authenticated, anon, service_role;

SELECT 'All GoStudy tables, policies, and functions created successfully!' AS status;
