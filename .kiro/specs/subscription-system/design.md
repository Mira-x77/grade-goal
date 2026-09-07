# Design Document: Subscription System

## Overview

The subscription system implements a freemium model for the exam library with local-first storage and code-based premium activation. The system operates without user authentication, using device identification for tracking.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  Local Storage (IndexedDB/AsyncStorage)        │    │
│  │  - device_id                                    │    │
│  │  - subscription { tier, downloads, expires }   │    │
│  └────────────────────────────────────────────────┘    │
│                         ↕                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  Subscription Service                           │    │
│  │  - checkDownloadLimit()                        │    │
│  │  - activatePremiumCode()                       │    │
│  │  - resetMonthlyDownloads()                     │    │
│  └────────────────────────────────────────────────┘    │
│                         ↕                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  Download Service (Modified)                    │    │
│  │  - Checks subscription before download          │    │
│  │  - Increments download count                    │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕ (Code Validation Only)
┌─────────────────────────────────────────────────────────┐
│                    Supabase                              │
│  ┌────────────────────────────────────────────────┐    │
│  │  subscription_codes Table                       │    │
│  │  - code (unique)                                │    │
│  │  - duration_months                              │    │
│  │  - is_used                                      │    │
│  │  - used_by (device_id)                         │    │
│  │  - used_at                                      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  Admin Panel                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Code Management                                │    │
│  │  - Generate codes                               │    │
│  │  - View code status                             │    │
│  │  - Track usage analytics                        │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Local Storage Schema

```typescript
interface LocalSubscription {
  deviceId: string;              // UUID generated on first launch
  tier: 'free' | 'premium';
  status: 'active' | 'expired';
  downloadsThisMonth: number;
  maxDownloads: number;          // 5 for free, -1 for unlimited
  subscriptionCode?: string;     // Premium code used
  activatedAt?: string;          // ISO date
  expiresAt?: string;            // ISO date
  lastResetDate: string;         // ISO date of last monthly reset
  createdAt: string;
  updatedAt: string;
}
```

### Supabase Schema

```sql
-- Subscription codes table
CREATE TABLE subscription_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(14) UNIQUE NOT NULL,  -- Format: XXXX-XXXX-XXXX
  duration_months INTEGER NOT NULL,   -- 1, 3, 6, or 12
  is_used BOOLEAN DEFAULT FALSE,
  used_by VARCHAR(255),               -- device_id
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL    -- admin email
);

-- Index for fast code lookup
CREATE INDEX idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX idx_subscription_codes_is_used ON subscription_codes(is_used);

-- Subscription analytics table
CREATE TABLE subscription_analytics (
  id VARCHAR(50) PRIMARY KEY,
  total_codes_generated INTEGER DEFAULT 0,
  total_codes_used INTEGER DEFAULT 0,
  active_premium_users INTEGER DEFAULT 0,
  codes_by_duration JSONB,           -- {"1": 10, "3": 5, "6": 2, "12": 1}
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Component Design

### 1. Subscription Service

```typescript
// src/services/subscriptionService.ts

class SubscriptionService {
  private subscription: LocalSubscription | null = null;
  
  // Initialize subscription on app launch
  async initialize(): Promise<void>
  
  // Get current subscription
  async getSubscription(): Promise<LocalSubscription>
  
  // Check if user can download
  async canDownload(): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: number;
  }>
  
  // Increment download count
  async incrementDownload(): Promise<void>
  
  // Validate and activate premium code
  async activatePremiumCode(code: string): Promise<void>
  
  // Check and reset monthly downloads
  async checkMonthlyReset(): Promise<void>
  
  // Check and handle expiration
  async checkExpiration(): Promise<boolean>
  
  // Get subscription status for display
  getStatus(): {
    tier: string;
    downloads: string;
    expires?: string;
    daysRemaining?: number;
  }
}
```

### 2. Device ID Management

```typescript
// src/lib/device-id.ts

// Generate or retrieve device ID
export async function getDeviceId(): Promise<string> {
  // Check if exists in storage
  let deviceId = await getStoredDeviceId();
  
  if (!deviceId) {
    // Generate new UUID
    deviceId = generateUUID();
    await storeDeviceId(deviceId);
  }
  
  return deviceId;
}

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### 3. Code Generator (Admin)

