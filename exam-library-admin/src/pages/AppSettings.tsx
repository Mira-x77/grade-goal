import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Crown, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

export default function AppSettings() {
  const [premiumEnabled, setPremiumEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'premium_enabled')
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setPremiumEnabled(data.value === true || data.value === 'true');
        } else {
          setPremiumEnabled(false);
        }
      });
  }, []);

  const toggle = async () => {
    if (premiumEnabled === null) return;
    setSaving(true);
    const newVal = !premiumEnabled;
    console.log('[AppSettings] toggling premium_enabled to:', newVal);
    const { error, data } = await supabase
      .from('app_config')
      .upsert({ key: 'premium_enabled', value: newVal, updated_at: new Date().toISOString() })
      .select();
    console.log('[AppSettings] upsert result:', { error, data });
    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      setPremiumEnabled(newVal);
      toast.success(`Premium ${newVal ? 'enabled' : 'disabled'}`);
    }
    setSaving(false);
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
              When disabled, the paywall UI still shows but the unlock button says "Coming Soon" and is inactive.
            </p>
            <p className={`text-xs font-bold mt-2 ${premiumEnabled ? 'text-green-400' : 'text-gray-500'}`}>
              {premiumEnabled === null ? 'Loading...' : premiumEnabled ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={saving || premiumEnabled === null}
          className="shrink-0 disabled:opacity-50 transition-transform active:scale-95"
        >
          {premiumEnabled ? (
            <ToggleRight className="h-10 w-10 text-green-400" />
          ) : (
            <ToggleLeft className="h-10 w-10 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
