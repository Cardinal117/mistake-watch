"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Headphones, Monitor } from "lucide-react";
import { AccountCommandPanel } from "@/components/account";
import { Button, SignalInlineStatus } from "@/components/ui";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import {
  type SourceLoadInput,
  type QueueAddInput,
  type ListenTvSettings,
} from "@/components/room/listen/shared";
import {
  ListenMemberAvatarRow,
  ListenModeTabs,
  ListenSearchShell,
  ListenRoomSettingsMenu,
} from "@/components/room/listen/header/header-tools";
import { ListenAddMediaPopover } from "@/components/room/listen/add-media/add-media-popover";
import { formatQueueRemainingDuration } from "@/components/room/listen/helpers";

export function ListenTechnicalRoomHeader({
  account,
  accountNotice,
  canAddQueue,
  canLoadSource,
  connectionStatus,
  desktopShell,
  historyCount,
  liveRoom,
  onAddQueueItem,
  onEnterTvMode,
  onLoadSource,
  queueItems,
  queueCount,
  remainingSeconds,
  room,
  onTvSettingsChange,
  tvSettings,
}: {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  desktopShell: boolean;
  historyCount: number;
  liveRoom: LiveRoomState;
  onAddQueueItem(input: QueueAddInput): void;
  onEnterTvMode(): void;
  onLoadSource(input: SourceLoadInput): void;
  queueItems: RoomQueueItem[];
  queueCount: number;
  remainingSeconds: number | null;
  room: RoomSnapshot;
  onTvSettingsChange: Dispatch<SetStateAction<ListenTvSettings>>;
  tvSettings: ListenTvSettings;
}) {
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const roomName = liveRoom.snapshot.session?.roomName ?? room.name;
  const roomAttached =
    account.status === "signed-in" && room.currentMember?.userId === account.id;
  const canRename =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";
  const [editingName, setEditingName] = useState(roomName);
  const [roomNameDirty, setRoomNameDirty] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const visibleRoomName = roomNameDirty ? editingName : roomName;

  async function commitRoomName() {
    const nextName = visibleRoomName.trim().replace(/\s+/g, " ");

    if (!canRename || !nextName || nextName === roomName || renaming) {
      setEditingName(roomName);
      setRoomNameDirty(false);
      return;
    }

    setRenaming(true);

    try {
      await liveRoom.renameRoom(nextName);
      setRoomNameDirty(false);
    } finally {
      setRenaming(false);
    }
  }

  const stats = [
    { accent: false, icon: null, label: "Room ID", value: room.code },
    {
      accent: false,
      icon: null,
      label: "Connected",
      value: `${onlineCount} connected`,
    },
    { accent: true, icon: Headphones, label: "Mode", value: "Listen mode" },
    {
      accent: false,
      icon: null,
      label: "Upcoming",
      value: `${queueCount} upcoming`,
    },
    remainingSeconds
      ? {
          accent: false,
          icon: null,
          label: "Remaining",
          value: `${formatQueueRemainingDuration(remainingSeconds)} remaining`,
        }
      : null,
    {
      accent: false,
      icon: null,
      label: "Played",
      value: `${historyCount} played`,
    },
  ].filter(
    (
      stat,
    ): stat is {
      accent: boolean;
      icon: typeof Headphones | null;
      label: string;
      value: string;
    } => Boolean(stat),
  );
  const mobileStats = [
    { label: "Code", value: room.code },
    { label: "Online", value: String(onlineCount) },
    { label: "Mode", value: "Listen" },
    { label: "Upcoming", value: String(queueCount) },
    remainingSeconds
      ? {
          label: "Remaining",
          value: formatQueueRemainingDuration(remainingSeconds),
        }
      : null,
    { label: "Played", value: String(historyCount) },
  ].filter(
    (
      stat,
    ): stat is {
      label: string;
      value: string;
    } => Boolean(stat),
  );

  return (
    <section className="relative z-20 border-b border-white/8 bg-background/68 backdrop-blur-xl">
      <div
        className={cx(
          "grid gap-3 px-4 py-3 sm:px-6",
          desktopShell && "px-6 py-5 min-[1200px]:px-10",
        )}
      >
        <div
          className={cx(
            "grid gap-4",
            desktopShell &&
              "items-start min-[1200px]:grid-cols-[minmax(0,1fr)_auto] min-[1200px]:items-start",
          )}
        >
          <div className="min-w-0">
            <ListenMemberAvatarRow participants={liveRoom.participants} />
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <input
                aria-label="Room name"
                className="min-w-[7rem] max-w-full bg-transparent text-headline-md font-semibold leading-tight text-on-surface outline-none transition placeholder:text-on-surface-variant/50 focus:border-b focus:border-[rgb(var(--listen-primary)/0.78)] disabled:cursor-default"
                disabled={!canRename || renaming}
                onBlur={commitRoomName}
                onChange={(event) => {
                  setEditingName(event.currentTarget.value);
                  setRoomNameDirty(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    setEditingName(roomName);
                    setRoomNameDirty(false);
                    event.currentTarget.blur();
                  }
                }}
                size={Math.min(Math.max(visibleRoomName.length, 7), 28)}
                value={visibleRoomName}
              />
              {renaming ? (
                <SignalInlineStatus
                  className="shrink-0"
                  state={{
                    detail: "Applying room name.",
                    label: "Saving",
                    state: "loading",
                    tone: "warning",
                  }}
                />
              ) : null}
            </div>
            <p
              aria-live="polite"
              className={cx(
                "mt-2 flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-on-surface-variant",
                desktopShell ? "flex" : "hidden",
              )}
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;

                return (
                  <span
                    className={cx(
                      "inline-flex items-center gap-1.5 whitespace-nowrap",
                      stat.accent &&
                        "font-semibold text-[rgb(var(--listen-primary))] drop-shadow-[0_0_10px_rgb(var(--listen-shadow)/0.32)]",
                    )}
                    key={stat.label}
                  >
                    {index > 0 ? <span className="opacity-45">*</span> : null}
                    {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                    <span className="transition-colors duration-300">
                      {index === 0 ? `Room ID: ${stat.value}` : stat.value}
                    </span>
                  </span>
                );
              })}
            </p>
            {!desktopShell ? (
              <div className="mt-3 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
                {mobileStats.map((stat) => (
                  <div
                    className="rounded-sm border border-white/10 bg-background/38 px-2 py-1.5"
                    key={stat.label}
                  >
                    <p className="technical-label border-0 p-0 text-on-surface-variant">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 truncate text-label-sm font-semibold text-on-surface">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div
            className={cx(
              "flex-wrap items-center gap-2",
              desktopShell
                ? "flex justify-start min-[1200px]:justify-end"
                : "hidden",
            )}
          >
            <ListenAddMediaPopover
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              connectionStatus={connectionStatus}
              items={queueItems}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              roomErrors={liveRoom.snapshot.errors}
              roomId={room.id}
            />
            <Button
              className="border-[rgb(var(--listen-primary)/0.45)] bg-[rgb(var(--listen-primary)/0.08)] text-[rgb(var(--listen-primary))] shadow-[0_0_18px_rgb(var(--listen-shadow)/0.12)] hover:border-[rgb(var(--listen-primary)/0.65)] hover:bg-[rgb(var(--listen-primary)/0.14)]"
              onClick={onEnterTvMode}
              type="button"
              variant="ghost"
            >
              <Monitor className="h-4 w-4" aria-hidden />
              TV Mode
            </Button>
            <AccountCommandPanel
              account={account}
              className="border-[rgb(var(--listen-primary)/0.45)] bg-[rgb(var(--listen-primary)/0.08)] shadow-[0_0_18px_rgb(var(--listen-shadow)/0.12)] hover:border-[rgb(var(--listen-primary)/0.65)] hover:bg-[rgb(var(--listen-primary)/0.12)]"
              compact
              notice={accountNotice}
              nextPath={`/rooms/${room.id}`}
              roomAttached={roomAttached}
              roomId={room.id}
            />
            <ListenRoomSettingsMenu
              canSave={liveRoom.canManageAuthority}
              controllerMemberId={controllerMemberId}
              currentMemberId={room.currentMember?.id}
              initialSaved={room.isSaved}
              inviteUrl={room.inviteUrl ?? null}
              liveRoom={liveRoom}
              roomCode={room.code}
              roomId={room.id}
              tvSettings={tvSettings}
              onTvSettingsChange={onTvSettingsChange}
            />
          </div>
        </div>
        {desktopShell ? (
          <div className="grid gap-4 rounded-md border border-white/10 bg-background/34 p-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] min-[980px]:grid-cols-[auto_minmax(20rem,1fr)] min-[980px]:items-center">
            <ListenModeTabs
              canSwitch={
                liveRoom.canManageAuthority &&
                liveRoom.connectionStatus === "connected"
              }
              mode="listen"
              onSwitchMode={liveRoom.switchMode}
            />
            <ListenSearchShell
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              connectionStatus={connectionStatus}
              items={queueItems}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              roomId={room.id}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
