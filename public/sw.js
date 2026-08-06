// Bumped v1 -> v2: forces every existing installed service worker to drop
// its old cache on next activate (see below), instead of reusing it forever
// since this name never changed across any prior deploy. Root cause of a
// real "I never see any change" report from a user (2026-08-05) was most
// likely index.html having no explicit Cache-Control header — fixed in
// vercel.json — but bumping this too is cheap, harmless defense in depth.
const CACHE = 'volta-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', e => {
  let data = { title: 'VOLTA', body: 'Nouvelle notification', url: '/messages' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch { /* keep defaults if the payload isn't JSON */ }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/messages';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => 'focus' in c);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;

  // Navigation requests: network-first so deploys are picked up immediately,
  // falling back to the cache only when offline.
  if (request.mode === 'navigate' || request.destination === 'document') {
    e.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Vite build assets are content-hashed, so cache-first is safe and fast.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return response;
      }))
    );
    return;
  }

  e.respondWith(caches.match(request).then(r => r || fetch(request)));
});
