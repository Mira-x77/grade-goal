import { hasPremiumBypass } from './app-features';

/** Dev-only: bypass all premium gates when true */
export const PREMIUM_DEV_BYPASS = hasPremiumBypass();

/** @deprecated Use usePremium() / useAppConfig().premiumEnabled */
export const PREMIUM_ENABLED = PREMIUM_DEV_BYPASS;
