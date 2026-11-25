/**
 * Delete unreferenced exam-papers objects, English tech library books,
 * and extra content_hash duplicate rows.
 *
 *   node scripts/delete-unreferenced-storage.mjs           # dry-run
 *   node scripts/delete-unreferenced-storage.mjs --execute
 *
 * Never prints secrets. Loads exam-library-admin/.env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'output');
const TSV_PATH = path.join(OUT_DIR, 'storage-unreferenced.tsv');
const EXECUTE = process.argv.includes('--execute');
const BUCKET = 'exam-papers';
const CHUNK = 50;

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
const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || (URL ? URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : null);
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || process.env.SUPABASE_MANAGEMENT_TOKEN;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

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

function pathFromUrl(raw, defaultBucket = BUCKET) {
  const extracted = extractObjectPath(raw, defaultBucket);
  if (!extracted) return null;
  if (typeof extracted === 'string') return { bucket: defaultBucket, path: extracted };
  return extracted;
}

function addRef(set, bucket, objectPath) {
  if (!bucket || !objectPath) return;
  set.add(`${bucket}::${objectPath}`);
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

async function loadReferencedSet() {
  const referenced = new Set();
  const papers = await fetchAllRows('exam_papers', 'id, file_url, preview_url, file_size, content_hash, title, created_at');
  const books = await fetchAllRows(
    'library_books',
    'id, title, author, subject, system, category, file_url, cover_url, file_name, file_size, content_hash, created_at',
  );
  const posts = await fetchAllRows('course_posts', 'id, image_url, image_urls');
  const notes = await fetchAllRows('admin_notifications', 'id, image_url');

  function ingest(raw, defaultBucket) {
    const extracted = pathFromUrl(raw, defaultBucket);
    if (extracted) addRef(referenced, extracted.bucket, extracted.path);
  }

  for (const row of papers) {
    ingest(row.file_url, BUCKET);
    ingest(row.preview_url, BUCKET);
  }
  for (const row of books) {
    ingest(row.file_url, BUCKET);
    ingest(row.cover_url, BUCKET);
  }
  for (const row of posts) {
    ingest(row.image_url, BUCKET);
    for (const u of row.image_urls || []) ingest(u, BUCKET);
  }
  for (const row of notes) ingest(row.image_url, BUCKET);

  return { referenced, papers, books, posts, notes };
}

function isReferenced(referenced, bucket, objectPath) {
  const key = `${bucket}::${objectPath}`;
  const alt = `${bucket}::${decodePath(objectPath)}`;
  return referenced.has(key) || referenced.has(alt);
}

function parseTsvPaths(tsv) {
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [bucket, objectPath, sizeBytes] = parts;
    if (bucket !== BUCKET) continue;
    out.push({ bucket, path: objectPath, size: Number(sizeBytes || 0) });
  }
  return out;
}

function bookSearchBlob(row) {
  return `${row.title || ''} ${row.author || ''} ${row.file_url || ''} ${row.file_name || ''} ${row.subject || ''}`.toLowerCase();
}

function looksLikeTogoSchoolBook(blob) {
  return /tehua|maths[_\s-]*1[eè]re[_\s-]*c|1ere[_\s-]*c|bepc|bac[_\s-]|apc|cepd|uemoa|togo|terminale|seconde|3eme|4eme|5eme|6eme|premiere|premi[eè]re/.test(
    blob,
  );
}

function isEnglishTechBookToRemove(row) {
  const blob = bookSearchBlob(row);
  const tech =
    /ai[_\s-]*engineering/.test(blob) ||
    /chip[_\s-]*huyen/.test(blob) ||
    /raspberry[_\s-]*pi/.test(blob) ||
    /gpt[_\s-]*3/.test(blob) ||
    /exploring[_\s-]*gpt/.test(blob) ||
    /learn[_\s-]*robotics/.test(blob) ||
    /robotics[_\s-]*at[_\s-]*home/.test(blob) ||
    /robotics[_\s-]*programming/.test(blob);
  if (!tech) return false;
  if (looksLikeTogoSchoolBook(blob) && !tech) return false;
  return true;
}

function matchesQueryPattern(row) {
  const blob = bookSearchBlob(row);
  return (
    /ai[_\s-]*engineering/.test(blob) ||
    /chip[_\s-]*huyen/.test(blob) ||
    /raspberry/.test(blob) ||
    /gpt[_\s-]*3/.test(blob) ||
    /robotics/.test(blob) ||
    /z-library|z-lib|1lib\.sk/.test(blob)
  );
}

async function objectExists(objectPath) {
  const dir = objectPath.includes('/') ? objectPath.slice(0, objectPath.lastIndexOf('/')) : '';
  const name = objectPath.includes('/') ? objectPath.slice(objectPath.lastIndexOf('/') + 1) : objectPath;
  const { data, error } = await supabase.storage.from(BUCKET).list(dir, { limit: 1000, search: name });
  if (error) return false;
  return (data || []).some((item) => item.name === name && item.id);
}

async function removePaths(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  const removed = [];
  const errors = [];
  if (!unique.length) return { removed, errors };

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    if (!EXECUTE) {
      removed.push(...chunk);
      continue;
    }
    const { data, error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) {
      errors.push({ chunk: chunk.length, message: error.message });
      console.warn(`storage.remove error (${chunk.length} paths): ${error.message}`);
    } else {
      const names = (data || []).map((d) => d.name).filter(Boolean);
      if (names.length) removed.push(...names);
      else removed.push(...chunk);
    }
  }
  return { removed, errors };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function tryManagementBackups() {
  const result = {
    accessTokenPresent: Boolean(ACCESS_TOKEN),
    projectIdPresent: Boolean(PROJECT_ID),
    attempted: false,
    deleted: [],
    notes: [],
  };
  if (!ACCESS_TOKEN) {
    result.notes.push('No SUPABASE_ACCESS_TOKEN / SUPABASE_PAT in env — cannot call Management API.');
    result.notes.push('Free-plan PITR / automatic backups usually cannot be dropped from the API.');
    return result;
  }
  if (!PROJECT_ID) {
    result.notes.push('No project id — cannot call Management API.');
    return result;
  }
  result.attempted = true;
  const headers = { Authorization: `Bearer ${ACCESS_TOKEN}`, apikey: ACCESS_TOKEN };
  const endpoints = [
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/backups`,
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/backups`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 400);
      }
      result.notes.push(`${endpoint} -> HTTP ${res.status}`);
      if (!res.ok) {
        result.notes.push(`List backups failed: ${typeof body === 'string' ? body : JSON.stringify(body).slice(0, 400)}`);
        continue;
      }
      const list = Array.isArray(body) ? body : body?.backups || body?.data || [];
      result.notes.push(`Listed ${Array.isArray(list) ? list.length : 0} backup records.`);
      if (!Array.isArray(list) || !list.length) continue;
      for (const b of list) {
        const id = b.id || b.backup_id || b.name;
        const status = b.status || b.type || '';
        result.notes.push(`Backup id=${id || '(none)'} status=${status} (not deleted — PITR/auto backups often cannot be dropped).`);
      }
    } catch (err) {
      result.notes.push(`Management API error: ${err.message}`);
    }
  }
  result.notes.push('Did not DELETE backups: Management API typically cannot drop Free PITR / automatic backups.');
  return result;
}

async function main() {
  console.log(EXECUTE ? 'EXECUTE mode — deletions will run' : 'DRY RUN — no deletions');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(TSV_PATH)) {
    console.error('Missing scripts/output/storage-unreferenced.tsv — run list-unreferenced-storage.mjs first');
    process.exit(1);
  }

  const tsvCandidates = parseTsvPaths(fs.readFileSync(TSV_PATH, 'utf8'));
  console.log(`TSV unreferenced candidates: ${tsvCandidates.length}`);

  let { referenced, papers, books } = await loadReferencedSet();
  console.log(`DB: exam_papers=${papers.length} library_books=${books.length} referencedKeys=${referenced.size}`);

  const queried = books.filter(matchesQueryPattern);
  console.log(`\nQuery matches (AI Engineering / Raspberry / GPT-3 / robotics / z-library / Chip Huyen): ${queried.length}`);
  for (const b of queried) {
    const mark = isEnglishTechBookToRemove(b) ? 'DELETE' : 'KEEP ';
    console.log(`  ${mark}  ${fmtBytes(b.file_size).padStart(8)}  ${b.title}  [${b.id}]`);
  }

  const report = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    startedAt: new Date().toISOString(),
    unreferenced: { planned: [], skippedReferenced: [], deleted: [], bytes: 0 },
    englishBooks: { planned: [], deletedRows: [], deletedPaths: [], bytes: 0 },
    hashDupes: { groups: 0, deletedRows: [], deletedPaths: [], kept: [] },
    backups: null,
    errors: [],
  };

  // --- 1) Unreferenced TSV (re-check immediately before delete)
  ({ referenced } = await loadReferencedSet());
  const unrefToDelete = [];
  for (const obj of tsvCandidates) {
    if (isReferenced(referenced, obj.bucket, obj.path)) {
      report.unreferenced.skippedReferenced.push(obj.path);
      continue;
    }
    unrefToDelete.push(obj);
  }
  report.unreferenced.planned = unrefToDelete.map((o) => ({ path: o.path, size: o.size }));
  report.unreferenced.bytes = unrefToDelete.reduce((s, o) => s + (o.size || 0), 0);
  console.log(
    `\nUnreferenced to delete: ${unrefToDelete.length} files (${fmtBytes(report.unreferenced.bytes)}); skipped still-referenced: ${report.unreferenced.skippedReferenced.length}`,
  );

  const unrefResult = await removePaths(unrefToDelete.map((o) => o.path));
  report.unreferenced.deleted = unrefResult.removed;
  report.errors.push(...unrefResult.errors);
  console.log(`Unreferenced storage.remove: ${unrefResult.removed.length} paths`);

  // --- 2) English tech library books (rows + files + covers)
  const english = books.filter(isEnglishTechBookToRemove);
  report.englishBooks.planned = english.map((b) => ({
    id: b.id,
    title: b.title,
    size: b.file_size,
    file_url: b.file_url,
    cover_url: b.cover_url,
  }));
  console.log(`\nEnglish tech books to remove from library: ${english.length}`);

  const englishPaths = [];
  for (const b of english) {
    const file = pathFromUrl(b.file_url);
    const cover = pathFromUrl(b.cover_url);
    if (file?.bucket === BUCKET) englishPaths.push(file.path);
    if (cover?.bucket === BUCKET) englishPaths.push(cover.path);
    if (EXECUTE) {
      const { error } = await supabase.from('library_books').delete().eq('id', b.id);
      if (error) {
        report.errors.push({ book: b.id, message: error.message });
        console.warn(`Failed to delete library_books ${b.id}: ${error.message}`);
      } else {
        report.englishBooks.deletedRows.push({ id: b.id, title: b.title });
      }
    } else {
      report.englishBooks.deletedRows.push({ id: b.id, title: b.title });
    }
  }
  report.englishBooks.bytes = english.reduce((s, b) => s + (b.file_size || 0), 0);
  const engRm = await removePaths(englishPaths);
  report.englishBooks.deletedPaths = engRm.removed;
  report.errors.push(...engRm.errors);

  // --- 3) Duplicate content_hash extra copies
  ({ referenced, papers, books } = await loadReferencedSet());
  function normTitle(t) {
    return String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  const hashGroups = {};
  for (const row of papers) {
    if (!row.content_hash || String(row.content_hash).length < 12) continue;
    (hashGroups[row.content_hash] ||= []).push({ table: 'exam_papers', ...row });
  }
  for (const row of books) {
    if (!row.content_hash || String(row.content_hash).length < 12) continue;
    (hashGroups[row.content_hash] ||= []).push({ table: 'library_books', ...row });
  }
  const dupes = Object.entries(hashGroups).filter(([, rows]) => rows.length > 1);
  report.hashDupes.groups = dupes.length;
  report.hashDupes.skippedDifferentPapers = [];
  console.log(`\nDuplicate content_hash groups: ${dupes.length}`);

  const extraFilePaths = [];
  for (const [, rows] of dupes) {
    const byTable = {};
    for (const row of rows) (byTable[row.table] ||= []).push(row);
    for (const tableRows of Object.values(byTable)) {
      if (tableRows.length < 2) continue;
      const scored = [];
      for (const row of tableRows) {
        const file = pathFromUrl(row.file_url);
        const exists = file ? await objectExists(file.path) : false;
        scored.push({ row, file, exists });
      }
      scored.sort((a, b) => {
        if (a.exists !== b.exists) return a.exists ? -1 : 1;
        const ta = a.row.created_at || '';
        const tb = b.row.created_at || '';
        return ta.localeCompare(tb);
      });
      const keep = scored[0];
      const extras = scored.slice(1).filter((extra) => {
        const sameFile = extra.file?.path && keep.file?.path && extra.file.path === keep.file.path;
        const sameTitle = normTitle(extra.row.title) === normTitle(keep.row.title);
        if (sameFile || sameTitle) return true;
        report.hashDupes.skippedDifferentPapers.push({
          hash: extra.row.content_hash?.slice(0, 16),
          keep: keep.row.title,
          skip: extra.row.title,
        });
        console.log(`  SKIP hash pair with different titles/files: "${keep.row.title}" vs "${extra.row.title}"`);
        return false;
      });
      if (!extras.length) continue;
      report.hashDupes.kept.push({
        table: keep.row.table,
        id: keep.row.id,
        title: keep.row.title,
        exists: keep.exists,
      });
      for (const extra of extras) {
        if (EXECUTE) {
          const { error } = await supabase.from(extra.row.table).delete().eq('id', extra.row.id);
          if (error) {
            report.errors.push({ table: extra.row.table, id: extra.row.id, message: error.message });
            console.warn(`Failed to delete ${extra.row.table} ${extra.row.id}: ${error.message}`);
            continue;
          }
        }
        report.hashDupes.deletedRows.push({
          table: extra.row.table,
          id: extra.row.id,
          title: extra.row.title,
        });
        if (extra.file?.path && extra.file.path !== keep.file?.path) {
          extraFilePaths.push(extra.file.path);
          const preview = pathFromUrl(extra.row.preview_url);
          const cover = pathFromUrl(extra.row.cover_url);
          if (preview?.path && preview.path !== keep.file?.path) extraFilePaths.push(preview.path);
          if (cover?.path) extraFilePaths.push(cover.path);
        }
      }
    }
  }

  ({ referenced } = await loadReferencedSet());
  const extraSafe = extraFilePaths.filter((p) => !isReferenced(referenced, BUCKET, p));
  const extraSkipped = extraFilePaths.filter((p) => isReferenced(referenced, BUCKET, p));
  if (extraSkipped.length) {
    console.log(`Duplicate extra files still referenced (kept): ${extraSkipped.length}`);
  }
  const dupeRm = await removePaths(extraSafe);
  report.hashDupes.deletedPaths = dupeRm.removed;
  report.errors.push(...dupeRm.errors);
  console.log(`Duplicate extra rows: ${report.hashDupes.deletedRows.length}; extra files: ${dupeRm.removed.length}`);

  report.backups = await tryManagementBackups();
  console.log('\nBackups:');
  for (const n of report.backups.notes) console.log(`  ${n}`);

  report.finishedAt = new Date().toISOString();
  const reportPath = path.join(OUT_DIR, 'storage-delete-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${path.join('scripts', 'output', 'storage-delete-report.json')}`);
  console.log(
    `Summary: unref files=${report.unreferenced.deleted.length} (${fmtBytes(report.unreferenced.bytes)}), english books=${report.englishBooks.deletedRows.length}, hash extra rows=${report.hashDupes.deletedRows.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
