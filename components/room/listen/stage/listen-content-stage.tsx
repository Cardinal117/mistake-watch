"use client";

import { useState, type ReactNode } from "react";
import { AudioWaveform, CirclePlay } from "lucide-react";

import type {
  AudioCompanionClient,
  AudioCompanionSnapshot,
} from "@/lib/audio-companion/client";
import type { ListenCanvasTheme } from "@/lib/player/listen-canvas-renderer-shared";
import {
  normalizeListenStageView,
  type ListenStageView,
  type ListenVisualizationMode,
} from "@/lib/player/listen-visualization";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomRhythmProfile } from "@/lib/spacetime/types";
import { cx } from "@/lib/ui";
import { ListenDiscoveryPanel } from "@/components/room/listen/discovery/discovery-panel";
import type {
  QueueAddInput,
  SourceLoadInput,
} from "@/components/room/listen/shared";
import { ListenVisualizerStage } from "@/components/room/listen/stage/listen-visualizer-stage";

export function ListenContentStage({
  active,
  activeArtworkUrl,
  activeMediaId,
  ambientFallbackEnabled,
  artist,
  canAddQueue,
  canLoadSource,
  canPlay,
  companion,
  currentItem,
  preferenceItem,
  currentPosition,
  durationSeconds,
  intensity,
  items,
  mediaPreferences,
  nowMs,
  onAddQueueItem,
  onLoadSource,
  onPlayQueueItem,
  playbackOccurrenceId,
  room,
  roomRhythmProfile,
  theme,
  title,
  visualizationMode,
  visualizerArtworkEnabled,
}: {
  active: boolean;
  activeArtworkUrl?: string | null;
  activeMediaId?: string | null;
  ambientFallbackEnabled: boolean;
  artist: string;
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  companion: {
    client: AudioCompanionClient;
    snapshot: AudioCompanionSnapshot;
  };
  currentItem: RoomQueueItem | null;
  preferenceItem: RoomQueueItem | null;
  currentPosition: number;
  durationSeconds: number;
  intensity: number;
  items: RoomQueueItem[];
  mediaPreferences: MediaPreferenceController;
  nowMs: number;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  onPlayQueueItem(queueItemId: string): void;
  playbackOccurrenceId?: string | null;
  room: RoomSnapshot;
  roomRhythmProfile?: LiveRoomRhythmProfile | null;
  theme: ListenCanvasTheme;
  title: string;
  visualizationMode: ListenVisualizationMode;
  visualizerArtworkEnabled: boolean;
}) {
  const [view, setView] = useState<ListenStageView>("discover");

  function selectView(nextView: ListenStageView) {
    setView(normalizeListenStageView(nextView));
  }

  return (
    <section className="relative min-h-[28rem] min-w-0 overflow-hidden rounded-xl border border-white/8 bg-background/46 shadow-[0_24px_70px_rgb(0_0_0/0.24)] xl:h-full xl:min-h-0">
      <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3 sm:px-4">
        <div
          aria-label="Listen workspace"
          className="pointer-events-auto inline-flex rounded-full border border-white/8 bg-background/72 p-1 backdrop-blur-md"
          role="tablist"
        >
          <StageTab
            controls="listen-discover-panel"
            icon={<CirclePlay aria-hidden className="h-4 w-4" />}
            label="Discover"
            onSelect={() => selectView("discover")}
            selected={view === "discover"}
          />
          <StageTab
            controls="listen-visualizer-panel"
            icon={<AudioWaveform aria-hidden className="h-4 w-4" />}
            label="Visualizer"
            onSelect={() => selectView("visualizer")}
            selected={view === "visualizer"}
          />
        </div>
      </div>

      <div
        aria-labelledby="listen-stage-tab-discover"
        className="h-full min-h-0 overflow-hidden"
        hidden={view !== "discover"}
        id="listen-discover-panel"
        role="tabpanel"
      >
        <ListenDiscoveryPanel
          canAddQueue={canAddQueue}
          canLoadSource={canLoadSource}
          canPlay={canPlay}
          currentItem={currentItem}
          items={items}
          mediaPreferences={mediaPreferences}
          onAddQueueItem={onAddQueueItem}
          onLoadSource={onLoadSource}
          onPlayQueueItem={onPlayQueueItem}
          room={room}
          embedded
        />
      </div>

      {view === "visualizer" ? (
        <div
          aria-labelledby="listen-stage-tab-visualizer"
          className="h-full min-h-0"
          id="listen-visualizer-panel"
          role="tabpanel"
        >
          <ListenVisualizerStage
            active={active}
            activeArtworkUrl={activeArtworkUrl}
            activeMediaId={activeMediaId}
            ambientFallbackEnabled={ambientFallbackEnabled}
            artist={artist}
            companion={companion}
            currentItem={preferenceItem}
            currentPosition={currentPosition}
            durationSeconds={durationSeconds}
            intensity={intensity}
            mediaPreferences={mediaPreferences}
            nowMs={nowMs}
            playbackOccurrenceId={playbackOccurrenceId}
            roomRhythmProfile={roomRhythmProfile}
            theme={theme}
            title={title}
            visualizationMode={visualizationMode}
            visualizerArtworkEnabled={visualizerArtworkEnabled}
            embedded
          />
        </div>
      ) : null}
    </section>
  );
}

function StageTab({
  controls,
  icon,
  label,
  onSelect,
  selected,
}: {
  controls: string;
  icon: ReactNode;
  label: string;
  onSelect(): void;
  selected: boolean;
}) {
  return (
    <button
      aria-controls={controls}
      aria-selected={selected}
      className={cx(
        "inline-flex h-8 min-w-28 items-center justify-center gap-2 rounded-full border px-3.5 text-label-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary))]",
        selected
          ? "border-[rgb(var(--listen-primary)/0.7)] bg-[rgb(var(--listen-primary)/0.12)] text-[rgb(var(--listen-primary))]"
          : "border-transparent text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
      )}
      id={`listen-stage-tab-${label.toLowerCase()}`}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
