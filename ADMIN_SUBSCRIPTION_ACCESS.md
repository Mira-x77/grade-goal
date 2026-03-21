# How to Access Subscription Codes in Admin Panel

## Step 1: Open Admin Panel

The admin panel is already running. Open your browser and go to:
```
http://localhost:5174
```
(or whatever port is shown in the terminal)

## Step 2: Login

Use your admin credentials to login.

## Step 3: Navigate to Subscriptions

You should now see a new menu item in the left sidebar:
- **Subscriptions** (with a ticket icon 🎫)

Click on it to access the Subscription Codes page.

## What You'll See

### Stats Cards (Top)
- Total Codes: 0
- Unused Codes: 0
- Used Codes: 0
- Active Premium: 0

### Generate Codes Button
Click "Generate Codes" to create new subscription codes.

### Codes Table
Shows all generated codes with:
- Code (e.g., A7K9-M2P4-X8Q1)
- Duration (1, 3, 6, or 12 months)
- Status (Unused/Used)
- Used By (device ID if used)
- Used At (timestamp)
- Created (timestamp)

## Generate Your First Code

1. Click **"Generate Codes"** button
2. Select **Duration**: 3 months
3. Enter **Quantity**: 1
4. Click **"Generate Codes"**
5. Copy the generated code
6. Click **"Done"**

The code will now appear in the table!

## Test the Code in Mobile App

1. Open the mobile app
2. Go to Library
3. Download 5 papers (reach the limit)
4. Try to download a 6th paper
5. "Download Limit Reached" dialog appears
6. Click "Enter Premium Code"
7. Paste the code you generated
8. Click "Activate Premium"
9. Success! You now have unlimited downloads

## Troubleshooting

### "Subscriptions" menu item not showing
- Make sure you saved the Layout.tsx file
- Refresh the browser (Ctrl+R or Cmd+R)
- Check browser console for errors

### Page shows error
- Check if migration was run (see SUBSCRIPTION_MIGRATION_INSTRUCTIONS.md)
- Verify Supabase connection
- Check browser console for errors

### Can't generate codes
- Verify you're logged in as admin
- Check Supabase connection
- Look for errors in browser console

## Quick Test Checklist

- [ ] Admin panel opens at localhost:5174
- [ ] Login successful
- [ ] "Subscriptions" menu item visible
- [ ] Subscription Codes page loads
- [ ] Stats cards show zeros
- [ ] "Generate Codes" button visible
- [ ] Can generate 1 test code
- [ ] Code appears in table
- [ ] Can copy code to clipboard

If all checks pass, the system is working! 🎉
