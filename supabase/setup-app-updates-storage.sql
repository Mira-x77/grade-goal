-- Create storage bucket for app updates
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-updates', 'app-updates', true);

-- Set up RLS policies for app-updates bucket
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'app-updates');

CREATE POLICY "Allow admin uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'app-updates' 
  AND auth.role() = 'authenticated'
  -- Add your admin role check here if you have role-based auth
);

CREATE POLICY "Allow admin updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'app-updates' 
  AND auth.role() = 'authenticated'
  -- Add your admin role check here if you have role-based auth
);

CREATE POLICY "Allow admin deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'app-updates' 
  AND auth.role() = 'authenticated'
  -- Add your admin role check here if you have role-based auth
);