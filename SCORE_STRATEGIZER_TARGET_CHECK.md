# Score Strategizer - Target Unreachable Check

## Problem
When a user's target average is mathematically impossible to achieve (even with perfect 20/20 scores on all remaining assessments), they were still able to access the Score Strategizer. This didn't make sense because you can't plan scores toward an unreachable target.

## Solution
Added a check before entering the Score Strategizer that:
1. Calculates the best possible average (if user scores 20/20 on everything remaining)
2. Compares it to the user's target
3. If target is unreachable, shows a dialog explaining the situation
4. Offers to update the target to a realistic value
5. Only allows access to the Strategizer after target is adjusted

## Files Created

### 1. TargetAdjustmentDialog.tsx
A new modal dialog component that:
- Shows current target vs maximum achievable average
- Explains why the target is unreachable
- Suggests a realistic target (rounded down to nearest 0.5)
- Provides two actions:
  - "Update & Continue" - Updates target and navigates to simulator
  - "Cancel" - Closes dialog without changes

## Files Modified

### 1. src/lib/i18n.ts
Added translation keys for both English and French:
- `targetOutOfReachSimulatorDesc` - Detailed explanation for simulator context
- `currentTarget` - Label for current target
- `suggestedTarget` - Label for suggested target
- `targetAdjustmentExplanation` - Explanation text
- `updateAndContinue` - Button text
- `cancel` - Cancel button text

### 2. src/pages/Home.tsx
- Imported `TargetAdjustmentDialog` component
- Added state for dialog visibility and data
- Replaced strategizer Link with button that checks target reachability
- Added logic to show dialog when target is unreachable
- Added dialog component with handlers for update and cancel actions

## User Flow

### Before (Broken)
1. User has target of 16/20
2. Best possible average is 14.5/20
3. User clicks strategizer button
4. Goes to simulator and plans scores (pointless since target is impossible)

### After (Fixed)
1. User has target of 16/20
2. Best possible average is 14.5/20
3. User clicks strategizer button
4. Dialog appears explaining target is unreachable
5. Shows current target (16) vs suggested target (14)
6. User clicks "Update & Continue"
7. Target is updated to 14
8. User is navigated to simulator with realistic target

## Technical Details

The check uses the existing `getAbsoluteBounds()` function from `exam-logic.ts` which:
- Calculates the minimum possible average (0 on all remaining)
- Calculates the maximum possible average (20 on all remaining)
- Returns `{ min, max }` bounds

The dialog only shows when `bounds.max < targetAverage`, meaning even perfect scores won't reach the target.

## Testing
To test this feature:
1. Add subjects with some marks entered
2. Set a high target (e.g., 18/20)
3. Enter low marks that make 18 impossible
4. Click the strategizer button (floating button with TrendingUp icon)
5. Dialog should appear
6. Click "Update & Continue"
7. Should navigate to simulator with updated target

## Notes
- This feature only applies to French/APC system users (not Nigerian system)
- The suggested target is rounded down to nearest 0.5 for cleaner values
- The dialog uses the same design language as other modals in the app
- Target can still be manually adjusted later from the Profile page
