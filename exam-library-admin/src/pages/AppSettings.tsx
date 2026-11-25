import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Crown, ToggleLeft, ToggleRight, Settings, Save } from 'lucide-react';
import {
  CODE_PRICING_CONFIG_KEY,
  DEFAULT_CODE_PRICING,
  parseCodePricing,
  formatCodePrice,
  type CodePricingConfig,
} from '../lib/code-pricing';

export default function AppSettings() {
  const [premiumEnabled, setPremiumEnabled] = useState<boolean | null>(null);
  const [pricing, setPricing] = useState<CodePricingConfig>(DEFAULT_CODE_PRICING);
  const [savingPremium, setSavingPremium] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['premium_enabled', CODE_PRICING_CONFIG_KEY])
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AppSettings] load failed:', error.message);
          setPremiumEnabled(false);
          return;
        }
        let foundPremium = false;
        for (const row of data ?? []) {
          if (row.key === 'premium_enabled') {
            foundPremium = true;
            setPremiumEnabled(row.value === true || row.value === 'true');
          }
          if (row.key === CODE_PRICING_CONFIG_KEY) {
            setPricing(parseCodePricing(row.value));
          }
        }
        if (!foundPremium) setPremiumEnabled(false);
      });
  }, []);

  const togglePremium = async () => {
    if (premiumEnabled === null) return;
    setSavingPremium(true);
    const newVal = !premiumEnabled;
    try {
      const { error } = await supabaseAdmin
        .from('app_config')
        .upsert({ key: 'premium_enabled', value: newVal, updated_at: new Date().toISOString() });
      if (error) {
        toast.error('Failed to update: ' + error.message);
      } else {
        setPremiumEnabled(newVal);
        toast.success(`Premium ${newVal ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update premium setting');
    }
    setSavingPremium(false);
  };

  const savePricing = async () => {
    setSavingPricing(true);
    const payload: CodePricingConfig = {
      currency: pricing.currency.trim() || 'FCFA',
      month1: Math.max(1, Math.round(pricing.month1)),
      month3: pricing.month3 ? Math.max(1, Math.round(pricing.month3)) : null,
      month6: pricing.month6 ? Math.max(1, Math.round(pricing.month6)) : null,
      month12: pricing.month12 ? Math.max(1, Math.round(pricing.month12)) : null,
    };
    try {
      const { error } = await supabaseAdmin
        .from('app_config')
        .upsert({
          key: CODE_PRICING_CONFIG_KEY,
          value: payload,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        toast.error('Failed to save prices: ' + error.message);
      } else {
        setPricing(payload);
        toast.success('Code prices updated — shown in the mobile app');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prices');
    }
    setSavingPricing(false);
  };

  const setPrice = (field: keyof CodePricingConfig, raw: string) => {
    const parsed = raw === '' ? null : Number(raw);
    setPricing((prev) => ({
      ...prev,
      [field]: parsed == null || Number.isNaN(parsed) ? (field === 'currency' ? 'FCFA' : null) : parsed,
    }));
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">App Settings</h1>
      </div>

      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 flex items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-500/20 p-2.5 rounded-lg shrink-0">
            <Crown className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="font-bold text-white text-base">Premium Features</p>
            <p className="text-sm text-gray-400 mt-0.5">
              When disabled, the paywall UI still shows but the unlock button says &quot;Coming Soon&quot; and is inactive.
            </p>
            <p className={`text-xs font-bold mt-2 ${premiumEnabled ? 'text-green-400' : 'text-gray-500'}`}>
              {premiumEnabled === null ? 'Loading...' : premiumEnabled ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>

        <button
          onClick={togglePremium}
          disabled={savingPremium || premiumEnabled === null}
          className="shrink-0 disabled:opacity-50 transition-transform active:scale-95"
        >
          {premiumEnabled ? (
            <ToggleRight className="h-10 w-10 text-green-400" />
          ) : (
            <ToggleLeft className="h-10 w-10 text-gray-500" />
          )}
        </button>
      </div>

      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <p className="font-bold text-white text-base">Premium Code Prices</p>
          <p className="text-sm text-gray-400 mt-0.5">
            Shown on the mobile app &quot;How to get code&quot; page (Settings → Premium).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {([
            { key: 'month1' as const, label: '1 month' },
            { key: 'month3' as const, label: '3 months' },
            { key: 'month6' as const, label: '6 months' },
            { key: 'month12' as const, label: '12 months' },
          ]).map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-400">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={pricing[key] ?? ''}
                  onChange={(e) => setPrice(key, e.target.value)}
                  className="w-full rounded-lg bg-[#0f1117] border border-gray-700 px-3 py-2 text-sm text-white"
                  required={key === 'month1'}
                />
                <span className="text-xs text-gray-500 shrink-0">{pricing.currency}</span>
              </div>
            </label>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          Preview: {formatCodePrice(pricing.month1, pricing.currency)} / month
        </p>

        <button
          onClick={savePricing}
          disabled={savingPricing || !pricing.month1}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
        >
          <Save className="h-4 w-4" />
          {savingPricing ? 'Saving...' : 'Save code prices'}
        </button>
      </div>
    </div>
  );
}
