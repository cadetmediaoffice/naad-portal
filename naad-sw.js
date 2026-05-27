// NAAD Content Portal — Service Worker v3
// Cadet Media Ghana 2026

const CACHE_NAME = 'naad-portal-v4';
const BASE       = '/naad-portal/';
const ASSETS     = [
  BASE + 'naad-portal.html',
  BASE + 'naad-sw.js',
];

// ── INSTALL ──
self.addEventListener('install', event => {
  console.log('[NAAD SW v3] Installing…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => {
        console.log('[NAAD SW v3] Cached');
        // Don't skipWaiting — wait for user to approve update
      })
  );
});

// ── ACTIVATE — remove old caches ──
self.addEventListener('activate', event => {
  console.log('[NAAD SW v3] Activating…');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[NAAD SW v3] Removing old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH — cache-first for app files, network-first for API ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls to Google / CMG Server
  if (url.hostname.includes('google') || url.hostname.includes('script')) return;

  // Network-first for HTML (always get fresh app)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(BASE + 'naad-portal.html'))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

// ── MESSAGE — SKIP_WAITING for update ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[NAAD SW v3] Skipping wait — updating');
    self.skipWaiting();
  }
});
