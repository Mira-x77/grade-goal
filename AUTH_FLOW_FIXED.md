# Authentication Flow - New vs Returning Users

## Problem
Previously, when users signed in with Google/Apple on a new device, they were always sent to onboarding, even if they had already completed it on another device. The app only checked for local data, not cloud data.

## Solution
Updated the authentication flow to check both local storage AND the database (`user_profile` table) to determine if a user is new or returning.

## Changes Made

### 1. AuthCallback.tsx
- Added `checkUserData()` function that queries the `user_profile` table
- Now checks both `localStorage` AND database before deciding where to navigate
- New users (no profile in DB) → `/onboarding`
- Returning users (profile exists in DB) → `/` (home)

### 2. AuthContext.tsx
- Added `checkUserHasCloudData()` function to query user profile
- Updated `navigateAfterAuth()` to accept userId and check cloud data
- Deep link authentication now properly checks database before navigation

## User Flow

### New User (First Time)
1. Sign in with Google/Apple
2. No profile found in database
3. Navigate to `/onboarding`
4. Complete onboarding
5. Profile saved to database

### Returning User (Same Device)
1. Sign in with Google/Apple
2. Local data found in localStorage
3. Navigate to `/` (home)
4. Data synced to cloud in background

### Returning User (New Device)
1. Sign in with Google/Apple
2. Profile found in database
3. Navigate to `/` (home)
4. `ProtectedRoute` shows "Restoring your data..." spinner
5. Cloud data pulled and saved to localStorage
6. Home screen displays with all user data

## Testing
To test the persistence:
1. Sign in on Device A, complete onboarding
2. Sign out
3. Sign in on Device B with the same account
4. Should see "Restoring your data..." then go straight to home with all data
5. No onboarding should be shown
