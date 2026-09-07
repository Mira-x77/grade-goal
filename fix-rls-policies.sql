-- Fix RLS policies for app_updates table

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read app updates" ON app_updates;
DROP POLICY IF EXISTS "Allow service role to manage app updates" ON app_updates;

-- Allow public read access (for mobile app update checks)
CREATE POLICY "Allow public read app updates" ON app_updates
    FOR SELECT USING (is_active = true);

-- Allow authenticated users to read all updates (for admin panel)
CREATE POLICY "Allow authenticated read all app updates" ON app_updates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert updates (for admin panel)
CREATE POLICY "Allow authenticated insert app updates" ON app_updates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update records (for admin panel)
CREATE POLICY "Allow authenticated update app updates" ON app_updates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete records (for admin panel)
CREATE POLICY "Allow authenticated delete app updates" ON app_updates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Allow service role full access (backup policy)
CREATE POLICY "Allow service role full access app updates" ON app_updates
    FOR ALL USING (auth.role() = 'service_role');