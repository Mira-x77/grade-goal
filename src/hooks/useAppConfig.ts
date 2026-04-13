import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback to the hardcoded value if remote fetch fails
const FALLBACK = false;

let cached: boolean | null = null;

export function usePremiumEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(cached ?? FALLBACK);

  useEffect(() => {
    if (cached !== null) return;
    supabase
      .from("app_config")
      .select("value")
      .eq("key", "premium_enabled")
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const val = data.value === true || data.value === "true";
          cached = val;
          setEnabled(val);
        }
      });
  }, []);

  return enabled;
}
