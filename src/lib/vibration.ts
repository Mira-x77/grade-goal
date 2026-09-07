/**
 * Vibration Utility
 * Provides haptic feedback for various app actions
 */

/**
 * Check if vibration is supported
 */
export function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Vibrate patterns for different actions
 */
export const VibrationPatterns = {
  // Short single tap (50ms)
  tap: 50,
  
  // Double tap (50ms, 100ms pause, 50ms)
  doubleTap: [50, 100, 50],
  
  // Success feedback (50ms, 50ms pause, 100ms)
  success: [50, 50, 100],
  
  // Error feedback (100ms, 50ms pause, 100ms)
  error: [100, 50, 100],
  
  // Warning (100ms, 100ms pause, 100ms, 100ms pause, 100ms)
  warning: [100, 100, 100, 100, 100],
  
  // Notification (short pulse: 100ms, 50ms pause, 100ms)
  notification: [100, 50, 100],
  
  // Long press (200ms continuous)
  longPress: 200,
  
  // Delete action (150ms)
  delete: 150,
};

/**
 * Trigger haptic feedback
 * @param pattern - Vibration pattern (number or array)
 */
export function vibrate(pattern: number | number[]): void {
  if (!isVibrationSupported()) {
    return;
  }
  
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Vibration failed:', error);
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelVibration(): void {
  if (!isVibrationSupported()) {
    return;
  }
  
  try {
    navigator.vibrate(0);
  } catch (error) {
    console.warn('Cancel vibration failed:', error);
  }
}

/**
 * Vibrate for tap action (button press)
 */
export function vibrateTap(): void {
  vibrate(VibrationPatterns.tap);
}

/**
 * Vibrate for success action
 */
export function vibrateSuccess(): void {
  vibrate(VibrationPatterns.success);
}

/**
 * Vibrate for error action
 */
export function vibrateError(): void {
  vibrate(VibrationPatterns.error);
}

/**
 * Vibrate for notification
 */
export function vibrateNotification(): void {
  vibrate(VibrationPatterns.notification);
}

/**
 * Vibrate for warning
 */
export function vibrateWarning(): void {
  vibrate(VibrationPatterns.warning);
}

/**
 * Vibrate for long press
 */
export function vibrateLongPress(): void {
  vibrate(VibrationPatterns.longPress);
}

/**
 * Vibrate for delete action
 */
export function vibrateDelete(): void {
  vibrate(VibrationPatterns.delete);
}
