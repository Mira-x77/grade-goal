# Create Admin Account in Firebase (NOT Supabase!)

## Important: The admin panel uses FIREBASE Authentication, not Supabase!

### Step 1: Go to Firebase Console
🔗 https://console.firebase.google.com/project/score-target/authentication/users

### Step 2: Enable Email/Password Authentication (if not already enabled)
1. Click on **"Sign-in method"** tab
2. Find **"Email/Password"**
3. Click on it and **Enable** it
4. Click **"Save"**

### Step 3: Create Admin User
1. Go back to **"Users"** tab
2. Click **"Add user"** button (top right)
3. Fill in:
   - **Email**: `techmira77@gmail.com`
   - **Password**: Choose a strong password (remember it!)
4. Click **"Add user"**

### Step 4: Restart Dev Server
The .env file was just updated with VITE_ADMIN_EMAIL. You need to restart:

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
cd exam-library-admin
npm run dev
```

### Step 5: Login
1. Go to: `http://localhost:3001`
2. Enter:
   - Email: `techmira77@gmail.com`
   - Password: (the password you set in Firebase)
3. Click **"Sign In"**

---

## Quick Links:

- **Firebase Console**: https://console.firebase.google.com/project/score-target
- **Authentication Users**: https://console.firebase.google.com/project/score-target/authentication/users
- **Sign-in Methods**: https://console.firebase.google.com/project/score-target/authentication/providers

---

## Troubleshooting:

**"Unauthorized: Admin access only"**
- Make sure the email in Firebase matches exactly: `techmira77@gmail.com`
- Make sure you restarted the dev server after updating .env

**"Invalid email or password"**
- Double-check the password you set in Firebase
- Make sure Email/Password authentication is enabled

**Can't access Firebase Console**
- Make sure you're logged into the Google account that owns the Firebase project
- Project ID: `score-target`

---

## Why Firebase and not Supabase?

The admin panel was originally built with Firebase Authentication. The mobile app uses Supabase for storage, but the admin panel authentication is separate and uses Firebase.

You could migrate to Supabase auth later if needed, but for now, use Firebase for admin login.
