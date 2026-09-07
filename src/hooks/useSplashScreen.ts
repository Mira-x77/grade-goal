import { useState, useEffect } from 'react';

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    // Check if this is the first launch
    const hasLaunchedBefore = localStorage.getItem('app_launched_before');
    
    if (hasLaunchedBefore) {
      setIsFirstLaunch(false);
      // Shorter splash for returning users
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      // Mark as launched for future visits
      localStorage.setItem('app_launched_before', 'true');
      setIsFirstLaunch(true);
      // Full splash experience for first-time users
      // The splash screen component will handle its own timing
    }
  }, []);

  const completeSplash = () => {
    setShowSplash(false);
  };

  return {
    showSplash,
    isFirstLaunch,
    completeSplash
  };
}