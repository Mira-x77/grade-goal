import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { CommunityDevice } from '@capacitor-community/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { supabase } from '../integrations/supabase/client';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.gostudy.student';

export interface AppUpdate {
  id: number;
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  bugFixes?: string;
  newFeatures?: string;
  isMandatory: boolean;
  downloadUrl: string;
  fileSize: number;
}

export interface UpdateCheckResponse {
  hasUpdate: boolean;
  update?: AppUpdate;
}

class UpdateService {
  private readonly CURRENT_VERSION_CODE = 1; // Current app version - update needs higher number

  /**
   * Check if there's an update available
   */
  async checkForUpdates(): Promise<UpdateCheckResponse> {
    try {
      console.log('🔍 Checking for updates... Current version:', this.CURRENT_VERSION_CODE);
      
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .gt('version_code', this.CURRENT_VERSION_CODE)
        .order('version_code', { ascending: false })
        .limit(1);

      console.log('📊 Update query result:', { data, error });

      if (error) {
        console.error('❌ Failed to check for updates:', error);
        return { hasUpdate: false };
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No updates found');
        return { hasUpdate: false };
      }

      const update = data[0];
      console.log('✅ Update found:', update);
      
      // Check if current version meets minimum requirements
      if (update.min_supported_version && this.CURRENT_VERSION_CODE < update.min_supported_version) {
        console.log('⚠️ Current version too old for this update');
        return { hasUpdate: false };
      }

      // Get download URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from('app-updates')
        .getPublicUrl(update.apk_file_path);

      console.log('🔗 Download URL:', urlData.publicUrl);

      return {
        hasUpdate: true,
        update: {
          id: update.id,
          versionName: update.version_name,
          versionCode: update.version_code,
          releaseNotes: update.release_notes,
          bugFixes: update.bug_fixes,
          newFeatures: update.new_features,
          isMandatory: update.is_mandatory,
          downloadUrl: urlData.publicUrl,
          fileSize: update.apk_file_size
        }
      };
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
      return { hasUpdate: false };
    }
  }

  /**
   * Open Google Play for updates (Play policy: no sideloaded APK installs).
   */
  async openStoreUpdate(_update?: AppUpdate): Promise<boolean> {
    try {
      if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
        await Browser.open({ url: PLAY_STORE_URL });
        return true;
      }
      window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
      return true;
    } catch (error) {
      console.error('Failed to open store update page:', error);
      return false;
    }
  }

  /** @deprecated Use openStoreUpdate — kept for callers during migration */
  async downloadAndInstallUpdate(
    update: AppUpdate,
    _onProgress?: (progress: number) => void,
  ): Promise<boolean> {
    return this.openStoreUpdate(update);
  }

  /**
   * Download APK file (legacy sideload path — not used on Play builds)
   */
  private async downloadAPK(update: AppUpdate, onProgress?: (progress: number) => void): Promise<string> {
    const fileName = `app-update-v${update.versionName}.apk`;
    
    try {
      const response = await fetch(update.downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (onProgress && total > 0) {
          const percentage = Math.round((receivedLength / total) * 100);
          onProgress(percentage);
        }
      }

      // Combine chunks into single array
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      // Convert to base64 for Capacitor Filesystem
      const blob = new Blob([allChunks]);
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write to filesystem
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      return result.uri;
    } catch (error) {
      console.error('Failed to download APK:', error);
      throw error;
    }
  }

  /**
   * Install APK file
   */
  private async installAPK(filePath: string): Promise<void> {
    // Check if we have install permission
    const hasPermission = await this.checkInstallPermission();
    
    if (!hasPermission) {
      // Request install permission
      await this.requestInstallPermission();
    }

    // Use native Android intent to install APK
    await this.triggerAPKInstall(filePath);
  }

  /**
   * Check if app has install packages permission
   */
  private async checkInstallPermission(): Promise<boolean> {
    try {
      if ((window as any).AndroidInstaller) {
        const result = await (window as any).AndroidInstaller.checkInstallPermission();
        return result.canInstall;
      }
      return false;
    } catch (error) {
      console.error('Failed to check install permission:', error);
      return false;
    }
  }

  /**
   * Request install packages permission
   */
  private async requestInstallPermission(): Promise<boolean> {
    try {
      if ((window as any).AndroidInstaller) {
        const result = await (window as any).AndroidInstaller.requestInstallPermission();
        return result.granted;
      }
      return false;
    } catch (error) {
      console.error('Failed to request install permission:', error);
      return false;
    }
  }

  /**
   * Trigger APK installation using Android intent
   */
  private async triggerAPKInstall(filePath: string): Promise<void> {
    try {
      if ((window as any).AndroidInstaller) {
        await (window as any).AndroidInstaller.installAPK({ filePath });
      } else {
        throw new Error('Android installer plugin not available');
      }
    } catch (error) {
      console.error('Failed to trigger APK install:', error);
      throw error;
    }
  }

  /**
   * Get current app version info
   */
  async getCurrentVersion(): Promise<{ versionName: string; versionCode: number }> {
    if (Capacitor.getPlatform() === 'web') {
      // On web, return default version info
      return {
        versionName: '1.0.0',
        versionCode: this.CURRENT_VERSION_CODE
      };
    }
    
    try {
      const info = await CommunityDevice.getInfo();
      return {
        versionName: info.appVersion,
        versionCode: this.CURRENT_VERSION_CODE
      };
    } catch (error) {
      console.warn('Failed to get device info:', error);
      // Fallback to default values
      return {
        versionName: '1.0.0',
        versionCode: this.CURRENT_VERSION_CODE
      };
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const updateService = new UpdateService();