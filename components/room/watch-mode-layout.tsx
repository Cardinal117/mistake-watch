"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  Film,
  Folder,
  FolderPlus,
  Grid2X2,
  History,
  List,
  ListPlus,
  MoreVertical,
  Play,
  Plus,
  Search,
  Sparkles,
  Upload,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Avatar, IconButton, PendingLink } from "@/components/ui";
import { AccountCommandPanel } from "@/components/account";
import type { AccountSummary } from "@/lib/account/types";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import { setRoomSavedAction } from "@/lib/rooms/actions";
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
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
  stageRef: RefObject<HTMLDivElement | null>;
};

type WatchSurfaceId = "audience" | "queue";
type MediaLibraryAsset = {
  createdAt: string;
  durationSeconds: number | null;
  fileSizeBytes: number;
  folderId: string | null;
  id: string;
  isLive: boolean;
  mediaKind: string;
  mimeType: string;
  posterStatus: string;
  processingDecisionReason: string | null;
  processingEstimatedCredits: number | null;
  processingErrorMessage: string | null;
  processingJobId: string | null;
  processingRequiresApproval: boolean;
  processingStatus: string;
  processingStrategy: string;
  publicUrl: string;
  sourceMatches: Array<{
    sourceId: string;
    sourceType: string;
    status: string;
  }>;
  status: string;
  thumbnailObjectKey: string | null;
  thumbnailUrl: string | null;
  title: string;
  visibility: string;
  waveformPeaksUrl: string | null;
  waveformStatus: string;
};
type MediaFolder = {
  createdAt: string;
  defaultSortDirection: MediaFolderSortDirection;
  defaultSortKey: MediaFolderSortKey;
  description: string | null;
  folderType: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
};
type MediaFolderSortDirection = "asc" | "desc";
type MediaFolderSortKey = "created_at" | "duration_seconds" | "name";
type ClientMediaInspection = {
  audioCodecs: string[];
  container: string | null;
  isBrowserSafe: boolean;
  notes: string[];
  videoCodecs: string[];
};
type WatchMediaHubItem = Omit<ReturnType<typeof getQueueItems>[number], "status"> & {
  addedAt?: string;
  folderId?: string | null;
  isLive?: boolean;
  processingEstimatedCredits?: number | null;
  processingRequiresApproval?: boolean;
  processingStatus?: string;
  processingStrategy?: string;
  status: "library" | "now" | "played" | "queued";
  visibility?: string;
};
type WatchMediaHubTab = "discover" | "uploads";
type UploadedLibraryViewMode = "grid" | "list";

export function WatchModeLayout({
  account,
  accountNotice,
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
          account={account}
          accountNotice={accountNotice}
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
        account={account}
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
  account,
  accountNotice,
  canSwitch,
  connectionStatus,
  liveRoom,
  onOpenSurface,
  onlineCount,
  queuedCount,
  room,
}: {
  activeSurface: WatchSurfaceId | null;
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  canSwitch: boolean;
  connectionStatus: LiveRoomState["connectionStatus"];
  liveRoom: LiveRoomState;
  onOpenSurface(surface: WatchSurfaceId): void;
  onlineCount: number;
  queuedCount: number;
  room: RoomSnapshot;
}) {
  const liveName = liveRoom.snapshot.session?.roomName ?? room.name;
  const roomAttached =
    account.status === "signed-in" && room.currentMember?.userId === account.id;

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
        <WatchSavedRoomToggle
          canSave={liveRoom.canManageAuthority}
          initialSaved={room.isSaved}
          roomId={room.id}
        />
        <InviteActions compact inviteUrl={room.inviteUrl} roomCode={room.code} />
        <AccountCommandPanel
          account={account}
          compact
          notice={accountNotice}
          nextPath={`/rooms/${room.id}`}
          roomAttached={roomAttached}
          roomId={room.id}
        />
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

function WatchSavedRoomToggle({
  canSave,
  initialSaved,
  roomId,
}: {
  canSave: boolean;
  initialSaved: boolean;
  roomId: string;
}) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  async function handleToggle() {
    if (!canSave || saving) {
      return;
    }

    const nextSaved = !isSaved;

    setSaving(true);
    setErrorMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId,
        saved: nextSaved,
      });

      setIsSaved(result.isSaved);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="relative">
      <button
        aria-label={isSaved ? "Remove saved room" : "Save room"}
        className={cx(
          "inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-label-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          isSaved
            ? "border-primary-fixed-dim/50 bg-primary-fixed-dim/12 text-primary-fixed-dim"
            : "border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
        )}
        disabled={!canSave || saving}
        onClick={handleToggle}
        title={
          canSave
            ? isSaved
              ? "Remove from saved spaces"
              : "Save to dashboard"
            : "Only the host can save this room"
        }
        type="button"
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span>{isSaved ? "Saved" : "Save"}</span>
      </button>
      {errorMessage ? (
        <span className="absolute right-0 top-full z-10 mt-1 w-56 rounded-sm border border-error/30 bg-error-container/95 px-2 py-1 text-[11px] text-error shadow-lg">
          {errorMessage}
        </span>
      ) : null}
    </span>
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
  account,
  activeSurface,
  liveRoom,
  onClose,
  room,
}: {
  account: AccountSummary;
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
        className="watch-surface-scrim absolute inset-0 bg-background/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <WatchQueueSheet
        account={account}
        liveRoom={liveRoom}
        onClose={onClose}
        room={room}
      />
    </div>
  );
}

function WatchQueueSheet({
  account,
  liveRoom,
  onClose,
  room,
}: {
  account: AccountSummary;
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
    <aside className="watch-queue-sheet absolute inset-x-2 bottom-2 grid max-h-[min(94dvh,56rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/10 bg-background/18 shadow-[0_22px_70px_rgb(0_0_0_/_0.42),inset_0_0_34px_rgb(0_219_233_/_0.04)] backdrop-blur-[3px] md:inset-x-6 md:bottom-auto md:top-2 md:mx-auto md:max-w-[92rem]">
      <div className="h-1 bg-primary-fixed-dim/65 shadow-[0_0_18px_rgb(0_219_233_/_0.28)]" />
      <WatchSurfaceHeader
        eyebrow="Watch media hub"
        icon={<Film className="h-4 w-4" aria-hidden />}
        onClose={onClose}
        title="Queue and media"
      />
      <div className="grid min-h-0 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(28rem,1.25fr)_minmax(22rem,0.85fr)] md:p-4">
        <WatchMediaHubDiscovery
          canAddQueue={liveRoom.canAddQueue}
          canLoadSource={canLoadSource}
          canManageQueue={liveRoom.canManageQueue}
          isOwner={
            account.status === "signed-in" &&
            account.role === "owner" &&
            account.accountStatus === "active"
          }
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
    </aside>
  );
}

