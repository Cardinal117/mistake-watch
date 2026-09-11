"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { RoomQueueItem } from "@/lib/rooms";
import type { QueueAddInput } from "../listen/shared";
import { parseYouTubeVideoId } from "@/lib/player/source";

type PendingAdd = { roomId: string; input: QueueAddInput; deadline: number };
export const OptimisticQueueContext = createContext<{
  retry(id: string): void;
  dismiss(id: string): void;
} | null>(null);

/** Shared Listen presentation only. Canonical playback/preparation never consumes these rows. */
export function useOptimisticAdds(
  roomId: string,
  items: RoomQueueItem[],
  allowed: boolean,
  send: (input: QueueAddInput) => void | Promise<void>,
) {
  const [pending, setPending] = useState<PendingAdd[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const attempts = useRef(new Map<string, symbol>());
  const currentRoom = useRef(roomId);
  useEffect(() => {
    currentRoom.current = roomId;
    const active = attempts.current;
    return () => {
      active.clear();
    };
  }, [roomId]);
  useEffect(() => {
    if (!pending.length) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending.length]);
  useEffect(() => {
    const confirmed = new Set(
      items.map((item) => item.clientActionId).filter(Boolean),
    );
    if (!confirmed.size) return;
    const frame = requestAnimationFrame(() => {
      for (const id of confirmed) attempts.current.delete(id!);
      setPending((current) =>
        current.filter(
          (p) => p.roomId === roomId && !confirmed.has(p.input.clientActionId),
        ),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [items, roomId]);
  async function submit(input: QueueAddInput) {
    if (!allowed)
      throw new Error("Queue permission or connection is unavailable.");
    const clientActionId = input.clientActionId ?? crypto.randomUUID();
    if (!attempts.current.has(clientActionId) && attempts.current.size >= 32)
      throw new Error("Wait for pending queue additions before adding more.");
    const token = Symbol(clientActionId);
    attempts.current.set(clientActionId, token);
    const request = { ...input, clientActionId };
    setPending((current) => [
      ...current.filter(
        (p) => p.roomId === roomId && p.input.clientActionId !== clientActionId,
      ),
      { roomId, input: request, deadline: Date.now() + 12000 },
    ]);
    try {
      await send(request);
    } catch (error) {
      if (
        currentRoom.current === roomId &&
        attempts.current.get(clientActionId) === token
      ) {
        attempts.current.delete(clientActionId);
        setPending((current) =>
          current.filter((p) => p.input.clientActionId !== clientActionId),
        );
        throw error;
      }
    }
  }
  const confirmed = new Set(
    items.map((item) => item.clientActionId).filter(Boolean),
  );
  const provisional: RoomQueueItem[] = pending
    .filter(
      (p) => p.roomId === roomId && !confirmed.has(p.input.clientActionId),
    )
    .map(({ input, deadline }) => ({
      id: `pending:${input.clientActionId}`,
      clientActionId: input.clientActionId,
      pendingAdd: deadline <= now ? "unconfirmed" : "sending",
      addedBy: "You",
      title: input.sourceTitle,
      status: "queued",
      duration: input.durationSeconds
        ? `${Math.floor(input.durationSeconds / 60)}:${String(input.durationSeconds % 60).padStart(2, "0")}`
        : "—",
      ...input,
      videoId: parseYouTubeVideoId(input.sourceUrl) ?? undefined,
    }));
  const projected = [...items];
  for (const item of provisional) {
    const firstQueued = projected.findIndex((row) => row.status === "queued");
    const firstPlayed = projected.findIndex((row) => row.status === "played");
    const at =
      item.isPlayNext && firstQueued >= 0
        ? firstQueued
        : firstPlayed >= 0
          ? firstPlayed
          : projected.length;
    projected.splice(at, 0, item);
  }
  function add(input: QueueAddInput) {
    const request = submit(input);
    // Legacy void handlers remain safe; callers that await still receive rejection.
    void request.catch(() => {});
    return request;
  }
  const actions = {
    retry(id: string) {
      const entry = pending.find(
        (p) =>
          p.roomId === roomId && `pending:${p.input.clientActionId}` === id,
      );
      if (entry) void add(entry.input).catch(() => {});
    },
    dismiss(id: string) {
      setPending((current) =>
        current.filter((p) => `pending:${p.input.clientActionId}` !== id),
      );
      attempts.current.delete(id.replace(/^pending:/, ""));
    },
  };
  return { items: projected, add, actions };
}
