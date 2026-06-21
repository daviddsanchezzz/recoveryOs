self.addEventListener('push', (event) => {
  let data = { title: 'RecoveryOS', body: '' };
  try { data = event.data?.json() ?? data; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/app'));
});
