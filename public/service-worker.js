
const CACHE_NAME = 'melora-music-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch handler to satisfy PWA requirements
    event.respondWith(fetch(event.request));
});
