import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppConfig {
  premiumEnabled: boolean;
}

const AppConfigContext = createContext<AppConfig>({ premiumEnabled: false });

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [premiumEnabled, setPremiumEnabled] = useState(false);

  useEffect(() => {
    supabase
      .from("app_config")
      .select("value")
      .eq("key", "premium_enabled")
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setPremiumEnabled(data.value === true || data.value === "true");
        }
      });
  }, []);

  return (
    <AppConfigContext.Provider value={{ premiumEnabled }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export const useAppConfig = () => useContext(AppConfigContext);
