import { Crown, Download } from 'lucide-react';
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
    downloads: string;
    isUnlimited: boolean;
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

  // Premium badge
  if (status.tier === 'premium') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-premium/15 border border-premium/30 active:bg-premium/25 transition-colors"
      >
        <Crown className="h-4 w-4 text-premium" />
        <span className="text-sm font-bold text-premium">{t("monthsAccess")}</span>
      </button>
    );
  }

  // Free tier badge — always visible
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
    >
      <Download className="h-4 w-4 text-primary" />
      <span className="text-sm font-bold text-primary">{t("free")} · {status.downloads}</span>
      <span className="text-[10px] font-bold text-primary/60 ml-1">↑ {t("upgradeToPremium")}</span>
    </button>
  );
}
