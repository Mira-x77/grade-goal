import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { subscriptionService } from "@/services/subscriptionService";
import { PremiumGateSheet } from "@/components/subscription/PremiumGateSheet";
import { DownloadLimitGateSheet } from "@/components/subscription/DownloadLimitGateSheet";
import AuthSheet from "@/components/AuthSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PREMIUM_DEV_BYPASS } from "@/config/premium";
import { quotaEvents } from "@/lib/quotaEvents";
import { isGuestUser, getPersistedUserId } from "@/lib/guest-auth";

interface AppConfig {
  premiumEnabled: boolean;
  premiumLoading: boolean;
  daysRemaining?: number;
  expiresAt?: string;
  refreshPremium: () => Promise<void>;
  requirePremium: (action: () => void, subjectName?: string) => void;
  openPremiumGate: (subjectName?: string, onSuccess?: () => void) => void;
  openDownloadLimitGate: (onSuccess?: () => void) => void;
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
  const { t } = useLanguage();
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [premiumEnabled, setPremiumEnabled] = useState(PREMIUM_DEV_BYPASS);
  const [daysRemaining, setDaysRemaining] = useState<number | undefined>();
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateSubject, setGateSubject] = useState<string | undefined>();
  const [downloadLimitGateOpen, setDownloadLimitGateOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const pendingGateRef = useRef<"premium" | "download" | null>(null);
  const pendingOpenAfterAuthRef = useRef<"premium" | "download" | null>(null);
  const pendingSuccessCallbackRef = useRef<(() => void) | null>(null);

  const refreshPremium = useCallback(async () => {
    if (PREMIUM_DEV_BYPASS) {
      setPremiumEnabled(true);
      setPremiumLoading(false);
      return;
    }
    setPremiumLoading(true);
    try {
      await subscriptionService.initialize(user?.id ?? getPersistedUserId());
      const status = await subscriptionService.getStatus();
      setPremiumEnabled(status.hasPremiumAccess);
      setDaysRemaining(status.daysRemaining);
      setExpiresAt(status.expires);
      if (status.hasPremiumAccess) {
        quotaEvents.emit();
      }
    } catch {
      try {
        const status = await subscriptionService.getStatus();
        setPremiumEnabled(status.hasPremiumAccess);
        setDaysRemaining(status.daysRemaining);
        setExpiresAt(status.expires);
      } catch {
        setPremiumEnabled(false);
      }
    } finally {
      setPremiumLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void refreshPremium(); }, [refreshPremium]);

  const openPremiumGate = useCallback((subjectName?: string, onSuccess?: () => void) => {
    pendingSuccessCallbackRef.current = onSuccess ?? null;
    setGateSubject(subjectName);
    if (isGuestUser(user)) {
      pendingGateRef.current = "premium";
      setAuthGateOpen(true);
      return;
    }
    setGateOpen(true);
  }, [user]);

  const openDownloadLimitGate = useCallback((onSuccess?: () => void) => {
    pendingSuccessCallbackRef.current = onSuccess ?? null;
    if (isGuestUser(user)) {
      pendingGateRef.current = "download";
      setAuthGateOpen(true);
      return;
    }
    setDownloadLimitGateOpen(true);
  }, [user]);

  const handleAuthGateClose = useCallback((signedIn?: boolean) => {
    setAuthGateOpen(false);
    if (!signedIn) {
      pendingGateRef.current = null;
      pendingOpenAfterAuthRef.current = null;
      pendingSuccessCallbackRef.current = null;
      return;
    }
    pendingOpenAfterAuthRef.current = pendingGateRef.current;
    pendingGateRef.current = null;
  }, []);

  const handleGateSuccess = useCallback(() => {
    void refreshPremium();
    quotaEvents.emit();
    if (pendingSuccessCallbackRef.current) {
      const cb = pendingSuccessCallbackRef.current;
      pendingSuccessCallbackRef.current = null;
      try {
        cb();
      } catch (err) {
        console.warn("Post-code success callback failed:", err);
      }
    }
  }, [refreshPremium]);

  useEffect(() => {
    if (!pendingOpenAfterAuthRef.current) return;
    if (isGuestUser(user)) return;

    const kind = pendingOpenAfterAuthRef.current;
    pendingOpenAfterAuthRef.current = null;
    if (kind === "premium") {
      setGateOpen(true);
    } else if (kind === "download") {
      setDownloadLimitGateOpen(true);
    }
  }, [user]);

  const requirePremium = useCallback((action: () => void, subjectName?: string) => {
    if (premiumEnabled) { action(); return; }
    openPremiumGate(subjectName, action);
  }, [premiumEnabled, openPremiumGate]);

  const value = useMemo(() => ({
    premiumEnabled, premiumLoading, daysRemaining, expiresAt, refreshPremium, requirePremium, openPremiumGate, openDownloadLimitGate,
  }), [premiumEnabled, premiumLoading, daysRemaining, expiresAt, refreshPremium, requirePremium, openPremiumGate, openDownloadLimitGate]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
      <AuthSheet
        open={authGateOpen}
        onClose={handleAuthGateClose}
        message={t("premiumSignInRequired")}
      />
      <PremiumGateSheet
        open={gateOpen}
        onClose={() => { setGateOpen(false); pendingSuccessCallbackRef.current = null; }}
        onSuccess={handleGateSuccess}
        subjectName={gateSubject}
      />
      <DownloadLimitGateSheet
        open={downloadLimitGateOpen}
        onClose={() => { setDownloadLimitGateOpen(false); pendingSuccessCallbackRef.current = null; }}
        onSuccess={handleGateSuccess}
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
