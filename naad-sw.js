// NAAD Content Portal — Service Worker v2
// Cadet Media Ghana 2026

const CACHE_NAME  = 'naad-portal-v2';
const ASSETS      = ['./naad-portal.html'];

// ── INSTALL ──
self.addEventListener('install', event => {
  console.log('[NAAD SW] Installing v2…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => {
        // Don't call skipWaiting here — wait for user to confirm update
        console.log('[NAAD SW] Cached successfully');
      })
  );
});

// ── ACTIVATE — clean old caches ──
self.addEventListener('activate', event => {
  console.log('[NAAD SW] Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[NAAD SW] Removing old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — cache first, fallback to network ──
self.addEventListener('fetch', event => {
  // Only cache same-origin requests (not Google Scripts API calls)
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Return cached + update in background
          const networkFetch = fetch(event.request)
            .then(res => {
              if (res && res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
              }
              return res;
            }).catch(() => {});
          return cached;
        }
        return fetch(event.request)
          .then(res => {
            if (res && res.status === 200 && event.request.method === 'GET') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => caches.match('./naad-portal.html'));
      })
  );
});

// ── MESSAGE — handle SKIP_WAITING for update flow ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[NAAD SW] Skipping wait — updating now');
    self.skipWaiting();
  }
});
