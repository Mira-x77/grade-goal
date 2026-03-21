# Tasks: Subscription System Implementation

## Phase 1: Database Setup

### Task 1.1: Create Supabase Tables
- [ ] Create `subscription_codes` table with schema
- [ ] Add unique constraint on `code` column
- [ ] Create indexes for performance
- [ ] Create `subscription_analytics` table
- [ ] Test table creation with sample data

### Task 1.2: Create Database Functions
- [ ] Create RPC function for atomic code validation
- [ ] Create function to update analytics
- [ ] Test functions with various scenarios

## Phase 2: Core Services (Mobile App)

### Task 2.1: Device ID Management
- [ ] Create `src/lib/device-id.ts`
- [ ] Implement UUID generation
- [ ] Implement storage/retrieval from AsyncStorage
- [ ] Add unit tests

### Task 2.2: Subscription Types
- [ ] Create `src/types/subscription.ts`
- [ ] Define `LocalSubscription` interface
- [ ] Define helper functions (canDownload, isExpired, etc.)
- [ ] Add TypeScript types for all subscription data

### Task 2.3: Subscription Service
- [ ] Create `src/services/subscriptionService.ts`
- [ ] Implement `initialize()` - load or create subscription
- [ ] Implement `getSubscription()` - get current state
- [ ] Implement `canDownload()` - check if download allowed
- [ ] Implement `incrementDownload()` - increment counter
- [ ] Implement `activatePremiumCode()` - validate and activate
- [ ] Implement `checkMonthlyReset()` - reset downloads if new month
- [ ] Implement `checkExpiration()` - check and handle expiration
- [ ] Implement `getStatus()` - format status for display
- [ ] Add error handling for all methods
- [ ] Add unit tests for all methods

### Task 2.4: Local Storage
- [ ] Add subscription storage to IndexedDB/AsyncStorage
- [ ] Implement save/load functions
- [ ] Add migration for existing users
- [ ] Test persistence across app restarts

## Phase 3: UI Components (Mobile App)

### Task 3.1: Subscription Badge
- [ ] Create `src/components/subscription/SubscriptionBadge.tsx`
- [ ] Show "Free: X/5" or "Premium: Unlimited"
- [ ] Add crown icon for premium
- [ ] Make clickable to show details
- [ ] Add to Library page (top-left)

### Task 3.2: Subscription Detail Dialog
- [ ] Create `src/components/subscription/SubscriptionDetailDialog.tsx`
- [ ] Show tier, downloads, expiry, days remaining
- [ ] Add "Upgrade to Premium" button for free users
- [ ] Style with existing design system

### Task 3.3: Download Limit Dialog
- [ ] Create `src/components/subscription/DownloadLimitDialog.tsx`
- [ ] Show "Download Limit Reached" message
- [ ] List premium benefits
- [ ] Add "Enter Premium Code" and "Cancel" buttons
- [ ] Trigger when free user hits limit

### Task 3.4: Premium Code Dialog
- [ ] Create `src/components/subscription/PremiumCodeDialog.tsx`
- [ ] Add code input field (format: XXXX-XXXX-XXXX)
- [ ] Auto-format input with dashes
- [ ] Add validation (12 chars, uppercase)
- [ ] Show loading state during activation
- [ ] Handle success/error states
- [ ] Add "Activate" and "Cancel" buttons

### Task 3.5: Expiration Dialog
- [ ] Create `src/components/subscription/ExpirationDialog.tsx`
- [ ] Show "Premium Expired" message
- [ ] Explain downgrade to free tier
- [ ] Add "Enter New Code" and "Continue with Free" buttons

## Phase 4: Integration with Download Flow

### Task 4.1: Modify Download Service
- [ ] Import subscriptionService
- [ ] Add subscription check before download
- [ ] Show appropriate dialog if limit reached
- [ ] Show toast notification with remaining downloads
- [ ] Increment download count after successful download
- [ ] Handle errors gracefully

### Task 4.2: App Initialization
- [ ] Initialize subscriptionService on app launch
- [ ] Check for monthly reset
- [ ] Check for expiration
- [ ] Migrate existing users to free tier

### Task 4.3: Library Page Integration
- [ ] Add SubscriptionBadge to Library page header
- [ ] Wire up badge click to show detail dialog
- [ ] Test on different screen sizes

## Phase 5: Admin Panel - Code Management

### Task 5.1: Code Generator Utility
- [ ] Create `exam-library-admin/src/lib/code-generator.ts`
- [ ] Implement `generateSubscriptionCode()` function
- [ ] Implement `generateCodes()` for bulk generation
- [ ] Add uniqueness checking
- [ ] Add unit tests

### Task 5.2: Subscription Codes Page
- [ ] Create `exam-library-admin/src/pages/SubscriptionCodes.tsx`
- [ ] Add page layout with header
- [ ] Add "Generate Codes" button
- [ ] Add stats cards (total, unused, used)
- [ ] Add to navigation menu

### Task 5.3: Codes Table Component
- [ ] Create `exam-library-admin/src/components/CodesTable.tsx`
- [ ] Display all codes in table
- [ ] Add columns: Code, Duration, Status, Used By, Used At, Created
- [ ] Add filter buttons (All/Unused/Used)
- [ ] Add search functionality
- [ ] Add copy-to-clipboard for codes
- [ ] Add pagination if needed

