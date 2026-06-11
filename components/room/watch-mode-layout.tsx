"use client";

import { useState, type ReactNode, type RefObject } from "react";
import {
  ChevronDown,
  Database,
  Film,
  History,
  ListPlus,
  Play,
  Plus,
  Search,
  Sparkles,
  Upload,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  Users,
  X,
} from "lucide-react";

import { Avatar, IconButton, PendingLink } from "@/components/ui";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { InviteActions } from "./invite-actions";
import { MediaStage } from "./media-stage";
import { MembersPanel } from "./members-panel";
import { ModeSwitcher } from "./mode-switcher";
import { QueuePanel } from "./queue-panel";
import { RoomChatPanel } from "./room-chat-panel";
import { TransportControls } from "./transport-controls";
import { YoutubeRoomStage } from "./youtube-room-stage";

type WatchModeLayoutProps = {
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
  stageRef: RefObject<HTMLDivElement | null>;
};

type WatchSurfaceId = "audience" | "queue";

export function WatchModeLayout({
  liveRoom,
  room,
  stageRef,
}: WatchModeLayoutProps) {
  const [activeSurface, setActiveSurface] = useState<WatchSurfaceId | null>(
    null,
  );
  const liveSourceType = liveRoom.snapshot.session?.sourceType;
  const activeQueueItem = liveRoom.snapshot.queue.find(
    (item) => item.status === "playing",
  );
  const queuedCount = liveRoom.snapshot.queue.filter(
    (item) => item.status === "queued",
  ).length;
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const thumbnailUrl =
    activeQueueItem?.thumbnailUrl ??
    (liveRoom.snapshot.session?.sourceType === "youtube" &&
    liveRoom.snapshot.session.sourceUrl
      ? getYouTubeThumbnailUrl(liveRoom.snapshot.session.sourceUrl)
      : null);
  function openSurface(surface: WatchSurfaceId) {
    setActiveSurface(surface);
  }

  function closeSurface() {
    setActiveSurface(null);
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-on-surface">
      <WatchAmbientGlow thumbnailUrl={thumbnailUrl} />

      <div
        className="relative z-10 grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] px-margin-mobile pb-[12.75rem] pt-0 md:pl-margin-desktop md:pr-[5rem] md:pt-0 lg:pb-[9.25rem]"
      >
        <WatchSignalBand
          activeSurface={activeSurface}
          canSwitch={
            liveRoom.canManageAuthority &&
            liveRoom.connectionStatus === "connected"
          }
          connectionStatus={liveRoom.connectionStatus}
          liveRoom={liveRoom}
          onOpenSurface={openSurface}
          onlineCount={onlineCount}
          queuedCount={queuedCount}
          room={room}
        />

        <main className="grid min-h-0 pt-2 md:pt-2">
          <section
            aria-label="Watch stage"
            className="grid min-h-0"
          >
            <div
              className="room-stage-mode-panel min-h-0 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-screen-glow"
              data-mode="watch"
              ref={stageRef}
            >
              {liveSourceType === "youtube" ? (
                <YoutubeRoomStage liveRoom={liveRoom} mode="watch" room={room} />
              ) : (
                <MediaStage liveRoom={liveRoom} room={room} />
              )}
            </div>
          </section>
        </main>
      </div>

      <WatchQueueSurface
        activeSurface={activeSurface}
        liveRoom={liveRoom}
        onClose={closeSurface}
        room={room}
      />

      <WatchAudienceSystem
        expanded={activeSurface === "audience"}
        liveRoom={liveRoom}
        onClose={closeSurface}
        onOpen={() => openSurface("audience")}
        room={room}
      />

      <TransportControls
        liveRoom={liveRoom}
        presentation="cinematic"
        room={room}
      />
    </div>
  );
}

