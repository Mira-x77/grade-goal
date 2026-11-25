/**
 * Upload PDFs from GoStudy_Organized_Exams → Supabase (exam-papers bucket + exam_papers table)
 *
 * Usage:
 *   node scripts/upload-gostudy-organized.mjs              # dry-run (default)
 *   node scripts/upload-gostudy-organized.mjs --execute    # upload for real
 *
 * Requires exam-library-admin/.env with VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generatePdfPreviewJpeg } from './lib/pdf-preview-node.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = 'C:\\Users\\Skydrake\\Desktop\\GoStudy_Organized_Exams';

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
const SOURCE = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1] ?? DEFAULT_SOURCE;
const BUCKET = process.env.VITE_SUPABASE_BUCKET || 'exam-papers';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or service role key in exam-library-admin/.env');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

const VALID_CLASS = new Set([
  '6ème', '5ème', '4ème', '3ème',
  '2nde', '2nde A4', '2nde CD', '2nde E', '2nde F', '2nde G',
  '1ère', '1ère A4', '1ère C', '1ère D', '1ère E', '1ère F', '1ère G',
  'Tle', 'Tle A4', 'Tle C', 'Tle D', 'Tle E', 'Tle F', 'Tle G',
]);

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Supabase storage keys must be ASCII-safe */
function storageSlug(s) {
  return stripAccents(s)
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeToken(s) {
  return stripAccents(s).toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}

/** Infer class from filename when folder is Non_spécifié / unknown */
function inferClassFromFilename(fileName) {
  const n = normalizeToken(fileName);
  let base = null;
  if (n.includes('2nde') || n.includes('2 nde')) base = '2nde';
  else if (n.includes('1ere') || n.includes('premiere')) base = '1ère';
  else if (n.includes('term') || n.includes('tle')) base = 'Tle';
  else if (n.includes('3eme')) base = '3ème';
  if (!base) return null;

  if (/\b2nde cd\b|2ndecd/.test(n)) return '2nde CD';
  if (/\b1ere g\b|1ereg|premieres g/.test(n)) return '1ère G';
  if (/\ba4\b/.test(n)) return `${base} A4`;
  if (/\bcd\b/.test(n)) return `${base} CD`;
  if (/\bg\b/.test(n) && !n.includes('geo')) return `${base} G`;
  return base;
}

/** Map messy AI folder names → app class_level */
function normalizeClassFolder(folderName, fileName = '') {
  const raw = folderName.trim();
  const n = normalizeToken(raw);

  if (!n) return null;

  if (n.includes('non specif') || n.includes('examen blanc n')) {
    return inferClassFromFilename(fileName);
  }

  if (/^6/.test(n) || n.includes('sixieme')) return '6ème';
  if (/^5/.test(n) || n.includes('cinquieme')) return '5ème';
  if (/^4/.test(n) || n.includes('quatrieme')) return '4ème';
  if (/^3/.test(n) || n.includes('troisieme') || n === '3eme') return '3ème';

  let base = null;
  if (n.includes('2ndes') || n.includes('2nde') || n.includes('seconde') || n.startsWith('2 ')) base = '2nde';
  else if (n.includes('term') || n.includes('tle')) base = 'Tle';
  else if (n.includes('1ere') || n.includes('1res') || n.includes('premiere') || n.includes('premieres') || n.includes('pfemieres')) base = '1ère';
  else if (n === '2 a4') base = '2nde';

  if (!base) return inferClassFromFilename(fileName);

  // Compact suffix: 1ereG, 2ndeCD, TleA
  const compact = raw.match(/^(?:1ere|1ère|1res|premieres?|2nde|2ndes|tle|term)[_\s-]*([a-g0-9]+)$/i);
  if (compact?.[1]) {
    const s = compact[1].toLowerCase();
    if (s === 'g' || s.startsWith('g2') || s.includes('g3')) return `${base} G`;
    if (s === 'cd' || s.startsWith('cd')) return `${base} CD`;
    if (s === 'a4' || s === 'a') return `${base} A4`;
  }

  if (/g2[\s-]?g3|g2g3/.test(n)) return `${base} G`;
  if (/\b1ere g\b|1ereg\b|1res g|premieres g|pfemieres g/.test(n)) return `${base} G`;

  const multiSeries =
    (n.includes(' a c d') || n.includes(' acd') || n.includes('a4 c d') || n.includes('a4 et d') ||
     n.includes(' a c et d') || n.includes(' c d') || n.includes(' e f g') || n.includes(' litteraire'));
  if (multiSeries) return base;

  if (/\ba4\b/.test(n) || n.includes('a 4') || /\b2 a4\b/.test(n)) return `${base} A4`;
  if (/\bcd\b/.test(n) || n.includes('cd1')) return `${base} CD`;
  if (/\bg2\b|\bg3\b/.test(n)) return `${base} G`;
  if (/\bg\b/.test(n) && !n.includes('geo')) return `${base} G`;
  if (/\bf\b/.test(n)) return `${base} F`;
  if (/\be\b/.test(n) && !n.includes('economie')) return `${base} E`;
  if (/\bd\b/.test(n) && !n.includes('devoir')) return `${base} D`;
  if (/\bc\b/.test(n) && !n.includes('composition')) return `${base} C`;
  if (/\ba\b/.test(n) && !n.includes('anglais') && !n.includes('annuel')) return `${base} A4`;

  return base;
}

function normalizeSubject(folderName) {
  const n = normalizeToken(folderName);
  const map = [
    [/math/, 'Mathématiques'],
    [/franc/, 'Français'],
    [/anglais|english/, 'Anglais'],
    [/physique|pct|science.*phys/, 'Physique'],
    [/chimie/, 'Chimie'],
    [/svt|vie.*terre|biolog/, 'SVT'],
    [/philo/, 'Philosophie'],
    [/hist|geo|histoire/, 'Histoire'],
    [/ecm|civique|morale/, 'ECM'],
    [/eco|compta|droit|entreprise/, 'ECM'],
    [/info/, 'Informatique'],
  ];
  for (const [re, subj] of map) {
    if (re.test(n)) return subj;
  }
  return folderName.replace(/_/g, ' ').trim();
}

function parseYearFolder(name) {
  const m = name.match(/(20\d{2})(?:-(20\d{2}))?/);
  if (!m) return new Date().getFullYear();
  return parseInt(m[2] || m[1], 10);
}

function parseSessionAndType(sessionFolder, filename) {
  const text = normalizeToken(`${sessionFolder} ${filename}`);
  let examType = 'Devoir';
  let session = 'Annual';

  if (text.includes('bepc')) examType = 'BEPC';
  else if (text.includes('bac') || text.includes('baccalaureat')) examType = 'Baccalauréat';
  else if (text.includes('probatoire')) examType = 'Probatoire';
  else if (text.includes('compo') || text.includes('composition')) examType = 'Composition';
  else if (text.includes('interro')) examType = 'Interro';
  else if (text.includes('examen blanc') || text.includes('blanc')) examType = 'Devoir';

  if (text.includes('1er trimestre') || text.includes('1er semestre') || text.includes('1eme semestre')) {
    session = '1st Semester';
  } else if (text.includes('2eme trimestre') || text.includes('2eme semestre') || text.includes('2ème semestre')) {
    session = '2nd Semester';
  } else if (text.includes('3eme trimestre')) {
    session = '3ème Trimestre';
  } else if (text.includes('annuel') || text.includes('annual')) {
    session = 'Annual';
  }

  return { examType, session };
}

function buildTitle(subject, classLevel, examType, session, year) {
  return `${examType} ${subject} ${classLevel} ${session} ${year}`.replace(/\s+/g, ' ').trim();
}

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function parsePdfPath(fullPath, sourceRoot) {
  const rel = path.relative(sourceRoot, fullPath);
  const parts = rel.split(path.sep);
  if (parts.length < 2) return null;

  const classFolder = parts[0];
  const fileName = path.basename(fullPath);
  const classLevel = normalizeClassFolder(classFolder, fileName);
  if (!classLevel || !VALID_CLASS.has(classLevel)) return null;

  const subject = normalizeSubject(parts[1]);
  const year = parts[2] ? parseYearFolder(parts[2]) : new Date().getFullYear();
  const sessionFolder = parts.length > 4 ? parts[3] : parts[2] ?? '';
  const { examType, session } = parseSessionAndType(sessionFolder, fileName);

  return {
    classLevel,
    subject,
    year,
    examType,
    session,
    fileName,
    title: buildTitle(subject, classLevel, examType, session, year),
    relPath: rel,
  };
}

function walkPdfs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPdfs(full, out);
    else if (entry.name.toLowerCase().endsWith('.pdf')) out.push(full);
  }
  return out;
}

