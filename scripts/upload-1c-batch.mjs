/**
 * Upload a small batch of local PDFs with explicit class tags.
 *   node scripts/upload-1c-batch.mjs --execute
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generatePdfPreviewJpeg } from './lib/pdf-preview-node.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXECUTE = process.argv.includes('--execute');

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

const BUCKET = process.env.VITE_SUPABASE_BUCKET || 'exam-papers';
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing Supabase keys in exam-library-admin/.env');
  process.exit(1);
}
const supabase = createClient(URL, KEY);

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}
function storageSlug(s) {
  return stripAccents(s).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

const BATCH = [
  {
    path: String.raw`c:\Users\Skydrake\Downloads\Super-prof-Togo-1ere-C.pdf`,
    title: 'Super-prof Togo — compilation 1ère C',
    subject: 'Mathématiques',
    classLevel: '1ère C',
    year: 2025,
    examType: 'Annales',
    session: 'Annual',
  },
  {
    path: String.raw`c:\Users\Skydrake\Downloads\Collection Hka-1ere scientique_071927 (2).pdf`,
    title: 'Collection HKA — 1ère scientifique',
    subject: 'Mathématiques',
    classLevel: '1ère C',
    year: 2024,
    examType: 'Annales',
    session: 'Annual',
  },
];

async function loadExistingHashes() {
  const { data, error } = await supabase.from('exam_papers').select('content_hash, class_level');
  if (error) throw error;
  const byClass = {};
  for (const r of data ?? []) {
    byClass[r.class_level] = (byClass[r.class_level] || 0) + 1;
  }
  return { hashes: new Set((data ?? []).map((r) => r.content_hash).filter(Boolean)), byClass };
}

async function uploadOne(item, buffer, existingHashes) {
  const hash = hashBuffer(buffer);
  if (existingHashes.has(hash)) return { status: 'skip' };
  const fileName = path.basename(item.path);
  const storagePath = [storageSlug(item.classLevel), storageSlug(item.subject), String(item.year), storageSlug(fileName)].join('/');
  if (!EXECUTE) return { status: 'dry-run', storagePath };

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (upErr) throw new Error(`Storage: ${upErr.message}`);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  let previewUrl = null;
  try {
    const jpeg = await generatePdfPreviewJpeg(buffer);
    const previewPath = `previews/preview_${hash.slice(0, 24)}.jpg`;
    const { error: prevErr } = await supabase.storage.from(BUCKET).upload(previewPath, jpeg, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (!prevErr) previewUrl = supabase.storage.from(BUCKET).getPublicUrl(previewPath).data.publicUrl;
  } catch (e) {
    console.warn('  preview skip:', e.message);
  }

  const { error: dbErr } = await supabase.from('exam_papers').insert({
    title: item.title,
    subject: item.subject,
    class_level: item.classLevel,
    year: item.year,
    exam_type: item.examType,
    session: item.session,
    system: 'apc',
    file_url: pub.publicUrl,
    file_name: fileName,
    file_size: buffer.length,
    file_size_formatted: formatBytes(buffer.length),
    content_hash: hash,
    preview_url: previewUrl,
    tags: [],
    downloads: 0,
    created_at: new Date().toISOString(),
  });
  if (dbErr) throw new Error(`DB: ${dbErr.message}`);
  existingHashes.add(hash);
  return { status: 'ok', storagePath };
}

async function main() {
  const { hashes, byClass } = await loadExistingHashes();
  console.log('Current 1ère C count:', byClass['1ère C'] || 0);
  console.log('Mode:', EXECUTE ? 'EXECUTE' : 'DRY-RUN');
  let ok = 0, skip = 0, err = 0, dry = 0;
  for (const item of BATCH) {
    if (!fs.existsSync(item.path)) {
      console.error('MISSING', item.path);
      err++;
      continue;
    }
    try {
      const buffer = fs.readFileSync(item.path);
      const res = await uploadOne(item, buffer, hashes);
      if (res.status === 'ok') {
        ok++;
        console.log('OK', item.classLevel, item.subject, item.title);
      } else if (res.status === 'skip') {
        skip++;
        console.log('DUP', item.title);
      } else {
        dry++;
        console.log('READY', item.classLevel, '|', item.examType, '|', item.title);
      }
    } catch (e) {
      err++;
      console.error('ERR', item.title, e.message);
    }
  }
  console.log({ ok, skip, dry, err });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
