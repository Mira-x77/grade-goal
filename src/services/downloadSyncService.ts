/**
 * Download Sync Service
 * Syncs user download history to Supabase so it's available across devices.
 * The actual PDF files stay on-device; only metadata is synced.
 */

import { supabase } from '@/integrations/supabase/client';
import { ExamPaper, CachedPaper } from '@/types/exam-library';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloudDownload {
  id: string;
  user_id: string;
  paper_id: string;
  paper_title: string;
  paper_subject: string;
  class_level: string;
  year: number | null;
  exam_type: string | null;
  file_size: number;
  preview_url: string | null;
  downloaded_at: string;
  deleted_at: string | null;
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Record a download ────────────────────────────────────────────────────────

export async function recordDownload(userId: string, paper: ExamPaper | CachedPaper): Promise<void> {
  try {
    const { error } = await withTimeout(
      supabase.from('user_downloads').upsert({
        user_id: userId,
        paper_id: paper.id,
        paper_title: paper.title,
        paper_subject: paper.subject,
        class_level: paper.classLevel,
        year: paper.year ?? null,
        exam_type: paper.examType ?? null,
        file_size: paper.fileSize ?? 0,
        preview_url: (paper as ExamPaper).preview_url ?? (paper as CachedPaper).preview_url ?? null,
        downloaded_at: new Date().toISOString(),
        deleted_at: null, // clear soft-delete if re-downloading
      }, {
        onConflict: 'user_id,paper_id',
        ignoreDuplicates: false,
      })
    );
    if (error) throw error;
  } catch (err) {
    // Non-blocking — don't fail the download if cloud sync fails
    console.warn('Failed to record download to cloud:', err);
  }
}

// ─── Mark a download as deleted (soft delete) ────────────────────────────────

export async function removeDownloadRecord(userId: string, paperId: string): Promise<void> {
  try {
    const { error } = await withTimeout(
      supabase
        .from('user_downloads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('paper_id', paperId)
    );
    if (error) throw error;
  } catch (err) {
    console.warn('Failed to remove download record from cloud:', err);
  }
}

// ─── Load all cloud downloads for a user ─────────────────────────────────────

export async function loadCloudDownloads(userId: string): Promise<CloudDownload[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('user_downloads')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('downloaded_at', { ascending: false })
  );

  if (error) {
    // Table may not exist yet — return empty gracefully
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []) as CloudDownload[];
}

// ─── Get cloud downloads NOT on this device ───────────────────────────────────

export async function getCloudOnlyDownloads(
  userId: string,
  localPaperIds: string[]
): Promise<CloudDownload[]> {
  try {
    const all = await loadCloudDownloads(userId);
    return all.filter(d => !localPaperIds.includes(d.paper_id));
  } catch (err) {
    console.warn('Failed to load cloud downloads:', err);
    return [];
  }
}
