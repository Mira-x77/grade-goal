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
import { subscriptionService, type SubscriptionCode } from '@/services/subscriptionService';
import { toast } from 'sonner';

type FilterType = 'all' | 'unused' | 'used';

export function CodesTable() {
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<SubscriptionCode[]>([]);
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
      let data: SubscriptionCode[];
      
      if (filter === 'all') {
        data = await subscriptionService.getAllCodes();
      } else {
        data = await subscriptionService.getCodesByStatus(filter === 'used');
      }
      
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
    const filtered = codes.filter(code =>
      code.code.toLowerCase().includes(query) ||
      code.used_by?.toLowerCase().includes(query)
    );
    setFilteredCodes(filtered);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({codes.length})
          </Button>
          <Button
            variant={filter === 'unused' ? 'default' : 'outline'}
            onClick={() => setFilter('unused')}
            size="sm"
          >
            Unused
          </Button>
          <Button
            variant={filter === 'used' ? 'default' : 'outline'}
            onClick={() => setFilter('used')}
            size="sm"
          >
            Used
          </Button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead>Used At</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading codes...
                </TableCell>
              </TableRow>
            ) : filteredCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No codes found matching your search' : 'No codes generated yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-medium">
                    {code.code}
                  </TableCell>
                  <TableCell>
                    {code.duration_months} {code.duration_months === 1 ? 'month' : 'months'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.is_used ? 'secondary' : 'default'}>
                      {code.is_used ? 'Used' : 'Unused'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {code.used_by ? code.used_by.substring(0, 8) + '...' : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {code.used_at ? formatDate(code.used_at) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(code.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code.code)}
                    >
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
