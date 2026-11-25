import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Search } from 'lucide-react';
import { subscriptionService, type EnrichedSubscriptionCode } from '@/services/subscriptionService';
import { toast } from 'sonner';

type FilterType = 'all' | 'unused' | 'used';

export function CodesTable() {
  const [codes, setCodes] = useState<EnrichedSubscriptionCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<EnrichedSubscriptionCode[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCodes();
  }, [filter]);

  useEffect(() => {
    filterCodes();
  }, [codes, searchQuery]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getEnrichedCodes(filter);
      setCodes(data);
    } catch (error) {
      console.error('Failed to load codes:', error);
      toast.error('Failed to load codes');
    } finally {
      setLoading(false);
    }
  };

  const filterCodes = () => {
    if (!searchQuery) {
      setFilteredCodes(codes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = codes.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        code.studentName?.toLowerCase().includes(query) ||
        code.used_by?.toLowerCase().includes(query) ||
        code.redeemed_by?.toLowerCase().includes(query) ||
        code.school?.toLowerCase().includes(query)
    );
    setFilteredCodes(filtered);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} size="sm">
            All ({codes.length})
          </Button>
          <Button variant={filter === 'unused' ? 'default' : 'outline'} onClick={() => setFilter('unused')} size="sm">
            Unused
          </Button>
          <Button variant={filter === 'used' ? 'default' : 'outline'} onClick={() => setFilter('used')} size="sm">
            Used
          </Button>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code, name, school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>School</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Redeemed</TableHead>
              <TableHead className="text-right">Copy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  Loading codes...
                </TableCell>
              </TableRow>
            ) : filteredCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No codes found matching your search' : 'No codes generated yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{code.code}</TableCell>
                  <TableCell>
                    {code.duration_months} {code.duration_months === 1 ? 'mo' : 'mos'}
                  </TableCell>
                  <TableCell>
                    {code.is_used ? (
                      code.isActivePremium ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Expired</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Unused</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{code.studentName || '—'}</div>
                    {code.authMethod && (
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {code.authMethod.replace('_', ' ')}
                        {code.isGuest ? ' · guest' : ''}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {code.is_used ? (
                      <span className="text-sm font-mono">
                        {code.deviceCount ?? (code.used_by ? 1 : 0)}/2
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {code.expiresAt ? formatDate(code.expiresAt) : '—'}
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground font-mono max-w-[90px] truncate"
                    title={code.used_by}
                  >
                    {code.used_by ? `${code.used_by.slice(0, 8)}…` : '—'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[100px] truncate" title={code.school}>
                    {code.school || '—'}
                  </TableCell>
                  <TableCell className="text-xs capitalize">{code.grading_system?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell className="text-xs capitalize">{code.code_source || '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {code.used_at ? formatDate(code.used_at) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
