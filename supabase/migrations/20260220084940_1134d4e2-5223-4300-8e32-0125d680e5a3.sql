
-- Create library_documents table
CREATE TABLE public.library_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  serie TEXT, -- null for collège, A/C/D/E/F/G for lycée
  doc_type TEXT NOT NULL DEFAULT 'exam', -- 'exam' or 'class_test'
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view documents" ON public.library_documents FOR SELECT USING (true);

-- Authenticated users can upload
CREATE POLICY "Authenticated users can insert documents" ON public.library_documents FOR INSERT WITH CHECK (auth.uid() = uploader_id);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own documents" ON public.library_documents FOR DELETE USING (auth.uid() = uploader_id);

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('library-pdfs', 'library-pdfs', true);

-- Storage policies
CREATE POLICY "Anyone can view library PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'library-pdfs');

CREATE POLICY "Authenticated users can upload library PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'library-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own library PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'library-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
