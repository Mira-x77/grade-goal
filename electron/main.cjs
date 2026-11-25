'use strict';

/**
 * GoStudy desktop shell.
 *
 * The renderer is the same Vite bundle the phone app ships; this process only
 * adds what a browser tab cannot do on its own:
 *
 *  - a local http origin (http://127.0.0.1) so BrowserRouter, the service
 *    worker and the R2 CORS rules behave exactly like the web build;
 *  - a bundled copy of the R2 catalogue, so the library and Actus render on a
 *    machine that has never been online;
 *  - a read-through disk cache for R2 objects, so any paper or book opened once
 *    keeps opening offline;
 *  - a background refresh that silently updates the catalogue when online.
 *
 * Nothing here talks to Supabase: the renderer keeps its normal database-first
 * flow and falls back to `catalog/*.json` exactly like the web build does.
 */

const { app, BrowserWindow, Menu, net, session, shell } = require('electron');
const fs = require('node:fs');
const fsp = fs.promises;
const http = require('node:http');
const path = require('node:path');

const APP_VERSION = require('../package.json').version;

const R2_ORIGIN = 'https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev';
const CATALOGUE_FILES = ['papers.json', 'books.json', 'feed.json'];
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GoStudyDesktop/' + APP_VERSION;

const PREFERRED_PORT = 47821;
const PORT_ATTEMPTS = 10;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHED_FILE_BYTES = 200 * 1024 * 1024;
const CACHE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024; // prune above 8 GB
const CACHE_TARGET_BYTES = 6 * 1024 * 1024 * 1024; // ...down to 6 GB

const OFFLINE = process.argv.includes('--offline');
const SMOKE = process.argv.includes('--smoke');

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const SCREENSHOT = argValue('--screenshot');
const SMOKE_ROUTE = argValue('--route') || '/library';
const CAPTURE_DIR = argValue('--capture');
const DEV_URL = process.env.GOSTUDY_DEV_URL || '';

const DIST_DIR = path.join(__dirname, '..', 'dist');
const BUNDLED_CATALOGUE = app.isPackaged
  ? path.join(process.resourcesPath, 'catalog')
  : path.join(__dirname, 'catalog');

let cacheRoot = '';
let catalogueRoot = '';
let localBase = '';
let mainWindow = null;
const downloadsInFlight = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
};

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

app.setName('GoStudy');
app.setAppUserModelId('app.gostudy.desktop');

// Screenshots are captured at 2x so they stay sharp in the guidebook PDF.
if (CAPTURE_DIR) app.commandLine.appendSwitch('force-device-scale-factor', '2');

// One window, one cache: a second launch just focuses the running app.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ---------------------------------------------------------------------------
// Static file helpers
// ---------------------------------------------------------------------------

