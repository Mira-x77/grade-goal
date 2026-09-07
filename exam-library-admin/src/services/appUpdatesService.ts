import { supabase } from '../lib/supabaseClient';

export interface AppUpdate {
  id: number;
  version_name: string;
  version_code: number;
  apk_file_path: string;
  apk_file_size: number;
  release_notes: string;
  bug_fixes?: string;
  new_features?: string;
  is_mandatory: boolean;
  min_supported_version?: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface NewAppUpdate {
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  bugFixes?: string;
  newFeatures?: string;
  isMandatory: boolean;
  minSupportedVersion?: number;
  apkFile: File;
}

class AppUpdatesService {
  /**
   * Get all app updates
   */
  async getAllUpdates(): Promise<AppUpdate[]> {
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .order('version_code', { ascending: false });

    if (error) {
      console.error('Failed to fetch app updates:', error);
      throw new Error(`Failed to fetch updates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check for updates (mobile app endpoint)
   */
  async checkForUpdates(currentVersionCode: number): Promise<{
    hasUpdate: boolean;
    update?: AppUpdate;
  }> {
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .eq('is_active', true)
      .gt('version_code', currentVersionCode)
      .order('version_code', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to check for updates:', error);
      throw new Error(`Failed to check for updates: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return { hasUpdate: false };
    }

    const update = data[0];
    
    // Check if current version meets minimum requirements
    if (update.min_supported_version && currentVersionCode < update.min_supported_version) {
      return { hasUpdate: false };
    }

    return {
      hasUpdate: true,
      update
    };
  }

  /**
   * Upload new app update
   */
  async uploadUpdate(updateData: NewAppUpdate): Promise<string> {
    try {
      // Check if version code already exists
      const { data: existing } = await supabase
        .from('app_updates')
        .select('id')
        .eq('version_code', updateData.versionCode)
        .single();

      if (existing) {
        throw new Error('Version code already exists');
      }

      // Upload APK file to Supabase Storage
      const fileName = `app-v${updateData.versionName}-${Date.now()}.apk`;
      const filePath = `app-updates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-updates')
        .upload(filePath, updateData.apkFile);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Insert update record
      const { data, error: insertError } = await supabase
        .from('app_updates')
        .insert({
          version_name: updateData.versionName,
          version_code: updateData.versionCode,
          apk_file_path: filePath,
          apk_file_size: updateData.apkFile.size,
          release_notes: updateData.releaseNotes,
          bug_fixes: updateData.bugFixes || null,
          new_features: updateData.newFeatures || null,
          is_mandatory: updateData.isMandatory,
          min_supported_version: updateData.minSupportedVersion || null,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('app-updates')
          .remove([filePath]);
        
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Failed to upload update:', error);
      throw error;
    }
  }

  /**
   * Toggle update active status
   */
  async toggleUpdateStatus(updateId: number): Promise<void> {
    // First get the current status
    const { data: currentUpdate, error: fetchError } = await supabase
      .from('app_updates')
      .select('is_active')
      .eq('id', updateId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch current status: ${fetchError.message}`);
    }

    // Toggle the status
    const { error } = await supabase
      .from('app_updates')
      .update({ 
        is_active: !currentUpdate.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', updateId);

    if (error) {
      throw new Error(`Failed to toggle update status: ${error.message}`);
    }
  }

  /**
   * Delete app update
   */
  async deleteUpdate(updateId: number): Promise<void> {
    try {
      // Get update details first
      const { data: update, error: fetchError } = await supabase
        .from('app_updates')
        .select('apk_file_path')
        .eq('id', updateId)
        .single();

      if (fetchError || !update) {
        throw new Error('Update not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('app-updates')
        .remove([update.apk_file_path]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('app_updates')
        .delete()
        .eq('id', updateId);

      if (deleteError) {
        throw new Error(`Failed to delete update: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Failed to delete update:', error);
      throw error;
    }
  }

  /**
   * Get download URL for APK
   */
  async getDownloadUrl(updateId: number): Promise<string> {
    const { data: update, error } = await supabase
      .from('app_updates')
      .select('apk_file_path')
      .eq('id', updateId)
      .eq('is_active', true)
      .single();

    if (error || !update) {
      throw new Error('Update not found or inactive');
    }

    const { data } = supabase.storage
      .from('app-updates')
      .getPublicUrl(update.apk_file_path);

    return data.publicUrl;
  }

  /**
   * Get update statistics
   */
  async getUpdateStats(): Promise<{
    totalUpdates: number;
    activeUpdates: number;
    mandatoryUpdates: number;
    latestVersion?: string;
  }> {
    const { data, error } = await supabase
      .from('app_updates')
      .select('version_name, is_active, is_mandatory')
      .order('version_code', { ascending: false });

    if (error) {
      console.error('Failed to fetch update stats:', error);
      return {
        totalUpdates: 0,
        activeUpdates: 0,
        mandatoryUpdates: 0
      };
    }

    const totalUpdates = data.length;
    const activeUpdates = data.filter(u => u.is_active).length;
    const mandatoryUpdates = data.filter(u => u.is_mandatory && u.is_active).length;
    const latestVersion = data.length > 0 ? data[0].version_name : undefined;

    return {
      totalUpdates,
      activeUpdates,
      mandatoryUpdates,
      latestVersion
    };
  }
}

export const appUpdatesService = new AppUpdatesService();