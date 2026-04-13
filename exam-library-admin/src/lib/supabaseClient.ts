import { createClient } from '@supabase/supabase-js';

// Shared singleton — all admin panel files should import from here
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
