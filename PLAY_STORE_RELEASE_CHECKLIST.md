# GoStudy – Play Store Release Checklist (v1.2.0)

## ✅ App Description (Copy-paste into Play Console → Store Listing)

### Short Description (80 chars max)
```
GoStudy: Smart exam planner, past papers & grade calculator for students.
```

### Full Description
```
GoStudy is your all-in-one academic success companion built for APC, French (AEFE/DNB/Baccalauréat), and Nigerian University students.

📚 EXAM LIBRARY
Browse and read 63+ real past exam papers — Baccalauréat, BEPC, Probatoire, DNB, and Nigerian University entrance exams — directly inside the app. No external browser needed.

🎯 GRADE CALCULATOR & SIMULATOR
Instantly calculate your semester average, simulate grade scenarios, and find out exactly what you need in upcoming exams to hit your target.

📅 SMART PLANNER
Organize your study schedule by subject. Track marks, set targets, and monitor your progress throughout the term.

🔔 IN-APP NOTIFICATIONS
Get study reminders and update alerts without leaving the app.

📖 BOOKS LIBRARY
Access textbook resources alongside past exam papers, all in one place.

🔒 OFFLINE-FIRST
All your data and downloaded PDFs work offline. Your progress syncs to the cloud when connected.

🌐 BILINGUAL
Full English and French language support — switch instantly from any screen.

GoStudy supports Cameroonian APC and French-track systems, AEFE/French-curriculum schools, and Nigerian University students across all departments.

Start studying smarter today.
```

---

## ✅ What's New in this Version (v1.2.0)
```
• New: Onboarding-first flow — set up your profile before signing in
• New: Google Sign-In available at end of onboarding
• Improved: Library PDF viewer performance
• Improved: Course pages now load offline with sample content
• Fixed: Sign-in pages no longer appear twice
• Fixed: App mascot redesigned — cleaner, modern look
• Fixed: Storage permissions for Android 13+ devices
• Fixed: Supabase database reconnected to official GoStudy backend
```

---

## ✅ Sensitive Permissions Declaration (Enter in Play Console → App content → Sensitive app permissions)

### REQUEST_INSTALL_PACKAGES
**Justification:**
GoStudy delivers in-app updates (new APK versions) directly to users without requiring them to open the Play Store. When an update is published by the admin, users receive an in-app notification and can download and install the update with one tap. This permission is used solely for this purpose and is triggered only by explicit user action.

---

## ✅ Financial Features Declaration (Play Console → App content → Financial services)

**Select: "No — my app does not include financial features."**

GoStudy does not process payments, display financial data, or offer financial services. Premium access codes are generated offline by the admin and entered manually by users — no in-app purchases or payment processing occurs.

---

## ✅ Health Declaration (Play Console → App content → Health & safety)

**Answer all questions with "No" and agree to the terms.**

GoStudy does not collect, store, or process any health or fitness data. The app handles academic grades and study schedules only.

---

## ✅ Content Rating (Play Console → Policy → App content → Content rating)

**Category: Education**
- Violence: None
- Sexual content: None
- Language: None
- Controlled substances: None
- Rating result will be: **Everyone (E)**

---

## ✅ Target Audience (Play Console → Policy → App content → Target audience)

- Age group: **13 and up**
- Designed for students in secondary school and university
- Does NOT knowingly collect data from children under 13

---

## ✅ App Access (Play Console → Policy → App content → App access)

**Select: "All or most functionality is available without special access"**

Users can complete onboarding and access all core features (grade calculator, simulator, library) without signing in. Google Sign-In is optional and only required for cloud sync and premium features.

---

## ✅ Deobfuscation / Mapping File

Since `minifyEnabled false` is set in the current `build.gradle`, **no mapping file is needed** for this release. The warning in Play Console is informational only and will not block publishing.

To suppress the warning in future releases, enable R8 and upload `app/build/outputs/mapping/release/mapping.txt`.
