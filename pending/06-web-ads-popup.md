# 6. Ad pop-up for the web app

**Type:** feature
**Status:** Open
**Depends on:** [5. Web app version](05-web-app-version.md)

## Goal

Show an ad pop-up in the **web** version only. The APK must never show it
(the Play Store build stays ad-free unless decided otherwise).

## Decisions needed

- [ ] Ad network: Google AdSense, Adsterra, Monetag, or a direct sponsor
- [ ] Format: interstitial modal on app open, or pop-up before a download
- [ ] Frequency cap: once per session? once per day? never twice in a row?
- [ ] Can it appear on the download flow, or only on the home/library screens?
- [ ] Country / age targeting rules

## Rules to enforce in code

1. Gate on platform: `Capacitor.isNativePlatform() === false` **and**
   `VITE_WEB_ADS_ENABLED === 'true'`.
2. Never block the library, the reader, or an in-progress download.
3. Always provide a visible **Close** button; never a fake "X" or a hidden close.
4. Respect the frequency cap in `localStorage` and reset it after a real
   conversion, not on every page load.
5. Do not show to premium/subscribed users.
6. Keyboard accessible: `Esc` closes, focus is trapped only while open.
7. No ad script may run inside the APK bundle.

## Implementation sketch

- `src/components/web/WebAdModal.tsx` — lazy-loaded, renders only on web.
- `src/hooks/useWebAd.ts` — decides whether to show (platform, env flag,
  premium check, frequency cap).
- Ad slot injected into the modal via the network's script tag in `index.html`,
  loaded only when the modal mounts.
- Add `VITE_WEB_ADS_ENABLED` and `VITE_AD_CLIENT_ID` to `.env` / hosting env.

## Done when

- [ ] Web build shows the ad at the agreed moment and frequency
- [ ] APK build contains no ad script (verify with a bundle search)
- [ ] Close button works with mouse and keyboard
- [ ] Premium users never see it
- [ ] Measured: no blocking of library load or PDF open

## Notes

Ad networks reject apps that hide the close button or overlay content. Keep it
honest and simple; a rejected account is worse than a missed impression.
