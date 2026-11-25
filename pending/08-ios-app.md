# 08 — iPhone (iOS) build

Status: **project fully configured and CI-ready; the binary must be compiled by macOS**

## What exists

| Piece | Value |
|---|---|
| Xcode project | `ios/App/App.xcodeproj` — Capacitor 8.6.2, Swift Package Manager (no CocoaPods) |
| Bundle ID | `com.gostudy.student` (matches Android) |
| Display name | `GoStudy!` |
| Version | `MARKETING_VERSION = 1.3.4`, `CURRENT_PROJECT_VERSION = 16` (Debug + Release) |
| Deployment target | iOS 15.0 — required by Capacitor 8 (was 13.0, would not link) |
| Shared scheme | `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` |
| Portability fixer | `scripts/ios/prepare-ios.mjs` (`npm run ios:prepare`) |
| Web assets | `npm run ios:sync` → `ios/App/App/public` (gitignored, rebuilt by CI) |
| CI, unsigned | `.github/workflows/ios.yml` → artifact `gostudy-ios-unsigned-ipa` |
| CI, signed | `.github/workflows/ios-release.yml` → archive + export + optional App Store Connect upload |
| Docs | `docs/ios/BUILD_IOS_FROM_WINDOWS.md` (canonical), `IOS_BUILD_GUIDE.md`, `QUICK_START_IOS.md` |

## Fixed during setup

- **Capacitor version skew**: `@capacitor/ios@8.4.1` peer-required
  `@capacitor/core ^8.4.0` but the project had `8.2.0` (`npm ls` flagged it
  invalid). All four Capacitor packages are now `8.6.2`; every plugin peer range
  is satisfied. Android release build is unaffected — verified with
  `gradlew assembleDebug` → `BUILD SUCCESSFUL`.
- **SwiftPM path separators**: `cap sync` on Windows writes
  `..\..\..\node_modules\...` into `CapApp-SPM/Package.swift`; SwiftPM on macOS
  cannot resolve backslashes. `npm run ios:prepare` normalises them and is a
  no-op on macOS.
- **Deployment target**: template shipped iOS 13.0 while Capacitor 8 and all
  plugins declare 15.0. Raised in all four build configurations plus the SwiftPM
  manifest.
- **Encryption declaration**: `ITSAppUsesNonExemptEncryption = false` added so
  App Store Connect stops asking on every upload.
- **APK inside the IPA**: `public/GoStudy.apk` (the landing-page download) was
  being copied into the iOS web assets. `prepare-ios.mjs` now deletes it, so the
  IPA only contains the real app.

## Why it cannot be finished here

Apple compiles IPA files with Xcode, which only runs on macOS, and iOS only
installs signed binaries. Both routes are prepared: a macOS GitHub Actions runner
produces the binary, Sideloadly/AltStore (free Apple ID) or TestFlight (paid)
supplies the signature.

## How to finish

1. `npm run ios:sync` on Windows, then push.
2. Add `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   as Actions secrets (`.env` is gitignored).
3. Run **iOS build (unsigned IPA)**, download the artifact, install with
   Sideloadly/AltStore.
4. Paid account: add the `IOS_*` + `ASC_*` secrets and run
   **iOS release (signed IPA)** for TestFlight.

## Done when

- [x] Bundle ID, version and display name aligned with the Android release
- [x] Capacitor dependency matrix consistent (8.6.2) with valid peers
- [x] iOS 15 deployment target in every configuration
- [x] SwiftPM plugin paths portable from Windows
- [x] Shared scheme committed; unsigned + signed CI workflows committed
- [x] Android build verified after the dependency bump
- [ ] An `.ipa` exists and installs on the iPhone
- [ ] Library (395 papers / 415 books from R2) verified on the device
- [ ] PDF viewer opens a remote R2 PDF on iOS
- [ ] Push notifications enabled or `UIBackgroundModes` removed before review
