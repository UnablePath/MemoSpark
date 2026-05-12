'use strict';

const CACHE_NAME = 'memospark-v2';
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192x192.png'];

function awaitTxnComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () =>
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function awaitRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        )),
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (
          res.ok &&
          event.request.method === 'GET' &&
          url.origin === self.location.origin &&
          event.request.destination !== 'video' &&
          event.request.destination !== 'audio'
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MemoSpark', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icons/icon-192x192.png',
      badge: data.badge ?? '/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag ?? 'memospark-default',
      renotify: true,
      requireInteraction: data.requireInteraction ?? false,
      actions: data.actions ?? [],
      data: {
        url: data.url ?? '/',
        notificationId: data.notificationId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const url =
    typeof data.url === 'string' && data.url.length ? data.url : '/';
  const notificationId = data.notificationId;
  let sourceType = data.sourceType;
  let sourceId = data.sourceId;
  const action = event.action;

  if (notificationId) {
    event.waitUntil(
      fetch('/api/push/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ notificationId }),
      }).catch(() =>
        queueAction('read', { notificationId }),
      ),
    );
  }

  if (typeof sourceId !== 'string' || !sourceId) {
    if (data.taskId != null) {
      sourceId = String(data.taskId);
      sourceType = 'task';
    } else if (data.reminderId != null) {
      sourceId = String(data.reminderId);
      sourceType = 'reminder';
    }
  }

  if (action === 'complete' && sourceId) {
    event.waitUntil(
      fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: sourceId,
          type: sourceType === 'reminder' ? 'reminder' : 'task',
        }),
      }).catch(() =>
        queueAction('complete', {
          id: sourceId,
          type: sourceType === 'reminder' ? 'reminder' : 'task',
        }),
      ),
    );
    return;
  }

  if (action === 'snooze' && sourceId) {
    event.waitUntil(
      fetch('/api/tasks/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: sourceId,
          type: sourceType === 'reminder' ? 'reminder' : 'task',
          minutes: 10,
        }),
      }).catch(() =>
        queueAction('snooze', {
          id: sourceId,
          type: sourceType === 'reminder' ? 'reminder' : 'task',
          minutes: 10,
        }),
      ),
    );
    return;
  }

  const target = typeof url === 'string' ? url : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (list) => {
        for (const client of list) {
          const clientUrl =
            typeof client.url === 'string' ? client.url : '';
          if (
            clientUrl.includes(self.location.origin) &&
            'focus' in client &&
            typeof client.focus === 'function'
          ) {
            return client.focus().then(() => {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: target,
                notificationId,
                sourceType,
                sourceId,
              });
            });
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
      },
    ),
  );
});

const ACTION_STORE_NAME = 'actions';

async function queueAction(type, payload) {
  const db = await openDb();
  const tx = db.transaction(ACTION_STORE_NAME, 'readwrite');
  tx.objectStore(ACTION_STORE_NAME).add({
    type,
    payload,
    queuedAt: Date.now(),
  });
  await awaitTxnComplete(tx);
  await self.registration.sync.register('replay-actions').catch(() => {});
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-actions') {
    event.waitUntil(replayQueuedActions());
  }
});

async function replayQueuedActions() {
  const db = await openDb();
  const tx = db.transaction(ACTION_STORE_NAME, 'readwrite');
  const store = tx.objectStore(ACTION_STORE_NAME);
  const all = typeof store.getAll === 'function'
    ? await awaitRequest(store.getAll())
    : [];

  for (const item of all) {
    try {
      if (item.type === 'complete') {
        await fetch('/api/tasks/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(item.payload),
        });
      } else if (item.type === 'snooze') {
        await fetch('/api/tasks/snooze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(item.payload),
        });
      } else if (item.type === 'read') {
        await fetch('/api/push/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(item.payload),
        });
      }
      await awaitRequest(store.delete(item.id));
    } catch {}
  }

  await awaitTxnComplete(tx);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('memospark-sw', 1);
    req.onupgradeneeded = () => {
      const dbResult = req.result;
      if (!dbResult.objectStoreNames.contains(ACTION_STORE_NAME)) {
        dbResult.createObjectStore(ACTION_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
