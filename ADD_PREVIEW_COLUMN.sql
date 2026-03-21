-- Add preview_url column to exam_papers table
-- Run this in Supabase SQL Editor

ALTER TABLE exam_papers 
ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Add comment
COMMENT ON COLUMN exam_papers.preview_url IS 'URL to watermarked preview image of first page';
