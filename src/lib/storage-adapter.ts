/**
 * Storage Adapter - Supabase Storage only
 * Handles PDF upload, delete, and URL generation for exam papers
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'exam-papers';

class StorageAdapter {
  /**
   * Upload file to Supabase Storage
   * Returns public URL
   */
  async uploadFile(path: string, file: File | Blob): Promise<string> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  /**
   * Get public URL for a stored file
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Extract storage path from a Supabase public URL
   */
  extractPath(publicUrl: string): string {
    try {
      const url = new URL(publicUrl);
      // Supabase public URL format:
      // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      const marker = `/object/public/${BUCKET}/`;
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) return url.pathname.slice(idx + marker.length);
      // Fallback — strip leading slash
      return url.pathname.replace(/^\//, '');
    } catch {
      return publicUrl;
    }
  }
}

export const storageAdapter = new StorageAdapter();
