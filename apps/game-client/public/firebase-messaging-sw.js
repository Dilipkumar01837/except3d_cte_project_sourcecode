/* Firebase is initialized after the page sends the environment-backed config. */
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js',
);
let messaging;
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'firebase-config' || messaging) return;
  firebase.initializeApp(event.data.config);
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification ?? {};
    const data = payload.data ?? {};
    self.registration.showNotification(notification.title ?? 'Code to Escape', {
      body: notification.body ?? '',
      icon: '/vite.svg',
      data: { url: data.url ?? '/' },
    });
  });
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows[0];
      if (existing) {
        existing.focus();
        void existing.navigate(url);
      } else void clients.openWindow(url);
    }),
  );
});
