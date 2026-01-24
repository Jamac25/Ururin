/* ========================================
   SERVICE WORKER - IMPROVED
   Better caching strategy with network-first for HTML
   ======================================== */

const CACHE_NAME = 'ololeeye-v3';
const STATIC_CACHE = 'ololeeye-static-v3';
const DYNAMIC_CACHE = 'ololeeye-dynamic-v3';

const STATIC_ASSETS = [
    './',
    './index.html',
    './index.css',
    './app.js',
    './data.js',
    './data-layer.js',
    './icons.js',
    './modern-icons.js',
    './components.js',
    './analytics.js',
    './search.js',
    './quick-actions.js',
    './onboarding.js',
    './auth.js',
    './supabase_config.js',
    './logo.png',
    './manifest.json'
];

// Install - Cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - Clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key =>
                    key !== STATIC_CACHE && key !== DYNAMIC_CACHE
                ).map(key => {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network first for HTML/API, Cache first for assets
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and cross-origin
    if (request.method !== 'GET') return;
    if (!url.origin.includes(self.location.origin) &&
        !url.hostname.includes('supabase.co') &&
        !url.hostname.includes('googleapis.com')) {
        return;
    }

    // Network first for HTML and API calls
    if (request.mode === 'navigate' ||
        url.pathname.endsWith('.html') ||
        url.hostname.includes('supabase.co')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Cache first for static assets
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
});

// Helper: Check if static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Strategy: Network First (for HTML/API)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Return offline page if available
        if (request.mode === 'navigate') {
            return caches.match('./index.html');
        }
        throw error;
    }
}

// Strategy: Cache First (for static assets)
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        throw error;
    }
}

// Strategy: Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, networkResponse.clone());
            });
        }
        return networkResponse;
    }).catch(error => {
        console.log('[SW] Network failed, using cache');
        return cachedResponse;
    });

    return cachedResponse || fetchPromise;
}

// Listen for skip waiting message
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
