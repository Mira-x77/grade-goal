# Build the iOS app

iOS binaries can only be compiled by Xcode, which runs on macOS. You do **not**
need a Mac: this project builds on a macOS GitHub Actions runner and you install
the result from Windows.

- Full instructions: [`docs/ios/BUILD_IOS_FROM_WINDOWS.md`](docs/ios/BUILD_IOS_FROM_WINDOWS.md)
- Short reference: [`IOS_BUILD_GUIDE.md`](IOS_BUILD_GUIDE.md)

## Fast path

```powershell
npm ci --legacy-peer-deps
npm run ios:sync          # build web assets, sync Capacitor, fix SPM paths / iOS 15
git push                  # so GitHub Actions can see the changes
```

Then:

1. Add `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   under **Settings → Secrets and variables → Actions**.
2. **Actions → iOS build (unsigned IPA) → Run workflow.**
3. Download the `gostudy-ios-unsigned-ipa` artifact.
4. Install it from Windows with **Sideloadly** or **AltStore** (free Apple ID,
   re-sign every 7 days).

For TestFlight/App Store, use the `iOS release (signed IPA)` workflow with a paid
Apple Developer account.

Do not use Gradle for iOS — Gradle only builds the Android APK/AAB.
