// StudySpark Notification Service Worker
// Production version - handles background notifications and scheduling

const CACHE_NAME = 'studyspark-notifications-v1';

// Service Worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      handleScheduleNotification(data);
      break;
    case 'CANCEL_NOTIFICATION':
      handleCancelNotification(data);
      break;
    case 'CANCEL_ALL_NOTIFICATIONS':
      handleCancelAllNotifications();
      break;
    case 'GET_SCHEDULED_NOTIFICATIONS':
      handleGetScheduledNotifications(event);
      break;
  }
});

// Handle notification click events and action buttons
self.addEventListener('notificationclick', (event) => {
  const notificationData = event.notification.data || {};
  const { notificationId, relatedTaskId, relatedReminderId, type } = notificationData;
  const action = event.action; // Action button clicked (if any)
  
  event.notification.close();
  
  // Handle specific action buttons
  if (action) {
    event.waitUntil(handleNotificationAction(action, notificationData));
    return;
  }
  
  // Handle regular notification click (no action button)
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Try to focus existing StudySpark window
      for (const client of clients) {
        if (client.url.includes('localhost') || client.url.includes('studyspark')) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: { notificationId, relatedTaskId, relatedReminderId, type }
          });
          return;
        }
      }
      
      // Open new window if none exists
      self.clients.openWindow('/dashboard').then((client) => {
        if (client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: { notificationId, relatedTaskId, relatedReminderId, type }
          });
        }
      });
    })
  );
});

// Handle notification action buttons
async function handleNotificationAction(action, notificationData) {
  const { notificationId, relatedTaskId, relatedReminderId, type } = notificationData;
  
  try {
    switch (action) {
      case 'mark_complete':
        if (relatedTaskId) {
          await fetch('/api/push/actions/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: relatedTaskId, notificationId })
          });
          await updateNotificationStats('clicked');
        }
        break;
        
      case 'snooze_15':
        if (relatedTaskId) {
          await fetch('/api/push/actions/snooze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              taskId: relatedTaskId, 
              notificationId, 
              snoozeMinutes: 15 
            })
          });
          await updateNotificationStats('clicked');
        }
        break;
        
      case 'snooze_1h':
        if (relatedTaskId) {
          await fetch('/api/push/actions/snooze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              taskId: relatedTaskId, 
              notificationId, 
              snoozeMinutes: 60 
            })
          });
          await updateNotificationStats('clicked');
        }
        break;
        
      case 'view_task':
        // Open the app and focus on the specific task
        const clients = await self.clients.matchAll({ type: 'window' });
        let targetClient = null;
        
        for (const client of clients) {
          if (client.url.includes('localhost') || client.url.includes('studyspark')) {
            targetClient = client;
            break;
          }
        }
        
        if (targetClient) {
          targetClient.focus();
          targetClient.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'view_task',
            data: { notificationId, relatedTaskId, relatedReminderId, type }
          });
        } else {
          await self.clients.openWindow('/dashboard').then((client) => {
            if (client) {
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: 'view_task',
                data: { notificationId, relatedTaskId, relatedReminderId, type }
              });
            }
          });
        }
        await updateNotificationStats('clicked');
        break;
        
      default:
        console.log('Unknown notification action:', action);
    }
  } catch (error) {
    console.error('Failed to handle notification action:', error);
  }
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  updateNotificationStats('dismissed');
});

