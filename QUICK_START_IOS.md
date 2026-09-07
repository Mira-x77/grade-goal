# 🚀 Quick Start - Get Your App on iPhone

## ✅ What's Done

Your **grade-goal app** (ScoreTarget) is now iOS-ready!
- ✅ Capacitor installed
- ✅ iOS project created
- ✅ Web app built and synced
- ✅ 12 Capacitor plugins configured

---

## 🎯 Fastest Way to Get on iPhone (No Mac!)

### Option 1: Cloud Build with Codemagic (Recommended)

**⏱️ Time: 30 minutes**

1. Go to https://codemagic.io
2. Sign up (free)
3. Connect your GitHub repo
4. Configure iOS build
5. Download .ipa file
6. Install via AltStore (https://altstore.io)

### Option 2: Use a Mac (If Available)

**⏱️ Time: 2-3 hours (first time)**

```bash
# On Mac:
cd /path/to/grade-goal
npm install --legacy-peer-deps
npm run ios:sync
npm run ios:open
# Click Play in Xcode
```

---

## 📱 New Commands Available

```bash
# Sync and open iOS (on Mac)
npm run ios:sync    # Build web + sync to iOS
npm run ios:open    # Open Xcode

# Sync and open Android
npm run android:sync
npm run android:open
```

---

## 🎁 What You Get

Your iPhone app will have:
- ✅ All features from web version
- ✅ Offline storage
- ✅ Cloud sync with Supabase
- ✅ Native iOS look and feel
- ✅ File downloads
- ✅ Share functionality
- ✅ Haptic feedback
- ✅ Local notifications
- ✅ Status bar styling

---

## 📖 Full Instructions

See **IOS_BUILD_GUIDE.md** for complete details.

---

## ❓ Quick FAQ

**Q: Can I build iOS on Windows?**
A: Not directly, but cloud services (Codemagic, EAS) can do it for you.

**Q: Do I need to pay Apple?**
A: $99/year for App Store or TestFlight. Free for testing on your own device.

**Q: How long to publish?**
A: 1-3 days for Apple review after submission.

**Q: Can I test without Mac?**
A: Yes! Use cloud build + AltStore/Sideloadly to install on iPhone.

---

Ready to go! 🚀
