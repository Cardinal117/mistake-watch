"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui";
import { createThemedRoomAction } from "@/lib/rooms/themed-actions";
export function ThemedRoomEntry() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [direction, setDirection] = useState("");
  const request = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      aria-label="Create Themed room"
      className="mb-4 grid min-w-0 gap-3 rounded-md border border-white/10 bg-surface-container-low/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            const result = await createThemedRoomAction(
              name,
              direction,
              "",
              (request.current ??= crypto.randomUUID()),
            );
            if (result.error) setError(result.error);
            else router.push(`/rooms/${result.roomId}`);
          } catch {
            setError("Could not create the room. Please retry.");
          }
        });
      }}
    >
      <label className="grid gap-2 text-label-sm">
        Themed room name
        <input
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 min-w-0 rounded-md border border-white/10 bg-surface-container px-3 text-on-surface"
          placeholder="Fantasy evenings"
        />
      </label>
      <label className="grid gap-2 text-label-sm">
        Room direction
        <textarea
          required
          maxLength={500}
          rows={2}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="w-full min-w-0 rounded-md border border-white/10 bg-surface-container p-3 text-on-surface"
          placeholder="Orchestral fantasy and quiet adventure"
        />
      </label>
      <Button disabled={pending} type="submit">
        <Compass className="h-4 w-4" aria-hidden />
        {pending ? "Creating…" : "Create Themed room"}
      </Button>
      <p className="text-label-sm text-on-surface-variant">
        Keep an explicit direction while choosing media yourself. Theme-filtered
        recommendations are still being developed.
      </p>
      {error && (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
