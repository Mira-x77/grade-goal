-- Required by use_subscription_code (014) — adds columns from 012 if missing.
-- Run in Supabase SQL Editor if you see:
--   column "redeemed_by" of relation "subscription_codes" does not exist

ALTER TABLE subscription_codes
  ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grading_system TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS code_source TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_codes_redeemed_by ON subscription_codes(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code_source ON subscription_codes(code_source);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_school ON subscription_codes(school);