```typescript
// exam-library-admin/src/lib/code-generator.ts

export function generateSubscriptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 3;
  const segmentLength = 4;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => {
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  }).join('-');
  
  return code;
}

// Generate multiple unique codes
export async function generateCodes(
  count: number,
  durationMonths: number
): Promise<string[]> {
  const codes: string[] = [];
  const attempts = count * 10; // Prevent infinite loop
  
  for (let i = 0; i < attempts && codes.length < count; i++) {
    const code = generateSubscriptionCode();
    
    // Check if code already exists in database
    const { data } = await supabase
      .from('subscription_codes')
      .select('code')
      .eq('code', code)
      .single();
    
    if (!data) {
      codes.push(code);
    }
  }
  
  return codes;
}
```

## UI Components

### 1. Subscription Status Badge

```typescript
// src/components/subscription/SubscriptionBadge.tsx

interface SubscriptionBadgeProps {
  onClick: () => void;
}

export function SubscriptionBadge({ onClick }: SubscriptionBadgeProps) {
  const { tier, downloads, expires, daysRemaining } = useSubscriptionStatus();
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border"
    >
      {tier === 'premium' ? (
        <>
          <Crown className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Premium</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span className="text-sm">{downloads}</span>
        </>
      )}
    </button>
  );
}
```

### 2. Premium Code Dialog

```typescript
// src/components/subscription/PremiumCodeDialog.tsx

interface PremiumCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PremiumCodeDialog({ open, onClose, onSuccess }: PremiumCodeDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleActivate = async () => {
    setLoading(true);
    try {
      await subscriptionService.activatePremiumCode(code);
      toast.success('Premium activated!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Premium Code</DialogTitle>
          <DialogDescription>
            Enter your premium code to unlock unlimited downloads
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={14}
          />
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={loading || code.length < 14}>
              {loading ? 'Activating...' : 'Activate Premium'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Download Limit Dialog

```typescript
// src/components/subscription/DownloadLimitDialog.tsx

interface DownloadLimitDialogProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function DownloadLimitDialog({ open, onClose, onUpgrade }: DownloadLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Limit Reached</DialogTitle>
          <DialogDescription>
            You've used all 5 free downloads this month
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Upgrade to Premium</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Unlimited downloads</li>
              <li>✓ Access all exam papers</li>
              <li>✓ No monthly limits</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onUpgrade}>
              Enter Premium Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Subscription Detail Dialog

```typescript
// src/components/subscription/SubscriptionDetailDialog.tsx

export function SubscriptionDetailDialog({ open, onClose }: DialogProps) {
  const status = useSubscriptionStatus();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscription Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="font-medium capitalize">{status.tier}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Downloads this month</span>
            <span className="font-medium">{status.downloads}</span>
          </div>
          
          {status.tier === 'premium' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="font-medium">{status.expires}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days remaining</span>
                <span className="font-medium">{status.daysRemaining} days</span>
              </div>
            </>
          )}
          
          {status.tier === 'free' && (
            <Button onClick={() => {/* Show code dialog */}}>
              Upgrade to Premium
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Admin Panel Components

### 1. Code Generation Page

```typescript
// exam-library-admin/src/pages/SubscriptionCodes.tsx

export default function SubscriptionCodes() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subscription Codes</h1>
        <Button onClick={() => setShowGenerateDialog(true)}>
          Generate Codes
        </Button>
      </div>
      
      <StatsCards />
      <CodesTable />
      <GenerateCodesDialog />
    </div>
  );
}
```

### 2. Generate Codes Dialog

```typescript
// exam-library-admin/src/components/GenerateCodesDialog.tsx

