"use client";
import { useRef, useState } from "react";
import type { LiveRoomState } from "@/lib/spacetime";

/** Listen's inline title interaction, using the same durable + realtime rename action. */
export function WatchRoomName({
  name,
  liveRoom,
}: {
  name: string;
  liveRoom: LiveRoomState;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelling = useRef(false);
  const pending = useRef(false);
  const allowed =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";
  async function commit() {
    if (cancelling.current) {
      cancelling.current = false;
      return;
    }
    const next = (draft ?? name).trim().replace(/\s+/g, " ");
    if (!allowed || !next || next === name) {
      setDraft(null);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await liveRoom.renameRoom(next);
      setDraft(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Room name could not be saved. Try again.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <div
      className="watch-room-name"
      style={{
        width: `${Math.min(Math.max((draft ?? name).length + 1, 8), 34)}ch`,
      }}
    >
      <input
        aria-label="Room name"
        title={allowed ? "Rename room — Enter to save, Escape to cancel" : name}
        value={draft ?? name}
        disabled={!allowed || saving}
        aria-busy={saving}
        aria-invalid={!!error}
        aria-describedby={error ? "watch-rename-status" : undefined}
        onChange={(e) => {
          setDraft(e.currentTarget.value);
          setError(null);
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            cancelling.current = true;
            setDraft(null);
            setError(null);
            e.currentTarget.blur();
          }
        }}
      />
      <span className="sr-only" aria-live="polite">
        {saving ? "Saving room name" : ""}
      </span>
      {error && (
        <p id="watch-rename-status" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
