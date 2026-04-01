const CACHE_NAME = 'exploration-form-v111';
const ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/silica-form.html',
  '/actual-run.html',
  '/core-loss.html',
  '/daily-sheet.html',
  '/inspection.html',
  '/p5m.html',
  '/logging.html',
  '/preparation.html',
  '/css/style.css',
  '/js/app.js',
  '/js/drive.js',
  '/js/auth.js',
  '/manifest.json',
  '/hero-globe.png.png'
];

// Install: cache semua asset
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first untuk asset lokal, network-first untuk API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Lewati request ke Google API — selalu butuh internet
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('gstatic.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache response baru untuk asset lokal
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback ke index.html untuk navigasi
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});