// Service Worker — Go Study!
// Strategy:
//   - App shell (JS/CSS/HTML/icons): Cache-first, updated in background on new deploy
//   - Supabase API / auth calls: Network-first, no caching
//   - Everything else: Network-first with cache fallback

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// These are replaced at build time by the Vite plugin with hashed asset URLs.
// Falls back to caching whatever the browser requests if not injected.
const PRECACHE_ASSETS = self.__PRECACHE_ASSETS__ || ['/'];

// ── Skip waiting on demand (triggered by update toast) ───────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Don't skipWaiting here — let the update toast handle it
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing logic ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept: Supabase, chrome-extension, non-GET
  if (
    request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // App shell assets (same origin JS/CSS/HTML/icons) — Cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Cross-origin (fonts, CDN, etc.) — Network-first with cache fallback
  event.respondWith(networkFirst(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return the root index.html for SPA navigation
    const fallback = await caches.match('/');
    return fallback || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
