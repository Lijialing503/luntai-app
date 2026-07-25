const CACHE_NAME = 'tire-app-v2';

// Install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first strategy with dynamic caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache successful same-origin responses
        if (networkResponse && networkResponse.status === 200) {
          try {
            var url = new URL(event.request.url);
            // Cache pages, scripts, and styles from any origin
            if (url.origin === self.location.origin || 
                url.hostname === 'cdn.jsdelivr.net' || 
                url.hostname === 'unpkg.com') {
              var responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          } catch(e) {}
        }
        return networkResponse;
      }).catch(() => {
        // Network failed: for navigation requests, try to serve any cached HTML page
        if (event.request.mode === 'navigate') {
          return caches.match(event.request.url).then(function(cached) {
            if (cached) return cached;
            // Last resort: find any cached HTML page
            return caches.keys().then(function(keys) {
              return Promise.all(
                keys.map(function(key) {
                  return caches.open(key).then(function(cache) {
                    return cache.keys();
                  }).then(function(reqs) {
                    for (var i = 0; i < reqs.length; i++) {
                      if (reqs[i].url.match(/\.html$/)) {
                        return caches.match(reqs[i]);
                      }
                    }
                    return null;
                  });
                })
              ).then(function(results) {
                return results.find(function(r) { return r !== null; }) || 
                       new Response('离线模式不可用', { status: 503 });
              });
            });
          });
        }
        return new Response('离线模式不可用', { status: 503 });
      });
    })
  );
});
