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
Browse and read 75+ real past exam papers — Baccalauréat, BEPC, Probatoire, DNB, and APC (Togo) exams — directly inside the app with preview thumbnails. No external browser needed.

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

## ✅ Release Notes — v1.2.0 (versionCode 7)

Paste into Play Console → **Release → Release notes** (English).

### English (recommended)
```
What's new in Go Study! 1.2.0:

• Exam library: 75+ APC past papers with preview thumbnails
• Smarter library filters — papers match your class and série
• Read PDFs in-app; download for offline study
• Weekly schedule & study reminders on the home screen
• Premium: redeem access codes; guide to get codes in Settings
• Guest users are prompted to sign in before premium actions
• Improved Settings, schedule, and How to Get Code pages
• Bug fixes and performance improvements
```

### French (Français)
```
Nouveautés Go Study! 1.2.0 :

• Bibliothèque : 75+ sujets APC avec aperçus
• Filtres par classe et série
• PDF intégrés et téléchargements hors ligne
• Emploi du temps et rappels sur l'accueil
• Premium : codes d'accès et guide dans Paramètres
• Connexion requise pour les actions premium (invité)
• Améliorations Paramètres, emploi du temps et pages d'aide
• Corrections et performances
```

### Short version (if character limit)
```
75+ APC exam papers with previews, class/série filters, in-app PDFs, schedule reminders, premium codes, and sign-in improvements.
```

---

## ✅ Privacy Policy URL (Google Play)

Use this in Play Console → Store listing → Privacy policy:

**https://goostudy.vercel.app/privacy**

(Static backup: **https://goostudy.vercel.app/privacy.html**)

Website policy matches the in-app policy exactly (`PrivacyPolicy.tsx` / `src/lib/i18n.ts` legal strings). Source: `cible-your-smart-grade-guide/src/lib/privacy-policy-content.ts` — redeploy after edits:

```powershell
cd C:\Users\Skydrake\Documents\cible-your-smart-grade-guide
npx vercel login   # once, if needed
npx vercel --prod
```

---

## ✅ Sensitive Permissions — REQUEST_INSTALL_PACKAGES

**Removed in v1.2.1 (versionCode 8).** Updates go through Google Play only. Do not declare this permission.

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
