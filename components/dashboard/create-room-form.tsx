"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import { Button, Input, RoomTransitionOverlay } from "@/components/ui";
import { markRoomTransition } from "@/lib/performance/room-transition";
import { createRoomAction } from "@/lib/rooms/actions";
import { cx } from "@/lib/ui";

type CreateRoomFormProps = {
  attached?: boolean;
};

export function CreateRoomForm({ attached = false }: CreateRoomFormProps) {
  return (
    <form
      action={createRoomAction}
      className={cx(
        "grid min-w-0 gap-3",
        attached
          ? "border-y border-white/10 bg-surface/35 p-3"
          : "rounded-xl border border-white/10 bg-surface-container/70 p-4 backdrop-blur-xl",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Input
          className="h-12"
          label="Room name"
          name="room-name"
          placeholder="Friday screening"
          required
        />
        <Input
          className="h-12"
          label="Your display name"
          name="display-name"
          placeholder="Mistake Host"
          required
        />
      </div>

      <label className="block space-y-2" htmlFor="room-mode">
        <span className="technical-label block text-on-surface-variant">
          Room mode
        </span>
        <select
          className="h-12 w-full rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface transition duration-200 focus:border-primary-fixed-dim focus:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim/20"
          defaultValue="watch"
          id="room-mode"
          name="room-mode"
        >
          <option value="watch">Watch</option>
          <option value="listen">Listen</option>
        </select>
      </label>

      <CreateRoomSubmitButton />
    </form>
  );
}

function CreateRoomSubmitButton() {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (pending) {
      markRoomTransition("Creating room");
    }
  }, [pending]);

  return (
    <>
      <RoomTransitionOverlay
        active={pending}
        detail="Setting up the invite, host session, and live room state."
        label="Creating room"
      />
      <Button
        aria-busy={pending}
        className="h-12"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        {pending ? "Creating room..." : "Create Room"}
      </Button>
    </>
  );
}
