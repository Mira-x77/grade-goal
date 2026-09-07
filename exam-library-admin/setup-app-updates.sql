-- Create app_updates table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_updates (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(50) NOT NULL,
    version_code INTEGER NOT NULL UNIQUE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_updates_version_code ON app_updates(version_code);
CREATE INDEX IF NOT EXISTS idx_app_updates_active ON app_updates(is_active, version_code);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_updates_updated_at_trigger ON app_updates;
CREATE TRIGGER update_app_updates_updated_at_trigger
    BEFORE UPDATE ON app_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_app_updates_updated_at();

-- Create storage bucket for app updates (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('app-updates', 'app-updates', true);

-- Set up RLS policies for app_updates table
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read app updates" ON app_updates;
DROP POLICY IF EXISTS "Allow service role to manage app updates" ON app_updates;

-- Policy for authenticated users to read updates
CREATE POLICY "Allow authenticated users to read app updates" ON app_updates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for service role to manage updates (admin operations)
CREATE POLICY "Allow service role to manage app updates" ON app_updates
    FOR ALL USING (auth.role() = 'service_role');

-- Storage policies for app-updates bucket
-- These need to be created in Supabase dashboard or via API:
-- 1. Allow authenticated users to read files
-- 2. Allow service role to upload/delete files