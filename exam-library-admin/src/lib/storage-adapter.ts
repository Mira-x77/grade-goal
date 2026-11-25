import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase } from './supabaseClient';
import {
  isR2Configured,
  r2Delete,
  r2Exists,
  r2Upload,
  r2KeyFromUrl,
  r2PublicUrl,
} from './r2Client';
import { getPreferredStorageTarget, type StorageProvider } from './storage-target';

export type { StorageProvider };

export interface UploadOptions {
  contentType?: string;
  onProgress?: (percent: number) => void;
  /** Explicit destination. Falls back to the operator's saved choice. */
  provider?: StorageProvider;
}

/**
 * Single entry point for file storage, with two interchangeable destinations:
 *
 * - `r2`       Cloudflare R2 (default, what the app serves)
 * - `supabase` the original Supabase Storage bucket
 *
 * Object keys are identical in both providers (same relative path), so a
 * document can be moved between them with a plain domain swap and the database
 * URL stays meaningful.
 */
class StorageAdapter {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    this.supabase = sharedSupabase;
    this.bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'exam-papers';
  }

  /** Destinations the operator can pick from right now. */
  get availableProviders(): StorageProvider[] {
    return isR2Configured() ? ['r2', 'supabase'] : ['supabase'];
  }

  /** The destination that will be used when none is passed explicitly. */
  get provider(): StorageProvider {
    const preferred = getPreferredStorageTarget();
    return preferred === 'r2' && isR2Configured() ? 'r2' : 'supabase';
  }

  get providerLabel(): string {
    return this.provider === 'r2' ? 'Cloudflare R2' : 'Supabase Storage';
  }

  resolveProvider(requested?: StorageProvider): StorageProvider {
    if (requested === 'r2') {
      if (!isR2Configured()) {
        throw new Error(
          'Cloudflare R2 is not configured. Add the VITE_R2_* variables to exam-library-admin/.env.',
        );
      }
      return 'r2';
    }
    if (requested === 'supabase') return 'supabase';
    return this.provider;
  }

  async uploadFile(
    path: string,
    file: File | Blob,
    options: UploadOptions = {},
  ): Promise<string> {
    const provider = this.resolveProvider(options.provider);

    if (provider === 'r2') {
      console.log(`📤 Uploading to R2: ${path}`);
      const url = await r2Upload(path, file, {
        contentType: options.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        onProgress: options.onProgress,
      });
      console.log('✅ R2 upload successful:', url);
      return url;
    }

    console.log(`📤 Uploading to Supabase Storage: ${path}`);
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: options.contentType || file.type || 'application/pdf',
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Supabase upload successful:', data);

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  /**
   * Delete the stored object behind a database URL.
   *
   * Safety rule: a Supabase object is only removed when the *same* path already
   * exists on R2. Otherwise R2 would be its only copy and deleting here would
   * lose the file.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    const r2Key = r2KeyFromUrl(fileUrl);

    if (r2Key) {
      if (!isR2Configured()) {
        throw new Error(
          'This file lives on R2 but the R2 credentials are missing from .env, so it cannot be deleted.',
        );
      }
      await r2Delete(r2Key);
      return;
    }

    const supabasePath = this.extractSupabasePath(fileUrl);
    if (!supabasePath) {
      console.warn('⚠️ Unrecognised storage URL, nothing deleted:', fileUrl);
      return;
    }

    if (isR2Configured()) {
      const mirrored = await r2Exists(supabasePath).catch(() => false);
      if (!mirrored) {
        console.warn(
          '⚠️ Skipped Supabase delete — this path has no copy on R2 yet:',
          supabasePath,
        );
        return;
      }
    }

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([supabasePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /** Public URL for a key on a given provider (defaults to the saved choice). */
  publicUrl(path: string, provider: StorageProvider = this.provider): string {
    if (provider === 'r2') return r2PublicUrl(path);
    return this.supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }

  private extractSupabasePath(fileUrl: string): string | null {
    try {
      const url = new URL(fileUrl);
      const marker = `/storage/v1/object/public/${this.bucket}/`;
      const index = url.pathname.indexOf(marker);
      if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length));
      return null;
    } catch {
      return null;
    }
  }
}

export const storageAdapter = new StorageAdapter();
