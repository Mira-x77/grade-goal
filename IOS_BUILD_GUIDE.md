# iOS build guide (hub)

**Canonical, up-to-date instructions: [`docs/ios/BUILD_IOS_FROM_WINDOWS.md`](docs/ios/BUILD_IOS_FROM_WINDOWS.md).**
It covers the Windows workflow, the GitHub Actions macOS build, signing, IPA
export and App Store submission in detail. This file is the short version.

## Status

| Item | Value |
|---|---|
| Project | `ios/App/App.xcodeproj` (Capacitor 8.6.2, Swift Package Manager) |
| Bundle ID | `com.gostudy.student` |
| Version | `1.3.3` (build `15`) — same as the Android APK |
| Display name | `GoStudy!` |
| Deployment target | iOS 15.0 |
| Shared scheme | `App` |

## Windows commands

```powershell
npm ci --legacy-peer-deps   # once, and after dependency changes
npm run ios:sync            # web build + cap sync ios + portability fixes
npm run ios:prepare         # verify only (paths, iOS 15, Info.plist)
```

`npm run ios:sync` must run after any web change, because `ios/App/App/public`
is generated and gitignored.

## Three ways to get the app onto the iPhone

1. **GitHub Actions, unsigned IPA** (no Mac, free Apple ID)
   `Actions → iOS build (unsigned IPA) → Run workflow`, then install the artifact
   with **Sideloadly** or **AltStore**. Re-sign every 7 days.
   Workflow: `.github/workflows/ios.yml`.
2. **GitHub Actions, signed IPA** (paid Apple Developer)
   `Actions → iOS release (signed IPA)`, needs the `IOS_*` signing secrets.
   Workflow: `.github/workflows/ios-release.yml`.
3. **A borrowed Mac** — `npm run ios:sync`, `npx cap open ios`, set the
   Development Team, then Product → Archive → TestFlight.

Gradle is never involved: iOS is compiled by `xcodebuild`, Android by Gradle.
