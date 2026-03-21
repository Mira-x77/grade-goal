# 📄 Printable Subscription Codes Feature

## Overview

Added a new feature to the admin panel that allows generating and printing multiple subscription codes at once for mass distribution to students.

---

## Features

### 1. **Bulk Code Generation**
- Generate 1-100 codes at once
- Choose subscription duration (1, 3, 6, or 12 months)
- Automatic pricing display

### 2. **Printable Sheet**
- Professional layout with 2 columns
- Each code card shows:
  - Sequential number (#001, #002, etc.)
  - Duration badge
  - Large, readable code in monospace font
  - Price per code
- Header with generation date and total count
- Footer with redemption instructions and support contact

### 3. **Export Options**
- **Print**: Direct print to paper
- **Download CSV**: Export codes as spreadsheet for record-keeping

### 4. **Auto-Save to Database**
- All generated codes are automatically saved
- Analytics updated automatically
- Codes tracked in the system

---

## How to Use

### Access the Feature

1. Open admin panel: `http://localhost:5173`
2. Navigate to **Subscription Codes** page
3. Click **"Print Sheet"** button (top right)

### Generate Codes

1. **Enter quantity**: 1-100 codes
2. **Select duration**:
   - 1 Month - 500 FCFA
   - 3 Months - 1,500 FCFA
   - 6 Months - 2,000 FCFA
   - 12 Months - 5,000 FCFA
3. Click **"Generate Sheet"**

### Print or Export

1. **Preview** appears with all generated codes
2. Click **"Print Sheet"** to print on paper
3. Or click **"Download CSV"** for digital record

---

## Use Cases

### 1. **School Distribution**
- Generate 30 codes for a class
- Print the sheet
- Cut individual code cards
- Distribute to students

### 2. **Bulk Sales**
- Generate codes for resellers
- Export CSV for tracking
- Share codes via WhatsApp/Email

### 3. **Promotional Campaigns**
- Generate limited codes
- Print promotional flyers
- Track usage in admin panel

---

## Code Card Layout

```
┌─────────────────────────────┐
│ #001                    1M  │
│                             │
│   XXXX-XXXX-XXXX           │
│                             │
│      500 FCFA               │
└─────────────────────────────┘
```

Each card includes:
- Sequential number for tracking
- Duration badge (1M, 3M, 6M, 12M)
- 12-character code in large font
- Price

---

## Sheet Layout

### Header
- **Title**: ScoreTarget Premium Codes
- **Duration & Price**: e.g., "1 Month Subscription - 500 FCFA"
- **Generation Info**: Date and total count

### Body
- **2-column grid** of code cards
- Professional borders and spacing
- Print-optimized layout

### Footer
- **Redemption instructions**:
  1. Open ScoreTarget app
  2. Go to Library → Subscription Badge
  3. Tap "I Have a Code"
  4. Enter code and activate
- **Support contact**: WhatsApp +228 90676722

---

## Technical Details

### Files Added/Modified

1. **New Component**: `exam-library-admin/src/components/subscription/PrintableCodesSheet.tsx`
   - Dialog for code generation
   - Printable sheet preview
   - CSV export functionality

2. **Updated**: `exam-library-admin/src/pages/SubscriptionCodes.tsx`
   - Added "Print Sheet" button
   - Integrated new component

3. **Updated**: `exam-library-admin/src/services/subscriptionService.ts`
   - Added `batchGenerateCodes()` method
   - Handles bulk code insertion
   - Updates analytics

### Print Styles

Custom CSS for print media:
- Hides UI controls when printing
- Optimizes layout for paper
- Prevents page breaks inside code cards
- Full-width printing

---

## CSV Export Format

```csv
Code,Duration,Price,Status
XXXX-XXXX-XXXX,1 month(s),500 FCFA,Unused
YYYY-YYYY-YYYY,1 month(s),500 FCFA,Unused
...
```

Perfect for:
- Excel/Google Sheets
- Record keeping
- Inventory management
- Sales tracking

---

## Benefits

✅ **Time-Saving**: Generate 100 codes in seconds
✅ **Professional**: Clean, printable layout
✅ **Trackable**: All codes saved in database
✅ **Flexible**: Multiple export options
✅ **User-Friendly**: Simple 3-step process
✅ **Mobile-Ready**: Works on tablets for on-site generation

---

## Future Enhancements

Possible additions:
- QR codes for each subscription code
- Custom branding/logo on sheets
- Batch expiration dates
- Email distribution
- SMS distribution via API

---

## Support

For issues or questions:
- WhatsApp: +228 90676722
- Admin Panel: Subscription Codes page
- Check database: `subscription_codes` table

---

## Example Workflow

### Scenario: New School Semester

1. **Generate**: 50 codes for 1-month subscriptions
2. **Print**: 2 sheets (25 codes per sheet)
3. **Distribute**: Give to students on first day
4. **Track**: Monitor activations in admin panel
5. **Follow-up**: Contact students who haven't activated

### Scenario: Promotional Event

1. **Generate**: 20 codes for 6-month subscriptions
2. **Export CSV**: Keep digital record
3. **Share**: Post codes on social media
4. **Monitor**: Watch real-time activations
5. **Analyze**: Check which codes were used

---

## Security Notes

⚠️ **Important**:
- Codes are single-use only
- Once activated, cannot be reused
- Keep printed sheets secure
- Track distribution for accountability
- Monitor for unauthorized sharing

---

## Testing

To test the feature:

1. Start admin panel: `cd exam-library-admin && npm run dev`
2. Navigate to Subscription Codes
3. Click "Print Sheet"
4. Generate 5 test codes (1 month)
5. Preview the sheet
6. Test print functionality
7. Download CSV to verify format

---

Ready to distribute codes to students! 🎓
