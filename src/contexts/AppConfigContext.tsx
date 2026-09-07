import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { subscriptionService } from "@/services/subscriptionService";
import { PremiumGateSheet } from "@/components/subscription/PremiumGateSheet";
import { DownloadLimitGateSheet } from "@/components/subscription/DownloadLimitGateSheet";
import { useAuth } from "@/contexts/AuthContext";
import { PREMIUM_DEV_BYPASS } from "@/config/premium";
import { quotaEvents } from "@/lib/quotaEvents";

interface AppConfig {
  premiumEnabled: boolean;
  premiumLoading: boolean;
  daysRemaining?: number;
  expiresAt?: string;
  refreshPremium: () => Promise<void>;
  requirePremium: (action: () => void, subjectName?: string) => void;
  openPremiumGate: (subjectName?: string) => void;
  openDownloadLimitGate: () => void;
}

const AppConfigContext = createContext<AppConfig>({
  premiumEnabled: false,
  premiumLoading: true,
  refreshPremium: async () => {},
  requirePremium: () => {},
  openPremiumGate: () => {},
  openDownloadLimitGate: () => {},
});

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [premiumEnabled, setPremiumEnabled] = useState(PREMIUM_DEV_BYPASS);
  const [daysRemaining, setDaysRemaining] = useState<number | undefined>();
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateSubject, setGateSubject] = useState<string | undefined>();
  const [downloadLimitGateOpen, setDownloadLimitGateOpen] = useState(false);

  const refreshPremium = useCallback(async () => {
    if (PREMIUM_DEV_BYPASS) {
      setPremiumEnabled(true);
      setPremiumLoading(false);
      return;
    }
    setPremiumLoading(true);
    try {
      await subscriptionService.initialize(user?.id ?? null);
      const status = await subscriptionService.getStatus();
      setPremiumEnabled(status.hasPremiumAccess);
      setDaysRemaining(status.daysRemaining);
      setExpiresAt(status.expires);
    } catch {
      setPremiumEnabled(false);
    } finally {
      setPremiumLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void refreshPremium(); }, [refreshPremium]);

  const openPremiumGate = useCallback((subjectName?: string) => {
    setGateSubject(subjectName);
    setGateOpen(true);
  }, []);

  const openDownloadLimitGate = useCallback(() => {
    setDownloadLimitGateOpen(true);
  }, []);

  const requirePremium = useCallback((action: () => void, subjectName?: string) => {
    if (premiumEnabled) { action(); return; }
    openPremiumGate(subjectName);
  }, [premiumEnabled, openPremiumGate]);

  const value = useMemo(() => ({
    premiumEnabled, premiumLoading, daysRemaining, expiresAt, refreshPremium, requirePremium, openPremiumGate, openDownloadLimitGate,
  }), [premiumEnabled, premiumLoading, daysRemaining, expiresAt, refreshPremium, requirePremium, openPremiumGate, openDownloadLimitGate]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
      <PremiumGateSheet open={gateOpen} onClose={() => setGateOpen(false)} onSuccess={() => void refreshPremium()} subjectName={gateSubject} />
      <DownloadLimitGateSheet
        open={downloadLimitGateOpen}
        onClose={() => setDownloadLimitGateOpen(false)}
        onSuccess={() => { void refreshPremium(); quotaEvents.emit(); }}
      />
    </AppConfigContext.Provider>
  );
}

export const useAppConfig = () => useContext(AppConfigContext);
export const usePremium = () => {
  const c = useAppConfig();
  return {
    isPremium: c.premiumEnabled,
    loading: c.premiumLoading,
    daysRemaining: c.daysRemaining,
    expiresAt: c.expiresAt,
    refresh: c.refreshPremium,
    requirePremium: c.requirePremium,
    openPremiumGate: c.openPremiumGate,
    openDownloadLimitGate: c.openDownloadLimitGate,
  };
};
