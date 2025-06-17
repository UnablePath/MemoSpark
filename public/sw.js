// StudySpark PWA Service Worker
// Version: 4.0.0

/* eslint-disable no-undef */
/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'memospark-v1'; // Change this version to force update
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
  '/manifest.json', // Ensure correct manifest is cached
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter((name) => {
            // Delete ALL old caches to start fresh
            return name !== CACHE_NAME;
          })
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Service worker activated and old caches cleared');
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch event - minimal interference, only for offline support
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          console.log('[SW] Fetch failed; returning offline page instead.', error);

          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('/offline');
          return cachedResponse;
        }
      })()
    );
  } else if (STATIC_CACHE_URLS.some(url => event.request.url.endsWith(url))) {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'MemoSpark Notification',
        body: event.data.text() || 'You have a new notification',
      };
    }
  }

  const options = {
    body: notificationData.body || 'MemoSpark notification',
    icon: notificationData.icon || '/icon-192x192.png',
    badge: notificationData.badge || '/icon-192x192.png',
    tag: notificationData.tag || 'memospark-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    data: {
      ...notificationData.data,
      notificationId: notificationData.data?.notificationId,
      url: notificationData.data?.url || '/dashboard',
      timestamp: Date.now()
    },
  };

  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(
        notificationData.title || 'MemoSpark',
        options
      ),
      // Track delivery analytics
      trackNotificationEvent(
        notificationData.data?.notificationId,
        'delivered'
      )
    ])
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  const notificationData = event.notification.data || {};
  
  event.notification.close();

  // Track the click/dismiss event
  const trackingPromise = event.action === 'dismiss' 
    ? trackNotificationEvent(notificationData.notificationId, 'dismissed')
    : trackNotificationEvent(notificationData.notificationId, 'clicked');

  if (event.action === 'dismiss') {
    event.waitUntil(trackingPromise);
    return;
  }

  // Determine target URL
  const targetUrl = notificationData.url || '/dashboard';

  // Open the app
  event.waitUntil(
    Promise.all([
      trackingPromise,
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it and navigate
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                url: targetUrl,
                data: notificationData
              });
              return client.focus();
            }
          }
          
          // Otherwise, open new window with target URL
          return self.clients.openWindow(targetUrl);
        })
    ])
  );
});

// Function to track notification events
async function trackNotificationEvent(notificationId, eventType) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/push/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId,
        eventType,
        additionalData: {
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      })
    });
  } catch (error) {
    console.error('[SW] Failed to track notification event:', error);
  }
}

// Background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'studyspark-sync') {
    event.waitUntil(
      // Handle offline data sync here
      Promise.resolve()
    );
  }
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
});

console.log('[SW] Service worker script loaded successfully');