"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  changeRoomDirectionAction,
  readRoomDirectionAction,
  type RoomDirection,
} from "@/lib/rooms/themed-actions";

export function RoomDirectionPanel({
  roomId,
  listenTone = false,
}: {
  roomId: string;
  listenTone?: boolean;
}) {
  const [saved, setSaved] = useState<
    (RoomDirection & { editable?: boolean }) | null
  >(null);
  const [direction, setDirection] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function apply(value: (RoomDirection & { editable?: boolean }) | null) {
    setSaved(value);
    setDirection(value?.direction ?? "");
    setExclusions(value?.exclusions ?? "");
  }
  useEffect(() => {
    let active = true;
    readRoomDirectionAction(roomId)
      .then((value) => {
        if (active) apply(value);
      })
      .catch(() => {
        if (active) setMessage("Could not load direction. Please reload.");
      });
    return () => {
      active = false;
    };
  }, [roomId]);
  return (
    <section aria-label="Room direction" className="grid min-w-0 gap-3">
      <h3>Room direction</h3>
      <p className="text-label-sm text-on-surface-variant">
        Only the owner changes this direction. Playing unrelated media will not
        change it. Theme-filtered recommendations are not ready yet.
      </p>
      <Button
        style={
          listenTone
            ? {
                color: "rgb(var(--listen-primary))",
                borderColor: "rgb(var(--listen-primary) / 0.45)",
                boxShadow: "none",
              }
            : undefined
        }
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              apply(await readRoomDirectionAction(roomId));
              setMessage("");
            } catch {
              setMessage("Could not reload direction. Please retry.");
            }
          })
        }
      >
        Reload direction
      </Button>
      {saved && !saved.editable && (
        <div className="grid gap-2 text-label-sm">
          <p className="whitespace-pre-wrap break-words">{saved.direction}</p>
          {saved.exclusions && (
            <p className="whitespace-pre-wrap break-words">
              Exclude: {saved.exclusions}
            </p>
          )}
          <p>Direction version {saved.version}</p>
        </div>
      )}
      {saved?.editable && (
        <form
          className="grid min-w-0 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              try {
                const result = await changeRoomDirectionAction(
                  roomId,
                  saved.version,
                  direction,
                  exclusions,
                );
                if (result.error) setMessage(result.error);
                else if (result.direction) {
                  apply({ ...result.direction, editable: true });
                  setMessage("Room direction saved.");
                }
              } catch {
                setMessage("Could not save direction. Please retry.");
              }
            });
          }}
        >
          <p className="text-label-sm">Direction version {saved.version}</p>
          <label className="grid gap-2 text-label-sm">
            Direction
            <textarea
              required
              maxLength={500}
              rows={4}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full min-w-0 rounded-md border border-white/10 bg-surface-container p-3 text-on-surface"
            />
          </label>
          <label className="grid gap-2 text-label-sm">
            Exclude
            <textarea
              maxLength={500}
              rows={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              className="w-full min-w-0 rounded-md border border-white/10 bg-surface-container p-3 text-on-surface"
            />
          </label>
          <Button
            style={
              listenTone
                ? {
                    background: "rgb(var(--listen-primary))",
                    color: "#131314",
                    boxShadow: "none",
                  }
                : undefined
            }
            type="submit"
            disabled={pending || !direction.trim()}
          >
            {pending ? "Saving…" : "Change room direction"}
          </Button>
        </form>
      )}
      <p role="status" className="text-label-sm">
        {message}
      </p>
    </section>
  );
}
