export type SystemNoticePermission = "default" | "granted" | "denied" | "unsupported";

export type SystemNoticeChannel = {
  permission: SystemNoticePermission;
  requestPermission: () => Promise<"default" | "granted" | "denied">;
  show: (title: string, body: string) => void;
};

export const ROUTE_NOTICE_TITLE = "CodeQuest";

export async function deliverSystemNotice(message: string, channel: SystemNoticeChannel): Promise<void> {
  if (channel.permission === "unsupported") return;
  const permission =
    channel.permission === "default" ? await channel.requestPermission() : channel.permission;
  if (permission !== "granted") return;
  channel.show(ROUTE_NOTICE_TITLE, message);
}

export async function showBrowserRouteNotice(message: string): Promise<void> {
  const channel = browserSystemChannel();
  if (!channel) return;
  await deliverSystemNotice(message, channel);
}

export function prepareBrowserSystemNotices(): void {
  const channel = browserSystemChannel();
  if (!channel || channel.permission !== "default") {
    registerRouteNoticeWorker();
    return;
  }
  void channel.requestPermission().finally(registerRouteNoticeWorker);
}

function browserSystemChannel(): SystemNoticeChannel | null {
  if (typeof Notification === "undefined") return null;
  return {
    permission: Notification.permission,
    requestPermission: async () => {
      const result = await Notification.requestPermission();
      if (result === "granted" || result === "denied") return result;
      return "default";
    },
    show: (title, body) => {
      void showInTray(title, body);
    },
  };
}

async function showInTray(title: string, body: string): Promise<void> {
  const registration = await routeNoticeRegistration();
  if (registration) {
    await registration.showNotification(title, { body, tag: "codequest-route" });
    return;
  }
  new Notification(title, { body });
}

async function routeNoticeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

function registerRouteNoticeWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/route-notice-sw.js").catch(() => undefined);
}
