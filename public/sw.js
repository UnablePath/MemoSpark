// MemoSpark Service Worker v5.2.0
const CACHE_NAME = 'memospark-v5-2'
const APP_NAME = 'MemoSpark'

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/favicon.ico',
  '/icon.svg'
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log(`[SW] ${APP_NAME} v5.2.0 installing...`)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Installation complete')
        // Don't skip waiting here - let the user choose when to update
        return Promise.resolve()
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log(`[SW] ${APP_NAME} v5.2.0 activating...`)
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('memospark-') && cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
            if (cacheName.startsWith('studyspark-')) {
              console.log('[SW] Deleting old StudySpark cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete - now controlling all pages')
      
      // Notify all clients that activation is complete
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '5.2.0',
            app: APP_NAME
          })
        })
      })
    })
  )
})

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

  // Skip OneSignal SDK requests to avoid conflicts
  if (url.pathname.includes('OneSignal') || url.pathname.includes('onesignal')) {
    return;
  }

  // Only intervene for navigation requests (pages) and static assets
  if (request.destination === 'document' || 
      url.pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?|webmanifest)$/)) {
    
    event.respondWith(
      // Network first - only use cache when network fails
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
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
                return caches.match('/offline').then(offlinePage => {
                  return offlinePage || new Response('Offline', { 
                    status: 503,
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
              }
              
              // For assets, return a basic error response
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});

// Push notification handling - only handle non-OneSignal notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  // Check if this is from OneSignal - if so, let OneSignal handle it
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.custom && data.custom.i) {
        // This is likely a OneSignal notification, skip it
        console.log('[SW] OneSignal notification detected, skipping custom handling');
        return;
      }
    } catch (e) {
      // Not JSON, continue with custom handling
    }
  }
  
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

// Background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'memospark-sync') {
    event.waitUntil(syncOfflineNotifications());
  } else if (event.tag === 'memospark-notification-schedule') {
    event.waitUntil(syncPendingNotificationSchedules());
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { data, ports } = event
  
  if (data && data.type === 'GET_VERSION') {
    // Respond with version info
    const response = {
      version: '5.2.0',
      app: APP_NAME,
      cache: CACHE_NAME
    }
    
    if (ports && ports[0]) {
      ports[0].postMessage(response)
    } else {
      event.source.postMessage(response)
    }
  } else if (data && data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING command')
    self.skipWaiting()
    
    // Notify the client that we're now controlling
    event.source.postMessage({
      type: 'SW_UPDATED',
      version: '5.2.0',
      app: APP_NAME
    })
  }
})

// Initialize notification scheduler when service worker activates
async function initializeNotificationScheduler() {
  console.log('[SW] Initializing notification scheduler...');
  
  // Set up periodic check for scheduled notifications
  setInterval(checkScheduledNotifications, 60000); // Check every minute
  
  // Initial check
  checkScheduledNotifications();
}

// Check for notifications that should be triggered
async function checkScheduledNotifications() {
  try {
    const db = await openNotificationDB();
    const now = new Date().getTime();
    
    const transaction = db.transaction(['scheduledNotifications'], 'readonly');
    const store = transaction.objectStore('scheduledNotifications');
    const index = store.index('scheduledFor');
    
    // Get notifications scheduled for now or in the past
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const notification = cursor.value;
        
        // Trigger the notification
        triggerLocalNotification(notification);
        
        // Remove from scheduled notifications
        deleteScheduledNotification(db, notification.id);
        
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('[SW] Error checking scheduled notifications:', error);
  }
}

// Handle offline notification scheduling
async function handleOfflineNotificationSchedule(payload) {
  try {
    const { userId, taskTitle, dueDate, reminderTime } = payload;
    const scheduledFor = new Date(reminderTime).getTime();
    
    console.log(`[SW] Storing offline notification schedule for: "${taskTitle}"`);
    
    const db = await openNotificationDB();
    
    // Store the notification locally
    await storeScheduledNotification(db, {
      userId,
      taskTitle,
      dueDate,
      scheduledFor,
      title: '📋 Task Reminder',
      body: `⏰ Don't forget: "${taskTitle}" is due soon!`,
      data: {
        type: 'task_reminder',
        taskTitle,
        dueDate,
        url: '/dashboard'
      },
      createdAt: Date.now()
    });
    
    // Also try to sync with server if online
    try {
      const response = await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        // Store for later sync if server request fails
        await storePendingSchedule(payload);
        
        // Register for background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          await self.registration.sync.register('memospark-notification-schedule');
        }
      }
    } catch (error) {
      console.log('[SW] Network unavailable, storing for later sync');
      await storePendingSchedule(payload);
    }
    
  } catch (error) {
    console.error('[SW] Error handling offline notification schedule:', error);
  }
}

// Trigger a local notification
async function triggerLocalNotification(notification) {
  try {
    console.log(`[SW] Triggering local notification: "${notification.taskTitle}"`);
    
    const options = {
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `task-reminder-${notification.taskTitle}`,
      renotify: true,
      requireInteraction: true,
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
        ...notification.data,
        isLocalNotification: true,
        timestamp: Date.now()
      },
    };

    await self.registration.showNotification(notification.title, options);
    
    console.log(`[SW] ✅ Local notification shown for: "${notification.taskTitle}"`);
  } catch (error) {
    console.error('[SW] Error triggering local notification:', error);
  }
}

// Sync offline notifications that couldn't be scheduled
async function syncPendingNotificationSchedules() {
  try {
    console.log('[SW] Syncing pending notification schedules...');
    
    const db = await openNotificationDB();
    const pendingSchedules = await getAllPendingSchedules(db);
    
    for (const schedule of pendingSchedules) {
      try {
        const response = await fetch('/api/push/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schedule.data)
        });
        
        if (response.ok) {
          await deletePendingSchedule(db, schedule.id);
          console.log('[SW] Successfully synced schedule:', schedule.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync schedule:', schedule.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error in syncPendingNotificationSchedules:', error);
  }
}

// IndexedDB functions for offline storage
async function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemoSparkNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores
      if (!db.objectStoreNames.contains('pendingSchedules')) {
        const store = db.createObjectStore('pendingSchedules', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('scheduledNotifications')) {
        const store = db.createObjectStore('scheduledNotifications', { keyPath: 'id', autoIncrement: true });
        store.createIndex('scheduledFor', 'scheduledFor');
        store.createIndex('taskTitle', 'taskTitle');
      }
    };
  });
}

async function storePendingSchedule(data) {
  const db = await openNotificationDB();
  const transaction = db.transaction(['pendingSchedules'], 'readwrite');
  const store = transaction.objectStore('pendingSchedules');
  
  return new Promise((resolve, reject) => {
    const request = store.add({
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function storeScheduledNotification(db, notification) {
  const transaction = db.transaction(['scheduledNotifications'], 'readwrite');
  const store = transaction.objectStore('scheduledNotifications');
  
  return new Promise((resolve, reject) => {
    const request = store.add(notification);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllPendingSchedules(db) {
  const transaction = db.transaction(['pendingSchedules'], 'readonly');
  const store = transaction.objectStore('pendingSchedules');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deletePendingSchedule(db, id) {
  const transaction = db.transaction(['pendingSchedules'], 'readwrite');
  const store = transaction.objectStore('pendingSchedules');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteScheduledNotification(db, id) {
  const transaction = db.transaction(['scheduledNotifications'], 'readwrite');
  const store = transaction.objectStore('scheduledNotifications');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function trackNotificationEvent(notificationId, eventType) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId,
        eventType,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('[SW] Failed to track notification event:', error);
  }
}

console.log('[SW] Service worker script loaded successfully');