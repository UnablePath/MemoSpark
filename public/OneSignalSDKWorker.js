// OneSignal Service Worker Integration
// This file integrates OneSignal with StudySpark's main service worker

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Ensure OneSignal doesn't interfere with our main service worker
// Only handle OneSignal-specific push notifications
self.addEventListener('push', (event) => {
  console.log('[OneSignal SW] Push received:', event);
  
  // Check if this is a OneSignal notification
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.custom && data.custom.i) {
        // This is a OneSignal notification - let OneSignal handle it
        console.log('[OneSignal SW] Handling OneSignal notification');
        return;
      }
    } catch (e) {
      // Not JSON or not OneSignal format
    }
  }
  
  // If not OneSignal notification, don't handle it here
  // Let the main service worker handle it
});

console.log('[OneSignal SW] OneSignal service worker initialized'); 