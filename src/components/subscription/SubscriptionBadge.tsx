import { Crown, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionBadgeProps {
  onClick: () => void;
}

export function SubscriptionBadge({ onClick }: SubscriptionBadgeProps) {
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 hover:bg-yellow-500/25 transition-colors"
      >
        <Crown className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">Full Access</span>
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
      <span className="text-sm font-bold text-primary">Free · {status.downloads}</span>
      <span className="text-[10px] font-bold text-primary/60 ml-1">↑ Upgrade</span>
    </button>
  );
}
