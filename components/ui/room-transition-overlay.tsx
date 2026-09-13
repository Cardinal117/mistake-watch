"use client";
import { useEffect, useRef } from "react";
import { useRoomTransitions } from "./room-loading/provider";
type Props = {
  active: boolean;
  detail?: string;
  label: string;
  tone?: "amber" | "cyan";
};
/** Compatibility adapter: one global presentation, never a nested overlay. */
export function RoomTransitionOverlay({ active, detail, label }: Props) {
  const store = useRoomTransitions();
  const token = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (active) {
      token.current = store?.begin({
        kind: "action",
        label,
        detail,
        pending: true,
      });
    } else if (token.current !== undefined) {
      store?.releaseAction(token.current);
      token.current = undefined;
    }
  }, [active, detail, label, store]);
  useEffect(
    () => () => {
      if (token.current !== undefined) store?.releaseAction(token.current);
    },
    [store],
  );
  return null;
}