async function serveStatic(res, filePath, cacheControl) {
  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return false;

  res.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function serveText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Catalogue (bundled + silently refreshed)
// ---------------------------------------------------------------------------

/** Newest copy of a catalogue file: refreshed on disk, else the bundled one. */
async function readCatalogue(name) {
  for (const file of [path.join(catalogueRoot, name), path.join(BUNDLED_CATALOGUE, name)]) {
    try {
      return await fsp.readFile(file, 'utf8');
    } catch {
      /* try the next location */
    }
  }
  return null;
}

/**
 * Point every R2 URL at the local cache proxy. Keys, ordering and every other
 * field stay identical, so the renderer cannot tell the difference - it just
 * gets its files from this process instead of the public bucket.
 */
function rewriteCatalogueUrls(text) {
  return text.split(R2_ORIGIN).join(`${localBase}/r2`);
}

let catalogueRefresh = null;

function refreshCatalogue() {
  if (OFFLINE) return Promise.resolve(false);
  if (catalogueRefresh) return catalogueRefresh;

  catalogueRefresh = (async () => {
    let updated = 0;
    for (const name of CATALOGUE_FILES) {
      try {
        const res = await net.fetch(`${R2_ORIGIN}/catalog/${name}`, {
          headers: { 'User-Agent': USER_AGENT },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        JSON.parse(text); // never replace a good copy with a broken one
        await fsp.mkdir(catalogueRoot, { recursive: true });
        await fsp.writeFile(path.join(catalogueRoot, name), text);
        updated += 1;
      } catch (error) {
        console.warn(`[desktop] catalogue refresh skipped for ${name}: ${error.message}`);
      }
    }
    if (updated > 0) console.log(`[desktop] catalogue refreshed (${updated}/${CATALOGUE_FILES.length})`);
    return updated > 0;
  })().finally(() => {
    catalogueRefresh = null;
  });

  return catalogueRefresh;
}

// ---------------------------------------------------------------------------
// R2 read-through cache
// ---------------------------------------------------------------------------

async function downloadToCache(remoteUrl, cachePath) {
  const res = await net.fetch(remoteUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_CACHED_FILE_BYTES) throw new Error('file too large to cache');

  await fsp.mkdir(path.dirname(cachePath), { recursive: true });
  const temp = `${cachePath}.${process.pid}.tmp`;
  await fsp.writeFile(temp, buffer);
  await fsp.rename(temp, cachePath);
  return buffer.length;
}

async function serveR2(requestUrl, res) {
  const encodedKey = requestUrl.slice('/r2/'.length);
  const key = decodeURIComponent(encodedKey);

  if (!key || key.includes('..') || key.startsWith('/')) {
    return serveText(res, 400, 'Bad object key');
  }

  const segments = key.split('/');
  const cachePath = path.join(cacheRoot, ...segments);
  const bundledAsset = path.join(BUNDLED_CATALOGUE, 'assets', ...segments);
  const cacheControl = 'public, max-age=86400';

  // 1. Already downloaded by an earlier session.
  if (await serveStatic(res, cachePath, cacheControl)) return;

  // 2. Shipped inside the installer (Actus flyers), so they work offline on a
  //    fresh install too.
  if (await serveStatic(res, bundledAsset, cacheControl)) return;

  // 3. Offline and never opened: the renderer shows its normal error state.
  if (OFFLINE) {
    return serveText(res, 503, 'Offline: this file has not been opened on this computer yet.');
  }

  // 4. Fetch once, then serve from disk forever.
  const remoteUrl = R2_ORIGIN + requestUrl.slice('/r2'.length);
  let pending = downloadsInFlight.get(key);
  if (!pending) {
    pending = downloadToCache(remoteUrl, cachePath).finally(() => downloadsInFlight.delete(key));
    downloadsInFlight.set(key, pending);
  }

  try {
    await pending;
  } catch (error) {
    console.warn(`[desktop] download failed for ${key}: ${error.message}`);
    return serveText(res, 502, `Could not download ${key}`);
  }

  if (!(await serveStatic(res, cachePath, cacheControl))) {
    await serveText(res, 502, `Could not serve ${key}`);
  }
}

/** Keep the cache under control: drop the least recently used files. */
async function pruneCache() {
  try {
    const files = [];
    let total = 0;

    async function walk(dir) {
      const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          const stat = await fsp.stat(full).catch(() => null);
          if (!stat) continue;
          files.push({ full, size: stat.size, atime: stat.atimeMs });
          total += stat.size;
        }
      }
    }

    await walk(cacheRoot);
    if (total <= CACHE_LIMIT_BYTES) return;

    files.sort((a, b) => a.atime - b.atime);
    let removed = 0;
    for (const file of files) {
      if (total <= CACHE_TARGET_BYTES) break;
      await fsp.unlink(file.full).catch(() => {});
      total -= file.size;
      removed += 1;
    }
    console.log(`[desktop] pruned ${removed} cached files (${(total / 1024 / 1024).toFixed(0)} MB left)`);
  } catch (error) {
    console.warn(`[desktop] cache prune skipped: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Local http server
// ---------------------------------------------------------------------------

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, localBase).pathname);
      const cacheControl = pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';

      if (pathname === '/health') {
        return serveText(
          res,
          200,
          JSON.stringify({ ok: true, version: APP_VERSION, offline: OFFLINE }),
          'application/json; charset=utf-8',
        );
      }

      if (pathname.startsWith('/catalog/')) {
        const name = pathname.slice('/catalog/'.length);
        if (!CATALOGUE_FILES.includes(name)) return serveText(res, 404, 'Unknown catalogue file');
        const text = await readCatalogue(name);
        if (!text) return serveText(res, 404, `Missing ${name}`);
        return serveText(res, 200, rewriteCatalogueUrls(text), 'application/json; charset=utf-8');
      }

      if (pathname.startsWith('/r2/')) {
        return serveR2(pathname, res);
      }

      const relative = pathname.replace(/^\/+/, '') || 'index.html';
      const normalized = path.normalize(relative);
      if (!normalized.startsWith('..') && !path.isAbsolute(normalized)) {
        const candidate = path.join(DIST_DIR, normalized);
        if (await serveStatic(res, candidate, cacheControl)) return;
      }

      // Single-page app: unknown routes render the shell, like the web deploy.
      if (await serveStatic(res, path.join(DIST_DIR, 'index.html'), 'no-cache')) return;
      return serveText(res, 404, 'Not found');
    } catch (error) {
      console.error('[desktop] request failed:', error);
      return serveText(res, 500, 'Internal error');
    }
  });

  return new Promise((resolve, reject) => {
    let attempt = 0;
    const listen = () => {
      const port = PREFERRED_PORT + attempt;
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && attempt < PORT_ATTEMPTS - 1) {
          attempt += 1;
          listen();
        } else {
          reject(error);
        }
      });
      server.listen(port, '127.0.0.1', () => {
        localBase = `http://127.0.0.1:${port}`;
        console.log(`[desktop] serving ${DIST_DIR} on ${localBase}`);
        resolve(localBase);
      });
    };
    listen();
  });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function isLocal(url) {
  return url.startsWith(localBase) || url.startsWith('devtools://');
}

