"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui";
import { createSharedRoomAction } from "@/lib/rooms/shared-actions";
export function SharedRoomEntry() {
  const router = useRouter();
  const [name, setName] = useState("");
  const requestId = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      aria-label="Create Shared room"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-white/10 bg-surface-container-low/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            const r = await createSharedRoomAction(
              name,
              (requestId.current ??= crypto.randomUUID()),
            );
            if (r.error) setError(r.error);
            else router.push(`/rooms/${r.roomId}`);
          } catch {
            setError("Could not create the room. Please retry.");
          }
        });
      }}
    >
      <label className="grid min-w-0 flex-1 gap-2 text-label-sm">
        Shared room name
        <input
          className="h-11 min-w-0 rounded-md border border-white/10 bg-surface-container px-3 text-on-surface"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday night"
        />
      </label>
      <Button type="submit" disabled={pending}>
        <Users className="h-4 w-4" aria-hidden />
        {pending ? "Creating…" : "Create Shared room"}
      </Button>
      <p className="w-full text-label-sm text-on-surface-variant">
        Invite friends, approve who joins, and keep a room you can return to.
      </p>
      {error && (
        <p role="alert" className="w-full text-label-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
