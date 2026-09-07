import { useState } from 'react';
import { X, Crown, Key, Loader2, ChevronDown } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { subscriptionService } from '@/services/subscriptionService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getGradingSystemFromState, getSchoolFromProfile, type CodeSource } from '@/lib/subscription-profile';
import { RedeemCodeSuccess } from './RedeemCodeSuccess';

interface RedeemCodeSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjectName?: string;
}

const SOURCE_OPTIONS: { value: CodeSource; labelKey: 'codeSourceSchool' | 'codeSourceFriend' | 'codeSourceOnline' | 'codeSourceOther' }[] = [
  { value: 'school', labelKey: 'codeSourceSchool' },
  { value: 'friend', labelKey: 'codeSourceFriend' },
  { value: 'online', labelKey: 'codeSourceOnline' },
  { value: 'other', labelKey: 'codeSourceOther' },
];

export function RedeemCodeSheet({ open, onClose, onSuccess, subjectName }: RedeemCodeSheetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [codeSource, setCodeSource] = useState<CodeSource | ''>('');
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

  const handleClose = () => {
    if (loading) return;
    setCode('');
    setCodeSource('');
    setError(null);
    onClose();
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
        const { data } = await supabase
          .from('user_profile')
          .select('metadata')
          .eq('user_id', user.id)
          .maybeSingle();
        profileMeta = (data?.metadata as Record<string, unknown>) ?? null;
      }

      const result = await subscriptionService.activatePremiumCode(code, {
        subjectName,
        userId: user?.id ?? null,
        gradingSystem: getGradingSystemFromState(),
        school: getSchoolFromProfile(profileMeta),
        codeSource: codeSource || null,
      });

      setDurationMonths(result.durationMonths);
      setShowSuccess(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('invalidCodeRetry');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    setCode('');
    setCodeSource('');
    onSuccess();
    onClose();
  };

  return (
    <>
      <Sheet open={open && !showSuccess} onBackdropClick={handleClose} zIndex={70}>
        <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-foreground/30" />
        </div>

        <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Key className="h-6 w-6 text-premium" />
            <div>
              <h2 className="text-lg font-black text-foreground">{t('iHaveACode')}</h2>
              <p className="text-xs font-semibold text-muted-foreground">{t('redeemCodeSubtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-muted-foreground active:scale-95 transition-transform">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 min-h-0">
          <div className="rounded-2xl bg-premium/10 border-2 border-premium/25 p-4">
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">{t('redeemCodeSteps')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="premium-code" className="text-xs font-black text-muted-foreground uppercase tracking-wide">
              {t('enterCodeLabel')}
            </label>
            <input
              id="premium-code"
              type="text"
              placeholder={t('enterCodePlaceholder')}
              value={code}
              onChange={handleCodeChange}
              maxLength={14}
              autoFocus
              disabled={loading}
              className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-4 text-2xl font-black text-foreground text-center tracking-widest placeholder:text-muted-foreground/40 focus:outline-none card-shadow"
            />
            <p className="text-[10px] font-semibold text-muted-foreground text-center">{t('enter12CharCode')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="code-source" className="text-xs font-black text-muted-foreground uppercase tracking-wide">
              {t('codeSourceQuestion')}{' '}
              <span className="font-semibold normal-case text-muted-foreground/80">({t('optional')})</span>
            </label>
            <div className="relative">
              <select
                id="code-source"
                value={codeSource}
                onChange={(e) => setCodeSource(e.target.value as CodeSource | '')}
                disabled={loading}
                className="w-full appearance-none rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-sm font-bold text-foreground focus:border-foreground focus:outline-none pr-10"
              >
                <option value="">{t('codeSourceSelect')}</option>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {error && <p className="text-sm font-bold text-destructive text-center">{error}</p>}

          <button
            type="button"
            onClick={handleActivate}
            disabled={loading || code.replace(/-/g, '').length !== 12}
            className="w-full rounded-2xl bg-secondary border-2 border-foreground py-4 font-black text-foreground card-shadow active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('activating')}
              </>
            ) : (
              <>
                <Crown className="h-5 w-5" />
                {t('activateCode')}
              </>
            )}
          </button>
        </div>
      </Sheet>

      <RedeemCodeSuccess open={showSuccess} durationMonths={durationMonths} onDone={handleSuccessDone} />
    </>
  );
}