function createWindow() {
  // Guidebook screenshots need a phone-sized viewport, not the desktop default.
  const capture = Boolean(CAPTURE_DIR);
  mainWindow = new BrowserWindow({
    width: capture ? 430 : 1280,
    height: capture ? 880 : 860,
    minWidth: capture ? 320 : 960,
    minHeight: capture ? 480 : 640,
    show: false,
    backgroundColor: '#0b0f19',
    title: 'GoStudy!',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    // Headless runs (smoke tests, guidebook screenshots) stay hidden.
    if (SMOKE || CAPTURE_DIR) return;
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Links to the website, WhatsApp groups etc. open in the user's browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocal(url)) return { action: 'allow' };
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isLocal(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  const target = DEV_URL || `${localBase}/`;
  mainWindow.loadURL(target);
  return mainWindow;
}

function installMenu() {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { role: 'togglefullscreen' },
        ],
      },
    ]),
  );
}

// ---------------------------------------------------------------------------
// Smoke test: `electron . --smoke [--offline] [--screenshot <file>]`
// ---------------------------------------------------------------------------

/** A filled APC profile, so guidebook screenshots show real-looking numbers. */
const DEMO_SCHEDULE = {
  schedule: {
    monday: ['Mathématiques', 'Français'],
    tuesday: ['Physique-Chimie', 'Anglais'],
    wednesday: ['Mathématiques', 'SVT', 'Histoire-Géographie'],
    thursday: ['Français', 'Physique-Chimie'],
    friday: ['Anglais', 'SVT'],
  },
  reminderSettings: { eveningEnabled: true, morningEnabled: true, eveningTime: '19:00', morningTime: '05:00' },
  setupCompleted: true,
  setupSkipped: false,
};