function WatchSignalBand({
  activeSurface,
  canSwitch,
  connectionStatus,
  liveRoom,
  onOpenSurface,
  onlineCount,
  queuedCount,
  room,
}: {
  activeSurface: WatchSurfaceId | null;
  canSwitch: boolean;
  connectionStatus: LiveRoomState["connectionStatus"];
  liveRoom: LiveRoomState;
  onOpenSurface(surface: WatchSurfaceId): void;
  onlineCount: number;
  queuedCount: number;
  room: RoomSnapshot;
}) {
  const liveName = liveRoom.snapshot.session?.roomName ?? room.name;

  return (
    <header className="grid gap-2 border-b border-white/10 bg-background/52 px-0 py-1.5 backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <PendingLink
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          href="/"
          loadingDetail="Returning you to the dashboard."
          loadingLabel="Leaving room"
          tone="cyan"
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Leave Room</span>
        </PendingLink>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="technical-label text-primary-fixed-dim">
              Signal Room
            </p>
            <span className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-primary-fixed-dim">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {connectionStatus}
            </span>
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="max-w-full truncate text-body-lg font-semibold leading-tight text-on-surface md:text-[22px]">
              {liveName}
            </h1>
            <span className="text-label-sm text-on-surface-variant">
              {room.code} / {onlineCount} connected
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
        <WatchDrawerButton
          active={activeSurface === "queue"}
          count={queuedCount}
          icon={<ChevronDown className="h-4 w-4" aria-hidden />}
          label="Queue"
          onClick={() => onOpenSurface("queue")}
        />
        <WatchDrawerButton
          active={activeSurface === "audience"}
          count={onlineCount}
          icon={<Users className="h-4 w-4" aria-hidden />}
          label="Audience"
          onClick={() => onOpenSurface("audience")}
        />
        <InviteActions compact inviteUrl={room.inviteUrl} roomCode={room.code} />
        <div className="min-w-[11rem] overflow-hidden rounded-sm border border-white/10">
          <ModeSwitcher
            canSwitch={canSwitch}
            compact
            mode={room.mode}
            onSwitchMode={liveRoom.switchMode}
          />
        </div>
      </div>
    </header>
  );
}

function WatchDrawerButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-label-sm font-semibold transition",
        active
          ? "border-primary-fixed-dim/50 bg-primary-fixed-dim/12 text-primary-fixed-dim"
          : "border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-sm border border-white/10 bg-surface-container-low px-1.5 text-[11px] leading-5 text-on-surface-variant">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function WatchQueueSurface({
  activeSurface,
  liveRoom,
  onClose,
  room,
}: {
  activeSurface: WatchSurfaceId | null;
  liveRoom: LiveRoomState;
  onClose(): void;
  room: RoomSnapshot;
}) {
  if (activeSurface !== "queue") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        aria-label="Close watch surface"
        className="absolute inset-0 bg-background/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <WatchQueueSheet liveRoom={liveRoom} onClose={onClose} room={room} />
    </div>
  );
}

function WatchQueueSheet({
  liveRoom,
  onClose,
  room,
}: {
  liveRoom: LiveRoomState;
  onClose(): void;
  room: RoomSnapshot;
}) {
  const queueItems = getQueueItems(liveRoom, room);
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const canLoadSource =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";

  return (
    <aside className="absolute inset-x-3 bottom-3 grid max-h-[min(88dvh,48rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-white/10 bg-background/18 shadow-[0_22px_70px_rgb(0_0_0_/_0.42),inset_0_0_34px_rgb(0_219_233_/_0.04)] backdrop-blur-[3px] md:bottom-auto md:left-1/2 md:top-3 md:w-[min(78rem,calc(100vw-6rem))] md:-translate-x-1/2">
      <div className="h-1 bg-primary-fixed-dim/65 shadow-[0_0_18px_rgb(0_219_233_/_0.28)]" />
      <WatchSurfaceHeader
        eyebrow="Watch media hub"
        icon={<Film className="h-4 w-4" aria-hidden />}
        onClose={onClose}
        title="Queue and media"
      />
      <div className="grid min-h-0 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(20rem,1fr)_minmax(22rem,0.92fr)] md:p-4">
        <WatchMediaHubDiscovery
          canAddQueue={liveRoom.canAddQueue}
          canLoadSource={canLoadSource}
          canManageQueue={liveRoom.canManageQueue}
          items={queueItems}
          onAddQueueItem={liveRoom.addQueueItem}
          onLoadSource={liveRoom.loadMediaSource}
          onPlayNext={(queueItemId) =>
            liveRoom.setQueueItemPriority(queueItemId, { isPlayNext: true })
          }
          onPlayQueueItem={liveRoom.playQueueItemNow}
        />
        <div className="min-h-0 overflow-y-auto rounded-md border border-white/10 bg-background/10 p-3 shadow-[inset_0_0_24px_rgb(229_226_227_/_0.018)] [scrollbar-color:rgb(0_219_233_/_0.32)_transparent] [scrollbar-width:thin]">
          <QueuePanel
            canAddQueue={liveRoom.canAddQueue}
            canLoadSource={canLoadSource}
            canManageQueue={liveRoom.canManageQueue}
            connectionStatus={liveRoom.connectionStatus}
            items={queueItems}
            mode={room.mode}
            onAddQueueItem={liveRoom.addQueueItem}
            onClearQueue={liveRoom.clearQueue}
            onLoadSource={liveRoom.loadMediaSource}
            onMoveQueueItem={liveRoom.moveQueueItem}
            onPlayQueueItem={liveRoom.playQueueItemNow}
            onQueueModeChange={liveRoom.setQueueMode}
            onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
            onRemoveQueueItem={liveRoom.removeQueueItem}
            presentation="hub"
            queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
            roomErrors={liveRoom.snapshot.errors}
            roomId={room.id}
          />
        </div>
        <span className="sr-only">
          Current controller: {controllerMemberId ?? "none"}
        </span>
      </div>
      <div className="grid gap-2 border-t border-white/10 bg-background/10 p-3 text-label-sm text-on-surface-variant md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Search className="h-4 w-4 text-primary-fixed-dim" aria-hidden />
          <span className="text-on-surface">
            Search / Upload / Drag files here
          </span>
          <span className="text-on-surface-variant">
            Upload library connects in the later Stream/R2 media task.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-background/12 px-2 py-1">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Later
          </span>
        </div>
      </div>
    </aside>
  );
}

