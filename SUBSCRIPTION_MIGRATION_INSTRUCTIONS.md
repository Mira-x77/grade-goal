# Subscription System - Database Migration Instructions

## Option 1: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `supabase/migrations/003_subscription_system.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Verify tables created:
   - `subscription_codes`
   - `subscription_analytics`

## Option 2: Run via Command Line

```bash
# Set environment variable first
$env:VITE_SUPABASE_ANON_KEY="your_anon_key_here"

# Then run migration
node run-subscription-migration.js
```

## Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_codes', 'subscription_analytics');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('use_subscription_code', 'update_code_generation_analytics');

-- Check initial analytics data
SELECT * FROM subscription_analytics WHERE id = 'main';
```

Expected results:
- 2 tables found
- 2 functions found
- 1 analytics row with all zeros

## Test Code Generation

After migration, test in admin panel:

1. Open admin panel
2. Navigate to Subscription Codes
3. Click "Generate Codes"
4. Select duration: 3 months
5. Enter quantity: 1
6. Click "Generate Codes"
7. Verify code appears in table

## Test Code Validation

In mobile app console:

```javascript
import { subscriptionService } from './src/services/subscriptionService';

// Initialize
await subscriptionService.initialize();

// Try to activate with test code
await subscriptionService.activatePremiumCode('TEST-CODE-HERE');
```

## Troubleshooting

### Error: "relation subscription_codes does not exist"
- Migration didn't run successfully
- Re-run the SQL script in Supabase dashboard

### Error: "function use_subscription_code does not exist"
- Functions weren't created
- Check for SQL syntax errors in migration
- Ensure you have proper permissions

### Error: "permission denied"
- RLS policies may be blocking
- Check Row Level Security settings
- Ensure anon key has proper access

## Next Steps After Migration

1. ✅ Verify tables and functions created
2. ✅ Test code generation in admin panel
3. ✅ Test code validation in mobile app
4. ✅ Proceed with route integration
