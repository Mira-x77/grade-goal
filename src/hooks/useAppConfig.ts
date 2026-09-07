import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback to the hardcoded value if remote fetch fails
const FALLBACK = false;

let cached: boolean | null = null;

export function usePremiumEnabled(): boolean {
  return true;
}
