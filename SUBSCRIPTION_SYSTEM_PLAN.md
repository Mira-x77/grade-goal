# Subscription System - Complete Plan

## Overview

A freemium subscription system for the exam library with:
- **Free Tier**: 5 downloads per month
- **Premium Tier**: Unlimited downloads
- **Activation**: Manual code-based (no payment gateway)
- **Storage**: Local device storage (no user accounts)

## Key Features

### For Students (Mobile App)

1. **Automatic Free Tier**
   - Every device starts with 5 free downloads/month
   - Downloads reset on the 1st of each month
   - No registration required

2. **Download Notifications**
   - Toast shows remaining downloads: "3/5 downloads remaining"
   - When limit reached: "Download limit reached. Upgrade to Premium"

3. **Premium Upgrade**
   - Dialog appears when limit reached
   - User enters code (format: XXXX-XXXX-XXXX)
   - Instant activation if code is valid
   - Unlimited downloads until expiration

4. **Status Display**
   - Badge in top-left of Library page
   - Free users see: "Free: 3/5"
   - Premium users see: "Premium: Unlimited" with crown icon
   - Click badge to see full details (expiry date, days remaining)

5. **Expiration Handling**
   - When premium expires, user is notified
   - Options: Enter new code or continue with free tier
   - Graceful downgrade to 5/month

### For Admin (Admin Panel)

1. **Code Generation**
   - Generate codes in bulk (1-100 at a time)
   - Choose duration: 1, 3, 6, or 12 months
   - Codes are random and unique (XXXX-XXXX-XXXX format)
   - Copy codes to share with students

2. **Code Management**
   - View all codes in table
   - Filter by status (All/Unused/Used)
   - See who used each code (device ID)
   - See when codes were used
   - Search by code

3. **Analytics**
   - Total codes generated
   - Unused vs used codes
   - Active premium users estimate
   - Code usage by duration
   - Recent activations

## Technical Architecture

### Mobile App

```
Local Storage (IndexedDB/AsyncStorage)
├── device_id (UUID)
└── subscription
    ├── tier: 'free' | 'premium'
    ├── downloads_this_month: number
    ├── max_downloads: 5 | -1 (unlimited)
    ├── expires_at: ISO date
    └── last_reset_date: ISO date
```

### Supabase Database

```sql
subscription_codes
├── code (unique)
├── duration_months
├── is_used
├── used_by (device_id)
└── used_at

subscription_analytics
├── total_codes_generated
├── total_codes_used
└── active_premium_users
```

### Flow Diagrams

#### Download Flow (Free User)
```
User clicks Download
    ↓
Check subscription.downloads_this_month
    ↓
If < 5:
    → Show toast: "X/5 remaining"
    → Download file
    → Increment counter
    
If = 5:
    → Show "Limit Reached" dialog
    → Options: "Enter Code" or "Cancel"
```

#### Premium Activation Flow
```
User enters code
    ↓
Validate format (XXXX-XXXX-XXXX)
    ↓
Query Supabase: SELECT * WHERE code = ?
    ↓
If not found:
    → Error: "Invalid code"
    
If is_used = true:
    → Error: "Code already used"
    
If valid:
    → Update Supabase: SET is_used = true, used_by = device_id
    → Update local: tier = 'premium', max_downloads = -1
    → Show success: "Premium activated!"
    → Allow download
```

#### Monthly Reset Flow
```
App launches
    ↓
Check last_reset_date
    ↓
If different month:
    → Set downloads_this_month = 0
    → Set last_reset_date = today
    → Save to storage
```

## Implementation Phases

### Phase 1: Core Foundation (2-3 days)
- Database tables
- Device ID generation
- Subscription service
- Local storage

### Phase 2: Mobile UI (2-3 days)
- Subscription badge
- Download limit dialog
- Premium code dialog
- Status detail dialog
- Integration with download flow

### Phase 3: Admin Panel (2-3 days)
- Code generator
- Codes table
- Generate codes dialog
- Stats cards
- Analytics integration

### Phase 4: Polish (2-3 days)
- Localization (French/English)
- Testing
- Documentation
- Deployment

**Total: ~10-12 days**

## Database Schema

### subscription_codes Table

```sql
CREATE TABLE subscription_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(14) UNIQUE NOT NULL,
  duration_months INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by VARCHAR(255),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX idx_subscription_codes_is_used ON subscription_codes(is_used);
```

### subscription_analytics Table