async function loadExistingHashes() {
  const { data, error } = await supabase.from('exam_papers').select('content_hash');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.content_hash).filter(Boolean));
}

async function uploadOne(meta, buffer, existingHashes) {
  const hash = hashBuffer(buffer);
  if (existingHashes.has(hash)) {
    return { status: 'skip', reason: 'duplicate hash', meta };
  }

  const storagePath = [
    storageSlug(meta.classLevel),
    storageSlug(meta.subject),
    String(meta.year),
    storageSlug(meta.fileName),
  ].join('/');

  if (!EXECUTE) {
    return { status: 'dry-run', storagePath, meta };
  }

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
    if (!prevErr) {
      previewUrl = supabase.storage.from(BUCKET).getPublicUrl(previewPath).data.publicUrl;
    }
  } catch (previewErr) {
    console.warn(`   ⚠ Preview failed for ${meta.fileName}: ${previewErr.message}`);
  }

  const { error: dbErr } = await supabase.from('exam_papers').insert({
    title: meta.title,
    subject: meta.subject,
    class_level: meta.classLevel,
    year: meta.year,
    exam_type: meta.examType,
    session: meta.session,
    system: 'apc',
    file_url: pub.publicUrl,
    file_name: meta.fileName,
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
  return { status: 'ok', storagePath, meta };
}

async function main() {
  console.log(`\n📁 Source: ${SOURCE}`);
  console.log(`Mode: ${EXECUTE ? '🚀 EXECUTE (uploading)' : '👀 DRY-RUN (no uploads)'}\n`);

  const pdfs = walkPdfs(SOURCE);
  console.log(`Found ${pdfs.length} PDF files\n`);

  const parsed = [];
  const skipped = [];

  for (const pdf of pdfs) {
    const meta = parsePdfPath(pdf, SOURCE);
    if (!meta) {
      skipped.push({ pdf, reason: 'could not map class/subject' });
      continue;
    }
    parsed.push({ pdf, meta });
  }

  let existingHashes = new Set();
  if (EXECUTE) {
    existingHashes = await loadExistingHashes();
  }

  const results = { ok: 0, skip: 0, dry: 0, err: 0 };

  for (const { pdf, meta } of parsed) {
    try {
      const buffer = fs.readFileSync(pdf);
      const res = await uploadOne(meta, buffer, existingHashes);
      if (res.status === 'ok') {
        results.ok++;
        console.log(`✅ ${meta.classLevel} | ${meta.subject} | ${meta.fileName}`);
      } else if (res.status === 'skip') {
        results.skip++;
        console.log(`⏭️  duplicate: ${meta.fileName}`);
      } else {
        results.dry++;
        console.log(`📋 ${meta.classLevel} | ${meta.subject} | ${meta.year} | ${meta.examType} | ${meta.session}`);
        console.log(`    ${meta.relPath}`);
      }
    } catch (e) {
      results.err++;
      console.error(`❌ ${meta.fileName}: ${e.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Parsed: ${parsed.length} | Skipped paths: ${skipped.length}`);
  console.log(EXECUTE
    ? `Uploaded: ${results.ok} | Duplicates: ${results.skip} | Errors: ${results.err}`
    : `Ready to upload: ${results.dry} (run with --execute)`);

  if (skipped.length) {
    console.log('\nSkipped files (fix folder name or upload manually in admin):');
    skipped.slice(0, 15).forEach((s) => console.log(`  - ${path.relative(SOURCE, s.pdf)} (${s.reason})`));
    if (skipped.length > 15) console.log(`  ... and ${skipped.length - 15} more`);
  }

  if (!EXECUTE && results.dry > 0) {
    console.log('\nTo upload: node scripts/upload-gostudy-organized.mjs --execute');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
