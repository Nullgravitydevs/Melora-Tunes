
const CACHE_NAME = 'melora-music-v2';
const STATIC_CACHE = 'melora-static-v2';
const API_CACHE = 'melora-api-v1';

// App shell files to pre-cache on install
const APP_SHELL = [
    '/',
    '/manifest.json',
];

// Install: Pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch(err => {
                console.warn('[SW] Pre-cache failed:', err);
                self.skipWaiting();
            })
    );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE && key !== API_CACHE)
                    .map(key => caches.delete(key))
            )
        ).then(() => clients.claim())
    );
});

// Fetch: Strategy-based routing
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension, etc.
    if (!url.protocol.startsWith('http')) return;

    // API routes: Network-first with cache fallback (short TTL)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstWithCache(event.request, API_CACHE, 5 * 60));
        return;
    }

    // Static assets (JS, CSS, fonts, images, sounds): Cache-first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(event.request, STATIC_CACHE));
        return;
    }

    // Navigation & HTML: Network-first with app shell fallback
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithFallback(event.request));
        return;
    }

    // Everything else: Network-first
    event.respondWith(networkFirstWithCache(event.request, CACHE_NAME, 60 * 60));
});

/**
 * Check if a path is a static asset worth caching long-term.
 */
function isStaticAsset(pathname) {
    return /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|svg|gif|ico|mp3|wav|ogg)$/i.test(pathname) ||
        pathname.startsWith('/_next/static/') ||
        pathname.startsWith('/assets/') ||
        pathname.startsWith('/sounds/') ||
        pathname.startsWith('/themes/') ||
        pathname.startsWith('/hero-images/');
}

/**
 * Cache-first strategy: try cache, fallback to network (and update cache).
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Network-first with cache fallback and TTL.
 */
async function networkFirstWithCache(request, cacheName, maxAgeSec) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Network-first for navigation with app shell fallback.
 */
async function networkFirstWithFallback(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback to cached root page (SPA)
        const fallback = await caches.match('/');
        if (fallback) return fallback;
        return new Response('Offline — please connect to the internet.', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}
