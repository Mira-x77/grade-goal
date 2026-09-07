/**
 * Application Feature Configuration
 * 
 * This file controls which features are enabled in the application.
 * Premium features are now controlled by download quotas and subscription codes.
 */

export const APP_FEATURES = {
  // Premium features - now controlled by quota system
  PREMIUM_ENABLED: false, // FALSE = production mode (quota system active)
  SUBSCRIPTION_REQUIRED: true, // Enable subscription checks for downloads
  
  // Download quota system
  FREE_DOWNLOAD_LIMIT: 5, // Downloads per month for free users
  PREMIUM_UNLIMITED_DOWNLOADS: true,
  QUOTA_TRACKING_ENABLED: true,
  
  // Tutorial and onboarding
  TUTORIAL_SKIPPABLE: true,
  FORCE_TUTORIAL: false,
  
  // Language support
  FRENCH_SYSTEM_ENABLED: true,
  MULTI_LANGUAGE_SUPPORT: true,
  
  // Download features
  PDF_DOWNLOAD_ENABLED: true,
  OFFLINE_MODE: true,
  
  // Study tools (premium gated)
  STUDY_TOOLS_ENABLED: true,
  ANALYTICS_ENABLED: true,
  PROGRESS_TRACKING: true,
  
  // Advanced features (premium gated)
  ADVANCED_ANALYTICS: true,
  CUSTOM_THEMES: true,
  COLLABORATION_FEATURES: true,
  
  // Debug and development
  DEBUG_MODE: false,
  VERBOSE_LOGGING: false,
} as const;

export type AppFeature = keyof typeof APP_FEATURES;

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: AppFeature): boolean {
  return APP_FEATURES[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): AppFeature[] {
  return Object.entries(APP_FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature as AppFeature);
}

/**
 * Check if premium features should bypass all checks (for development/testing)
 */
export function hasPremiumBypass(): boolean {
  return APP_FEATURES.PREMIUM_ENABLED;
}

/**
 * Check if quota system is enabled
 */
export function isQuotaSystemEnabled(): boolean {
  return APP_FEATURES.QUOTA_TRACKING_ENABLED && APP_FEATURES.SUBSCRIPTION_REQUIRED;
}

/**
 * Get free tier download limit
 */
export function getFreeDownloadLimit(): number {
  return APP_FEATURES.FREE_DOWNLOAD_LIMIT;
}