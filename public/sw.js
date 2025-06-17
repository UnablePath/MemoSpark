// StudySpark PWA Service Worker
// Version: 3.0.0

const CACHE_NAME = 'studyspark-v3';
const STATIC_CACHE_NAME = 'studyspark-static-v3';
const DYNAMIC_CACHE_NAME = 'studyspark-dynamic-v3';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/offline',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
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
            return name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
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
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip all Next.js internals and API routes
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/api/') ||
      url.searchParams.has('_rsc')) {
    return;
  }

  // Only intervene for navigation requests (pages) and static assets
  if (request.destination === 'document' || 
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)) {
    
    event.respondWith(
      // Network first - only use cache when network fails
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              })
              .catch(() => {}); // Ignore cache errors
          }
          return response;
        })
        .catch(() => {
          // Only use cache when network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving from cache (offline):', request.url);
                return cachedResponse;
              }
              
              // For navigation requests, show offline page
              if (request.destination === 'document') {
                return caches.match('/offline');
              }
              
              // For assets, return a basic error response
              return new Response('Offline', { status: 503 });
            });
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