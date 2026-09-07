import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface RedeemCodeSuccessProps {
  open: boolean;
  durationMonths?: number;
  onDone: () => void;
}

function ConfettiBurst() {
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.2, duration: 0.8 }}>
      {Array.from({ length: 48 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block h-2 w-2 rounded-sm"
          style={{
            left: `${(i * 17) % 100}%`,
            top: '-4%',
            background: colors[i % colors.length],
          }}
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: 360 + i * 20,
            opacity: [1, 1, 0],
            x: (i % 2 === 0 ? 1 : -1) * (40 + (i % 5) * 24),
          }}
          transition={{ duration: 2.4 + (i % 7) * 0.1, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

export function RedeemCodeSuccess({ open, durationMonths, onDone }: RedeemCodeSuccessProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <>
      <ConfettiBurst />
      <motion.div
        className="fixed inset-0 z-[85] flex items-center justify-center bg-background/95 backdrop-blur-sm px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl border-2 border-foreground bg-card p-8 text-center card-shadow"
          initial={{ scale: 0.85, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center">
              <span className="text-4xl">👑</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-premium/15 border border-premium/30 px-3 py-1 mb-3">
            <Crown className="h-4 w-4 text-premium" />
            <span className="text-xs font-black text-premium">{t('premiumUnlocked')}</span>
          </div>
          <h2 className="text-2xl font-black text-foreground">{t('accessGranted')}</h2>
          <p className="text-sm font-semibold text-muted-foreground mt-2">
            {durationMonths
              ? t('premiumActiveForMonths').replace('{n}', String(durationMonths))
              : t('premiumActiveNow')}
          </p>
          <motion.button
            onClick={onDone}
            className="mt-6 w-full rounded-2xl bg-secondary border-2 border-foreground py-3.5 font-black text-foreground card-shadow active:translate-y-0.5"
            whileTap={{ scale: 0.98 }}
          >
            {t('letsGo')}
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}
