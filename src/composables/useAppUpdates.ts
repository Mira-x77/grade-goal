import { useState, useEffect } from 'react';
import { updateService, type AppUpdate } from '@/services/UpdateService';
import { Capacitor } from '@capacitor/core';

export function useAppUpdates() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

  /**
   * Check for updates when app starts
   */
  const checkForUpdatesOnStartup = async () => {
    // Only check on mobile platforms (disabled for testing)
    // if (!Capacitor.isNativePlatform()) {
    //   return;
    // }

    try {
      setIsCheckingForUpdates(true);
      
      const result = await updateService.checkForUpdates();
      
      if (result.hasUpdate && result.update) {
        setAvailableUpdate(result.update);
        
        // Check if user previously dismissed this version
        const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
        
        if (dismissedVersion === result.update.versionCode.toString()) {
          // Show as notification if previously dismissed
          setShowUpdateNotification(true);
        } else {
          // Show as popup for new updates
          setShowUpdateDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  /**
   * Manually check for updates (triggered by user)
   */
  const manualUpdateCheck = async (): Promise<boolean> => {
    try {
      setIsCheckingForUpdates(true);
      
      const result = await updateService.checkForUpdates();
      
      if (result.hasUpdate && result.update) {
        setAvailableUpdate(result.update);
        setShowUpdateDialog(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  /**
   * Handle update dialog dismissal (Later button)
   */
  const onUpdateDialogDismiss = () => {
    // Only allow dismissal if update is not mandatory
    if (!availableUpdate?.isMandatory) {
      // Remember that user dismissed this version
      if (availableUpdate) {
        localStorage.setItem('dismissedUpdateVersion', availableUpdate.versionCode.toString());
      }
      
      setShowUpdateDialog(false);
      // Show as notification instead
      setShowUpdateNotification(true);
    }
  };

  /**
   * Handle notification dismissal
   */
  const onNotificationDismiss = () => {
    setShowUpdateNotification(false);
  };

  /**
   * Handle "Install Now" from notification
   */
  const onNotificationInstall = () => {
    setShowUpdateNotification(false);
    setShowUpdateDialog(true);
  };

  /**
   * Handle update started
   */
  const onUpdateStarted = () => {
    console.log('Update download started');
  };

  /**
   * Handle update completed
   */
  const onUpdateCompleted = () => {
    console.log('Update completed');
    setShowUpdateDialog(false);
    setShowUpdateNotification(false);
    setAvailableUpdate(null);
    
    // Clear dismissed version since update is complete
    localStorage.removeItem('dismissedUpdateVersion');
    
    // App will restart automatically after APK installation
  };

  /**
   * Get current app version
   */
  const getCurrentVersion = async () => {
    return await updateService.getCurrentVersion();
  };

  // Auto-check for updates when hook is used
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = setTimeout(checkForUpdatesOnStartup, 2000);
    return () => clearTimeout(timer);
  }, []);

  return {
    // State
    showUpdateDialog,
    showUpdateNotification,
    availableUpdate,
    isCheckingForUpdates,
    
    // Methods
    checkForUpdatesOnStartup,
    manualUpdateCheck,
    onUpdateDialogDismiss,
    onNotificationDismiss,
    onNotificationInstall,
    onUpdateStarted,
    onUpdateCompleted,
    getCurrentVersion
  };
}