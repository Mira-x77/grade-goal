import type { AcademicSystem, ClassLevel, ExamPaper, ExamType, Session } from '../types';

/**
 * Reads the catalogue published next to the PDFs on R2:
 *
 *   <public base>/catalog/papers.json   (319 papers)
 *   <public base>/catalog/books.json    (355 books)
 *
 * Those two files are the same rows the app serves, so the admin can show real
 * counts, previews and links even when the Supabase project is restricted
 * (HTTP 402) and cannot answer `select * from exam_papers`.
 */

export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  subjects?: string[];
  category: string;
  system: string;
  classLevel: string | null;
  classLevels?: string[] | null;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  contentHash: string;
  tags: string[];
  downloads: number;
  publishedYear: number | null;
  createdAt: string;
}

export interface CatalogueData {
  papers: ExamPaper[];
  books: LibraryBook[];
  generatedAt: string | null;
}

/** Mirror of `course_posts`, published as `catalog/feed.json`. */
export interface CatalogueFeedPost {
  id: string;
  title: string;
  description: string;
  instructor: string | null;
  price: string | null;
  duration: string | null;
  level: string;
  category: string;
  image_url: string | null;
  image_urls?: string[] | null;
  post_type?: 'course' | 'news' | null;
  link_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface RawPaper {
  id: string;
  title: string;
  subject: string;
  subjects?: string[];
  class_level: string;
  class_levels?: string[];
  year: number;
  exam_type: string;
  session: string;
  system?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  content_hash: string;
  preview_url?: string | null;
  tags?: string[];
  description?: string;
  downloads?: number;
  created_at: string;
}

interface RawBook {
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
  content_hash?: string;
  tags?: string[];
  downloads?: number;
  published_year?: number | null;
  created_at: string;
}

const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');

/**
 * `VITE_CATALOG_URL` wins when set; otherwise the catalogue is derived from the
 * R2 public base (`<base>/catalog`), which is where scripts/r2 uploads it.
 */
export const catalogueBase = (
  (import.meta.env.VITE_CATALOG_URL as string | undefined) ||
  (publicBase ? `${publicBase}/catalog` : '')
).replace(/\/+$/, '');

export const catalogueConfigured = /^https?:\/\//i.test(catalogueBase);

let cache: Promise<CatalogueData> | null = null;
let feedCache: Promise<CatalogueFeedPost[]> | null = null;

async function fetchJson<T>(name: string): Promise<T | null> {
  if (!catalogueConfigured) return null;
  try {
    const res = await fetch(`${catalogueBase}/${name}`, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`R2 catalogue ${name} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`R2 catalogue ${name} unavailable:`, error);
    return null;
  }
}

function mapPaper(row: RawPaper): ExamPaper {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    // The catalogue is the source of truth; its strings are wider than the
    // admin form unions (e.g. class "All", type "Revision"), so keep them.
    classLevel: row.class_level as ClassLevel,
    year: row.year,
    examType: row.exam_type as ExamType,
    session: row.session as Session,
    system: (row.system || 'apc') as AcademicSystem,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileSizeFormatted: row.file_size_formatted,
    contentHash: row.content_hash,
    uploadDate: row.created_at,
    downloads: row.downloads ?? 0,
    tags: row.tags ?? [],
    description: row.description,
    previewUrl: row.preview_url ?? undefined,
    classLevels: row.class_levels,
    subjects: row.subjects,
  };
}

function mapBook(row: RawBook): LibraryBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    subject: row.subject,
    subjects: row.subjects,
    category: row.category,
    system: row.system,
    classLevel: row.class_level,
    classLevels: row.class_levels,
    description: row.description,
    coverUrl: row.cover_url,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileSizeFormatted: row.file_size_formatted,
    contentHash: row.content_hash ?? '',
    tags: row.tags ?? [],
    downloads: row.downloads ?? 0,
    publishedYear: row.published_year ?? null,
    createdAt: row.created_at,
  };
}

async function loadCatalogue(): Promise<CatalogueData> {
  if (!catalogueConfigured) {
    return { papers: [], books: [], generatedAt: null };
  }

  const [papersJson, booksJson] = await Promise.all([
    fetchJson<{ generated_at?: string; papers?: RawPaper[] }>('papers.json'),
    fetchJson<{ generated_at?: string; books?: RawBook[] }>('books.json'),
  ]);

  return {
    papers: (papersJson?.papers ?? []).map(mapPaper),
    books: (booksJson?.books ?? []).map(mapBook),
    generatedAt: papersJson?.generated_at ?? booksJson?.generated_at ?? null,
  };
}

/** Cached catalogue read (one network round per session). */
export function fetchCatalogue(): Promise<CatalogueData> {
  if (!cache) cache = loadCatalogue().catch(() => ({ papers: [], books: [], generatedAt: null }));
  return cache;
}

export async function fetchCataloguePapers(): Promise<ExamPaper[]> {
  return (await fetchCatalogue()).papers;
}

export async function fetchCatalogueBooks(): Promise<LibraryBook[]> {
  return (await fetchCatalogue()).books;
}

/**
 * Actus/feed rows published next to the papers and books. Used when
 * `course_posts` cannot be read because the Supabase project is restricted.
 */
export function fetchCatalogueFeed(): Promise<CatalogueFeedPost[]> {
  if (!feedCache) {
    feedCache = fetchJson<{ posts?: CatalogueFeedPost[] }>('feed.json')
      .then((data) => (data?.posts ?? []).filter((post) => Boolean(post?.title)))
      .catch(() => []);
  }
  return feedCache;
}

export async function fetchCatalogueSummary(): Promise<{
  papers: number;
  books: number;
  files: number;
  totalBytes: number;
  generatedAt: string | null;
}> {
  const { papers, books, generatedAt } = await fetchCatalogue();
  const totalBytes =
    papers.reduce((sum, p) => sum + (p.fileSize || 0), 0) +
    books.reduce((sum, b) => sum + (b.fileSize || 0), 0);
  return {
    papers: papers.length,
    books: books.length,
    files: papers.length + books.length,
    totalBytes,
    generatedAt,
  };
}

export function resetCatalogueCache(): void {
  cache = null;
  feedCache = null;
}
