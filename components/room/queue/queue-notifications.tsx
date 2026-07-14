"use client";

import { useEffect, useRef, useState } from "react";

import type { LiveRoomError } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import type { QueueNotification } from "./contracts";

const roomErrorToneBySeverity = {
  error: "error",
  info: "info",
  warning: "warning",
} satisfies Record<LiveRoomError["severity"], QueueNotification["tone"]>;

export function useQueueNotifications(roomErrors: LiveRoomError[]) {
  const [notifications, setNotifications] = useState<QueueNotification[]>([]);
  const notifiedRoomErrorIds = useRef<Set<string> | null>(null);

  function notify(message: string, tone: QueueNotification["tone"] = "info") {
    const id = window.crypto.randomUUID();

    setNotifications((current) => [
      ...current.slice(-3),
      { id, message, tone },
    ]);
    window.setTimeout(() => {
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    }, 4200);
  }

  useEffect(() => {
    if (notifiedRoomErrorIds.current === null) {
      notifiedRoomErrorIds.current = new Set(
        roomErrors.map((error) => error.errorId),
      );
      return;
    }

    const seen = notifiedRoomErrorIds.current;

    for (const error of roomErrors) {
      if (seen.has(error.errorId)) {
        continue;
      }

      seen.add(error.errorId);
      notify(error.message, roomErrorToneBySeverity[error.severity]);
    }
  }, [roomErrors]);

  return { notifications, notify };
}

export function QueueNotifications({
  notifications,
}: {
  notifications: QueueNotification[];
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[130] grid w-[min(22rem,calc(100vw-2rem))] gap-2"
    >
      {notifications.map((notification) => (
        <div
          className={cx(
            "rounded-md border bg-surface/95 p-3 text-label-sm shadow-[0_0_32px_rgb(0_0_0_/_0.38)] backdrop-blur-xl",
            notification.tone === "success" &&
              "border-primary-fixed-dim/35 text-primary-fixed-dim",
            notification.tone === "warning" &&
              "border-secondary-fixed-dim/35 text-secondary-fixed-dim",
            notification.tone === "error" && "border-error/40 text-error",
            notification.tone === "info" &&
              "border-white/10 text-on-surface-variant",
          )}
          key={notification.id}
          role={notification.tone === "error" ? "alert" : "status"}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}
