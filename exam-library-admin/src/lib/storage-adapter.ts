import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase } from './supabaseClient';

class StorageAdapter {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    this.supabase = sharedSupabase;
    this.bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'exam-papers';
  }

  async uploadFile(path: string, file: File | Blob): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'application/pdf'
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', data);

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const path = this.extractPathFromUrl(fileUrl);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  private extractPathFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      // Supabase Storage URL pattern: /storage/v1/object/public/{bucket}/{path}
      const pathParts = url.pathname.split(`/storage/v1/object/public/${this.bucket}/`);
      if (pathParts.length > 1) return pathParts[1];
      // Fallback
      return url.pathname.split('/').slice(-1)[0];
    } catch {
      return fileUrl;
    }
  }
}

export const storageAdapter = new StorageAdapter();
