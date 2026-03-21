-- Subscription System Tables

-- Subscription codes table
CREATE TABLE IF NOT EXISTS subscription_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(14) UNIQUE NOT NULL,
  duration_months INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by VARCHAR(255),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_is_used ON subscription_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_created_at ON subscription_codes(created_at DESC);

-- Subscription analytics table
CREATE TABLE IF NOT EXISTS subscription_analytics (
  id VARCHAR(50) PRIMARY KEY,
  total_codes_generated INTEGER DEFAULT 0,
  total_codes_used INTEGER DEFAULT 0,
  active_premium_users INTEGER DEFAULT 0,
  codes_by_duration JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize analytics
INSERT INTO subscription_analytics (id, total_codes_generated, total_codes_used, active_premium_users, codes_by_duration)
VALUES ('main', 0, 0, 0, '{"1": 0, "3": 0, "6": 0, "12": 0}')
ON CONFLICT (id) DO NOTHING;

-- Function to validate and use a subscription code
CREATE OR REPLACE FUNCTION use_subscription_code(
  p_code VARCHAR(14),
  p_device_id VARCHAR(255)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  duration_months INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_code_record RECORD;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_code_record
  FROM subscription_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid code', NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if already used
  IF v_code_record.is_used THEN
    RETURN QUERY SELECT FALSE, 'Code already used', NULL::INTEGER, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Calculate expiry date
  v_expiry := NOW() + (v_code_record.duration_months || ' months')::INTERVAL;

  -- Mark code as used
  UPDATE subscription_codes
  SET is_used = TRUE,
      used_by = p_device_id,
      used_at = NOW()
  WHERE code = p_code;

  -- Update analytics
  UPDATE subscription_analytics
  SET total_codes_used = total_codes_used + 1,
      active_premium_users = active_premium_users + 1,
      last_updated = NOW()
  WHERE id = 'main';

  -- Return success
  RETURN QUERY SELECT TRUE, 'Code activated successfully', v_code_record.duration_months, v_expiry;
END;
$$ LANGUAGE plpgsql;

-- Function to update analytics after code generation
CREATE OR REPLACE FUNCTION update_code_generation_analytics(
  p_count INTEGER,
  p_duration INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE subscription_analytics
  SET total_codes_generated = total_codes_generated + p_count,
      codes_by_duration = jsonb_set(
        codes_by_duration,
        ARRAY[p_duration::TEXT],
        (COALESCE((codes_by_duration->>p_duration::TEXT)::INTEGER, 0) + p_count)::TEXT::JSONB
      ),
      last_updated = NOW()
  WHERE id = 'main';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your RLS policies)
-- For now, allowing public read on codes for validation
ALTER TABLE subscription_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read codes for validation (app needs this)
CREATE POLICY "Allow public to read codes for validation" ON subscription_codes
  FOR SELECT USING (true);

-- Allow authenticated users (admin) to insert codes
CREATE POLICY "Allow authenticated to insert codes" ON subscription_codes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users (admin) to view all codes
CREATE POLICY "Allow authenticated to view all codes" ON subscription_codes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow public to read analytics
CREATE POLICY "Allow public to read analytics" ON subscription_analytics
  FOR SELECT USING (true);

-- Allow authenticated to update analytics
CREATE POLICY "Allow authenticated to update analytics" ON subscription_analytics
  FOR UPDATE USING (auth.role() = 'authenticated');
