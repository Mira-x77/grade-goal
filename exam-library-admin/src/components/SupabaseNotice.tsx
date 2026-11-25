import { CloudOff, Database } from 'lucide-react';
import { SUPABASE_RESTRICTED_MESSAGE, type SupabaseStatus } from '../lib/supabase-status';

interface SupabaseNoticeProps {
  status: SupabaseStatus;
  /** What still works, e.g. "Library content is read from the R2 catalogue." */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Honest status banner for pages whose data lives in Supabase tables.
 * Renders nothing while the project is healthy (or still being probed).
 */
export default function SupabaseNotice({ status, children, className = '' }: SupabaseNoticeProps) {
  if (status === 'ok' || status === 'checking') return null;

  const restricted = status === 'restricted';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        restricted
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          : 'border-red-500/40 bg-red-500/10 text-red-100'
      } ${className}`}
    >
      {restricted ? (
        <CloudOff className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
      ) : (
        <Database className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
      )}
      <div className="text-sm">
        <p className="font-semibold">
          {restricted ? 'Supabase project is restricted' : 'Supabase is not reachable'}
        </p>
        <p className={`mt-1 ${restricted ? 'text-amber-100/90' : 'text-red-100/90'}`}>
          {restricted
            ? SUPABASE_RESTRICTED_MESSAGE
            : 'Supabase could not be reached. Check the VITE_SUPABASE_* values in exam-library-admin/.env and the network.'}
        </p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}
