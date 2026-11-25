/**
 * Static catalogue fallback.
 *
 * The app normally reads papers and books from Supabase. When the project is
 * unreachable (network problems, or the storage quota restriction returning
 * HTTP 402 for every request) this module lets the app keep working from a
 * catalogue published next to the PDFs, with no database involved.
 *
 * Enable it by setting VITE_CATALOG_URL to the folder that contains
 * papers.json and books.json, e.g.
 *
 *   VITE_CATALOG_URL=https://pub-xxxxxxxx.r2.dev/catalog
 *
 * When the variable is unset this module is inert and the app behaves exactly
 * as before.
 */

/** Mirror of the exam_papers table columns used by the app. */
export interface SupabasePaperRow {
  id: string;
  title: string;
  subject: string;
  /** Optional multi-value companions of the scalar fields above. */
  subjects?: string[];
  class_level: string;
  class_levels?: string[];
  year: number;
  exam_type: string;
  session: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  content_hash: string;
  tags: string[];
  description?: string;
  preview_url?: string | null;
  downloads: number;
  created_at: string;
  system?: string;
}

import type { FeedPost } from "@/lib/feed-posts";

/** Mirror of the library_books table columns used by the app. */
export interface SupabaseBookRow {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  subjects?: string[];
  category: string;
  system: string;
  class_level: string | null;
  class_levels?: string[] | null;
  description: string | null;
  cover_url: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  tags: string[];
  downloads: number;
  published_year: number | null;
  created_at: string;
}

const BASE = (import.meta.env.VITE_CATALOG_URL || '').replace(/\/+$/, '');

export const staticCatalogEnabled = BASE.length > 0;

let papersPromise: Promise<SupabasePaperRow[]> | null = null;
let booksPromise: Promise<SupabaseBookRow[]> | null = null;
let feedPromise: Promise<FeedPost[]> | null = null;

async function fetchJson<T>(name: string): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/${name}`, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`Static catalogue ${name} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`Static catalogue ${name} unavailable:`, error);
    return null;
  }
}

/** Raw paper rows, same snake_case shape as the Supabase table. */
export function fetchStaticPaperRows(): Promise<SupabasePaperRow[]> {
  if (!papersPromise) {
    papersPromise = fetchJson<{ papers?: SupabasePaperRow[] }>('papers.json')
      .then((data) => data?.papers ?? [])
      .catch(() => []);
  }
  return papersPromise;
}

/** Raw book rows, same snake_case shape as the Supabase table. */
export function fetchStaticBookRows(): Promise<SupabaseBookRow[]> {
  if (!booksPromise) {
    booksPromise = fetchJson<{ books?: SupabaseBookRow[] }>('books.json')
      .then((data) => data?.books ?? [])
      .catch(() => []);
  }
  return booksPromise;
}

/**
 * Feed/Actus posts, same shape as `course_posts`.
 *
 * The news feed used to be database-only, so the Actus tab fell back to three
 * English sample courses whenever Supabase returned 402. `catalog/feed.json`
 * carries the same rows next to the PDFs and is used in that case.
 */
export function fetchStaticFeedPosts(): Promise<FeedPost[]> {
  if (!feedPromise) {
    feedPromise = fetchJson<{ posts?: FeedPost[] }>('feed.json')
      .then((data) => (data?.posts ?? []).filter((post) => Boolean(post?.title)))
      .catch(() => []);
  }
  return feedPromise;
}

/** Forget the in-memory copy, e.g. after a foreground refresh. */
export function resetStaticCatalog(): void {
  papersPromise = null;
  booksPromise = null;
  feedPromise = null;
}