### Task 5.4: Generate Codes Dialog
- [ ] Create `exam-library-admin/src/components/GenerateCodesDialog.tsx`
- [ ] Add duration dropdown (1, 3, 6, 12 months)
- [ ] Add quantity input (1-100)
- [ ] Add "Generate" button
- [ ] Show generated codes in list
- [ ] Add "Copy All" button
- [ ] Add individual copy buttons
- [ ] Insert codes into Supabase
- [ ] Update analytics after generation

### Task 5.5: Stats Cards Component
- [ ] Create `exam-library-admin/src/components/subscription/StatsCards.tsx`
- [ ] Show total codes generated
- [ ] Show unused codes count
- [ ] Show used codes count
- [ ] Show active premium users (estimate)
- [ ] Fetch data from Supabase

## Phase 6: Admin Panel - Analytics

### Task 6.1: Subscription Analytics Service
- [ ] Create `exam-library-admin/src/services/subscriptionAnalyticsService.ts`
- [ ] Implement `getCodeStats()` - total, used, unused
- [ ] Implement `getActivePremiumUsers()` - estimate from codes
- [ ] Implement `getCodesByDuration()` - breakdown by duration
- [ ] Implement `getRecentActivations()` - last 10 activations

### Task 6.2: Dashboard Integration
- [ ] Add subscription stats to Dashboard page
- [ ] Show premium users count
- [ ] Show codes generated/used
- [ ] Add link to Subscription Codes page

### Task 6.3: Analytics Page Enhancement
- [ ] Add subscription section to Analytics page
- [ ] Show premium activations over time (chart)
- [ ] Show code usage by duration (pie chart)
- [ ] Show revenue estimate (if price configured)

## Phase 7: Localization

### Task 7.1: Add Translations
- [ ] Add English translations to `src/lib/i18n.ts`
- [ ] Add French translations to `src/lib/i18n.ts`
- [ ] Translate all subscription-related strings:
  - Download limit messages
  - Premium activation messages
  - Error messages
  - Dialog titles and descriptions
  - Button labels
  - Status labels

### Task 7.2: Apply Translations
- [ ] Use i18n in all subscription components
- [ ] Test language switching
- [ ] Verify all text is translated

## Phase 8: Testing

### Task 8.1: Unit Tests
- [ ] Test device ID generation and storage
- [ ] Test subscription service methods
- [ ] Test code generation uniqueness
- [ ] Test monthly reset logic
- [ ] Test expiration checking
- [ ] Test download limit enforcement
- [ ] Test code validation logic

### Task 8.2: Integration Tests
- [ ] Test full premium activation flow
- [ ] Test download with limit checking
- [ ] Test expiration and downgrade
- [ ] Test monthly reset timing
- [ ] Test code reuse prevention

### Task 8.3: Manual Testing
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Test on web browser
- [ ] Test offline functionality
- [ ] Test with multiple devices
- [ ] Test edge cases:
  - Invalid codes
  - Already used codes
  - Network errors
  - App restart scenarios
  - Month boundary reset
  - Expiration boundary

## Phase 9: Documentation

### Task 9.1: User Documentation
- [ ] Create user guide for premium activation
- [ ] Document how to get premium codes
- [ ] Explain download limits
- [ ] Add FAQ section

### Task 9.2: Admin Documentation
- [ ] Document code generation process
- [ ] Document code distribution workflow
- [ ] Document analytics interpretation
- [ ] Add troubleshooting guide

### Task 9.3: Developer Documentation
- [ ] Document subscription service API
- [ ] Document database schema
- [ ] Document code format and validation
- [ ] Add architecture diagrams

## Phase 10: Deployment

### Task 10.1: Database Migration
- [ ] Run Supabase migrations in production
- [ ] Verify tables created correctly
- [ ] Test RPC functions in production
- [ ] Seed initial analytics data

### Task 10.2: Mobile App Deployment
- [ ] Test subscription system in staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify existing users migrated correctly

### Task 10.3: Admin Panel Deployment
- [ ] Deploy admin panel updates
- [ ] Test code generation in production
- [ ] Verify analytics working
- [ ] Train admin on new features

### Task 10.4: Monitoring
- [ ] Set up error tracking for subscription service
- [ ] Monitor code activation success rate
- [ ] Monitor download limit enforcement
- [ ] Track premium user growth

## Estimated Timeline

- Phase 1 (Database): 1 day
- Phase 2 (Core Services): 2 days
- Phase 3 (UI Components): 2 days
- Phase 4 (Integration): 1 day
- Phase 5 (Admin Code Management): 2 days
- Phase 6 (Admin Analytics): 1 day
- Phase 7 (Localization): 0.5 days
- Phase 8 (Testing): 2 days
- Phase 9 (Documentation): 1 day
- Phase 10 (Deployment): 1 day

**Total: ~13.5 days**

## Priority Order

1. **Critical** (Must have for launch):
   - Phase 1: Database Setup
   - Phase 2: Core Services
   - Phase 3: UI Components (Tasks 3.1-3.4)
   - Phase 4: Integration
   - Phase 5: Admin Code Management (Tasks 5.1-5.4)

2. **High** (Should have soon):
   - Phase 3: UI Components (Task 3.5)
   - Phase 5: Admin Code Management (Task 5.5)
   - Phase 7: Localization
   - Phase 8: Testing

3. **Medium** (Nice to have):
   - Phase 6: Admin Analytics
   - Phase 9: Documentation

4. **Low** (Can be added later):
   - Advanced analytics features
   - Revenue tracking
   - Automated code distribution
