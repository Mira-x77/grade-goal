import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Crown, Download, AlertCircle } from 'lucide-react';
import { quotaService, type DownloadQuota } from '@/services/quotaService';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePremium } from '@/hooks/usePremium';
import { quotaEvents } from '@/lib/quotaEvents';

interface DownloadQuotaDisplayProps {
  className?: string;
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
}

export interface DownloadQuotaDisplayRef {
  refreshQuota: () => Promise<void>;
}

export const DownloadQuotaDisplay = forwardRef<DownloadQuotaDisplayRef, DownloadQuotaDisplayProps>(({ 
  className = '', 
  showUpgradeButton = true,
  onUpgradeClick,
}, ref) => {
  const { t } = useLanguage();
  const { isPremium } = usePremium();
  const [quota, setQuota] = useState<DownloadQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuota = async () => {
    try {
      setLoading(true);
      const quotaStatus = await quotaService.getQuotaStatus();
      setQuota(quotaStatus);
    } catch (error) {
      console.error('Failed to load quota:', error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshQuota: loadQuota
  }));

  useEffect(() => {
    void loadQuota();
    return quotaEvents.subscribe((snapshot) => {
      if (snapshot) {
        setQuota(snapshot);
        setLoading(false);
      } else {
        void loadQuota();
      }
    });
  }, []);

  if (loading) {
    return (
      <div className={`rounded-2xl bg-card border-2 border-border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  if (isPremium || quota.hasPremium) {
    return null;
  }

  const progress = quota.downloadsUsed / quota.quotaLimit;
  const isNearLimit = progress > 0.8;
  const isAtLimit = !quota.canDownload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-4 ${
        isAtLimit 
          ? 'bg-card border-danger/30' 
          : isNearLimit 
            ? 'bg-card border-warning/30'
            : 'bg-card border-border'
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 ${
          isAtLimit 
            ? 'border-danger bg-danger/10'
            : 'border-border bg-background'
        }`}>
          {isAtLimit ? (
            <AlertCircle className="h-5 w-5 text-danger" />
          ) : (
            <Download className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-black text-sm ${
              isAtLimit ? 'text-danger' : 'text-foreground'
            }`}>
              {`${quota.downloadsUsed}/${quota.quotaLimit} ${t('downloads') || 'Downloads'}`}
            </p>
            
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isAtLimit 
                ? 'bg-danger/10 text-danger border border-danger/20'
                : isNearLimit 
                  ? 'bg-warning/10 text-warning border border-warning/20'
                  : 'bg-muted text-muted-foreground border border-muted-foreground/20'
            }`}>
              {quota.downloadsRemaining} {t('remaining') || 'left'}
            </span>
          </div>

          <p className={`text-xs font-semibold ${
            isAtLimit ? 'text-danger/70' : 'text-muted-foreground'
          }`}>
            {isAtLimit 
              ? t('upgradeForUnlimited') || 'Upgrade for unlimited downloads'
              : `${t('resetsMonthly') || 'Resets monthly'} • ${quota.monthYear}`
            }
          </p>

          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  isAtLimit 
                    ? 'bg-danger' 
                    : isNearLimit 
                      ? 'bg-warning' 
                      : 'bg-secondary'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {showUpgradeButton && isAtLimit && onUpgradeClick && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onUpgradeClick}
          className="w-full mt-3 rounded-xl bg-premium border-2 border-premium/30 py-2.5 px-4 flex items-center justify-center gap-2 font-black text-premium-foreground text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Crown className="h-4 w-4" />
          {t('upgradeToPremium') || 'Upgrade to Premium'}
        </motion.button>
      )}
    </motion.div>
  );
});
