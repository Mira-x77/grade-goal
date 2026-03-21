# Create Admin Account for Login

## Quick Steps:

### 1. Go to Supabase Dashboard
🔗 https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/auth/users

### 2. Create Admin User
1. Click **"Add user"** button (top right)
2. Select **"Create new user"**
3. Fill in:
   - **Email**: `techmira77@gmail.com` (or your email)
   - **Password**: Choose a strong password (remember it!)
   - **Auto Confirm User**: ✅ Check this box (important!)
4. Click **"Create user"**

### 3. Login to Admin Panel
1. Go to: `http://localhost:3001`
2. You'll see the login page
3. Enter:
   - Email: `techmira77@gmail.com` (or the email you used)
   - Password: (the password you set)
4. Click **"Sign In"**

### 4. You're In!
After login, you'll see the admin panel with:
- Dashboard
- Upload
- Papers
- Analytics
- **Subscriptions** (bright yellow-orange button) ← Your subscription codes page!

---

## Alternative: Use Any Email

You can use ANY email address you want:
1. Create user in Supabase with your preferred email
2. Login with that email and password
3. The admin panel doesn't restrict by email - any authenticated user can access it

---

## Troubleshooting:

**"Invalid login credentials"**
- Make sure you checked "Auto Confirm User" when creating the account
- Try resetting the password in Supabase dashboard

**Can't access Supabase dashboard**
- Make sure you're logged into Supabase
- Use the direct link above (includes your project ID)

**Still stuck?**
- You can create the user via SQL in Supabase SQL Editor:
  ```sql
  -- This creates a user directly (advanced)
  -- Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/sql
  ```

---

## Your Supabase Project:
- **Project ID**: aaayzhvqgqptgqaxxbdh
- **URL**: https://aaayzhvqgqptgqaxxbdh.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh
