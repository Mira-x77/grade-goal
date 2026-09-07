// Device ID management for subscription tracking

const DEVICE_ID_KEY = 'scoretarget_device_id';

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get stored device ID from localStorage
 */
async function getStoredDeviceId(): Promise<string | null> {
  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Failed to get stored device ID:', error);
    return null;
  }
}

/**
 * Store device ID in localStorage
 */
async function storeDeviceId(deviceId: string): Promise<void> {
  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    console.error('Failed to store device ID:', error);
    throw error;
  }
}

/**
 * Get or create device ID
 * This is the main function to use
 */
export async function getDeviceId(): Promise<string> {
  // Check if exists in storage
  let deviceId = await getStoredDeviceId();
  
  if (!deviceId) {
    // Generate new UUID
    deviceId = generateUUID();
    await storeDeviceId(deviceId);
    console.log('Generated new device ID:', deviceId);
  }
  
  return deviceId;
}

/**
 * Clear device ID (for testing purposes)
 */
export async function clearDeviceId(): Promise<void> {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Failed to clear device ID:', error);
  }
}
