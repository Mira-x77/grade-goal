-- Add image_url column to admin_notifications table
ALTER TABLE public.admin_notifications 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.admin_notifications.image_url IS 'Optional image URL to display with the notification';
