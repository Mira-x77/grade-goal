/**
 * Lifetime download peak — never decreases when user deletes local files.
 * Prevents bypassing the 5-download free tier by removing downloads.
 */

const LIFETIME_PEAK_KEY = 'scoretarget_lifetime_download_peak';

export function readLifetimeDownloadPeak(): number {
  try {
    const raw = localStorage.getItem(LIFETIME_PEAK_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpLifetimeDownloadPeak(used: number): void {
  const peak = Math.max(readLifetimeDownloadPeak(), used);
  try {
    localStorage.setItem(LIFETIME_PEAK_KEY, String(peak));
  } catch {
    /* ignore */
  }
}
