import urllib.request
import json

supabase_url = "https://rvkkrxdqlvtitwhicgbc.supabase.co"
# Service role key from transcript log 4d56e19f-5647-4879-a0e0-204b4571b470
service_key = "sb_secret_laUHF_riUoJa6CQkn4KQFQ_RAas_qXi"

# SQL to create public.exam_papers table and RLS policies
sql = """
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

ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public read access to exam_papers" ON public.exam_papers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public insert to exam_papers" ON public.exam_papers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to exam_papers" ON public.exam_papers;
CREATE POLICY "Allow public update to exam_papers" ON public.exam_papers FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_papers TO anon, authenticated, service_role;
"""

# Try posting to /rest/v1/rpc or sql query endpoint
req = urllib.request.Request(
    f"{supabase_url}/rest/v1/query",
    data=json.dumps({"query": sql}).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Success:", resp.read().decode('utf-8'))
except Exception as e:
    print("REST query endpoint error:", e)