export function GenerateCodesDialog({ open, onClose }: DialogProps) {
  const [duration, setDuration] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  
  const handleGenerate = async () => {
    const codes = await generateCodes(quantity, duration);
    
    // Insert into Supabase
    await supabase.from('subscription_codes').insert(
      codes.map(code => ({
        code,
        duration_months: duration,
        created_by: currentUser.email
      }))
    );
    
    setGeneratedCodes(codes);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Subscription Codes</DialogTitle>
        </DialogHeader>
        
        {generatedCodes.length === 0 ? (
          <div className="space-y-4">
            <div>
              <Label>Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generated {generatedCodes.length} codes. Copy and save them now.
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {generatedCodes.map(code => (
                <div key={code} className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="font-mono">{code}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button onClick={() => copyAllCodes(generatedCodes)}>
              Copy All Codes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Codes Table

```typescript
// exam-library-admin/src/components/CodesTable.tsx

export function CodesTable() {
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');
  
  useEffect(() => {
    loadCodes();
  }, [filter]);
  
  const loadCodes = async () => {
    let query = supabase.from('subscription_codes').select('*');
    
    if (filter === 'unused') {
      query = query.eq('is_used', false);
    } else if (filter === 'used') {
      query = query.eq('is_used', true);
    }
    
    const { data } = await query.order('created_at', { ascending: false });
    setCodes(data || []);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'unused' ? 'default' : 'outline'}
          onClick={() => setFilter('unused')}
        >
          Unused
        </Button>
        <Button
          variant={filter === 'used' ? 'default' : 'outline'}
          onClick={() => setFilter('used')}
        >
          Used
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Used By</TableHead>
            <TableHead>Used At</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map(code => (
            <TableRow key={code.id}>
              <TableCell className="font-mono">{code.code}</TableCell>
              <TableCell>{code.duration_months} month(s)</TableCell>
              <TableCell>
                <Badge variant={code.is_used ? 'secondary' : 'default'}>
                  {code.is_used ? 'Used' : 'Unused'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {code.used_by || '-'}
              </TableCell>
              <TableCell>
                {code.used_at ? formatDate(code.used_at) : '-'}
              </TableCell>
              <TableCell>{formatDate(code.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

## Integration with Download Flow

### Modified Download Service

```typescript
// src/services/downloadService.ts (modifications)

async downloadPaper(
  paper: ExamPaper,
  onProgress: (progress: DownloadProgress) => void
): Promise<string> {
  // CHECK SUBSCRIPTION BEFORE DOWNLOAD
  const canDownload = await subscriptionService.canDownload();
  
  if (!canDownload.allowed) {
    // Show appropriate dialog
    if (canDownload.reason === 'limit_reached') {
      showDownloadLimitDialog();
    } else if (canDownload.reason === 'expired') {
      showExpirationDialog();
    }
    throw new Error(canDownload.reason);
  }
  
  // Show remaining downloads notification
  if (canDownload.remaining > 0) {
    toast.info(`Download started. ${canDownload.remaining}/5 downloads remaining this month`);
  }
  
  // Proceed with download...
  const localPath = await this.performDownload(paper, onProgress);
  
  // INCREMENT DOWNLOAD COUNT
  await subscriptionService.incrementDownload();
  
  return localPath;
}
```

## Monthly Reset Logic

```typescript
// src/services/subscriptionService.ts

async checkMonthlyReset(): Promise<void> {
  const subscription = await this.getSubscription();
  const lastReset = new Date(subscription.lastResetDate);
  const now = new Date();
  
  // Check if month changed
  const needsReset = 
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();
  
  if (needsReset) {
    subscription.downloadsThisMonth = 0;
    subscription.lastResetDate = now.toISOString();
    subscription.updatedAt = now.toISOString();
    
    await this.saveSubscription(subscription);
    
    console.log('Monthly downloads reset');
  }
}
```

## Expiration Check Logic

```typescript
// src/services/subscriptionService.ts

async checkExpiration(): Promise<boolean> {
  const subscription = await this.getSubscription();
  
  if (subscription.tier !== 'premium' || !subscription.expiresAt) {
    return false;
  }
  
  const now = new Date();
  const expires = new Date(subscription.expiresAt);
  
  if (expires <= now) {
    // Downgrade to free
    subscription.tier = 'free';
    subscription.status = 'expired';
    subscription.maxDownloads = 5;
    subscription.downloadsThisMonth = 0;
    subscription.updatedAt = now.toISOString();
    
    await this.saveSubscription(subscription);
    
    // Show expiration dialog
    showExpirationDialog();
    
    return true;
  }
  
  return false;
}
```

## Security Considerations

1. **Code Uniqueness**: Database unique constraint prevents duplicate codes
2. **Atomic Updates**: Use Supabase RPC for atomic code validation and marking
3. **Device Binding**: Codes are bound to device_id, preventing sharing
4. **Local Validation**: Download limits enforced locally, no server dependency
5. **Code Format**: Random 12-character codes are hard to guess

## Performance Considerations

1. **Local-First**: All checks happen locally, no network latency
2. **Lazy Loading**: Subscription loaded once on app init, cached in memory
3. **Minimal Syncs**: Only sync with Supabase for code validation
4. **Indexed Queries**: Database indexes on code and is_used columns

## Testing Strategy

1. **Unit Tests**:
   - Code generation uniqueness
   - Monthly reset logic
   - Expiration checking
   - Download limit enforcement

2. **Integration Tests**:
   - Full premium activation flow
   - Download with limit checking
   - Expiration and downgrade

3. **Manual Testing**:
   - Test on multiple devices
   - Test offline functionality
   - Test code reuse prevention
   - Test monthly reset timing
