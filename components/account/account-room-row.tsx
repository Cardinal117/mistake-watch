"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookmarkCheck,
  BookmarkX,
  Clock3,
  DoorClosed,
  Headphones,
  LogOut,
  Video,
} from "lucide-react";

import { Badge, Button, PendingLink, buttonClassName } from "@/components/ui";
import { manageAccountRoomAction } from "@/lib/account/actions";
import {
  getAccountRoomCommands,
  type AccountRoomCommand,
} from "@/lib/account/room-management-policy";
import type { AccountRoomSummary } from "@/lib/account/room-projection";

type AccountRoomRowProps = {
  currentRoomId?: string;
  onChanged(): void;
  room: AccountRoomSummary;
};

const commandConfig = {
  archive: {
    confirm: "Remove this closed room from your account history?",
    icon: Archive,
    label: "Archive",
  },
  close: {
    confirm: "Close this room for everyone and keep it in your history?",
    icon: DoorClosed,
    label: "Close",
  },
  leave: {
    confirm: "Leave this room and remove it from your account?",
    icon: LogOut,
    label: "Leave",
  },
  "remove-save": {
    confirm: "Remove this room from your saved spaces?",
    icon: BookmarkX,
    label: "Unsave",
  },
} satisfies Record<
  AccountRoomCommand,
  { confirm: string; icon: typeof Archive; label: string }
>;

export function AccountRoomRow({
  currentRoomId,
  onChanged,
  room,
}: AccountRoomRowProps) {
  const router = useRouter();
  const ModeIcon = room.mode === "listen" ? Headphones : Video;
  const isOpen = room.status === "open";
  const commands = getAccountRoomCommands(room);
  const [confirmation, setConfirmation] = useState<AccountRoomCommand | null>(
    null,
  );
  const [pending, setPending] = useState<AccountRoomCommand | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCommand(command: AccountRoomCommand) {
    if (pending) return;

    setPending(command);
    setError(null);

    try {
      await manageAccountRoomAction({ command, roomId: room.id });
      setConfirmation(null);
      onChanged();

      if (
        currentRoomId === room.id &&
        (command === "close" || command === "leave")
      ) {
        router.push("/");
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The room action could not be completed.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ModeIcon
            className={
              room.mode === "listen"
                ? "h-4 w-4 shrink-0 text-secondary-fixed-dim"
                : "h-4 w-4 shrink-0 text-primary-fixed-dim"
            }
            aria-hidden
          />
          <h5 className="min-w-0 truncate text-body-md font-semibold text-on-surface">
            {room.name}
          </h5>
          <Badge tone={relationshipTone(room.relationship)}>
            {relationshipLabel(room.relationship)}
          </Badge>
          {room.isSaved ? (
            <BookmarkCheck
              aria-label="Saved room"
              className="h-4 w-4 text-primary-fixed-dim"
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
          <span className="capitalize">{room.mode} room</span>
          <span>{isOpen ? "Open" : "Closed"}</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {formatLastActive(room.lastActiveAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {isOpen ? (
          <PendingLink
            className={buttonClassName({
              className: "w-full sm:w-auto",
              size: "sm",
              variant: "secondary",
            })}
            href={`/rooms/${room.id}`}
            loadingDetail="Opening the room with your account membership."
            loadingLabel="Opening room"
            tone={room.mode === "listen" ? "amber" : "cyan"}
          >
            Open
          </PendingLink>
        ) : (
          <Badge className="w-fit" tone="neutral">
            Closed
          </Badge>
        )}
        {commands.map((command) => {
          const config = commandConfig[command];
          const CommandIcon = config.icon;

          return (
            <Button
              aria-label={`${config.label} ${room.name}`}
              disabled={Boolean(pending)}
              key={command}
              onClick={() => setConfirmation(command)}
              size="sm"
              variant={command === "remove-save" ? "ghost" : "danger"}
            >
              <CommandIcon className="h-4 w-4" aria-hidden />
              {config.label}
            </Button>
          );
        })}
      </div>

      {confirmation ? (
        <div className="grid gap-3 border-t border-white/10 pt-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-label-sm text-on-surface-variant">
            {commandConfig[confirmation].confirm}
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              disabled={Boolean(pending)}
              onClick={() => setConfirmation(null)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={Boolean(pending)}
              onClick={() => void runCommand(confirmation)}
              size="sm"
              variant="danger"
            >
              {pending
                ? "Working..."
                : `Confirm ${commandConfig[confirmation].label}`}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-label-sm text-error sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}

function relationshipLabel(relationship: AccountRoomSummary["relationship"]) {
  if (relationship === "owned") return "Owned";
  if (relationship === "saved") return "Saved";
  return "Joined";
}

function relationshipTone(relationship: AccountRoomSummary["relationship"]) {
  if (relationship === "owned") return "amber" as const;
  if (relationship === "saved") return "cyan" as const;
  return "neutral" as const;
}

function formatLastActive(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return "Activity unavailable";

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    timestamp,
  );
}
