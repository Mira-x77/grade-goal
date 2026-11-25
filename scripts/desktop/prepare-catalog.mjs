#!/usr/bin/env node
/**
 * Copy the published R2 catalogue into the desktop bundle.
 *
 * The desktop build ships `catalog/{papers,books,feed}.json` (plus the Actus
 * flyers they reference) inside the installer, so the library and the news
 * feed render on a machine that has never been online. PDFs are *not* bundled:
 * the shell caches each one the first time it is opened.
 *
 * Run through `npm run desktop:build`; the output lands in `electron/catalog`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const SOURCE_DIR = path.join(repoRoot, 'scripts', 'r2', 'output', 'catalog');
const TARGET_DIR = path.join(repoRoot, 'electron', 'catalog');
const ASSET_DIR = path.join(TARGET_DIR, 'assets');

const R2_ORIGIN = 'https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GoStudyDesktop/1.3.4';

const CATALOGUE_FILES = ['papers.json', 'books.json', 'feed.json'];
const REQUIRED_COUNTS = { 'papers.json': 'papers', 'books.json': 'books', 'feed.json': 'posts' };

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

/** Every R2 object an Actus post points at (cover + gallery). */
function collectFeedImages(posts) {
  const urls = new Set();
  for (const post of posts) {
    for (const url of [post?.image_url, ...(post?.image_urls ?? [])]) {
      if (typeof url === 'string' && url.startsWith(`${R2_ORIGIN}/`)) urls.add(url);
    }
  }
  return [...urls];
}

async function download(url, destination) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
  return buffer.byteLength;
}

async function main() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  await fs.mkdir(ASSET_DIR, { recursive: true });

  const counts = {};

  for (const name of CATALOGUE_FILES) {
    const source = path.join(SOURCE_DIR, name);
    const data = await readJson(source);
    const rows = data[REQUIRED_COUNTS[name]];
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`${name} has no "${REQUIRED_COUNTS[name]}" rows - run the R2 publish first`);
    }
    counts[name] = rows.length;
    await fs.copyFile(source, path.join(TARGET_DIR, name));
  }

  const feed = await readJson(path.join(SOURCE_DIR, 'feed.json'));
  const images = collectFeedImages(feed.posts ?? []);
  let imageBytes = 0;
  for (const url of images) {
    const key = url.slice(R2_ORIGIN.length + 1);
    const destination = path.join(ASSET_DIR, ...key.split('/'));
    try {
      imageBytes += await download(url, destination);
    } catch (error) {
      console.warn(`[desktop] skipped ${key}: ${error.message}`);
    }
  }

  const totalBytes = (await Promise.all(
    CATALOGUE_FILES.map(async (name) => (await fs.stat(path.join(TARGET_DIR, name))).size),
  )).reduce((sum, size) => sum + size, 0);

  console.log(
    `[desktop] catalogue ready: ${counts['papers.json']} papers, ` +
      `${counts['books.json']} books, ${counts['feed.json']} posts, ` +
      `${images.length} flyers (${(totalBytes / 1024).toFixed(0)} KB json, ` +
      `${(imageBytes / 1024 / 1024).toFixed(1)} MB images) -> electron/catalog`,
  );
}

main().catch((error) => {
  console.error(`[desktop] catalogue preparation failed: ${error.message}`);
  process.exitCode = 1;
});