// Handle push events from server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { notification } = data;
    
    const options = {
      body: notification.body,
      icon: notification.icon || '/favicon.ico',
      badge: notification.badge || '/favicon.ico',
      data: notification.data || {},
      tag: notification.tag || `push-${Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
      vibrate: notification.vibrate || [200, 100, 200],
      timestamp: notification.timestamp || Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(notification.title, options)
        .then(() => updateNotificationStats('sent'))
        .catch(error => console.error('Failed to show push notification:', error))
    );
  } catch (error) {
    console.error('Failed to process push event:', error);
  }
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(self.VAPID_PUBLIC_KEY)
    }).then(subscription => {
      return fetch('/api/push/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEndpoint: event.oldSubscription?.endpoint,
          newSubscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          }
        })
      });
    }).catch(error => console.error('Failed to re-subscribe:', error))
  );
});

// Schedule a notification
async function handleScheduleNotification(notificationData) {
  try {
    const { notification } = notificationData;
    const scheduledTime = new Date(notification.scheduledTime);
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      await showNotification(notification);
      return;
    }
    
    await storeNotification({
      ...notification,
      swTimeoutId: setTimeout(() => {
        showNotification(notification);
        removeStoredNotification(notification.id);
      }, delay)
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

// Cancel a notification
async function handleCancelNotification(data) {
  try {
    const { notificationId } = data;
    const stored = await getStoredNotification(notificationId);
    
    if (stored && stored.swTimeoutId) {
      clearTimeout(stored.swTimeoutId);
    }
    
    await removeStoredNotification(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

// Cancel all notifications
async function handleCancelAllNotifications() {
  try {
    const allNotifications = await getAllStoredNotifications();
    
    for (const notification of allNotifications) {
      if (notification.swTimeoutId) {
        clearTimeout(notification.swTimeoutId);
      }
    }
    
    await clearAllStoredNotifications();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

// Get scheduled notifications
async function handleGetScheduledNotifications(event) {
  try {
    const notifications = await getAllStoredNotifications();
    event.ports[0].postMessage({
      type: 'SCHEDULED_NOTIFICATIONS_RESPONSE',
      data: notifications.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduledTime: n.scheduledTime,
        type: n.type
      }))
    });
  } catch (error) {
    event.ports[0].postMessage({
      type: 'SCHEDULED_NOTIFICATIONS_ERROR',
      error: error.message
    });
  }
}

// Show notification
async function showNotification(notification) {
  try {
    const options = {
      body: notification.body,
      icon: notification.icon || '/favicon.ico',
      badge: notification.badge || '/favicon.ico',
      data: {
        notificationId: notification.id,
        relatedTaskId: notification.relatedTaskId,
        relatedReminderId: notification.relatedReminderId,
        type: notification.type
      },
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
      tag: notification.id,
      renotify: true,
      timestamp: Date.now()
    };
    
    if (notification.vibrate !== false) {
      options.vibrate = [200, 100, 200];
    }
    
    await self.registration.showNotification(notification.title, options);
    await updateNotificationStats('sent');
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// IndexedDB operations
async function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StudySparkNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('notifications')) {
        const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notificationStore.createIndex('scheduledTime', 'scheduledTime');
        notificationStore.createIndex('type', 'type');
      }
      
      if (!db.objectStoreNames.contains('stats')) {
        db.createObjectStore('stats', { keyPath: 'key' });
      }
    };
  });
}

async function storeNotification(notification) {
  const db = await openNotificationDB();
  const transaction = db.transaction(['notifications'], 'readwrite');
  const store = transaction.objectStore('notifications');
  
  const { swTimeoutId, ...notificationData } = notification;
  
  return new Promise((resolve, reject) => {
    const request = store.put(notificationData);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getStoredNotification(id) {
  const db = await openNotificationDB();
  const transaction = db.transaction(['notifications'], 'readonly');
  const store = transaction.objectStore('notifications');
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeStoredNotification(id) {
  const db = await openNotificationDB();
  const transaction = db.transaction(['notifications'], 'readwrite');
  const store = transaction.objectStore('notifications');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllStoredNotifications() {
  const db = await openNotificationDB();
  const transaction = db.transaction(['notifications'], 'readonly');
  const store = transaction.objectStore('notifications');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function clearAllStoredNotifications() {
  const db = await openNotificationDB();
  const transaction = db.transaction(['notifications'], 'readwrite');
  const store = transaction.objectStore('notifications');
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function updateNotificationStats(type) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['stats'], 'readwrite');
    const store = transaction.objectStore('stats');
    
    const today = new Date().toDateString();
    const key = `stats_${today}`;
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result || {
          key,
          totalSent: 0,
          totalClicked: 0,
          totalDismissed: 0,
          lastUpdated: today
        };
        
        switch (type) {
          case 'sent':
            existing.totalSent++;
            break;
          case 'clicked':
            existing.totalClicked++;
            break;
          case 'dismissed':
            existing.totalDismissed++;
            break;
        }
        
        existing.lastUpdated = new Date().toISOString();
        
        const putRequest = store.put(existing);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(putRequest.result);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Failed to update notification stats:', error);
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Restore scheduled notifications on startup
(async function restoreScheduledNotifications() {
  try {
    const notifications = await getAllStoredNotifications();
    const now = new Date();
    
    for (const notification of notifications) {
      const scheduledTime = new Date(notification.scheduledTime);
      const delay = scheduledTime.getTime() - now.getTime();
      
      if (delay <= 0) {
        await showNotification(notification);
        await removeStoredNotification(notification.id);
      } else {
        setTimeout(() => {
          showNotification(notification);
          removeStoredNotification(notification.id);
        }, delay);
      }
    }
  } catch (error) {
    console.error('Failed to restore scheduled notifications:', error);
  }
})(); 