function WatchMediaHubDiscovery({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  isOwner,
  items,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  isOwner: boolean;
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
  const [assets, setAssets] = useState<MediaLibraryAsset[]>([]);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState(true);
  const [activeHubTab, setActiveHubTab] =
    useState<WatchMediaHubTab>("discover");
  const [dragActive, setDragActive] = useState(false);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [folderCreateStatus, setFolderCreateStatus] = useState<{
    detail: string;
    tone: "error" | "info" | "success";
  } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [uploadFolderId, setUploadFolderId] = useState<string>("");
  const [uploadedSearchQuery, setUploadedSearchQuery] = useState("");
  const [uploadedViewMode, setUploadedViewMode] =
    useState<UploadedLibraryViewMode>("grid");
  const [uploadStatus, setUploadStatus] = useState<{
    detail: string;
    progress: number;
    tone: "error" | "info" | "success";
  } | null>(null);
  const activeItems = items.filter((item) => item.status !== "played");
  const liveItems = activeItems.filter(isLiveMediaHubItem);
  const nonLiveActiveItems = activeItems.filter((item) => !isLiveMediaHubItem(item));
  const queuedItems = items.filter((item) => item.status === "queued");
  const historyItems = items
    .filter((item) => item.status === "played")
    .slice()
    .reverse();
  const libraryItems = assets.map(mediaAssetToHubItem);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setAssetLoading(true);
      setAssetError(null);

      try {
        const response = await fetch("/api/media/assets", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          assets?: MediaLibraryAsset[];
          error?: string;
          folders?: MediaFolder[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Media library could not load.");
        }

        if (!cancelled) {
          setAssets(payload.assets ?? []);
          setFolders(payload.folders ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setAssetError(
            error instanceof Error
              ? error.message
              : "Media library could not load.",
          );
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshMediaLibrary() {
    const response = await fetch("/api/media/assets", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      assets?: MediaLibraryAsset[];
      error?: string;
      folders?: MediaFolder[];
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Media library could not load.");
    }

    setAssets(payload.assets ?? []);
    setFolders(payload.folders ?? []);
  }

  async function createFolder() {
    const name = newFolderName.trim();

    if (!name) {
      setFolderCreateStatus({
        detail: "Folder name is required.",
        tone: "error",
      });
      return;
    }

    setFolderCreateStatus({
      detail: "Creating folder",
      tone: "info",
    });

    try {
      const response = await fetch("/api/media/folders", {
        body: JSON.stringify({ folderType: "series", name }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        folder?: MediaFolder;
      };

      if (!response.ok || !payload.folder) {
        throw new Error(payload.error ?? "Folder could not be created.");
      }

      setFolders((current) => [...current, payload.folder!]);
      setSelectedFolderId(payload.folder.id);
      setUploadFolderId(payload.folder.id);
      setNewFolderName("");
      setFolderCreateStatus({
        detail: `${payload.folder.name} created.`,
        tone: "success",
      });
    } catch (error) {
      setFolderCreateStatus({
        detail:
          error instanceof Error ? error.message : "Folder could not be created.",
        tone: "error",
      });
    }
  }

  async function uploadFile(file: File) {
    if (!isOwner) {
      setUploadStatus({
        detail: "Only the owner account can upload first-party media.",
        progress: 0,
        tone: "error",
      });
      return;
    }

    setUploadStatus({
      detail: `Preparing ${file.name}`,
      progress: 0,
      tone: "info",
    });

    try {
      const [clientInspection, durationSeconds] = await Promise.all([
        inspectUploadFile(file),
        readUploadDuration(file),
      ]);
      const createResponse = await fetch("/api/media/uploads", {
        body: JSON.stringify({
          fileName: file.name,
          fileSizeBytes: file.size,
          folderId: uploadFolderId || null,
          folderName: null,
          mimeType: file.type || "application/octet-stream",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const createPayload = (await createResponse.json()) as {
        error?: string;
        folderId?: string | null;
        partCount?: number | null;
        partSizeBytes?: number | null;
        uploadId?: string;
        uploadMode?: "multipart" | "single";
        uploadUrl?: string;
      };

      if (!createResponse.ok || !createPayload.uploadId) {
        throw new Error(createPayload.error ?? "Upload could not be prepared.");
      }

      const completedParts =
        createPayload.uploadMode === "multipart"
          ? await uploadMultipartFileToR2({
              file,
              onProgress: (progress, detail) => {
                setUploadStatus({
                  detail,
                  progress,
                  tone: "info",
                });
              },
              partCount: createPayload.partCount ?? 0,
              partSizeBytes: createPayload.partSizeBytes ?? 0,
              uploadId: createPayload.uploadId,
            })
          : await uploadSingleFileToR2({
              file,
              onProgress: (progress, detail) => {
                setUploadStatus({
                  detail: detail ?? `Uploading ${file.name}`,
                  progress,
                  tone: "info",
                });
              },
              uploadUrl: createPayload.uploadUrl,
            });

      setUploadStatus({
        detail:
          createPayload.uploadMode === "multipart"
            ? "Finalizing multipart upload"
            : "Inspecting uploaded source",
        progress: 96,
        tone: "info",
      });

      const completeResponse = await fetch(
        `/api/media/uploads/${createPayload.uploadId}/complete`,
        {
          body: JSON.stringify({
            clientInspection,
            durationSeconds,
            folderId: createPayload.folderId ?? null,
            multipartParts: completedParts,
            title: deriveUploadTitle(file.name),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const completePayload = (await completeResponse.json()) as {
        asset?: MediaLibraryAsset;
        error?: string;
      };

      if (!completeResponse.ok || !completePayload.asset) {
        throw new Error(completePayload.error ?? "Upload could not be completed.");
      }

      const completedAsset = completePayload.asset!;
      setAssets((current) => [completedAsset, ...current]);
      if (
        completedAsset.status === "ready" ||
        completedAsset.processingStatus === "not_required"
      ) {
        setUploadStatus({
          detail: `${completedAsset.title} is ready without CloudConvert conversion.`,
          progress: 100,
          tone: "success",
        });
        if (completedAsset.posterStatus !== "ready") {
          void captureAndUploadPoster(completedAsset, (asset) => {
            setAssets((current) =>
              current.map((item) => (item.id === asset.id ? asset : item)),
            );
          });
        }
        return;
      }

      if (
        completedAsset.processingStatus === "approval_required" ||
        completedAsset.processingRequiresApproval
      ) {
        setUploadStatus({
          detail: `${completedAsset.title} needs owner approval before CloudConvert runs.`,
          progress: 100,
          tone: "info",
        });
        return;
      }

      setUploadStatus({
        detail: `${completedAsset.title} is queued for CloudConvert processing.`,
        progress: 97,
        tone: "info",
      });
      const readyAsset = await pollMediaProcessing(completedAsset.id, (status) => {
        setUploadStatus({
          detail: status.detail,
          progress: status.progress,
          tone: status.tone,
        });
      });
      setAssets((current) =>
        current.map((item) => (item.id === readyAsset.id ? readyAsset : item)),
      );
      setUploadStatus({
        detail: `${readyAsset.title} is ready in the media library.`,
        progress: 100,
        tone: "success",
      });
      if (readyAsset.posterStatus !== "ready") {
        void captureAndUploadPoster(readyAsset, (asset) => {
          setAssets((current) =>
            current.map((item) => (item.id === asset.id ? asset : item)),
          );
        });
      }
    } catch (error) {
      setUploadStatus({
        detail:
          error instanceof Error ? error.message : "Upload could not complete.",
        progress: 0,
        tone: "error",
      });
    }
  }

  function handleFiles(files: FileList | File[]) {
    const [file] = Array.from(files);

    if (file) {
      void uploadFile(file);
    }
  }

  const discoverySections: Array<
    | {
        comingSoon?: false;
        icon: ReactNode;
        items: WatchMediaHubItem[];
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
      items: nonLiveActiveItems.slice(0, 4),
      label: "For you",
      note: nonLiveActiveItems.length
        ? "Ready from this room's active watch list."
        : "Queue something to seed this row.",
    },
    {
      icon: <Radio className="h-4 w-4" aria-hidden />,
      items: liveItems.slice(0, 4),
      label: "Live",
      note: liveItems.length
        ? "Live streams and HLS links stay easy to find."
        : "HLS and live-looking links will appear here.",
    },
    {
      icon: <Film className="h-4 w-4" aria-hidden />,
      items: queuedItems.filter((item) => !isLiveMediaHubItem(item)).slice(0, 4),
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
      icon: <Users className="h-4 w-4" aria-hidden />,
      label: "Shared media",
      note: "Coming soon after account-backed sharing exists.",
    },
  ];
  const visibleLibraryItems =
    selectedFolderId === "all"
      ? libraryItems
      : selectedFolderId === "unsorted"
        ? libraryItems.filter((item) => !item.folderId)
        : selectedFolderId === "live"
          ? libraryItems.filter(isLiveMediaHubItem)
          : libraryItems.filter((item) => item.folderId === selectedFolderId);
  const searchedLibraryItems = filterUploadedLibraryItems({
    folders,
    items: visibleLibraryItems,
    query: uploadedSearchQuery,
  });
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const sortedLibraryItems = sortUploadedLibraryItems(
    searchedLibraryItems,
    selectedFolder ?? null,
  );

  return (
    <div className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-md border border-white/10 bg-background/8 p-3 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.025)] [scrollbar-width:thin]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="technical-label text-primary-fixed-dim">Media</p>
          <h3 className="mt-1 text-body-lg font-semibold text-on-surface">
            Watch media hub
          </h3>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/10 bg-background/20 text-label-sm">
          <button
            className={cx(
              "px-3 py-2 font-semibold transition",
              activeHubTab === "discover"
                ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            onClick={() => setActiveHubTab("discover")}
            type="button"
          >
            Discovery
          </button>
          <button
            className={cx(
              "px-3 py-2 font-semibold transition",
              activeHubTab === "uploads"
                ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            onClick={() => setActiveHubTab("uploads")}
            type="button"
          >
            Uploaded
          </button>
        </div>
      </div>

      {activeHubTab === "uploads" ? (
        <>
          {isOwner ? (
            <div className="grid gap-2 rounded-md border border-white/10 bg-background/10 p-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="grid gap-1 text-label-sm text-on-surface-variant">
                  Upload into folder
                  <select
                    className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-on-surface outline-none focus:border-primary-fixed-dim/60"
                    onChange={(event) => setUploadFolderId(event.target.value)}
                    value={uploadFolderId}
                  >
                    <option value="">Unsorted</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-1 text-label-sm text-on-surface-variant">
                  <span>New folder</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-on-surface outline-none focus:border-primary-fixed-dim/60"
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder="Minecraft playthrough"
                      value={newFolderName}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/40 bg-primary-fixed-dim/12 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/18 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!newFolderName.trim()}
                      onClick={createFolder}
                      type="button"
                    >
                      <FolderPlus className="h-4 w-4" aria-hidden />
                      Create
                    </button>
                  </div>
                  {folderCreateStatus ? (
                    <span
                      className={cx(
                        "text-[11px]",
                        folderCreateStatus.tone === "error"
                          ? "text-error"
                          : folderCreateStatus.tone === "success"
                            ? "text-primary-fixed-dim"
                            : "text-on-surface-variant",
                      )}
                    >
                      {folderCreateStatus.detail}
                    </span>
                  ) : null}
                </div>
              </div>
              <label
                className={cx(
                  "group grid cursor-pointer gap-3 rounded-md border border-dashed p-4 text-left transition md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center",
                  dragActive
                    ? "border-primary-fixed-dim/80 bg-primary-fixed-dim/14 shadow-[inset_0_0_28px_rgb(0_219_233_/_0.12)]"
                    : "border-primary-fixed-dim/35 bg-primary-fixed-dim/7 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.055)] hover:border-primary-fixed-dim/60 hover:bg-primary-fixed-dim/10",
                )}
                htmlFor="watch-media-upload"
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  handleFiles(event.dataTransfer.files);
                }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md border border-primary-fixed-dim/35 bg-background/22 text-primary-fixed-dim shadow-[0_0_20px_rgb(0_219_233_/_0.12)]">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="grid gap-1">
                  <span className="technical-label text-primary-fixed-dim">
                    Owner upload and CloudConvert
                  </span>
                  <span className="text-body-md font-semibold text-on-surface">
                    Drop any video here
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    Source uploads to R2, then CloudConvert creates a browser-safe MP4 and thumbnail.
                  </span>
                </span>
                <span className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/40 bg-primary-fixed-dim/12 px-3 text-label-sm font-semibold text-primary-fixed-dim transition group-hover:bg-primary-fixed-dim/18">
                  <Upload className="h-4 w-4" aria-hidden />
                  Choose video
                </span>
                <input
                  accept="video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v"
                  className="hidden"
                  id="watch-media-upload"
                  onChange={(event) => {
                    if (event.currentTarget.files) {
                      handleFiles(event.currentTarget.files);
                    }
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-1 rounded-md border border-white/10 bg-background/10 p-3">
              <p className="technical-label text-primary-fixed-dim">
                Uploaded media
              </p>
              <p className="text-label-sm text-on-surface-variant">
                Owner-uploaded R2 media appears here when it is ready. Upload
                and folder controls are owner-only.
              </p>
            </div>
          )}
        </>
      ) : null}
        {uploadStatus ? (
          <div
            className={cx(
              "grid gap-1 rounded-sm border px-2 py-1.5 text-label-sm",
              uploadStatus.tone === "error"
                ? "border-error/30 bg-error/10 text-error"
                : uploadStatus.tone === "success"
                  ? "border-primary-fixed-dim/35 bg-primary-fixed-dim/10 text-primary-fixed-dim"
                  : "border-white/10 bg-background/16 text-on-surface-variant",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{uploadStatus.detail}</span>
              <span>{Math.round(uploadStatus.progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_8px_rgb(0_0_0_/_0.35)]">
              <div
                className="h-full bg-primary-fixed-dim shadow-[0_0_14px_rgb(0_219_233_/_0.45)] transition-[width]"
                style={{
                  width: `${Math.max(0, Math.min(100, uploadStatus.progress))}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        {assetError ? (
          <p className="text-label-sm text-error">{assetError}</p>
        ) : null}
      {activeHubTab === "discover"
        ? discoverySections.map((section) => (
            <WatchMediaHubSection
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              canManageQueue={canManageQueue}
              key={section.label}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              onPlayNext={onPlayNext}
              onPlayQueueItem={onPlayQueueItem}
              section={section}
            />
          ))
        : (
            <UploadedMediaLibrary
              assets={sortedLibraryItems}
              allAssets={libraryItems}
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              canManageQueue={canManageQueue}
              folders={folders}
              isOwner={isOwner}
              onApproveProcessing={async (assetId) => {
                try {
                  setUploadStatus({
                    detail: "Starting approved CloudConvert processing.",
                    progress: 97,
                    tone: "info",
                  });
                  const approvedAsset = await approveAssetProcessing(assetId);
                  setAssets((current) =>
                    current.map((item) =>
                      item.id === approvedAsset.id ? approvedAsset : item,
                    ),
                  );
                  const readyAsset = await pollMediaProcessing(
                    approvedAsset.id,
                    (status) => {
                      setUploadStatus({
                        detail: status.detail,
                        progress: status.progress,
                        tone: status.tone,
                      });
                    },
                  );
                  setAssets((current) =>
                    current.map((item) =>
                      item.id === readyAsset.id ? readyAsset : item,
                    ),
                  );
                  setUploadStatus({
                    detail: `${readyAsset.title} is ready in the media library.`,
                    progress: 100,
                    tone: "success",
                  });
                } catch (error) {
                  setUploadStatus({
                    detail:
                      error instanceof Error
                        ? error.message
                        : "Approved conversion could not start.",
                    progress: 0,
                    tone: "error",
                  });
                }
              }}
              onDeleteAsset={async (assetId) => {
                await deleteAsset(assetId);
                setAssets((current) =>
                  current.filter((item) => item.id !== assetId),
                );
              }}
              onAddQueueItem={onAddQueueItem}
              onFolderChange={async (assetId, folderId) => {
                const asset = await moveAssetToFolder(assetId, folderId);
                setAssets((current) =>
                  current.map((item) => (item.id === asset.id ? asset : item)),
                );
              }}
              onFolderSortChange={async (folderId, sortKey, sortDirection) => {
                const folder = await updateFolderSort(
                  folderId,
                  sortKey,
                  sortDirection,
                );
                setFolders((current) =>
                  current.map((item) => (item.id === folder.id ? folder : item)),
                );
              }}
              onLoadSource={onLoadSource}
              onPlayNext={onPlayNext}
              onPlayQueueItem={onPlayQueueItem}
              onVisibilityChange={async (assetId, visibility) => {
                const asset = await updateAssetVisibility(assetId, visibility);
                setAssets((current) =>
                  current.map((item) => (item.id === asset.id ? asset : item)),
                );
              }}
              searchQuery={uploadedSearchQuery}
              selectedFolderId={selectedFolderId}
              setSelectedFolderId={setSelectedFolderId}
              setSearchQuery={setUploadedSearchQuery}
              setViewMode={setUploadedViewMode}
              viewMode={uploadedViewMode}
            />
          )}
    </div>
  );
}

type WatchMediaHubSectionConfig =
  | {
      comingSoon?: false;
      icon: ReactNode;
      items: WatchMediaHubItem[];
      label: string;
      note: string;
    }
  | {
      comingSoon: true;
      icon: ReactNode;
      label: string;
      note: string;
    };

function WatchMediaHubSection({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  section,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
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
  section: WatchMediaHubSectionConfig;
}) {
  return (
    <section className="grid gap-2">
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
      <p className="text-label-sm text-on-surface-variant">{section.note}</p>
    </section>
  );
}

function UploadedMediaLibrary({
  assets,
  allAssets,
  canAddQueue,
  canLoadSource,
  canManageQueue,
  folders,
  isOwner,
  onAddQueueItem,
  onApproveProcessing,
  onDeleteAsset,
  onFolderSortChange,
  onFolderChange,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  onVisibilityChange,
  searchQuery,
  selectedFolderId,
  setSelectedFolderId,
  setSearchQuery,
  setViewMode,
  viewMode,
}: {
  assets: WatchMediaHubItem[];
  allAssets: WatchMediaHubItem[];
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  folders: MediaFolder[];
  isOwner: boolean;
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
  onApproveProcessing(assetId: string): Promise<void>;
  onDeleteAsset(assetId: string): Promise<void>;
  onFolderChange(assetId: string, folderId: string | null): Promise<void>;
  onFolderSortChange(
    folderId: string,
    sortKey: MediaFolderSortKey,
    sortDirection: MediaFolderSortDirection,
  ): Promise<void>;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  onVisibilityChange(assetId: string, visibility: "owner_only" | "public"): Promise<void>;
  searchQuery: string;
  selectedFolderId: string;
  setSelectedFolderId(folderId: string): void;
  setSearchQuery(query: string): void;
  setViewMode(viewMode: UploadedLibraryViewMode): void;
  viewMode: UploadedLibraryViewMode;
}) {
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const folderActionItems = selectedFolder
    ? sortUploadedLibraryItems(
        allAssets.filter((item) => item.folderId === selectedFolder.id),
        selectedFolder,
      )
    : [];
  const hiddenCount = allAssets.filter(
    (item) => item.visibility === "owner_only",
  ).length;
  const liveCount = allAssets.filter(isLiveMediaHubItem).length;
  const unsortedCount = allAssets.filter((item) => !item.folderId).length;

  function addMediaItem(item: WatchMediaHubItem, isPlayNext = false) {
    const input = mediaHubItemToQueueInput(item, { isPlayNext });

    if (input) {
      onAddQueueItem?.(input);
    }
  }

  function playItem(item: WatchMediaHubItem) {
    if (item.status === "queued") {
      onPlayQueueItem?.(item.id);
      return;
    }

    if (!item.sourceType || !item.sourceUrl) {
      return;
    }

    onLoadSource?.({
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
    });
  }

  function queueFolder(action: "append" | "next" | "play") {
    if (folderActionItems.length === 0) {
      return;
    }

    if (action === "play") {
      const [first, ...rest] = folderActionItems;
      playItem(first);
      rest.forEach((item) => addMediaItem(item));
      return;
    }

    folderActionItems.forEach((item) =>
      addMediaItem(item, action === "next"),
    );
  }

  async function updateSort(value: string) {
    if (!selectedFolder) {
      return;
    }

    const [sortKey, sortDirection] = value.split(":");

    await onFolderSortChange(
      selectedFolder.id,
      sortKey as MediaFolderSortKey,
      sortDirection as MediaFolderSortDirection,
    );
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-2 rounded-md border border-white/10 bg-background/10 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="technical-label text-primary-fixed-dim">Folders</p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Browse uploaded media by folder, quick view, or search.
            </p>
          </div>
          <div className="inline-grid h-9 grid-cols-2 rounded-sm border border-white/10 bg-background/20 p-1">
            <button
              className={cx(
                "inline-flex items-center justify-center gap-1 rounded-sm px-3 text-label-sm font-semibold transition",
                viewMode === "grid"
                  ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <Grid2X2 className="h-3.5 w-3.5" aria-hidden />
              Grid
            </button>
            <button
              className={cx(
                "inline-flex items-center justify-center gap-1 rounded-sm px-3 text-label-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
          </div>
        </div>
        <label className="grid h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-sm border border-white/10 bg-surface-container-low px-3">
          <Search className="h-4 w-4 text-on-surface-variant" aria-hidden />
          <input
            className="min-w-0 bg-transparent text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search uploaded media, folders, episodes, or numbers"
            value={searchQuery}
          />
        </label>
      </div>

      <div className="grid gap-2">
        <p className="technical-label text-on-surface">Quick views</p>
        <div className="flex flex-wrap items-center gap-2">
        <button
          className={cx(
            "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
            selectedFolderId === "all"
              ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
              : "border-white/10 bg-background/18 text-on-surface-variant",
          )}
          onClick={() => setSelectedFolderId("all")}
          type="button"
        >
          <Database className="h-3.5 w-3.5" aria-hidden />
          See all media
          <span className="text-[11px] opacity-70">{allAssets.length}</span>
        </button>
        <button
          className={cx(
            "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
            selectedFolderId === "unsorted"
              ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
              : "border-white/10 bg-background/18 text-on-surface-variant",
          )}
          onClick={() => setSelectedFolderId("unsorted")}
          type="button"
        >
          <Folder className="h-3.5 w-3.5" aria-hidden />
          Unsorted
          <span className="text-[11px] opacity-70">{unsortedCount}</span>
        </button>
        <button
          className={cx(
            "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
            selectedFolderId === "live"
              ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
              : "border-white/10 bg-background/18 text-on-surface-variant",
          )}
          onClick={() => setSelectedFolderId("live")}
          type="button"
        >
          <Radio className="h-3.5 w-3.5" aria-hidden />
          Live
          <span className="text-[11px] opacity-70">{liveCount}</span>
        </button>
        {isOwner && hiddenCount > 0 ? (
          <span className="inline-flex h-9 items-center gap-2 rounded-sm border border-white/10 bg-background/12 px-3 text-label-sm text-on-surface-variant">
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            {hiddenCount} hidden
          </span>
        ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="technical-label text-on-surface">Folders</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
        {folders.map((folder) => (
          <button
            className={cx(
              "grid min-h-20 gap-1 rounded-md border p-3 text-left transition",
              selectedFolderId === folder.id
                ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "border-white/10 bg-background/18 text-on-surface-variant",
            )}
            key={folder.id}
            onClick={() => setSelectedFolderId(folder.id)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Folder className="h-3.5 w-3.5" aria-hidden />
              <span className="truncate font-semibold">{folder.name}</span>
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {allAssets.filter((item) => item.folderId === folder.id).length} items
            </span>
          </button>
        ))}
        {folders.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
            No folders yet
          </div>
        ) : null}
        </div>
      </div>

      <div className="grid gap-2 rounded-md border border-white/10 bg-background/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="technical-label text-primary-fixed-dim">
              {selectedFolder?.name ??
                (selectedFolderId === "all"
                  ? "All media"
                  : selectedFolderId === "live"
                    ? "Live"
                    : "Unsorted")}
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              {assets.length} visible result{assets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedFolder ? (
              <>
                <select
                  className="h-9 rounded-sm border border-white/10 bg-surface-container-low px-3 text-label-sm text-on-surface outline-none focus:border-primary-fixed-dim/60"
                  onChange={(event) => void updateSort(event.target.value)}
                  value={`${selectedFolder.defaultSortKey}:${selectedFolder.defaultSortDirection}`}
                >
                  <option value="name:asc">Name A-Z</option>
                  <option value="name:desc">Name Z-A</option>
                  <option value="created_at:desc">Recently added</option>
                  <option value="created_at:asc">Oldest added</option>
                  <option value="duration_seconds:asc">Shortest duration</option>
                  <option value="duration_seconds:desc">Longest duration</option>
                </select>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/10 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canLoadSource || folderActionItems.length === 0}
                  onClick={() => queueFolder("play")}
                  type="button"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Play folder
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 bg-background/20 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canAddQueue || folderActionItems.length === 0}
                  onClick={() => queueFolder("next")}
                  type="button"
                >
                  <ListPlus className="h-3.5 w-3.5" aria-hidden />
                  Add next
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 bg-background/20 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canAddQueue || folderActionItems.length === 0}
                  onClick={() => queueFolder("append")}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Queue folder
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {assets.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {assets.map((item) => (
              <WatchMediaHubCard
                canAddQueue={canAddQueue}
                canLoadSource={canLoadSource}
                canManageQueue={canManageQueue}
                folders={folders}
                isOwner={isOwner}
                item={item}
                key={item.id}
                layout="grid"
                onAddQueueItem={onAddQueueItem}
                onApproveProcessing={onApproveProcessing}
                onDeleteAsset={onDeleteAsset}
                onFolderChange={onFolderChange}
                onLoadSource={onLoadSource}
                onPlayNext={onPlayNext}
                onPlayQueueItem={onPlayQueueItem}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {assets.map((item) => (
              <WatchMediaHubCard
                canAddQueue={canAddQueue}
                canLoadSource={canLoadSource}
                canManageQueue={canManageQueue}
                folders={folders}
                isOwner={isOwner}
                item={item}
                key={item.id}
                layout="list"
                onAddQueueItem={onAddQueueItem}
                onApproveProcessing={onApproveProcessing}
                onDeleteAsset={onDeleteAsset}
                onFolderChange={onFolderChange}
                onLoadSource={onLoadSource}
                onPlayNext={onPlayNext}
                onPlayQueueItem={onPlayQueueItem}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-8 text-center text-label-sm text-on-surface-variant">
          No uploaded media matches this view
        </div>
      )}
    </section>
  );
}

function WatchMediaHubCard({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  folders = [],
  isOwner = false,
  item,
  layout = "grid",
  onAddQueueItem,
  onApproveProcessing,
  onDeleteAsset,
  onFolderChange,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  onVisibilityChange,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  folders?: MediaFolder[];
  isOwner?: boolean;
  item: WatchMediaHubItem;
  layout?: UploadedLibraryViewMode;
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
  onApproveProcessing?(assetId: string): Promise<void>;
  onDeleteAsset?(assetId: string): Promise<void>;
  onFolderChange?(assetId: string, folderId: string | null): Promise<void>;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  onVisibilityChange?(
    assetId: string,
    visibility: "owner_only" | "public",
  ): Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    placement: "bottom" | "top";
    top: number;
  } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const canUseQueueSource = Boolean(item.sourceUrl && item.sourceType);
  const queued = item.status === "queued";
  const library = item.status === "library";
  const hidden = item.visibility === "owner_only";
  const approvalRequired =
    library &&
    (item.processingRequiresApproval ||
      item.processingStatus === "approval_required" ||
      item.processingStrategy === "needs_approval");
  const processing = item.isUnavailable && library && !approvalRequired;
  const directReady = library && item.processingStrategy === "direct_ready";
  const playbackBlocked = processing || approvalRequired;
  const directActionsDisabled = {
    add:
      playbackBlocked ||
      queued ||
      !canAddQueue ||
      !canUseQueueSource ||
      !onAddQueueItem,
    next: queued
      ? !canManageQueue || !onPlayNext
      : playbackBlocked || !canAddQueue || !canUseQueueSource || !onAddQueueItem,
    play: queued
      ? !canManageQueue || !onPlayQueueItem
      : playbackBlocked || !canLoadSource || !canUseQueueSource || !onLoadSource,
  };

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

  async function changeFolder(folderId: string | null) {
    await onFolderChange?.(item.id, folderId);
    setMenuOpen(false);
  }

  async function toggleVisibility() {
    await onVisibilityChange?.(item.id, hidden ? "public" : "owner_only");
    setMenuOpen(false);
  }

  async function deleteFile() {
    const confirmed = window.confirm(
      `Delete "${item.title}" from the uploaded media library? This removes the R2 file and cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    await onDeleteAsset?.(item.id);
    setMenuOpen(false);
  }

  async function approveProcessing() {
    await onApproveProcessing?.(item.id);
    setMenuOpen(false);
  }

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const rect = menuButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      setMenuOpen(true);
      return;
    }

    const menuWidth = 240;
    const menuHeight = isOwner ? 360 : 130;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < menuHeight + viewportPadding ? "top" : "bottom";
    const top =
      placement === "top"
        ? Math.max(viewportPadding, rect.top - menuHeight - 8)
        : Math.min(
            window.innerHeight - viewportPadding - menuHeight,
            rect.bottom + 8,
          );
    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - viewportPadding - menuWidth,
    );
    const left = Math.min(
      maxLeft,
      Math.max(viewportPadding, rect.right - menuWidth),
    );

    setMenuPosition({ left, placement, top });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeMenu() {
      setMenuOpen(false);
    }

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuOpen]);

  const actionMenu = (
    <div
      className="watch-menu-popover fixed z-[95] grid max-h-[min(24rem,calc(100dvh-1.5rem))] w-60 gap-1 overflow-y-auto rounded-md border border-white/10 bg-surface-container-low/95 p-1.5 text-label-sm shadow-[0_18px_48px_rgb(0_0_0_/_0.35)] backdrop-blur-xl"
      data-placement={menuPosition?.placement ?? "bottom"}
      style={{
        left: menuPosition?.left ?? 12,
        top: menuPosition?.top ?? 12,
      }}
    >
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.play || approvalRequired}
        onClick={() => {
          playNow();
          setMenuOpen(false);
        }}
        type="button"
      >
        <Play className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Play now
      </button>
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.next || approvalRequired}
        onClick={() => {
          playNext();
          setMenuOpen(false);
        }}
        type="button"
      >
        <ListPlus className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Add next
      </button>
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.add || approvalRequired}
        onClick={() => {
          addQueueItem();
          setMenuOpen(false);
        }}
        type="button"
      >
        <Plus className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Add to queue
      </button>
      {isOwner ? (
        <>
          {approvalRequired ? (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="flex min-h-8 items-center gap-2 rounded-sm px-2 py-1 text-left text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!onApproveProcessing}
                onClick={() => void approveProcessing()}
                type="button"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="grid gap-0.5">
                  <span>Approve conversion</span>
                  <span className="text-[10px] text-on-surface-variant">
                    {formatCreditEstimate(item.processingEstimatedCredits)}
                  </span>
                </span>
              </button>
            </>
          ) : null}
          <div className="my-1 h-px bg-white/10" />
          <button
            className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!onVisibilityChange}
            onClick={() => void toggleVisibility()}
            type="button"
          >
            {hidden ? (
              <EyeOff className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              {hidden ? "Hidden from viewers" : "Visible to viewers"}
            </span>
            <Check
              className={cx("h-3.5 w-3.5", hidden ? "opacity-100" : "opacity-0")}
              aria-hidden
            />
          </button>
          <div className="grid gap-1 px-2 py-1">
            <span className="technical-label text-on-surface-variant">
              Move to folder
            </span>
            <button
              className={cx(
                "flex h-7 items-center justify-between rounded-sm px-2 text-left transition hover:bg-primary-fixed-dim/10",
                !item.folderId ? "text-primary-fixed-dim" : "text-on-surface",
              )}
              onClick={() => void changeFolder(null)}
              type="button"
            >
              Unsorted
              {!item.folderId ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </button>
            {folders.map((folder) => (
              <button
                className={cx(
                  "flex h-7 items-center justify-between rounded-sm px-2 text-left transition hover:bg-primary-fixed-dim/10",
                  item.folderId === folder.id
                    ? "text-primary-fixed-dim"
                    : "text-on-surface",
                )}
                key={folder.id}
                onClick={() => void changeFolder(folder.id)}
                type="button"
              >
                <span className="truncate">{folder.name}</span>
                {item.folderId === folder.id ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
          {library ? (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!onDeleteAsset}
                onClick={() => void deleteFile()}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete file
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
  const renderedActionMenu =
    menuOpen && menuPosition ? createPortal(actionMenu, document.body) : null;

  if (layout === "list") {
    return (
      <article className="relative grid gap-3 rounded-md border border-white/10 bg-background/12 p-2 transition hover:border-primary-fixed-dim/30 md:grid-cols-[6rem_minmax(0,1fr)_auto_auto] md:items-center">
        <div className="aspect-video overflow-hidden rounded-sm bg-surface-container-lowest">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Queue thumbnails come from provider metadata and uploaded posters.
            <img
              alt=""
              className="h-full w-full object-cover opacity-90"
              src={item.thumbnailUrl}
            />
          ) : (
            <div className="grid h-full place-items-center text-primary-fixed-dim">
              <Film className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-label-sm font-semibold text-on-surface">
              {item.title}
            </span>
            {processing ? (
              <span className="technical-label text-secondary-fixed-dim">
                Processing
              </span>
            ) : null}
            {approvalRequired ? (
              <span className="technical-label text-secondary-fixed-dim">
                Needs approval
              </span>
            ) : null}
            {directReady ? (
              <span className="technical-label text-primary-fixed-dim">
                Direct
              </span>
            ) : null}
            {hidden ? (
              <span className="technical-label text-secondary-fixed-dim">
                Hidden
              </span>
            ) : null}
          </div>
          <span className="truncate text-[11px] text-on-surface-variant">
            {item.artist ?? item.channelName ?? item.duration} / {item.duration}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 md:w-44">
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.play}
            onClick={playNow}
            type="button"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Play now</span>
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.next}
            onClick={playNext}
            type="button"
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Add next</span>
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.add}
            onClick={() => addQueueItem()}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Add to queue</span>
          </button>
        </div>
        <div className="justify-self-end">
          <button
            aria-expanded={menuOpen}
            ref={menuButtonRef}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-background/24 text-on-surface-variant transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim"
            onClick={toggleMenu}
            title="Media settings"
            type="button"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
          {renderedActionMenu}
        </div>
      </article>
    );
  }

  return (
    <article className="group relative grid min-h-36 overflow-hidden rounded-sm border border-white/10 bg-background/12 text-left transition hover:border-primary-fixed-dim/35 hover:bg-primary-fixed-dim/8">
      <button
        aria-expanded={menuOpen}
        ref={menuButtonRef}
        className="absolute right-2 top-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-background/55 text-on-surface-variant opacity-90 backdrop-blur-md transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim"
        onClick={toggleMenu}
        title="Media settings"
        type="button"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {renderedActionMenu}
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
          {item.isLive
            ? "Live"
            : item.status === "now"
            ? "Now"
            : library
              ? approvalRequired
                ? "Needs approval"
                : processing
                  ? "Converting"
                  : directReady
                    ? "Direct"
                    : "R2"
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
        {hidden ? (
          <span className="technical-label text-secondary-fixed-dim">
            Hidden from viewers
          </span>
        ) : null}
        {processing ? (
          <span className="technical-label text-secondary-fixed-dim">
            CloudConvert is preparing MP4
          </span>
        ) : null}
        {approvalRequired ? (
          <span className="technical-label text-secondary-fixed-dim">
            {formatCreditEstimate(item.processingEstimatedCredits)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function mediaAssetToHubItem(asset: MediaLibraryAsset): WatchMediaHubItem {
  return {
    addedAt: asset.createdAt,
    addedBy: "R2 library",
    artist: "Mistake Watch Library",
    channelName: undefined,
    duration:
      typeof asset.durationSeconds === "number"
        ? formatDuration(asset.durationSeconds)
        : "Ready",
    folderId: asset.folderId,
    id: asset.id,
    isLive: asset.isLive,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: asset.status !== "ready",
    playedSequence: undefined,
    playlistId: undefined,
    playlistTitle: undefined,
    processingEstimatedCredits: asset.processingEstimatedCredits,
    processingRequiresApproval: asset.processingRequiresApproval,
    processingStatus: asset.processingStatus,
    processingStrategy: asset.processingStrategy,
    sourceType: "direct",
    sourceUrl: asset.publicUrl,
    status: "library",
    thumbnailUrl: asset.thumbnailUrl ?? undefined,
    title: asset.title,
    visibility: asset.visibility,
    videoId:
      asset.sourceMatches.find((match) => match.sourceType === "youtube")
        ?.sourceId ?? undefined,
  };
}

async function moveAssetToFolder(assetId: string, folderId: string | null) {
  const response = await fetch(`/api/media/assets/${assetId}/folder`, {
    body: JSON.stringify({ folderId }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media asset could not be moved.");
  }

  return payload.asset;
}

async function updateAssetVisibility(
  assetId: string,
  visibility: "owner_only" | "public",
) {
  const response = await fetch(`/api/media/assets/${assetId}/visibility`, {
    body: JSON.stringify({ visibility }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media visibility could not be updated.");
  }

  return payload.asset;
}

async function approveAssetProcessing(assetId: string) {
  const response = await fetch(`/api/media/assets/${assetId}/processing`, {
    method: "POST",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media conversion could not be approved.");
  }

  return payload.asset;
}

async function deleteAsset(assetId: string) {
  const response = await fetch(`/api/media/assets/${assetId}`, {
    method: "DELETE",
  });
  const payload = (await response.json()) as {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Media asset could not be deleted.");
  }
}

async function updateFolderSort(
  folderId: string,
  sortKey: MediaFolderSortKey,
  sortDirection: MediaFolderSortDirection,
) {
  const response = await fetch(`/api/media/folders/${folderId}/sort`, {
    body: JSON.stringify({ sortDirection, sortKey }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    error?: string;
    folder?: MediaFolder;
  };

  if (!response.ok || !payload.folder) {
    throw new Error(payload.error ?? "Folder sort could not be updated.");
  }

  return payload.folder;
}

function mediaHubItemToQueueInput(
  item: WatchMediaHubItem,
  options: { isPlayNext?: boolean } = {},
) {
  if (!item.sourceType || !item.sourceUrl) {
    return null;
  }

  return {
    artist: item.artist,
    channelName: item.channelName,
    durationSeconds:
      item.duration === "Metadata pending"
        ? undefined
        : parseDurationSeconds(item.duration),
    isPlayNext: options.isPlayNext,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    sourceTitle: item.title,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    thumbnailUrl: item.thumbnailUrl,
  };
}

function filterUploadedLibraryItems({
  folders,
  items,
  query,
}: {
  folders: MediaFolder[];
  items: WatchMediaHubItem[];
  query: string;
}) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const folderName =
      folders.find((folder) => folder.id === item.folderId)?.name ?? "unsorted";
    const searchable = normalizeSearchText(
      [
        item.title,
        item.artist,
        item.channelName,
        item.duration,
        item.sourceType,
        folderName,
        item.isLive ? "live" : "",
      ].join(" "),
    );

    return normalizedQuery
      .split(" ")
      .every((token) => searchable.includes(token));
  });
}

function sortUploadedLibraryItems(
  items: WatchMediaHubItem[],
  folder: MediaFolder | null,
) {
  const sortKey = folder?.defaultSortKey ?? "created_at";
  const direction = folder?.defaultSortDirection ?? "desc";
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((first, second) => {
    if (sortKey === "name") {
      return first.title.localeCompare(second.title) * multiplier;
    }

    if (sortKey === "duration_seconds") {
      return (
        ((parseDurationSeconds(first.duration) ?? Number.MAX_SAFE_INTEGER) -
          (parseDurationSeconds(second.duration) ?? Number.MAX_SAFE_INTEGER)) *
        multiplier
      );
    }

    return (
      (new Date(first.addedAt ?? 0).getTime() -
        new Date(second.addedAt ?? 0).getTime()) *
      multiplier
    );
  });
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function captureAndUploadPoster(
  asset: MediaLibraryAsset,
  onComplete: (asset: MediaLibraryAsset) => void,
) {
  try {
    const blob = await captureVideoPoster(asset.publicUrl);
    const createResponse = await fetch(
      `/api/media/assets/${asset.id}/poster-upload`,
      { method: "POST" },
    );
    const createPayload = (await createResponse.json()) as {
      error?: string;
      objectKey?: string;
      uploadUrl?: string;
    };

    if (
      !createResponse.ok ||
      !createPayload.objectKey ||
      !createPayload.uploadUrl
    ) {
      throw new Error(createPayload.error ?? "Poster upload could not start.");
    }

    await uploadBlobToR2(blob, createPayload.uploadUrl, "image/jpeg");

    const completeResponse = await fetch(
      `/api/media/assets/${asset.id}/poster`,
      {
        body: JSON.stringify({ objectKey: createPayload.objectKey }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const completePayload = (await completeResponse.json()) as {
      asset?: MediaLibraryAsset;
      error?: string;
    };

    if (!completeResponse.ok || !completePayload.asset) {
      throw new Error(completePayload.error ?? "Poster could not be saved.");
    }

    onComplete(completePayload.asset);
  } catch {
    // Poster capture is best-effort; the asset remains playable with fallback art.
  }
}

function captureVideoPoster(sourceUrl: string) {
  return new Promise<Blob>((resolve, reject) => {
    const video = document.createElement("video");
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Poster capture failed."));
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = sourceUrl;
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(Math.max(duration * 0.1, 1), 8);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");

      if (!context) {
        fail();
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Poster capture produced no image."));
        },
        "image/jpeg",
        0.82,
      );
    };
  });
}

async function readUploadDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (durationSeconds: number | null) => {
      cleanup();
      resolve(durationSeconds);
    };

    video.preload = "metadata";
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      finish(
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.floor(video.duration)
          : null,
      );
    };
    video.onerror = () => finish(null);
  });
}

async function inspectUploadFile(file: File): Promise<ClientMediaInspection> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const container =
    extension === "mp4" || extension === "m4v" || file.type === "video/mp4"
      ? "mp4"
      : extension || null;
  const baseInspection: ClientMediaInspection = {
    audioCodecs: [],
    container,
    isBrowserSafe: false,
    notes: [],
    videoCodecs: [],
  };

  if (container !== "mp4") {
    return {
      ...baseInspection,
      notes: ["Non-MP4 upload requires conversion."],
    };
  }

  const sample = await readFileSample(file);
  const videoCodecs = readPresentCodecs(sample, [
    "av01",
    "avc1",
    "hev1",
    "hvc1",
    "vp09",
  ]);
  const audioCodecs = readPresentCodecs(sample, [
    "ac-3",
    "dts",
    "ec-3",
    "fLaC",
    "mp4a",
    "Opus",
  ]).map((codec) => codec.toLowerCase());
  const safe =
    videoCodecs.some((codec) => codec.startsWith("avc1")) &&
    audioCodecs.some((codec) => codec.startsWith("mp4a")) &&
    !videoCodecs.some((codec) =>
      ["av01", "hev1", "hvc1", "vp09"].some((unsafe) =>
        codec.startsWith(unsafe),
      ),
    ) &&
    !audioCodecs.some((codec) =>
      ["ac-3", "dts", "ec-3", "flac", "opus"].some((unsafe) =>
        codec.startsWith(unsafe),
      ),
    );

  return {
    audioCodecs,
    container,
    isBrowserSafe: safe,
    notes: safe
      ? ["MP4 preflight found browser-safe H.264/AAC markers."]
      : ["MP4 preflight could not prove browser-safe H.264/AAC."],
    videoCodecs,
  };
}

async function readFileSample(file: File) {
  const headSize = Math.min(file.size, 16 * 1024 * 1024);
  const tailSize = file.size > headSize ? Math.min(file.size - headSize, 4 * 1024 * 1024) : 0;
  const chunks = [file.slice(0, headSize)];

  if (tailSize > 0) {
    chunks.push(file.slice(file.size - tailSize, file.size));
  }

  const buffers = await Promise.all(chunks.map((chunk) => chunk.arrayBuffer()));
  const merged = new Uint8Array(
    buffers.reduce((total, buffer) => total + buffer.byteLength, 0),
  );
  let offset = 0;

  for (const buffer of buffers) {
    merged.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return merged;
}

function readPresentCodecs(sample: Uint8Array, codecMarkers: string[]) {
  return codecMarkers.filter((marker) => includesAscii(sample, marker));
}

function includesAscii(sample: Uint8Array, marker: string) {
  const needle = Array.from(marker).map((char) => char.charCodeAt(0));

  outer: for (let index = 0; index <= sample.length - needle.length; index += 1) {
    for (let needleIndex = 0; needleIndex < needle.length; needleIndex += 1) {
      if (sample[index + needleIndex] !== needle[needleIndex]) {
        continue outer;
      }
    }

    return true;
  }

  return false;
}

type MultipartCompletedPart = {
  etag: string;
  partNumber: number;
};

function uploadSingleFileToR2({
  file,
  onProgress,
  uploadUrl,
}: {
  file: File;
  onProgress(progress: number, detail?: string): void;
  uploadUrl?: string;
}) {
  if (!uploadUrl) {
    throw new Error("Upload could not start because the signed URL is missing.");
  }

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.min(95, (event.loaded / event.total) * 95);
        onProgress(
          progress,
          `Uploading ${file.name} (${formatBytes(event.loaded)} of ${formatBytes(
            event.total,
          )})`,
        );
      }
    };
    request.onerror = () => reject(new Error("R2 upload failed."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(95, `Uploaded ${file.name}`);
        resolve();
        return;
      }

      reject(new Error(`R2 upload failed with status ${request.status}.`));
    };
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type || "video/mp4");
    request.send(file);
  }).then(() => []);
}

async function uploadMultipartFileToR2({
  file,
  onProgress,
  partCount,
  partSizeBytes,
  uploadId,
}: {
  file: File;
  onProgress(progress: number, detail: string): void;
  partCount: number;
  partSizeBytes: number;
  uploadId: string;
}) {
  if (!partCount || !partSizeBytes) {
    throw new Error("Multipart upload metadata is missing.");
  }

  const completedParts: MultipartCompletedPart[] = [];
  const completedBytesByPart = new Map<number, number>();
  const inFlightBytesByPart = new Map<number, number>();
  let nextPartNumber = 1;

  function emitProgress(detailPrefix = "Uploading parts") {
    const completedBytes = Array.from(completedBytesByPart.values()).reduce(
      (total, bytes) => total + bytes,
      0,
    );
    const inFlightBytes = Array.from(inFlightBytesByPart.values()).reduce(
      (total, bytes) => total + bytes,
      0,
    );
    const uploadedBytes = Math.min(file.size, completedBytes + inFlightBytes);
    const progress = Math.min(95, (uploadedBytes / file.size) * 95);

    onProgress(
      progress,
      `${detailPrefix} (${formatBytes(uploadedBytes)} of ${formatBytes(
        file.size,
      )})`,
    );
  }

  async function uploadNextPart() {
    while (nextPartNumber <= partCount) {
      const partNumber = nextPartNumber;
      nextPartNumber += 1;
      const start = (partNumber - 1) * partSizeBytes;
      const end = Math.min(file.size, start + partSizeBytes);
      const partSize = end - start;
      const part = await uploadMultipartPartWithRetry({
        file,
        onProgress: (loadedBytes) => {
          inFlightBytesByPart.set(partNumber, loadedBytes);
          emitProgress(`Uploading part ${partNumber}/${partCount}`);
        },
        partNumber,
        start,
        end,
        uploadId,
      });

      inFlightBytesByPart.delete(partNumber);
      completedBytesByPart.set(partNumber, partSize);
      completedParts.push(part);
      emitProgress(`Uploaded part ${partNumber}/${partCount}`);
      await recordCompletedMultipartParts(uploadId, [part]);
    }
  }

  onProgress(0, `Preparing multipart upload for ${file.name}`);
  await Promise.all(
    Array.from({ length: Math.min(3, partCount) }, () => uploadNextPart()),
  );

  return completedParts.sort((left, right) => left.partNumber - right.partNumber);
}

async function uploadMultipartPartWithRetry(input: {
  end: number;
  file: File;
  onProgress(loadedBytes: number): void;
  partNumber: number;
  start: number;
  uploadId: string;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const uploadUrl = await createMultipartPartUrl(
        input.uploadId,
        input.partNumber,
      );

      return await uploadMultipartPart({
        ...input,
        uploadUrl,
      });
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, 450 * attempt));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Part ${input.partNumber} could not be uploaded.`);
}

async function createMultipartPartUrl(uploadId: string, partNumber: number) {
  const response = await fetch(`/api/media/uploads/${uploadId}/parts`, {
    body: JSON.stringify({ partNumbers: [partNumber] }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: string;
    parts?: Array<{
      partNumber: number;
      uploadUrl: string;
    }>;
  };

  if (!response.ok || !payload.parts?.[0]?.uploadUrl) {
    throw new Error(payload.error ?? "Upload part could not be prepared.");
  }

  return payload.parts[0].uploadUrl;
}

function uploadMultipartPart(input: {
  end: number;
  file: File;
  onProgress(loadedBytes: number): void;
  partNumber: number;
  start: number;
  uploadId: string;
  uploadUrl: string;
}) {
  return new Promise<MultipartCompletedPart>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const blob = input.file.slice(input.start, input.end);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress(event.loaded);
      }
    };
    request.onerror = () =>
      reject(new Error(`Part ${input.partNumber} failed to upload.`));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const etag = request.getResponseHeader("ETag");

        if (!etag) {
          reject(
            new Error(
              "R2 did not expose the upload part ETag. Check the bucket CORS ExposeHeaders setting.",
            ),
          );
          return;
        }

        resolve({
          etag,
          partNumber: input.partNumber,
        });
        return;
      }

      reject(
        new Error(
          `Part ${input.partNumber} failed with status ${request.status}.`,
        ),
      );
    };
    request.open("PUT", input.uploadUrl);
    request.send(blob);
  });
}

async function recordCompletedMultipartParts(
  uploadId: string,
  parts: MultipartCompletedPart[],
) {
  const response = await fetch(`/api/media/uploads/${uploadId}/parts`, {
    body: JSON.stringify({ parts }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error ?? "Upload progress could not be recorded.");
  }
}

async function pollMediaProcessing(
  assetId: string,
  onStatus: (status: {
    detail: string;
    progress: number;
    tone: "error" | "info" | "success";
  }) => void,
) {
  const startedAt = Date.now();
  const timeoutMs = 45 * 60 * 1000;
  let attempts = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1;
    await new Promise((resolve) => window.setTimeout(resolve, attempts < 3 ? 1500 : 4000));

    const response = await fetch(`/api/media/assets/${assetId}/processing`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      asset?: MediaLibraryAsset;
      error?: string;
      events?: Array<{
        message: string | null;
        status: string;
        taskName: string | null;
        taskOperation: string | null;
      }>;
    };

    if (!response.ok || !payload.asset) {
      throw new Error(payload.error ?? "Processing status could not be loaded.");
    }

    const latestEvent = payload.events?.[0];
    const status = payload.asset.processingStatus;

    if (payload.asset.status === "ready" || status === "ready") {
      onStatus({
        detail: "CloudConvert finished. Preparing library item.",
        progress: 100,
        tone: "success",
      });
      return payload.asset;
    }

    if (payload.asset.status === "failed" || status === "failed") {
      throw new Error(
        payload.asset.processingErrorMessage ??
          latestEvent?.message ??
          "CloudConvert could not process this video.",
      );
    }

    onStatus({
      detail: formatProcessingStatus(latestEvent, status),
      progress: status === "queued" ? 97 : 99,
      tone: "info",
    });
  }

  throw new Error("Video processing is taking longer than expected. Check the uploaded item status later.");
}

function formatProcessingStatus(
  event:
    | {
        message: string | null;
        status: string;
        taskName: string | null;
        taskOperation: string | null;
      }
    | undefined,
  status: string,
) {
  if (event?.message) {
    return event.message;
  }

  if (event?.taskOperation === "convert") {
    return "CloudConvert is creating a browser-safe MP4.";
  }

  if (event?.taskOperation === "thumbnail") {
    return "CloudConvert is creating the thumbnail.";
  }

  if (event?.taskOperation === "export/s3") {
    return "CloudConvert is exporting processed media to R2.";
  }

  return status === "queued"
    ? "CloudConvert job is queued."
    : "CloudConvert is processing the video.";
}

function uploadBlobToR2(blob: Blob, uploadUrl: string, contentType: string) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.onerror = () => reject(new Error("R2 upload failed."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`R2 upload failed with status ${request.status}.`));
    };
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", contentType);
    request.send(blob);
  });
}

function isLiveMediaHubItem(item: WatchMediaHubItem) {
  if (item.isLive || item.sourceType === "hls") {
    return true;
  }

  const url = item.sourceUrl?.toLowerCase() ?? "";
  const title = item.title.toLowerCase();

  return (
    url.includes(".m3u8") ||
    url.includes("/live") ||
    url.includes("livestream") ||
    title.includes(" live ") ||
    title.startsWith("live:")
  );
}

function deriveUploadTitle(fileName: string) {
  return (
    fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Uploaded video"
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

function formatCreditEstimate(credits: number | null | undefined) {
  if (typeof credits !== "number" || !Number.isFinite(credits)) {
    return "Estimated credits unavailable";
  }

  return `~${credits} CloudConvert credit${credits === 1 ? "" : "s"}`;
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
    <aside className="watch-audience-panel fixed inset-x-0 bottom-0 z-[65] grid max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-background/16 shadow-[0_-22px_54px_rgb(0_0_0_/_0.34)] backdrop-blur-sm lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(48rem,calc(100vw-2rem))] lg:rounded-l-lg lg:rounded-r-none lg:border-y-0 lg:border-r-0 lg:bg-background/8 lg:shadow-[0_0_48px_rgb(0_0_0_/_0.26)]">
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
