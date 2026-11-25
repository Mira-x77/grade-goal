/**
 * Generate preview_url thumbnails for exam papers missing them.
 *
 *   node scripts/backfill-paper-previews.mjs              # dry-run
 *   node scripts/backfill-paper-previews.mjs --execute    # upload + update DB
 *   node scripts/backfill-paper-previews.mjs --execute --system=apc
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generatePdfPreviewJpeg } from './lib/pdf-preview-node.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

const EXECUTE = process.argv.includes('--execute');
const SYSTEM = process.argv.find((a) => a.startsWith('--system='))?.split('=')[1];
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);
const BUCKET = process.env.VITE_SUPABASE_BUCKET || 'exam-papers';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or service role key');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

async function fetchPapersNeedingPreview() {
  const pageSize = 1000;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from('exam_papers')
      .select('id, title, file_url, file_name, content_hash, preview_url, system')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (SYSTEM) query = query.eq('system', SYSTEM);

    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }

  const missing = all.filter((p) => !p.preview_url);
  return LIMIT > 0 ? missing.slice(0, LIMIT) : missing;
}

async function fetchBooksNeedingCover() {
  const { data, error } = await supabase
    .from('library_books')
    .select('id, title, file_url, content_hash, cover_url')
    .order('created_at', { ascending: false })
    .limit(10000);
  if (error) throw error;
  const missing = (data ?? []).filter((b) => !b.cover_url);
  return LIMIT > 0 ? missing.slice(0, LIMIT) : missing;
}

async function backfillOne(paper) {
  const pdfRes = await fetch(paper.file_url);
  if (!pdfRes.ok) throw new Error(`PDF fetch ${pdfRes.status}`);
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const jpeg = await generatePdfPreviewJpeg(pdfBuffer);

  const slug = (paper.content_hash || paper.id).slice(0, 24).replace(/[^a-zA-Z0-9]/g, '');
  const previewPath = `previews/preview_${slug}.jpg`;

  if (!EXECUTE) {
    return { status: 'dry-run', previewPath, title: paper.title, bytes: jpeg.length };
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(previewPath, jpeg, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) throw new Error(`Storage: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(previewPath);
  const { error: dbErr } = await supabase
    .from('exam_papers')
    .update({ preview_url: pub.publicUrl })
    .eq('id', paper.id);
  if (dbErr) throw new Error(`DB: ${dbErr.message}`);

  return { status: 'ok', previewPath, previewUrl: pub.publicUrl, title: paper.title };
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}${SYSTEM ? ` | system=${SYSTEM}` : ''}\n`);

  const papers = await fetchPapersNeedingPreview();
  console.log(`Papers missing preview_url: ${papers.length}`);
  let books = [];
  try {
    books = await fetchBooksNeedingCover();
    console.log(`Books missing cover_url: ${books.length}\n`);
  } catch (e) {
    console.warn(`Skipping book covers: ${e.message}\n`);
  }

  const stats = { ok: 0, dry: 0, err: 0 };

  for (const paper of papers) {
    try {
      const res = await backfillOne(paper);
      if (res.status === 'ok') {
        stats.ok++;
        console.log(`✅ ${paper.title}`);
      } else {
        stats.dry++;
        console.log(`📋 ${paper.title} → ${res.previewPath} (${res.bytes} bytes)`);
      }
    } catch (e) {
      stats.err++;
      console.error(`❌ ${paper.title}: ${e.message}`);
    }
  }

  for (const book of books) {
    try {
      const pdfRes = await fetch(book.file_url);
      if (!pdfRes.ok) throw new Error(`PDF fetch ${pdfRes.status}`);
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const jpeg = await generatePdfPreviewJpeg(pdfBuffer);
      const slug = (book.content_hash || book.id).slice(0, 24).replace(/[^a-zA-Z0-9]/g, '');
      const previewPath = `book-covers/preview_${slug}.jpg`;
      if (!EXECUTE) {
        stats.dry++;
        console.log(`📋 book ${book.title} → ${previewPath} (${jpeg.length} bytes)`);
        continue;
      }
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(previewPath, jpeg, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw new Error(`Storage: ${upErr.message}`);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(previewPath);
      const { error: dbErr } = await supabase
        .from('library_books')
        .update({ cover_url: pub.publicUrl })
        .eq('id', book.id);
      if (dbErr) throw new Error(`DB: ${dbErr.message}`);
      stats.ok++;
      console.log(`✅ book ${book.title}`);
    } catch (e) {
      stats.err++;
      console.error(`❌ book ${book.title}: ${e.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(
    EXECUTE
      ? `Updated: ${stats.ok} | Errors: ${stats.err}`
      : `Ready: ${stats.dry} | Errors: ${stats.err}`,
  );
  if (!EXECUTE && stats.dry > 0) {
    console.log('\nRun: node scripts/backfill-paper-previews.mjs --execute --system=apc');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
