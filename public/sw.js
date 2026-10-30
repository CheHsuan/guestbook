'use strict';

const CACHE_NAME = 'guestbook-v1';
const SHELL_ASSETS = [
  '/app',
  '/styles.css',
  '/app.js',
  '/utils.js',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
  '/icon.svg',
];

// Domains that must always go to the network (Firebase live data and auth)
const NETWORK_ONLY_ORIGINS = [
  'firebaseio.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'apis.google.com',
  'gstatic.com',
];

function isNetworkOnly(url) {
  return NETWORK_ONLY_ORIGINS.some(origin => url.hostname.endsWith(origin));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept non-GET requests or network-only origins
  if (event.request.method !== 'GET' || isNetworkOnly(url)) return;

  // Firebase Hosting reserved URLs (/__/) must always hit the network
  if (url.pathname.startsWith('/__/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful same-origin responses for shell assets
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached app shell for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/app');
        }
      });
    })
  );
});
