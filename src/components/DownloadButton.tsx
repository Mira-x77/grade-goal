import { useState } from 'react';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDownloadQuota } from '@/hooks/useDownloadQuota';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePremium } from '@/contexts/AppConfigContext';

interface DownloadButtonProps {
  onDownload: () => Promise<void>;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showQuotaWarning?: boolean;
}

export function DownloadButton({
  onDownload,
  isDownloaded = false,
  isDownloading = false,
  disabled = false,
  className = '',
  children,
  showQuotaWarning = true
}: DownloadButtonProps) {
  const { t } = useLanguage();
  const { canDownload, downloadsRemaining, loading } = useDownloadQuota();
  const { isPremium, openDownloadLimitGate } = usePremium();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = async () => {
    if (disabled || isDownloading || isDownloaded || isClicked) return;

    if (!isPremium && !canDownload) {
      openDownloadLimitGate();
      return;
    }

    try {
      setIsClicked(true);
      await onDownload();
    } catch (error) {
      console.error('Download failed:', error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('limit reached') || msg.includes('Download limit')) {
        openDownloadLimitGate();
      }
    } finally {
      setIsClicked(false);
    }
  };

  const getButtonState = () => {
    if (isDownloaded) {
      return {
        text: t('downloaded') || 'Downloaded',
        icon: Download,
        className: 'bg-success/10 border-success/30 text-success cursor-default',
        disabled: true
      };
    }

    if (isDownloading || isClicked) {
      return {
        text: t('downloading') || 'Downloading...',
        icon: Loader2,
        className: 'bg-primary/10 border-primary/30 text-primary cursor-wait',
        disabled: true,
        spinning: true
      };
    }

    if (!isPremium && !canDownload) {
      return {
        text: showQuotaWarning ? (t('limitReached') || 'Limit Reached') : (t('download') || 'Download'),
        icon: AlertCircle,
        className: 'bg-danger/10 border-danger/30 text-danger active:scale-95',
        disabled: false
      };
    }

    return {
      text: children || t('download') || 'Download',
      icon: Download,
      className: 'bg-primary border-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
      disabled: false
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="space-y-2">
      <motion.button
        onClick={handleClick}
        disabled={buttonState.disabled || disabled || loading}
        whileTap={buttonState.disabled ? {} : { scale: 0.95 }}
        className={`
          w-full rounded-2xl border-2 py-3 px-4 font-black text-sm
          flex items-center justify-center gap-2 transition-all
          ${buttonState.className}
          ${className}
        `}
      >
        <buttonState.icon
          className={`h-4 w-4 ${buttonState.spinning ? 'animate-spin' : ''}`}
        />
        {buttonState.text}
      </motion.button>

      {showQuotaWarning && !isPremium && !isDownloaded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-center"
        >
          {canDownload ? (
            <p className="text-xs font-semibold text-muted-foreground">
              {downloadsRemaining} {t('downloadsRemaining') || 'downloads remaining this month'}
            </p>
          ) : (
            <p className="text-xs font-bold text-danger">
              {t('downloadLimitReached') || 'Download limit reached'}
            </p>
          )}
        </motion.div>
      )}

    </div>
  );
}
