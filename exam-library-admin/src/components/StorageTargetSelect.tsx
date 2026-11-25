import { useEffect } from 'react';
import { Cloud, Database } from 'lucide-react';
import { useStorageTarget } from '../lib/storage-target';
import { isR2Configured } from '../lib/r2Client';

interface StorageTargetSelectProps {
  disabled?: boolean;
  className?: string;
}

/**
 * Destination picker shown above the upload buttons.
 *
 * Both providers stay available; the choice is remembered in localStorage so
 * the operator does not have to re-pick it on every form.
 */
export default function StorageTargetSelect({
  disabled = false,
  className = '',
}: StorageTargetSelectProps) {
  const [target, setTarget] = useStorageTarget();
  const r2Ready = isR2Configured();

  // Never leave the selection on a provider that cannot accept files.
  useEffect(() => {
    if (!r2Ready && target === 'r2') setTarget('supabase');
  }, [r2Ready, target, setTarget]);

  const card = (selected: boolean) =>
    [
      'flex flex-1 items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
      selected
        ? 'border-indigo-500 bg-indigo-500/10'
        : 'border-gray-700 bg-[#0f1117] hover:border-gray-600',
      'disabled:opacity-40 disabled:cursor-not-allowed',
    ].join(' ');

  return (
    <div className={`bg-[#1a1d2e] rounded-lg border border-gray-800 p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Upload to
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setTarget('r2')}
          disabled={disabled || !r2Ready}
          aria-pressed={target === 'r2'}
          className={card(target === 'r2')}
        >
          <Cloud className="h-5 w-5 mt-0.5 shrink-0 text-indigo-400" />
          <span>
            <span className="block text-sm font-semibold text-white">Cloudflare R2</span>
            <span className="block text-xs text-gray-400">
              {r2Ready ? 'Recommended — the app serves these files' : 'Not configured in .env'}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTarget('supabase')}
          disabled={disabled}
          aria-pressed={target === 'supabase'}
          className={card(target === 'supabase')}
        >
          <Database className="h-5 w-5 mt-0.5 shrink-0 text-emerald-400" />
          <span>
            <span className="block text-sm font-semibold text-white">Supabase Storage</span>
            <span className="block text-xs text-gray-400">
              Original bucket — needs free storage quota
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
