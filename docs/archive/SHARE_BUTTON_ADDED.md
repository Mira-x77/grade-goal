# Share Button - Paper Details Page

## Implementation
Added a share button to the paper details page that allows users to share exam papers with others.

## Changes Made

### 1. src/pages/PaperDetail.tsx
- Imported `Share2` icon from lucide-react
- Added `handleShare()` function that:
  - Uses Capacitor Share plugin for native apps
  - Falls back to Web Share API for web browsers
  - Falls back to clipboard copy if neither is available
  - Shows appropriate toast messages for success/failure
- Added share button UI below the Prep button

### 2. src/lib/i18n.ts
Added translation keys for both English and French:
- `share` - "Share" / "Partager"
- `linkCopied` - "Link copied to clipboard" / "Lien copié dans le presse-papiers"
- `shareFailed` - "Failed to share" / "Échec du partage"

## Features

### Share Content
When sharing, the following information is included:
- Title: Paper title
- Text: "{title} - {subject} ({classLevel}, {year})"
- URL: Current page URL

### Platform Support
1. **Native Apps (Android/iOS)**: Uses Capacitor Share plugin with native share sheet
2. **Modern Browsers**: Uses Web Share API
3. **Fallback**: Copies link to clipboard and shows toast notification

### Error Handling
- Gracefully handles user cancellation (no error shown)
- Shows error toast if sharing fails
- Provides clipboard fallback if sharing is not supported

## User Experience
1. User views a paper detail page
2. Clicks the "Share" button below the Prep section
3. Native share sheet appears (or web share dialog)
4. User selects how to share (WhatsApp, Email, Copy, etc.)
5. Paper link and details are shared

## Testing
To test the share functionality:
1. Navigate to any paper detail page
2. Click the "Share" button
3. On mobile: Native share sheet should appear
4. On web: Browser share dialog should appear (if supported)
5. If neither: Link should be copied to clipboard with toast notification

## Technical Notes
- Uses dynamic imports for Capacitor plugins to avoid bundle bloat
- Checks for share capability before attempting to share
- Handles all three sharing methods with proper fallbacks
- User cancellation is handled gracefully without showing errors
