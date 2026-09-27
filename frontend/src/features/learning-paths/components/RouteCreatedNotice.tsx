"use client";

import { useEffect, useRef } from "react";
import type { MyRouteSummary } from "../lib/load-my-routes";
import { routeCreatedMessage } from "../lib/route-created-notice";
import { prepareBrowserSystemNotices, showBrowserRouteNotice } from "../lib/system-route-notice";
import { subscribeLearningPathEvents, subscribeLiveRouteEvents } from "../lib/subscribe-learning-paths";

type LiveMessage = { event?: string; data?: Record<string, unknown> };

export function RouteCreatedNotice({
  onNotify,
  subscribeCreated = subscribeLearningPathEvents,
  subscribeLive = subscribeLiveRouteEvents,
  showSystem = showBrowserRouteNotice,
  prepareSystem = prepareBrowserSystemNotices,
}: {
  onNotify: (message: string) => void;
  subscribeCreated?: (onCreated: (route: MyRouteSummary) => void) => () => void;
  subscribeLive?: (onEvent: (message: LiveMessage) => void) => () => void;
  showSystem?: (message: string) => void;
  prepareSystem?: () => void;
}) {
  const notifyRef = useRef(onNotify);
  const showSystemRef = useRef(showSystem);
  notifyRef.current = onNotify;
  showSystemRef.current = showSystem;
  const seen = useRef(new Set<string>());

  useEffect(() => {
    prepareSystem();
  }, [prepareSystem]);

  useEffect(() => {
    const announce = (event: string, data: Record<string, unknown>) => {
      const title = textField(data, "title") ?? textField(data, "source_path_id");
      const message = routeCreatedMessage({
        event,
        title,
        replayed: data.replayed === true,
      });
      if (!message) return;
      const id = textField(data, "id");
      const key = `${event}:${id ?? title ?? message}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      notifyRef.current(message);
      showSystemRef.current(message);
    };
    const stopCreated = subscribeCreated((route) => {
      announce("path_created", { id: route.id, title: route.title });
    });
    const stopLive = subscribeLive((message) => {
      announce(message.event ?? "", message.data ?? {});
    });
    return () => {
      stopCreated();
      stopLive();
    };
  }, [subscribeCreated, subscribeLive]);

  return null;
}

function textField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
