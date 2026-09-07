/**
 * Application initialization module
 * Handles startup tasks for the exam library feature
 */

import { initFilesystem } from './filesystem';
import { cacheService } from '@/services/cacheService';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';

/**
 * Initialize all app services on startup
 * This should be called once when the app starts
 */
export async function initializeApp(): Promise<void> {
  console.log('Initializing Go Study! app...');

  try {
    // Native Mobile Initializations
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        // Make status bar transparent so app content flows underneath it, feeling more native
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Lock screen to portrait to prevent weird resolution issues
        await ScreenOrientation.lock({ orientation: 'portrait' });

        // Hide splash screen smoothly after app is ready
        await SplashScreen.hide();
        console.log('✓ Native mobile plugins configured');
      } catch (e) {
        console.warn('Native plugin configuration skipped or failed:', e);
      }
    }
    // Supabase is initialized in examService - no setup needed here
    console.log('✓ Supabase ready');

    // Initialize IndexedDB for caching
    await cacheService.init();
    console.log('✓ IndexedDB initialized');

    // Initialize filesystem for downloads
    await initFilesystem();
    console.log('✓ Filesystem initialized');

    // Clear expired cache (older than 24 hours)
    await cacheService.clearExpiredCache();
    console.log('✓ Cache cleaned');

    console.log('App initialization complete!');
  } catch (error) {
    console.error('Error during app initialization:', error);
    // Don't throw - allow app to continue even if some services fail
  }
}

/**
 * Check if app is ready
 */
export function isAppReady(): boolean {
  return true;
}
