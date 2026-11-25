/**
 * List-only audit of Supabase Storage vs DB URL columns.
 * Does NOT delete anything.
 *
 *   node scripts/list-unreferenced-storage.mjs
 *
 * Writes:
 *   scripts/output/storage-audit-summary.json
 *   scripts/output/storage-unreferenced.tsv
 *
 * Requires exam-library-admin/.env (or repo .env) with
 * VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'output');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(ROOT, 'exam-library-admin', '.env'));
loadEnvFile(path.join(ROOT, '.env'));

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const authKey = KEY || ANON;

if (!URL || !authKey) {
  console.error('Missing VITE_SUPABASE_URL and a key in exam-library-admin/.env');
  process.exit(1);
}

if (!KEY) {
  console.warn('No service role key — listing may be incomplete under RLS. Prefer VITE_SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(URL, authKey, { auth: { persistSession: false, autoRefreshToken: false } });

function fmtBytes(n) {
  if (!n || n < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function decodePath(p) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function extractObjectPath(value, bucketHint) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const markers = [
    `/object/public/${bucketHint}/`,
    `/object/sign/${bucketHint}/`,
    `/object/authenticated/${bucketHint}/`,
  ];
  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      const rest = trimmed.slice(idx + marker.length).split('?')[0];
      return decodePath(rest);
    }
  }

  const generic = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (generic) {
    return { bucket: decodePath(generic[1]), path: decodePath(generic[2]) };
  }

  if (!trimmed.startsWith('http') && !trimmed.includes('://')) {
    return decodePath(trimmed.replace(/^\//, ''));
  }
  return null;
}

function addRef(map, bucket, objectPath) {
  if (!bucket || !objectPath) return;
  map.add(`${bucket}::${objectPath}`);
}

async function fetchAllRows(table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn(`Could not read ${table}: ${error.message}`);
      return rows;
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function listStorageObjectsFromTable() {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('id, name, bucket_id, metadata, created_at, updated_at')
      .range(from, from + pageSize - 1);
    if (error) {
      return { error: error.message, rows: [] };
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return { error: null, rows };
}

async function listBucketRecursive(bucket, prefix = '') {
  const out = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
  for (const item of data || []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    const isFolder = !item.id || item.metadata == null;
    if (isFolder) {
      out.push(...(await listBucketRecursive(bucket, full)));
    } else {
      out.push({
        bucket,
        path: full,
        size: Number(item.metadata?.size || 0),
        updated_at: item.updated_at || item.created_at || null,
      });
    }
  }
  return out;
}

function classify(pathName) {
  const p = pathName.toLowerCase();
  if (p.endsWith('.apk')) return 'apk';
  if (p.startsWith('app-updates/') || p.includes('/app-updates/')) return 'apk';
  if (p.startsWith('preview_') || p.includes('/preview_') || p.startsWith('previews/')) return 'preview';
  if (p.startsWith('book-covers/') || p.includes('/book-covers/')) return 'cover';
  if (p.startsWith('feed-') || p.startsWith('notification-')) return 'image';
  if (p.startsWith('books/') || p.includes('/books/')) return 'book-pdf';
  if (p.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif)$/.test(p)) return 'image';
  return 'other';
}

async function main() {
  console.log('Listing buckets…');
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) {
    console.error('listBuckets failed:', bucketErr.message);
  }
  const bucketNames = (buckets || []).map((b) => b.name);
  console.log('Buckets:', bucketNames.join(', ') || '(none visible)');

  let objects = [];
  const tableList = await listStorageObjectsFromTable();
  if (tableList.error) {
    console.warn('storage.objects query failed, falling back to recursive list:', tableList.error);
    for (const name of bucketNames.length ? bucketNames : ['exam-papers', 'app-updates', 'library-pdfs']) {
      try {
        const listed = await listBucketRecursive(name);
        objects.push(...listed);
      } catch (err) {
        console.warn(`Could not list ${name}:`, err.message);
      }
    }
  } else {
    objects = tableList.rows.map((row) => ({
      bucket: row.bucket_id,
      path: row.name,
      size: Number(row.metadata?.size || 0),
      updated_at: row.updated_at || row.created_at || null,
    }));
  }

  const referenced = new Set();
  const knownBuckets = new Set(objects.map((o) => o.bucket).concat(bucketNames));

  function ingestUrl(raw, defaultBucket) {
    const extracted = extractObjectPath(raw, defaultBucket);
    if (!extracted) return;
    if (typeof extracted === 'string') {
      addRef(referenced, defaultBucket, extracted);
    } else {
      addRef(referenced, extracted.bucket, extracted.path);
      knownBuckets.add(extracted.bucket);
    }
  }

  const papers = await fetchAllRows('exam_papers', 'id, file_url, preview_url, file_size, content_hash, title');
  const books = await fetchAllRows('library_books', 'id, file_url, cover_url, file_size, content_hash, title');
  const posts = await fetchAllRows('course_posts', 'id, image_url, image_urls');
  const notes = await fetchAllRows('admin_notifications', 'id, image_url');
  const updates = await fetchAllRows('app_updates', 'id, apk_file_path, apk_file_size, version_name, is_active');

  for (const row of papers) {
    ingestUrl(row.file_url, 'exam-papers');
    ingestUrl(row.preview_url, 'exam-papers');
  }
  for (const row of books) {
    ingestUrl(row.file_url, 'exam-papers');
    ingestUrl(row.cover_url, 'exam-papers');
  }
  for (const row of posts) {
    ingestUrl(row.image_url, 'exam-papers');
    for (const u of row.image_urls || []) ingestUrl(u, 'exam-papers');
  }
  for (const row of notes) ingestUrl(row.image_url, 'exam-papers');
  for (const row of updates) {
    ingestUrl(row.apk_file_path, 'app-updates');
  }

  const unreferenced = [];
  const byBucket = {};
  const byClass = {};

  for (const obj of objects) {
    const size = obj.size || 0;
    if (!byBucket[obj.bucket]) byBucket[obj.bucket] = { files: 0, bytes: 0 };
    byBucket[obj.bucket].files += 1;
    byBucket[obj.bucket].bytes += size;

    const kind = classify(obj.path);
    if (!byClass[kind]) byClass[kind] = { files: 0, bytes: 0 };
    byClass[kind].files += 1;
    byClass[kind].bytes += size;

    const key = `${obj.bucket}::${obj.path}`;
    const alt = `${obj.bucket}::${decodePath(obj.path)}`;
    if (!referenced.has(key) && !referenced.has(alt)) {
      unreferenced.push(obj);
    }
  }

  unreferenced.sort((a, b) => (b.size || 0) - (a.size || 0));
  const largest = [...objects].sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 25);

  const hashDupes = {};
  for (const row of papers) {
    if (!row.content_hash) continue;
    if (!hashDupes[row.content_hash]) hashDupes[row.content_hash] = [];
    hashDupes[row.content_hash].push({ table: 'exam_papers', id: row.id, title: row.title, size: row.file_size });
  }
  for (const row of books) {
    if (!row.content_hash) continue;
    if (!hashDupes[row.content_hash]) hashDupes[row.content_hash] = [];
    hashDupes[row.content_hash].push({ table: 'library_books', id: row.id, title: row.title, size: row.file_size });
  }
  const duplicateHashes = Object.entries(hashDupes)
    .filter(([, rows]) => rows.length > 1)
    .map(([hash, rows]) => ({ hash: hash.slice(0, 12), count: rows.length, bytes: rows.reduce((s, r) => s + (r.size || 0), 0), rows }));

  const unrefBytes = unreferenced.reduce((s, o) => s + (o.size || 0), 0);
  const totalBytes = objects.reduce((s, o) => s + (o.size || 0), 0);
  const previewUnref = unreferenced.filter((o) => classify(o.path) === 'preview');
  const apkUnref = unreferenced.filter((o) => classify(o.path) === 'apk' || o.path.toLowerCase().endsWith('.apk'));
  const apkAll = objects.filter((o) => o.path.toLowerCase().endsWith('.apk') || o.bucket === 'app-updates');

  const summary = {
    generatedAt: new Date().toISOString(),
    usedServiceRole: Boolean(KEY),
    buckets: bucketNames,
    totals: {
      files: objects.length,
      bytes: totalBytes,
      human: fmtBytes(totalBytes),
    },
    byBucket: Object.fromEntries(
      Object.entries(byBucket).map(([k, v]) => [k, { ...v, human: fmtBytes(v.bytes) }]),
    ),
    byClass: Object.fromEntries(
      Object.entries(byClass).map(([k, v]) => [k, { ...v, human: fmtBytes(v.bytes) }]),
    ),
    dbRows: {
      exam_papers: papers.length,
      library_books: books.length,
      course_posts: posts.length,
      admin_notifications: notes.length,
      app_updates: updates.length,
    },
    referencedKeys: referenced.size,
    unreferenced: {
      files: unreferenced.length,
      bytes: unrefBytes,
      human: fmtBytes(unrefBytes),
      previewFiles: previewUnref.length,
      previewBytes: fmtBytes(previewUnref.reduce((s, o) => s + (o.size || 0), 0)),
      apkFiles: apkUnref.length,
      apkBytes: fmtBytes(apkUnref.reduce((s, o) => s + (o.size || 0), 0)),
    },
    apkInStorage: {
      files: apkAll.length,
      bytes: fmtBytes(apkAll.reduce((s, o) => s + (o.size || 0), 0)),
      paths: apkAll.map((o) => `${o.bucket}/${o.path} (${fmtBytes(o.size)})`),
    },
    duplicateContentHashes: {
      groups: duplicateHashes.length,
      extraCopies: duplicateHashes.reduce((s, g) => s + (g.count - 1), 0),
    },
    largestFiles: largest.map((o) => ({
      bucket: o.bucket,
      path: o.path,
      size: fmtBytes(o.size),
      referenced: referenced.has(`${o.bucket}::${o.path}`),
    })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'storage-audit-summary.json'), JSON.stringify(summary, null, 2));
  const tsv = ['bucket\tpath\tsize_bytes\tsize\tclass\tupdated_at']
    .concat(
      unreferenced.map(
        (o) => `${o.bucket}\t${o.path}\t${o.size || 0}\t${fmtBytes(o.size)}\t${classify(o.path)}\t${o.updated_at || ''}`,
      ),
    )
    .join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'storage-unreferenced.tsv'), tsv);

  console.log('\n=== Storage audit (list only, nothing deleted) ===');
  console.log(`Files: ${objects.length}  Total listed size: ${fmtBytes(totalBytes)}`);
  console.log('By bucket:');
  for (const [name, v] of Object.entries(summary.byBucket)) {
    console.log(`  ${name}: ${v.files} files, ${v.human}`);
  }
  console.log('By type:');
  for (const [name, v] of Object.entries(summary.byClass)) {
    console.log(`  ${name}: ${v.files} files, ${v.human}`);
  }
  console.log(
    `Unreferenced vs DB URLs: ${unreferenced.length} files (${fmtBytes(unrefBytes)})`,
  );
  console.log(`DB rows: papers=${papers.length} books=${books.length} posts=${posts.length} notifications=${notes.length} app_updates=${updates.length}`);
  console.log(`Duplicate content_hash groups: ${duplicateHashes.length}`);
  console.log('\nLargest 15 files:');
  for (const row of summary.largestFiles.slice(0, 15)) {
    console.log(`  ${row.referenced ? 'USED ' : 'ORPH '} ${row.size.padStart(8)}  ${row.bucket}/${row.path}`);
  }
  console.log(`\nWrote ${path.join('scripts', 'output', 'storage-audit-summary.json')}`);
  console.log(`Wrote ${path.join('scripts', 'output', 'storage-unreferenced.tsv')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
