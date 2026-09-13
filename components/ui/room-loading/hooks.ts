"use client";
import { useCallback, useLayoutEffect, type CSSProperties } from "react";
import { readableWatchAccent } from "@/components/room/watch/watch-accent";
import { useRoomTransitions } from "./provider";
import type { RoomMode } from "@/lib/room-transition/store";
export function useModeTransition(
  onSwitchMode?: (mode: RoomMode) => Promise<void>,
) {
  const store = useRoomTransitions();
  return useCallback(
    async (mode: RoomMode) => {
      if (!onSwitchMode) return;
      const id = store?.mode(mode);
      if (id === null) return;
      try {
        await onSwitchMode(mode);
        if (id !== undefined) store?.settle(id);
      } catch (error) {
        if (id !== undefined)
          store?.fail(
            id,
            error instanceof Error
              ? error.message
              : "Room mode could not be changed.",
          );
        throw error;
      }
    },
    [onSwitchMode, store],
  );
}
export function useRoomShellReady(
  roomId: string,
  mode: RoomMode,
  epoch: number,
) {
  const store = useRoomTransitions();
  useLayoutEffect(() => {
    store?.mounted(roomId, mode, epoch);
    return () => store?.unmounted(roomId, mode, epoch);
  }, [store, roomId, mode, epoch]);
}
/** Publish the existing extraction result, never wait for artwork to load. */
export function useRoomBrandTheme(roomId: string, style: CSSProperties) {
  const store = useRoomTransitions();
  const variables = style as Record<string, string>;
  const primary = variables["--listen-primary"];
  const secondary = variables["--listen-secondary"];
  const background = variables["--listen-background-primary"];
  useLayoutEffect(() => {
    const valid = (value: string | undefined, fallback: string) =>
      value &&
      /^\d{1,3} \d{1,3} \d{1,3}$/.test(value) &&
      value.split(" ").every((v) => +v <= 255)
        ? value
        : fallback;
    store?.theme(roomId, {
      primary: readableWatchAccent(valid(primary, "232 182 87")),
      secondary: readableWatchAccent(valid(secondary, "83 201 237")),
      background: valid(background, "16 22 25"),
    });
  }, [store, roomId, primary, secondary, background]);
}
