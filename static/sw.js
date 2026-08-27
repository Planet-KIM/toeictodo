/* ==========================================================================
   TOEIC 750 Service Worker - Offline Caching Engine (PWA)
   ========================================================================== */

const CACHE_NAME = 'toeic-750-v1';
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
  '/js/main.js',
  '/api/words',
  '/api/pairs',
  '/api/traps',
  '/api/users'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core static assets & API responses...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
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

  // Audio Proxy MP3 Caching strategy: Cache First, then Network
  if (url.pathname.startsWith('/api/audio')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Offline fallback if audio is not cached
            return new Response('', { status: 503, statusText: 'Audio Offline Unavailable' });
          });
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate for APIs and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
