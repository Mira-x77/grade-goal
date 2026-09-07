import { Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscriptionService } from '@/services/subscriptionService';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionBadgeProps {
  onClick: () => void;
}

export function SubscriptionBadge({ onClick }: SubscriptionBadgeProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<{
    tier: string;
    hasPremiumAccess: boolean;
    unlockedSubjects: string[];
  } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await subscriptionService.getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  if (!status) return null;

  if (status.hasPremiumAccess) {
    const label = status.unlockedSubjects.includes('all')
      ? t("allSubjectsPass")
      : `${status.unlockedSubjects.length} ${status.unlockedSubjects.length === 1 ? t("subject") : t("subjects")} ${t("unlocked")}`;

    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-premium/15 border border-premium/30 active:bg-premium/25 transition-colors"
      >
        <Crown className="h-4 w-4 text-premium" />
        <span className="text-sm font-bold text-premium">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 active:bg-primary/20 transition-colors"
    >
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm font-bold text-primary">{t("unlock")}</span>
    </button>
  );
}
