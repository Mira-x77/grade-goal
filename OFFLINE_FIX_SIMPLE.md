# Offline Navigation - Simple Fix ✅

## What It Does

**When device is offline:**
- Clicking Library tab → Goes to My Downloads (not Library)

**When device is online:**
- Clicking Library tab → Goes to Library (normal)

---

## The Fix

Changed the Library tab from a `<Link>` to a `<button>` with conditional logic:

```typescript
<button
  onClick={() => {
    if (!navigator.onLine) {
      navigate("/my-downloads");  // Offline: go to downloads
    } else {
      navigate("/library");       // Online: go to library
    }
    haptic();
  }}
>
  {/* Library icon and label */}
</button>
```

**That's it!** Simple conditional: offline = downloads, online = library.

---

## File Changed

- `src/components/TaskBar.tsx` - Changed Library tab from Link to button with offline check

---

## Test It

1. **Turn OFF WiFi/data**
2. Click Library tab
3. Should go to **My Downloads** (with offline banner)
4. Should NOT see "Couldn't load papers" error

---

## Why This Works

- Button checks `navigator.onLine` BEFORE navigating
- If offline: navigates to `/my-downloads`
- If online: navigates to `/library`
- User never lands on Library page when offline

---

**Status:** ✅ Fixed and built successfully

**Deploy:**
```bash
npm run build
npx cap sync android
npx cap run android
```
