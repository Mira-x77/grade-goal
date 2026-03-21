/**
 * Storage Adapter - Abstraction layer for file storage
 * Supports Firebase Storage, Cloudflare R2, and Supabase Storage
 */

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type StorageProvider = 'firebase' | 'r2' | 'supabase';

interface StorageConfig {
  provider: StorageProvider;
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
  };
  supabase?: {
    url: string;
    anonKey: string;
    bucket: string;
  };
}

class StorageAdapter {
  private config: StorageConfig;
  private supabaseClient?: SupabaseClient;

  constructor() {
    // Determine provider from environment
    const provider = (import.meta.env.VITE_STORAGE_PROVIDER || 'firebase') as StorageProvider;
    
    this.config = {
      provider,
      r2: provider === 'r2' ? {
        accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
        accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
        bucketName: import.meta.env.VITE_R2_BUCKET_NAME || '',
        publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || ''
      } : undefined,
      supabase: provider === 'supabase' ? {
        url: import.meta.env.VITE_SUPABASE_URL || '',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        bucket: import.meta.env.VITE_SUPABASE_BUCKET || 'exam-papers'
      } : undefined
    };

    // Initialize Supabase client if using Supabase
    if (provider === 'supabase' && this.config.supabase) {
      this.supabaseClient = createClient(
        this.config.supabase.url,
        this.config.supabase.anonKey
      );
    }
  }

  /**
   * Upload file to storage
   */
  async uploadFile(path: string, file: File | Blob): Promise<string> {
    if (this.config.provider === 'firebase') {
      return this.uploadToFirebase(path, file);
    } else if (this.config.provider === 'supabase') {
      return this.uploadToSupabase(path, file);
    } else {
      return this.uploadToR2(path, file);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(path: string): Promise<void> {
    if (this.config.provider === 'firebase') {
      return this.deleteFromFirebase(path);
    } else if (this.config.provider === 'supabase') {
      return this.deleteFromSupabase(path);
    } else {
      return this.deleteFromR2(path);
    }
  }

  /**
   * Get download URL for file
   */
  async getDownloadURL(path: string): Promise<string> {
    if (this.config.provider === 'firebase') {
      return this.getFirebaseURL(path);
    } else if (this.config.provider === 'supabase') {
      return this.getSupabaseURL(path);
    } else {
      return this.getR2URL(path);
    }
  }

  // Firebase Storage implementation
  private async uploadToFirebase(path: string, file: File | Blob): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  private async deleteFromFirebase(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  private async getFirebaseURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }

  // Cloudflare R2 implementation
  private async uploadToR2(path: string, file: File | Blob): Promise<string> {
    if (!this.config.r2) {
      throw new Error('R2 configuration not found');
    }

    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = this.config.r2;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Create AWS Signature V4 for R2
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${path}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Authorization': await this.generateR2Auth(path, 'PUT', accessKeyId, secretAccessKey)
      },
      body: arrayBuffer
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.statusText}`);
    }

    // Return public URL
    return `${publicUrl}/${path}`;
  }

  private async deleteFromR2(path: string): Promise<void> {
    if (!this.config.r2) {
      throw new Error('R2 configuration not found');
    }

    const { accountId, accessKeyId, secretAccessKey, bucketName } = this.config.r2;
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': await this.generateR2Auth(path, 'DELETE', accessKeyId, secretAccessKey)
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`R2 delete failed: ${response.statusText}`);
    }
  }

  private async getR2URL(path: string): Promise<string> {
    if (!this.config.r2) {
      throw new Error('R2 configuration not found');
    }

    return `${this.config.r2.publicUrl}/${path}`;
  }

  // Supabase Storage implementation
  private async uploadToSupabase(path: string, file: File | Blob): Promise<string> {
    if (!this.supabaseClient || !this.config.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabaseClient.storage
      .from(this.config.supabase.bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabaseClient.storage
      .from(this.config.supabase.bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  private async deleteFromSupabase(path: string): Promise<void> {
    if (!this.supabaseClient || !this.config.supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await this.supabaseClient.storage
      .from(this.config.supabase.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  private async getSupabaseURL(path: string): Promise<string> {
    if (!this.supabaseClient || !this.config.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data } = this.supabaseClient.storage
      .from(this.config.supabase.bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Generate AWS Signature V4 for R2 authentication
   * Simplified version - for production, use aws4fetch or similar library
   */
  private async generateR2Auth(
    path: string,
    method: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<string> {
    // For simplicity, using basic auth
    // In production, implement full AWS Signature V4
    const credentials = btoa(`${accessKeyId}:${secretAccessKey}`);
    return `Basic ${credentials}`;
  }

  /**
   * Get current storage provider
   */
  getProvider(): StorageProvider {
    return this.config.provider;
  }
}

// Export singleton instance
export const storageAdapter = new StorageAdapter();
