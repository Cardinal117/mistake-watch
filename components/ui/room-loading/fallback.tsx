"use client";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useRoomTransitions } from "./provider";
import { RoomLoadingScreen } from "./screen";
import "./room-loading.css";
const waiting = {
  id: 0,
  kind: "room" as const,
  pending: true,
  label: "Opening your room",
  startedAt: 0,
};
/** Server-streamed fallback shares the appearance; the persistent host wins after hydration. */
export function RoomLoadingFallback({
  error,
  retry,
  label,
  detail,
}: {
  error?: string;
  retry?: () => void;
  label?: string;
  detail?: string;
} = {}) {
  const store = useRoomTransitions();
  const active = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => null),
    () => null,
  );
  const router = useRouter();
  return active ? null : (
    <RoomLoadingScreen
      state={{
        ...waiting,
        label: label ?? waiting.label,
        detail,
        error,
        retry,
        pending: !error,
      }}
      onBack={() => router.push("/")}
      onDismiss={() => {}}
    />
  );
}
/** Release a previous navigation when the route resolves to a gate or error instead of a room. */
export function RoomLoadingResolved() {
  const store = useRoomTransitions();
  useLayoutEffect(() => {
    store?.cancel();
  }, [store]);
  return null;
}