const DEMO_STATE = {
  step: 'marks',
  targetAverage: 15,
  targetMin: 14,
  studentName: 'Ama',
  classLevel: '1ère',
  serie: 'D',
  semester: '1er Semestre',
  subjects: [
    { id: 's1', name: 'Mathématiques', coefficient: 4, marks: { interro: 15.5, dev: 14, compo: null } },
    { id: 's2', name: 'Physique-Chimie', coefficient: 3, marks: { interro: 13, dev: null, compo: 11 } },
    { id: 's3', name: 'SVT', coefficient: 2, marks: { interro: null, dev: 14, compo: 13 } },
    { id: 's4', name: 'Français', coefficient: 3, marks: { interro: 14, dev: 15, compo: 12.5 } },
    { id: 's5', name: 'Anglais', coefficient: 2, marks: { interro: 16, dev: 15, compo: null } },
    { id: 's6', name: 'Histoire-Géographie', coefficient: 2, marks: { interro: 11, dev: null, compo: 10.5 } },
  ],
  settings: {
    weights: { interro: 1, dev: 1, compo: 2, locked: false },
    rounding: 'standard',
    colorThresholds: { greenBelow: 0, yellowBelow: 2 },
    notifications: { targetUnreachable: true, subjectCritical: true, canSaveAverage: true },
    gradingSystem: 'apc',
    apcWeightedSplit: true,
  },
  hasEverSetTarget: true,
  hasEverAddedSubjects: true,
  hasEverLoggedMark: true,
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
};

/** Screens the guidebook needs, in walking order. */
const CAPTURE_ROUTES = [
  ['01-home', '/', 7000],
  ['02-library', '/library', 6000],
  ['03-books', '/library/books', 5000],
  ['04-paper-detail', '/library/edu-p-864', 7000],
  ['05-simulator', '/simulator', 5000],
  ['06-schedule', '/schedule', 6000],
  ['07-actus', '/courses', 6000, 420],
  ['08-downloads', '/my-downloads', 5000],
  ['09-profile', '/profile', 5000],
  ['10-settings', '/settings', 5000],
  ['11-welcome', '/welcome', 4000],
  ['12-quiz', '/quiz', 5000],
  ['13-book-detail', '/book/edu-b-163', 6000],
  ['14-get-code', '/premium/how-to-get-code', 5000],
];

async function seedStudentProfile(webContents) {
  await webContents.executeJavaScript(`
    localStorage.setItem('scoretarget_state', JSON.stringify(${JSON.stringify(DEMO_STATE)}));
    localStorage.setItem('scoretarget_schedule', JSON.stringify(${JSON.stringify(DEMO_SCHEDULE)}));
    localStorage.setItem('grade_calculator_setup_done', 'true');
    // Skip the first-run tour and the per-screen intro sheets so screenshots
    // show the page itself, not a coach mark.
    localStorage.setItem('scoretarget_tour_seen', 'true');
    ['library', 'simulator', 'profile'].forEach((k) =>
      localStorage.setItem('scoretarget_intro_seen_' + k, 'true')
    );
  `);
}

async function runSmoke(window) {
  const webContents = window.webContents;
  if (webContents.isLoading()) {
    await new Promise((resolve) => webContents.once('did-finish-load', resolve));
  }

  // Skip onboarding the way a returning student would.
  await seedStudentProfile(webContents);

  await window.loadURL(`${localBase}${SMOKE_ROUTE}`);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  const report = await webContents.executeJavaScript(`
    (async () => {
      const readJson = async (name) => {
        try {
          const res = await fetch('/catalog/' + name);
          return res.ok ? await res.json() : null;
        } catch { return null; }
      };
      const papers = await readJson('papers.json');
      const books = await readJson('books.json');
      const feed = await readJson('feed.json');
      let pdfStatus = 0;
      let pdfBytes = 0;
      try {
        const res = await fetch('/r2/edusocial/papers/1ere-D/Mathematiques/0864-DEVOIR-SURVEILL-1ER-SEMESTRE-MATHS-1-RE-D.pdf');
        pdfStatus = res.status;
        pdfBytes = (await res.arrayBuffer()).byteLength;
      } catch (error) {
        pdfStatus = -1;
      }
      return {
        href: location.href,
        papers: papers?.papers?.length ?? 0,
        books: books?.books?.length ?? 0,
        feed: feed?.posts?.length ?? 0,
        pdfStatus,
        pdfBytes,
        text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 300),
      };
    })()
  `);

  if (SCREENSHOT) {
    const image = await window.webContents.capturePage();
    await fsp.mkdir(path.dirname(SCREENSHOT), { recursive: true });
    await fsp.writeFile(SCREENSHOT, image.toPNG());
    report.screenshot = SCREENSHOT;
  }

  const payload = { ...report, offline: OFFLINE, version: APP_VERSION };
  // The packaged exe is a GUI binary: keep a copy on disk so CI/shells can read
  // the result even when stdout is not attached.
  await fsp.writeFile(path.join(app.getPath('userData'), 'smoke-report.json'), JSON.stringify(payload, null, 2));

  console.log(`SMOKE_RESULT ${JSON.stringify(payload)}`);
  app.exit(0);
}

