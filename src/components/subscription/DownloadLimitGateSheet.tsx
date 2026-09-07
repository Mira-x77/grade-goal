import { useState } from 'react';
import { X, Crown, Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { subscriptionService } from '@/services/subscriptionService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getGradingSystemFromState, getSchoolFromProfile } from '@/lib/subscription-profile';
import { RedeemCodeSuccess } from './RedeemCodeSuccess';

interface DownloadLimitGateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DownloadLimitGateSheet({ open, onClose, onSuccess }: DownloadLimitGateSheetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | undefined>();

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 4 && value.length <= 8) value = `${value.slice(0, 4)}-${value.slice(4)}`;
    else if (value.length > 8) value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
    setCode(value);
    setError(null);
  };

  const handleActivate = async () => {
    if (code.replace(/-/g, '').length !== 12) {
      setError(t('enterValidCode'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let profileMeta: Record<string, unknown> | null = null;
      if (user?.id) {
        const { data } = await supabase.from('user_profile').select('metadata').eq('user_id', user.id).maybeSingle();
        profileMeta = (data?.metadata as Record<string, unknown>) ?? null;
      }
      const result = await subscriptionService.activatePremiumCode(code, {
        userId: user?.id ?? null,
        gradingSystem: getGradingSystemFromState(),
        school: getSchoolFromProfile(profileMeta),
        codeSource: null,
      });
      setDurationMonths(result.durationMonths);
      setShowSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('invalidCodeRetry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open && !showSuccess} onBackdropClick={() => !loading && onClose()} zIndex={75}>
        <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
        </div>
        <div className="flex justify-end px-5 pt-2">
          <button type="button" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 pb-6 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-28 h-28 rounded-3xl bg-secondary/20 border-2 border-border flex items-center justify-center">
              <Crown className="h-12 w-12 text-premium" />
            </div>
            <p className="text-base font-black text-foreground leading-snug">{t('premiumDownloadLimitMessage')}</p>
          </div>
          <input
            type="text"
            placeholder={t('enterCodePlaceholder')}
            value={code}
            onChange={handleCodeChange}
            maxLength={14}
            disabled={loading}
            className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-4 text-xl font-black text-center tracking-widest"
          />
          {error && <p className="text-sm font-bold text-destructive text-center">{error}</p>}
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading || code.replace(/-/g, '').length !== 12}
            className="w-full rounded-2xl bg-premium border-2 border-foreground py-4 font-black text-premium-foreground flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Crown className="h-5 w-5" />{t('activateCode')}</>}
          </button>
        </div>
      </Sheet>
      <RedeemCodeSuccess open={showSuccess} durationMonths={durationMonths} onDone={() => { setShowSuccess(false); setCode(''); onSuccess(); onClose(); }} />
    </>
  );
}
