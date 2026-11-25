-- Feeds / Actus: news vs course, up to 5 images, price stays optional

ALTER TABLE public.course_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'course';

UPDATE public.course_posts
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND image_url <> ''
  AND (image_urls IS NULL OR cardinality(image_urls) = 0);

ALTER TABLE public.course_posts
  DROP CONSTRAINT IF EXISTS course_posts_post_type_check;

ALTER TABLE public.course_posts
  ADD CONSTRAINT course_posts_post_type_check
  CHECK (post_type IN ('course', 'news'));

COMMENT ON COLUMN public.course_posts.image_urls IS 'Up to 5 flyer/context images; image_url remains the cover';
COMMENT ON COLUMN public.course_posts.post_type IS 'course (may have price/link) or news (price not required)';
