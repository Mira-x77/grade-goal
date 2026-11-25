import { useEffect, useState } from 'react';
import { userProfileService, type AdminUserProfile } from '../services/userProfileService';
import { subscriptionService, type UserPremiumStatus } from '../services/subscriptionService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function Users() {
  const [profiles, setProfiles] = useState<AdminUserProfile[]>([]);
  const [filtered, setFiltered] = useState<AdminUserProfile[]>([]);
  const [premiumByUser, setPremiumByUser] = useState<Map<string, UserPremiumStatus>>(new Map());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await userProfileService.getAllProfiles();
        setProfiles(rows);
        const premium = await subscriptionService.getActivePremiumByUserIds(rows.map((r) => r.user_id));
        setPremiumByUser(premium);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load user profiles');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered(profiles);
      return;
    }
    setFiltered(
      profiles.filter(
        (p) =>
          p.student_name?.toLowerCase().includes(q) ||
          p.user_id.toLowerCase().includes(q) ||
          String(p.metadata?.auth_method ?? '').toLowerCase().includes(q)
      )
    );
  }, [profiles, query]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          Students & Accounts
        </h1>
        <p className="text-muted-foreground mt-1">
          Synced from the Go Study! app — names, systems, premium status, and sign-in type
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, user id, or auth type..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Sign-in</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Class / Info</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Last sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading profiles...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No profiles found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const meta = p.metadata ?? {};
                const serverPremium = premiumByUser.get(p.user_id);
                const premiumActive = serverPremium?.isActive ?? false;
                const hadPremium = Boolean(serverPremium?.expiresAt);
                const authMethod = String(meta.auth_method ?? 'unknown');
                const isGuest = meta.is_guest === true;

                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.student_name || '—'}</TableCell>
                    <TableCell>{p.academic_system}</TableCell>
                    <TableCell>
                      <Badge variant={isGuest ? 'secondary' : 'default'} className="capitalize">
                        {authMethod.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {premiumActive ? (
                        <Badge className="bg-yellow-600">Active</Badge>
                      ) : hadPremium ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Free</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {premiumActive ? `${serverPremium?.deviceCount ?? 0}/2` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {[meta.classLevel, meta.department].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">{formatDate(p.updated_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
