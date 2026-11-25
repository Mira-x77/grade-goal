/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Folder that holds the static catalogue (papers.json + books.json), used as
   * an offline fallback when Supabase cannot be reached.
   * Example: https://pub-xxxxxxxx.r2.dev/catalog
   */
  readonly VITE_CATALOG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
