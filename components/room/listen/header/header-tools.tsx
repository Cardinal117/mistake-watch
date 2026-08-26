"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Headphones,
  LogOut,
  Settings,
  Share2,
  UsersRound,
  Video,
} from "lucide-react";
import { PendingLink, RoomTransitionOverlay } from "@/components/ui";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import { YouTubeAddMediaSearch } from "@/components/room/youtube-add-media-search";
import {
  type SourceLoadInput,
  type QueueAddInput,
  type ListenTvSettings,
} from "@/components/room/listen/shared";
import {
  ListenRoomSettingsDialog,
  getCopyableRoomLink,
  ListenPermissionsDialog,
} from "@/components/room/listen/settings/settings-dialogs";
export function ListenModeTabs({
  canSwitch,
  mode,
  onSwitchMode,
}: {
  canSwitch: boolean;
  mode: RoomSnapshot["mode"];
  onSwitchMode?(mode: "listen" | "watch"): Promise<void>;
}) {
  const [pendingMode, setPendingMode] = useState<"listen" | "watch" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modes = [
    { icon: Video, id: "watch", label: "Watch" },
    { icon: Headphones, id: "listen", label: "Listen" },
  ] as const;

  async function handleSwitch(nextMode: "listen" | "watch") {
    if (!canSwitch || !onSwitchMode || nextMode === mode || pendingMode) {
      return;
    }

    setErrorMessage(null);
    setPendingMode(nextMode);

    try {
      await onSwitchMode(nextMode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Room mode could not be changed.",
      );
    } finally {
      window.setTimeout(() => setPendingMode(null), 300);
    }
  }

  return (
    <div>
      <RoomTransitionOverlay
        active={Boolean(pendingMode)}
        detail="Updating the room stage for everyone."
        label={
          pendingMode === "listen"
            ? "Switching to listen mode"
            : "Switching to watch mode"
        }
        tone={pendingMode === "listen" ? "amber" : "cyan"}
      />
      <div
        aria-label="Room mode"
        className="flex w-fit min-w-72 items-end gap-9 px-4"
        role="tablist"
      >
        {modes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;

          return (
            <button
              aria-disabled={!canSwitch || Boolean(pendingMode)}
              aria-selected={active}
              className={cx(
                "relative inline-flex h-12 items-center gap-2.5 px-1 text-body-md font-semibold text-on-surface-variant transition hover:text-on-surface",
                active &&
                  "text-[rgb(var(--listen-primary))] drop-shadow-[0_0_12px_rgb(var(--listen-shadow)/0.32)]",
                (!canSwitch || pendingMode) &&
                  "cursor-not-allowed opacity-70 hover:text-on-surface-variant",
              )}
              disabled={!canSwitch || Boolean(pendingMode)}
              key={item.id}
              onClick={() => handleSwitch(item.id)}
              role="tab"
              type="button"
            >
              <Icon
                className={cx(
                  "h-5 w-5",
                  active && "text-[rgb(var(--listen-primary))]",
                )}
                aria-hidden
              />
              <span
                className={cx(active && "text-[rgb(var(--listen-primary))]")}
              >
                {item.label}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-1/2 h-0.5 w-28 -translate-x-1/2 rounded-full bg-[rgb(var(--listen-primary))] shadow-[0_0_18px_rgb(var(--listen-shadow)/0.65)]"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {errorMessage ? (
        <p
          className="mt-2 rounded-sm border border-error/35 bg-error/10 px-3 py-2 text-label-sm font-semibold text-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
export function ListenSearchShell({
  canAddQueue,
  canLoadSource,
  connectionStatus,
  items,
  onAddQueueItem,
  onLoadSource,
  roomId,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  items: RoomQueueItem[];
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  roomId: string;
}) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const duplicateVideoIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.videoId)
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    [items],
  );
  const canSearchAdd = canAddQueue && connectionStatus === "connected";
  const canSearchLoad = canLoadSource && connectionStatus === "connected";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        shellRef.current &&
        event.target instanceof Node &&
        !shellRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function youtubeSearchItemToQueueInput(
    item: YouTubeSearchItem,
  ): QueueAddInput {
    return {
      artist: item.channelTitle ?? undefined,
      channelName: item.channelTitle ?? undefined,
      durationSeconds: item.durationSeconds ?? undefined,
      isUnavailable: item.availability.playable === false,
      sourceTitle: item.title,
      sourceType: "youtube",
      sourceUrl: item.url,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
    };
  }

  function addSearchResult(item: YouTubeSearchItem) {
    onAddQueueItem(youtubeSearchItemToQueueInput(item));
  }

  function playSearchResultNext(item: YouTubeSearchItem) {
    onAddQueueItem({
      ...youtubeSearchItemToQueueInput(item),
      isPlayNext: true,
    });
  }

  function loadSearchResult(item: YouTubeSearchItem) {
    onLoadSource(youtubeSearchItemToQueueInput(item));
  }

  return (
    <div className="relative min-w-0" ref={shellRef}>
      <YouTubeAddMediaSearch
        canAddQueue={canSearchAdd}
        canLoadSource={canSearchLoad}
        duplicateVideoIds={duplicateVideoIds}
        inputClassName="h-12 w-full border-white/10 bg-surface-container-low/24 px-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] backdrop-blur-sm focus-within:border-[rgb(var(--listen-primary)/0.55)] focus-within:bg-surface-container-low/58 focus-within:shadow-[0_0_24px_rgb(var(--listen-shadow)/0.16)] hover:border-[rgb(var(--listen-primary)/0.42)] hover:bg-surface-container-low/42"
        inputIconClassName="h-5 w-5 text-[rgb(var(--listen-primary))]"
        mode="listen"
        onAddResult={addSearchResult}
        onInputFocus={() => setOpen(true)}
        onLoadResult={loadSearchResult}
        onPlayNextResult={playSearchResultNext}
        onRequestClose={() => setOpen(false)}
        placeholder="Search videos, playlists, artists..."
        popoverOpen={open}
        presentation="popover"
        roomId={roomId}
        shortcutLabel="Ctrl K"
      />
    </div>
  );
}
export function ListenRoomSettingsMenu({
  canSave,
  controllerMemberId,
  currentMemberId,
  initialSaved,
  inviteUrl,
  liveRoom,
  onTvSettingsChange,
  roomCode,
  roomId,
  tvSettings,
  showPermissionsAction = true,
  showSaveAction = true,
}: {
  canSave: boolean;
  controllerMemberId: string | null;
  currentMemberId?: string | null;
  initialSaved: boolean;
  inviteUrl: string | null;
  liveRoom: LiveRoomState;
  onTvSettingsChange: Dispatch<SetStateAction<ListenTvSettings>>;
  roomCode: string;
  roomId: string;
  tvSettings: ListenTvSettings;
  showPermissionsAction?: boolean;
  showSaveAction?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function writeClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatusMessage(`${label} copied.`);
    } catch {
      setStatusMessage(`${label} could not be copied.`);
    }
  }

  async function shareRoom() {
    const roomLink = getCopyableRoomLink(inviteUrl, roomId);

    if (!roomLink) {
      setStatusMessage("Room link is not available yet.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text: `Join room ${roomCode}`,
          title: "Mistake Watch room",
          url: roomLink,
        });
        setStatusMessage("Share sheet opened.");
        return;
      } catch {
        return;
      }
    }

    await writeClipboard(roomLink, "Room link");
  }

  async function toggleSaved() {
    if (!canSave || saving) {
      return;
    }

    const nextSaved = !isSaved;
    setSaving(true);
    setStatusMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId,
        saved: nextSaved,
      });

      setIsSaved(result.isSaved);
      setStatusMessage(result.isSaved ? "Room saved." : "Room removed.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="Room settings"
        className={cx(
          "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-white/10 bg-surface-container-low/70 text-on-surface-variant shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] transition hover:border-[rgb(var(--listen-primary)/0.36)] hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-on-surface",
          open &&
            "border-[rgb(var(--listen-primary)/0.46)] bg-[rgb(var(--listen-primary)/0.11)] text-[rgb(var(--listen-primary))]",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-64 overflow-hidden rounded-md border border-white/10 bg-surface/94 p-2 shadow-[0_22px_54px_rgb(0_0_0_/_0.48),0_0_30px_rgb(var(--listen-shadow)/0.12)] backdrop-blur-xl">
          <ListenMenuButton
            icon={<Copy className="h-4 w-4" aria-hidden />}
            label="Copy Room ID"
            onClick={() => void writeClipboard(roomCode, "Room ID")}
          />
          <ListenMenuButton
            icon={<Copy className="h-4 w-4" aria-hidden />}
            label="Copy Room Link"
            onClick={() => {
              const roomLink = getCopyableRoomLink(inviteUrl, roomId);

              return roomLink
                ? void writeClipboard(roomLink, "Room link")
                : setStatusMessage("Room link is not available yet.");
            }}
          />
          <ListenMenuButton
            icon={<Share2 className="h-4 w-4" aria-hidden />}
            label="Share Room"
            onClick={() => void shareRoom()}
          />
          <div className="my-2 h-px bg-white/10" />
          {showSaveAction ? (
            <ListenMenuButton
              disabled={!canSave || saving}
              icon={
                isSaved ? (
                  <BookmarkCheck className="h-4 w-4" aria-hidden />
                ) : (
                  <Bookmark className="h-4 w-4" aria-hidden />
                )
              }
              label={isSaved ? "Saved Room" : "Save Room"}
              onClick={() => void toggleSaved()}
            />
          ) : null}
          <ListenMenuButton
            icon={<Settings className="h-4 w-4" aria-hidden />}
            label="Room Settings"
            onClick={() => {
              setSettingsOpen(true);
              setOpen(false);
            }}
          />
          {showPermissionsAction ? (
            <ListenMenuButton
              icon={<UsersRound className="h-4 w-4" aria-hidden />}
              label="Permissions"
              onClick={() => {
                setPermissionsOpen(true);
                setOpen(false);
              }}
            />
          ) : null}
          <div className="my-2 h-px bg-white/10" />
          <PendingLink
            className="flex min-h-10 w-full items-center gap-3 rounded-sm px-3 text-left text-label-sm font-semibold text-[rgb(var(--listen-primary))] transition hover:bg-[rgb(var(--listen-primary)/0.1)]"
            href="/"
            loadingDetail="Returning you to the dashboard."
            loadingLabel="Leaving room"
            tone="amber"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Leave Room
          </PendingLink>
          {statusMessage ? (
            <p className="mt-2 rounded-sm border border-white/10 bg-background/36 px-2 py-1.5 text-label-sm text-on-surface-variant">
              {statusMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      <ListenPermissionsDialog
        controllerMemberId={controllerMemberId}
        currentMemberId={currentMemberId}
        liveRoom={liveRoom}
        onClose={() => setPermissionsOpen(false)}
        open={permissionsOpen}
      />
      <ListenRoomSettingsDialog
        onChange={onTvSettingsChange}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        settings={tvSettings}
      />
    </div>
  );
}
export function ListenMenuButton({
  disabled = false,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      className="flex min-h-10 w-full items-center gap-3 rounded-sm px-3 text-left text-label-sm font-semibold text-on-surface-variant transition hover:bg-white/6 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
