self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((windowClient) => windowClient.url.startsWith(self.location.origin));
      if (open) return open.focus();
      return self.clients.openWindow("/");
    }),
  );
});