function WatchMediaHubDiscovery({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  items,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  items: ReturnType<typeof getQueueItems>;
  onAddQueueItem?(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPlayNext?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
}) {
  const activeItems = items.filter((item) => item.status !== "played");
  const queuedItems = items.filter((item) => item.status === "queued");
  const historyItems = items
    .filter((item) => item.status === "played")
    .slice()
    .reverse();
  const sections: Array<
    | {
        comingSoon?: false;
        icon: ReactNode;
        items: ReturnType<typeof getQueueItems>;
        label: string;
        note: string;
      }
    | {
        comingSoon: true;
        icon: ReactNode;
        label: string;
        note: string;
      }
  > = [
    {
      icon: <Sparkles className="h-4 w-4" aria-hidden />,
      items: activeItems.slice(0, 4),
      label: "For you",
      note: activeItems.length
        ? "Ready from this room's active watch list."
        : "Queue something to seed this row.",
    },
    {
      icon: <Film className="h-4 w-4" aria-hidden />,
      items: queuedItems.slice(0, 4),
      label: "Recommended",
      note: queuedItems.length
        ? "Pulled from upcoming room picks for now."
        : "Recommendations need queue or provider data.",
    },
    {
      icon: <History className="h-4 w-4" aria-hidden />,
      items: historyItems.slice(0, 4),
      label: "Room history",
      note: historyItems.length
        ? "Recently watched in this live room."
        : "Played videos will appear here.",
    },
    {
      comingSoon: true,
      icon: <Database className="h-4 w-4" aria-hidden />,
      label: "Cloud storage",
      note: "Coming soon with the Stream/R2 media library task.",
    },
    {
      comingSoon: true,
      icon: <Users className="h-4 w-4" aria-hidden />,
      label: "Shared media",
      note: "Coming soon after account-backed sharing exists.",
    },
  ];

  return (
    <div className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-md border border-white/10 bg-background/8 p-3 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.025)] [scrollbar-width:thin]">
      <div>
        <p className="technical-label text-primary-fixed-dim">Media</p>
        <h3 className="mt-1 text-body-lg font-semibold text-on-surface">
          Watch media hub
        </h3>
      </div>
      {sections.map((section) => (
        <section className="grid gap-2" key={section.label}>
          <div className="flex items-center gap-2">
            <span className="text-primary-fixed-dim">{section.icon}</span>
            <p className="technical-label text-on-surface">{section.label}</p>
          </div>
          {"comingSoon" in section && section.comingSoon ? (
            <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
              Coming soon
            </div>
          ) : section.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {section.items.map((item) => (
                <WatchMediaHubCard
                  canAddQueue={canAddQueue}
                  canLoadSource={canLoadSource}
                  canManageQueue={canManageQueue}
                  item={item}
                  key={`${section.label}-${item.id}`}
                  onAddQueueItem={onAddQueueItem}
                  onLoadSource={onLoadSource}
                  onPlayNext={onPlayNext}
                  onPlayQueueItem={onPlayQueueItem}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
              No items yet
            </div>
          )}
          <p className="text-label-sm text-on-surface-variant">
            {section.note}
          </p>
        </section>
      ))}
    </div>
  );
}

function WatchMediaHubCard({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  item,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  item: ReturnType<typeof getQueueItems>[number];
  onAddQueueItem?(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPlayNext?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
}) {
  const canUseQueueSource = Boolean(item.sourceUrl && item.sourceType);
  const queued = item.status === "queued";

  function addQueueItem(isPlayNext = false) {
    if (!canUseQueueSource || !item.sourceType || !item.sourceUrl) {
      return;
    }

    onAddQueueItem?.({
      artist: item.artist,
      channelName: item.channelName,
      durationSeconds:
        item.duration === "Metadata pending"
          ? undefined
          : parseDurationSeconds(item.duration),
      isPlayNext,
      playlistId: item.playlistId,
      playlistTitle: item.playlistTitle,
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      thumbnailUrl: item.thumbnailUrl,
    });
  }

  function playNow() {
    if (queued) {
      onPlayQueueItem?.(item.id);
      return;
    }

    if (!canUseQueueSource || !item.sourceType || !item.sourceUrl) {
      return;
    }

    onLoadSource?.({
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
    });
  }

  function playNext() {
    if (queued) {
      onPlayNext?.(item.id);
      return;
    }

    addQueueItem(true);
  }

  return (
    <article className="group grid min-h-36 overflow-hidden rounded-sm border border-white/10 bg-background/12 text-left transition hover:border-primary-fixed-dim/35 hover:bg-primary-fixed-dim/8">
      <div className="aspect-video overflow-hidden bg-surface-container-lowest">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Queue thumbnails come from provider metadata and are decorative in compact hub cards.
          <img
            alt=""
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.03]"
            src={item.thumbnailUrl}
          />
        ) : (
          <div className="grid h-full place-items-center text-primary-fixed-dim">
            <Film className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <div className="grid gap-1 p-2">
        <span className="technical-label text-primary-fixed-dim">
          {item.status === "now"
            ? "Now"
            : item.status === "played"
              ? "History"
              : "Play"}
        </span>
        <span className="line-clamp-2 text-label-sm font-semibold text-on-surface">
          {item.title}
        </span>
        <span className="truncate text-[11px] text-on-surface-variant">
          {item.artist ?? item.channelName ?? item.duration}
        </span>
        <div className="mt-1 grid grid-cols-3 gap-1">
          <button
            className="inline-flex h-7 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              queued || !canAddQueue || !canUseQueueSource || !onAddQueueItem
            }
            onClick={() => addQueueItem()}
            title="Add to queue"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Add to queue</span>
          </button>
          <button
            className="inline-flex h-7 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              queued
                ? !canManageQueue || !onPlayNext
                : !canAddQueue || !canUseQueueSource || !onAddQueueItem
            }
            onClick={playNext}
            title="Play next"
            type="button"
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Play next</span>
          </button>
          <button
            className="inline-flex h-7 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              queued
                ? !canManageQueue || !onPlayQueueItem
                : !canLoadSource || !canUseQueueSource || !onLoadSource
            }
            onClick={playNow}
            title="Play now"
            type="button"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Play now</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function parseDurationSeconds(duration: string) {
  const parts = duration.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function WatchAudienceSystem({
  expanded,
  liveRoom,
  onClose,
  onOpen,
  room,
}: {
  expanded: boolean;
  liveRoom: LiveRoomState;
  onClose(): void;
  onOpen(): void;
  room: RoomSnapshot;
}) {
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;

  if (!expanded) {
    return (
      <aside className="fixed bottom-[9.25rem] right-0 top-0 z-[55] hidden w-16 border-l border-white/10 bg-background/20 shadow-[0_0_36px_rgb(0_0_0_/_0.28)] backdrop-blur-md md:grid md:grid-rows-[auto_minmax(0,1fr)] md:justify-items-center md:gap-3 md:px-2 md:py-3">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/15"
          onClick={onOpen}
          type="button"
          aria-label="Open audience panel"
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
        </button>
        <div className="grid content-start gap-2 overflow-y-auto [scrollbar-width:none]">
          {liveRoom.participants.slice(0, 6).map((participant) => (
            <button
              className="rounded-sm border border-white/10 bg-background/25 p-1 transition hover:border-primary-fixed-dim/35"
              key={participant.id}
              onClick={onOpen}
              type="button"
              title={participant.name}
            >
              <Avatar
                avatarKey={participant.avatarKey}
                className="h-8 w-8"
                crowned={participant.role === "host"}
                name={participant.name}
                seed={participant.id}
                status={participant.status}
              />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[65] grid max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-background/16 shadow-[0_-22px_54px_rgb(0_0_0_/_0.34)] backdrop-blur-sm lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(48rem,calc(100vw-2rem))] lg:rounded-l-lg lg:rounded-r-none lg:border-y-0 lg:border-r-0 lg:bg-background/8 lg:shadow-[0_0_48px_rgb(0_0_0_/_0.26)]">
      <WatchSurfaceHeader
        eyebrow="Audience"
        icon={<PanelRightClose className="h-4 w-4" aria-hidden />}
        onClose={onClose}
        title="Chat and members"
      />
      <div className="grid min-h-0 overflow-hidden p-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:p-3">
        <RoomChatPanel
          connectionStatus={liveRoom.connectionStatus}
          currentMemberId={room.currentMember?.id}
          getMemberAccentColor={getMemberAccentColor}
          messages={liveRoom.snapshot.chatMessages}
          participants={liveRoom.participants}
          presentation="audience"
          sendMessage={liveRoom.sendChatMessage}
        />
        <MembersPanel
          canManageAuthority={liveRoom.canManageAuthority}
          connectionStatus={liveRoom.connectionStatus}
          controllerMemberId={controllerMemberId}
          currentMemberId={room.currentMember?.id}
          errorMessage={liveRoom.errorMessage}
          grantControl={liveRoom.grantControl}
          kickMember={liveRoom.kickMember}
          onPermissionChange={liveRoom.setPermission}
          participants={liveRoom.participants}
          presentation="audience"
          removeIdleMember={liveRoom.removeIdleMember}
          revokeControl={liveRoom.revokeControl}
        />
      </div>
    </aside>
  );
}

function WatchSurfaceHeader({
  eyebrow,
  icon,
  onClose,
  title,
}: {
  eyebrow: string;
  icon: ReactNode;
  onClose(): void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-background/28 p-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-primary-fixed-dim/25 bg-primary-fixed-dim/10 text-primary-fixed-dim">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="technical-label text-primary-fixed-dim">{eyebrow}</p>
          <h2 className="truncate text-body-md font-semibold text-on-surface">
            {title}
          </h2>
        </div>
      </div>
      <IconButton label={`Close ${title}`} onClick={onClose} variant="ghost">
        <X className="h-5 w-5" aria-hidden />
      </IconButton>
    </div>
  );
}

function getQueueItems(liveRoom: LiveRoomState, room: RoomSnapshot) {
  const participantsById = new Map(
    liveRoom.participants.map((participant) => [participant.id, participant]),
  );

  const liveQueueItems = liveRoom.snapshot.queue.map((item) => ({
    addedBy:
      participantsById.get(item.addedByMemberId)?.name ??
      (item.addedByMemberId ? "Guest" : "Room"),
    artist: item.artist ?? undefined,
    channelName: item.channelName ?? undefined,
    duration:
      typeof item.durationSeconds === "number"
        ? formatDuration(item.durationSeconds)
        : "Metadata pending",
    id: item.queueItemId,
    isPinned: item.isPinned,
    isPlayNext: item.isPlayNext,
    isUnavailable: item.isUnavailable,
    playedSequence: item.playedSequence,
    playlistId: item.playlistId ?? undefined,
    playlistTitle: item.playlistTitle ?? undefined,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    status:
      item.status === "playing"
        ? ("now" as const)
        : item.status === "played"
          ? ("played" as const)
          : ("queued" as const),
    thumbnailUrl:
      item.thumbnailUrl ??
      (item.sourceType === "youtube"
        ? (getYouTubeThumbnailUrl(item.sourceUrl) ?? undefined)
        : undefined),
    title: getSourceDisplayTitle({
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      title: item.title,
    }),
    videoId:
      item.sourceType === "youtube"
        ? (parseYouTubeVideoId(item.sourceUrl) ?? undefined)
        : undefined,
  }));

  return liveRoom.connectionStatus === "connected" ? liveQueueItems : room.queue;
}

function getMemberAccentColor(memberId: string) {
  const palette = [
    "#00dbe9",
    "#ffba20",
    "#b6c4ff",
    "#7df4ff",
    "#ffdea8",
    "#dce1ff",
  ];
  let hash = 0;

  for (let index = 0; index < memberId.length; index += 1) {
    hash = (hash * 31 + memberId.charCodeAt(index)) % 9973;
  }

  return palette[hash % palette.length];
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function WatchAmbientGlow({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {thumbnailUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnail is used only as a blurred ambient backdrop, not frame sampling. */}
          <img
            alt=""
            className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-[0.16] blur-3xl saturate-150"
            src={thumbnailUrl}
          />
          <div className="absolute inset-0 bg-background/82" />
        </>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgb(0_219_233_/_0.13),transparent_32rem),radial-gradient(circle_at_80%_72%,rgb(255_186_32_/_0.07),transparent_34rem),linear-gradient(180deg,rgb(10_10_11_/_0.72),rgb(10_10_11_/_0.98))]" />
    </div>
  );
}
