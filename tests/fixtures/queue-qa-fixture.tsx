"use client";
import { useState, type CSSProperties } from "react";
import { PlaylistPreviewCard } from "@/components/room/shared/add-media/preview-cards";
import { ListenPlaylistReviewOverlay } from "@/components/room/listen/add-media/playlist-review-overlay";
import { ListenQueueDrawer } from "@/components/room/listen/queue/queue-drawer";
import { deriveQueueState } from "@/lib/queue/derived";
import {
  projectQueueMove,
  queuePlacement,
  type MoveQueueAction,
} from "@/lib/queue/move-intent";
import type { RoomQueueItem } from "@/lib/rooms";
import {
  playlistItemKeys,
  type PlaylistPreview,
} from "@/components/room/shared/add-media/contracts";
import { previewArtwork } from "./watch-preview-data";
import "@/components/room/watch/watch-room.css";
const preview: PlaylistPreview = {
  playlistId: "local",
  playlistTitle: "Replay Mix",
  status: "available",
  totalCount: 250,
  skippedUnavailable: 0,
  items: Array.from({ length: 250 }, (_, i) => ({
    videoId: `local-${i}`,
    position: i,
    title: `Track ${i + 1} — a long playlist title for layout QA`,
    channelTitle: "Local QA artist",
    durationSeconds: 180,
    sourceUrl: `https://www.youtube.com/watch?v=local-${i}`,
    thumbnailUrl: previewArtwork(i % 4),
    isUnavailable: false,
    availability: {
      playable: true,
      reason: "Local fixture",
      status: "playable",
      source: "playlist",
    },
  })),
};
const initial: RoomQueueItem[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `item-${i}`,
  title: `Queue item ${i}`,
  duration: "3:00",
  addedBy: "QA host",
  status: i ? "queued" : "now",
  sourceType: "direct",
  sourceUrl: "/dev/watch-fixture.webm",
  thumbnailUrl: previewArtwork(i % 4),
}));
export function QueueQaFixture() {
  const [screen, setScreen] = useState("playlist"),
    [selected, onSelectionChange] = useState(playlistItemKeys(preview.items));
  const [notice, setNotice] = useState(""),
    [items, setItems] = useState(initial),
    [open, setOpen] = useState(true),
    [allowed, setAllowed] = useState(true);
  const move: MoveQueueAction = async (id, position, actionId, placement) => {
    const intent = {
      id,
      actionId: actionId ?? "local",
      ...(placement ??
        queuePlacement(
          items.filter((i) => i.status === "queued").map((i) => i.id),
          id,
          position,
        )!),
    };
    await new Promise((resolve) => setTimeout(resolve, 600));
    setItems((current) => projectQueueMove(current, intent));
  };
  const duplicateIds = new Set(preview.items.slice(1).map((i) => i.videoId));
  return (
    <main
      className="watch-redesign"
      style={
        {
          "--listen-primary": "197 157 122",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        } as CSSProperties
      }
    >
      <nav
        aria-label="Local QA surfaces"
        style={{ display: "flex", gap: 12, padding: 12, flexWrap: "wrap" }}
      >
        <a href="/dev/watch-design">Watch room</a>
        <button onClick={() => setScreen("playlist")}>Watch playlist</button>
        <button onClick={() => setScreen("listen-playlist")}>
          Listen playlist
        </button>
        <button
          onClick={() => {
            setScreen("listen");
            setOpen(true);
          }}
        >
          Listen queue
        </button>
        <button onClick={() => setAllowed((value) => !value)}>
          {allowed ? "Revoke permission" : "Allow controls"}
        </button>
      </nav>
      <p role="status" style={{ padding: "0 12px" }}>
        Local fixture · 600 ms move confirmation ·{" "}
        {notice || "No external service calls"}
      </p>
      {screen === "playlist" && (
        <section
          className="watch-workspace-content"
          style={{ minHeight: 0, overflow: "auto", padding: 16 }}
        >
          <PlaylistPreviewCard
            mode="watch"
            preview={preview}
            selectedIds={selected}
            onSelectionChange={onSelectionChange}
            addDisabled={!allowed}
            duplicateSourceUrls={new Set()}
            duplicateVideoIds={duplicateIds}
            onCancel={() => setNotice("Cancelled")}
            onImport={(strategy) =>
              setNotice(
                `Import ${strategy}: ${strategy === "selected" ? selected.size : 250} items`,
              )
            }
          />
        </section>
      )}
      {screen === "listen-playlist" && (
        <ListenPlaylistReviewOverlay
          preview={preview}
          selectedIds={selected}
          onSelectionChange={onSelectionChange}
          addDisabled={!allowed}
          duplicateSourceUrls={new Set()}
          duplicateVideoIds={duplicateIds}
          onClose={() => setScreen("playlist")}
          onImportAll={() => setNotice("Import all")}
          onImportSelected={() => setNotice(`Import ${selected.size} selected`)}
        />
      )}
      {screen === "listen" && (
        <ListenQueueDrawer
          canAddQueue={allowed}
          canManageQueue={allowed}
          desktopShell={false}
          isConnected
          nextPreparation={{
            status: "idle",
            target: null,
            detail: null,
            durationMs: null,
          }}
          onOpenChange={setOpen}
          open={open}
          queueState={deriveQueueState(items)}
          queueMode="normal"
          remainingLoading={false}
          remainingSeconds={180000}
          onMoveQueueItem={move}
          onRemoveQueueItem={(id) =>
            setItems((current) => current.filter((i) => i.id !== id))
          }
          onPlayQueueItem={(id) => setNotice(`Play ${id}`)}
          onQueueItemPriorityChange={(id, patch) =>
            setItems((current) =>
              current.map((i) => (i.id === id ? { ...i, ...patch } : i)),
            )
          }
          onAddQueueItem={() => setNotice("Add requested")}
          onClearQueue={() => setItems([])}
          onPinnedFirst={() => {}}
          onShuffle={() => {}}
          onSmartShuffle={() => {}}
        />
      )}
    </main>
  );
}