// ---------------------------------------------------------------------------
// Guidebook screenshots: `electron . --capture docs/partnership/guidebook/screens`
// ---------------------------------------------------------------------------

async function runCapture(window) {
  const webContents = window.webContents;
  if (webContents.isLoading()) {
    await new Promise((resolve) => webContents.once('did-finish-load', resolve));
  }

  await seedStudentProfile(webContents);
  window.setContentSize(430, 880);
  await fsp.mkdir(CAPTURE_DIR, { recursive: true });

  // Hide scrollbars and horizontal overflow so screenshots look like a phone.
  // Re-applied after every navigation, because insertCSS is per-document.
  const CLEAN_CSS = `
    ::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
    html, body { scrollbar-width: none !important; overflow-x: hidden !important; }
  `;
  await webContents.insertCSS(CLEAN_CSS);

  const written = [];
  for (const [slug, route, waitMs, scrollBy] of CAPTURE_ROUTES) {
    await window.loadURL(`${localBase}${route}`);
    await webContents.insertCSS(CLEAN_CSS).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, waitMs ?? 2500));
    if (scrollBy) {
      // Wheel events scroll whatever pane sits under the pointer in the app.
      for (let i = 0; i < 6; i += 1) {
        webContents.sendInputEvent({ type: 'mouseWheel', x: 215, y: 500, deltaX: 0, deltaY: -scrollBy / 6, canScroll: true });
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } else {
      await webContents.executeJavaScript('window.scrollTo(0, 0)').catch(() => {});
    }
    const image = await webContents.capturePage();
    const file = path.join(CAPTURE_DIR, `${slug}.png`);
    await fsp.writeFile(file, image.toPNG());
    written.push({ slug, route, href: webContents.getURL(), size: window.getContentSize() });
  }

  console.log(`CAPTURE_RESULT ${JSON.stringify(written)}`);
  app.exit(0);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

app.on('window-all-closed', () => {
  app.quit();
});

app.whenReady().then(async () => {
  cacheRoot = path.join(app.getPath('userData'), 'cache', 'r2');
  catalogueRoot = path.join(app.getPath('userData'), 'catalog');

  // Offline mode also blocks every non-local request, so the run matches an
  // unplugged machine instead of only skipping our own refreshes.
  if (OFFLINE) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !isLocal(details.url) && !details.url.startsWith('data:') });
    });
  }

  installMenu();
  await startServer();

  // Warm the cache in the background; the UI never waits for the network.
  void refreshCatalogue();
  setInterval(() => void refreshCatalogue(), REFRESH_INTERVAL_MS).unref();
  void pruneCache();

  const window = createWindow();

  if (SMOKE) {
    runSmoke(window).catch((error) => {
      console.error(`SMOKE_FAILED ${error.stack || error.message}`);
      app.exit(1);
    });
  } else if (CAPTURE_DIR) {
    runCapture(window).catch((error) => {
      console.error(`CAPTURE_FAILED ${error.stack || error.message}`);
      app.exit(1);
    });
  }
});