```sql
CREATE TABLE subscription_analytics (
  id VARCHAR(50) PRIMARY KEY,
  total_codes_generated INTEGER DEFAULT 0,
  total_codes_used INTEGER DEFAULT 0,
  active_premium_users INTEGER DEFAULT 0,
  codes_by_duration JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Code Format

- **Format**: `XXXX-XXXX-XXXX` (12 characters + 2 dashes)
- **Characters**: Uppercase letters (A-Z) and numbers (0-9)
- **Example**: `A7K9-M2P4-X8Q1`
- **Uniqueness**: Checked against database before insertion
- **Security**: Cryptographically random generation

## User Flows

### New User First Download
1. User opens app → Device ID generated
2. Free subscription created (5/month)
3. User downloads paper → Toast: "4/5 remaining"
4. Download succeeds

### Free User Hits Limit
1. User tries 6th download
2. Dialog: "Download Limit Reached"
3. Options: "Enter Premium Code" or "Cancel"
4. If Cancel → Download blocked
5. If Enter Code → Code dialog appears

### Premium Activation
1. User enters code: `A7K9-M2P4-X8Q1`
2. System validates with Supabase
3. If valid → Success message
4. Subscription updated to premium
5. Download proceeds immediately
6. Badge shows "Premium: Unlimited"

### Premium Expiration
1. System checks expiration on app launch
2. If expired → Dialog: "Premium Expired"
3. Options: "Enter New Code" or "Continue with Free"
4. If Continue → Downgrade to 5/month
5. If Enter Code → Code dialog appears

### Monthly Reset
1. App launches on March 1st
2. Last reset was February 15th
3. System detects month change
4. Downloads reset to 0/5
5. User can download again

## Admin Workflow

### Generating Codes
1. Admin logs into admin panel
2. Navigates to "Subscription Codes"
3. Clicks "Generate Codes"
4. Selects duration (e.g., 3 months)
5. Enters quantity (e.g., 10 codes)
6. Clicks "Generate"
7. System creates 10 unique codes
8. Admin copies codes
9. Admin shares codes with students (via WhatsApp, email, etc.)

### Tracking Usage
1. Admin views codes table
2. Filters by "Used" status
3. Sees which codes were activated
4. Sees device IDs of users
5. Sees activation dates
6. Tracks revenue (codes sold × price)

## Security Considerations

1. **No Payment Processing**: Admin handles payments offline
2. **One-Time Codes**: Each code can only be used once
3. **Device Binding**: Code tied to device ID
4. **Random Generation**: Codes are cryptographically random
5. **Database Constraints**: Unique constraint prevents duplicates
6. **Atomic Updates**: Code validation and marking happen atomically

## Offline Functionality

### Works Offline
- Checking download limits
- Displaying subscription status
- Downloading papers (if quota available)
- Monthly reset checking

### Requires Internet
- Validating premium codes
- Generating codes (admin)
- Viewing code usage (admin)

## Edge Cases Handled

1. **User changes device**: New device = new subscription (by design)
2. **User reinstalls app**: Device ID regenerated = new subscription
3. **Clock manipulation**: Server timestamp used for expiration
4. **Code reuse attempt**: Database prevents with unique constraint
5. **Network timeout**: Clear error message, retry option
6. **Month boundary**: Reset happens on first app launch in new month
7. **Expired premium**: Graceful downgrade with notification

## Success Metrics

- Number of premium activations
- Code usage rate (used/generated)
- Average downloads per user type
- Premium retention (renewals)
- Revenue from code sales

## Future Enhancements (Not in v1)

- Account system for multi-device sync
- Automated payment integration (Stripe, PayPal)
- Subscription auto-renewal
- Referral codes
- Gift codes
- Promotional codes (free premium trials)
- Usage analytics per user
- Push notifications for expiration reminders

## Questions Resolved

✅ User identification: Device ID (no accounts)
✅ Code format: XXXX-XXXX-XXXX (random, one-time use)
✅ Code duration: 1, 3, 6, or 12 months (admin chooses)
✅ Download limit display: Toast notification on each download
✅ Code entry: Dialog when limit reached
✅ Premium status: Badge in top-left corner
✅ Expiration handling: Dialog with renewal or free tier option
✅ Storage: Local device storage (IndexedDB/AsyncStorage)
✅ Sync: Only for code validation, rest is local

## Ready to Implement?

All planning is complete. The system is:
- ✅ Fully designed
- ✅ Requirements documented
- ✅ Architecture defined
- ✅ Tasks broken down
- ✅ Timeline estimated
- ✅ Edge cases considered

**Next step**: Start implementation with Phase 1 (Database Setup)
