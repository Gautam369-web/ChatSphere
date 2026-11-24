self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || "New message received",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: {
        url: data.url || "/chat",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title || "ChatSphere", options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/chat") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || "/chat");
      }
    })
  );
});
