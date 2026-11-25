# Quick start — GoStudy on iPhone

The iOS project is generated and versioned (`com.gostudy.student`, 1.3.3 / 15).
Nothing about it needs a Mac on your side: a macOS GitHub runner compiles it.

## 3 steps

```powershell
# 1. refresh the iOS project from the current web build (run on Windows)
npm run ios:sync

# 2. push so the workflow can build it
git add -A
git commit -m "iOS project sync"
git push
```

3. GitHub → **Actions** → **iOS build (unsigned IPA)** → **Run workflow** →
   download `gostudy-ios-unsigned-ipa` → install with **Sideloadly** or
   **AltStore** from Windows.

Before the first run, add the `VITE_SUPABASE_*` secrets (Settings → Secrets and
variables → Actions). `.env` is gitignored, so CI rebuilds it from them.

## Files that matter

| Path | Purpose |
|---|---|
| `ios/App/App.xcodeproj` | Xcode project (shared scheme `App`) |
| `ios/App/App/Info.plist` | bundle settings, display name `GoStudy!` |
| `ios/App/CapApp-SPM/Package.swift` | generated plugin list, normalised by `npm run ios:prepare` |
| `scripts/ios/prepare-ios.mjs` | fixes Windows SPM paths + iOS 15 deployment target |
| `.github/workflows/ios.yml` | unsigned IPA build |
| `.github/workflows/ios-release.yml` | signed IPA / TestFlight build |

Full details, signing and App Store checklist:
[`docs/ios/BUILD_IOS_FROM_WINDOWS.md`](docs/ios/BUILD_IOS_FROM_WINDOWS.md).
