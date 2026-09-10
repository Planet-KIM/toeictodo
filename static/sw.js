/* ==========================================================================
   TOEIC 750 Service Worker - Offline Caching Engine (PWA)
   ========================================================================== */

/* ==========================================================================
   TOEIC 750 Service Worker - Offline Caching Engine (PWA)
   ========================================================================== */

const CACHE_NAME = 'toeic-750-v3';
const AUDIO_CACHE_NAME = 'toeic-audio-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/header.css',
  '/css/login.css',
  '/css/dashboard.css',
  '/css/vocabs.css',
  '/css/flashcards.css',
  '/css/quiz.css',
  '/css/modal.css',
  '/js/state.js',
  '/js/audio.js',
  '/js/auth.js',
  '/js/offlineDb.js',
  '/js/dashboard.js',
  '/js/vocabs.js',
  '/js/autoPlayer.js',
  '/js/flashcards.js',
  '/js/quiz.js',
  '/js/modal.js',
  '/js/main.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing updated ServiceWorker toeic-750-v3...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new ServiceWorker toeic-750-v3...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-GET requests (e.g. POST /api/stt)
  if (event.request.method !== 'GET') {
    return;
  }

  // Audio Proxy MP3 Caching strategy: Cache First, then Network
  if (url.pathname.startsWith('/api/audio')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              cache.put(event.request, responseToCache);
            }
            return networkResponse;
          }).catch(() => {
            return new Response('', { status: 503, statusText: 'Audio Offline Unavailable' });
          });
        });
      })
    );
    return;
  }

  // Network-First for JS and CSS files to guarantee fresh code updates!
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-First for general static assets with safe response cloning
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

