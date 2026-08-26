"use client";

import type {
  AudioCompanionClient,
  AudioCompanionSnapshot,
} from "@/lib/audio-companion/client";
import {
  isUsableRoomRhythmProfile,
  ROOM_RHYTHM_ALGORITHM_VERSION,
} from "@/lib/audio-companion/room-rhythm";
import type { ListenCanvasTheme } from "@/lib/player/listen-canvas-renderer-shared";
import {
  getListenVisualizerStagePresentation,
  shouldShowListenStageArtwork,
  type ListenVisualizationMode,
} from "@/lib/player/listen-visualization";
import { resolveListenVisualizationCapability } from "@/lib/player/listen-visualizer-input";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomRhythmProfile } from "@/lib/spacetime/types";
import { cx } from "@/lib/ui";
import { formatSeconds } from "@/components/room/listen/helpers";
import { PreferenceHeartButton } from "@/components/room/listen/preference-heart-button";
import { AmbientWaveformPrototype } from "@/components/room/listen/theme/ambient-waveform-prototype";
import { ListenVisualization } from "@/components/room/listen/theme/listen-visualization";
import { VisualizerStatusInfo } from "@/components/room/listen/stage/visualizer-status-info";

export function ListenVisualizerStage({
  active,
  activeArtworkUrl,
  activeMediaId,
  ambientFallbackEnabled,
  artist,
  companion,
  currentItem,
  currentPosition,
  durationSeconds,
  intensity,
  mediaPreferences,
  nowMs,
  playbackOccurrenceId,
  roomRhythmProfile,
  theme,
  title,
  visualizationMode,
  visualizerArtworkEnabled,
  embedded = false,
}: {
  active: boolean;
  activeArtworkUrl?: string | null;
  activeMediaId?: string | null;
  ambientFallbackEnabled: boolean;
  artist: string;
  companion: {
    client: AudioCompanionClient;
    snapshot: AudioCompanionSnapshot;
  };
  currentItem: RoomQueueItem | null;
  currentPosition: number;
  durationSeconds: number;
  intensity: number;
  mediaPreferences: MediaPreferenceController;
  nowMs: number;
  playbackOccurrenceId?: string | null;
  roomRhythmProfile?: LiveRoomRhythmProfile | null;
  theme: ListenCanvasTheme;
  title: string;
  visualizationMode: ListenVisualizationMode;
  visualizerArtworkEnabled: boolean;
  embedded?: boolean;
}) {
  const hasSharedRhythm = Boolean(
    activeMediaId &&
    playbackOccurrenceId &&
    isUsableRoomRhythmProfile(roomRhythmProfile ?? null, {
      algorithmVersion: ROOM_RHYTHM_ALGORITHM_VERSION,
      mediaId: activeMediaId,
      nowMs,
      playbackOccurrenceId,
    }),
  );
  const capability = resolveListenVisualizationCapability(visualizationMode, {
    hasLocalDetail: companion.snapshot.hasVisualDetail,
    hasSharedRhythm,
    preview: false,
  });
  const presentation = getListenVisualizerStagePresentation({
    ambientFallbackEnabled,
    capability,
    selectedMode: visualizationMode,
  });
  const progress = durationSeconds
    ? Math.min(100, Math.max(0, (currentPosition / durationSeconds) * 100))
    : 0;
  const preference = mediaPreferences.getPreference(currentItem);
  const visibleArtworkUrl =
    activeArtworkUrl &&
    shouldShowListenStageArtwork(
      presentation.activeMode,
      visualizerArtworkEnabled,
    )
      ? activeArtworkUrl
      : null;

  return (
    <section
      aria-label="Active media visualizer"
      className={cx(
        "relative isolate grid min-h-[clamp(24rem,56vh,46rem)] overflow-hidden",
        embedded
          ? "h-full rounded-none border-0 bg-transparent shadow-none"
          : "rounded-xl border border-white/8 bg-background/58 shadow-[0_24px_70px_rgb(0_0_0/0.28)]",
      )}
      data-listen-stage-mode={presentation.activeMode}
      data-listen-stage-status={presentation.statusLabel}
    >
      {visibleArtworkUrl ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgb(var(--listen-background-secondary)/0.72),transparent_46%),linear-gradient(90deg,rgb(var(--listen-background-primary)/0.92),rgb(var(--listen-background-secondary)/0.72)_50%,rgb(var(--listen-background-primary)/0.92))]" />
          {/* eslint-disable-next-line @next/next/no-img-element -- Provider artwork is intentionally confined to the Visualizer stage. */}
          <img
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-18 blur-2xl saturate-125"
            decoding="async"
            src={visibleArtworkUrl}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- The clear artwork layer preserves the actual media composition. */}
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-72 saturate-110"
            decoding="async"
            src={visibleArtworkUrl}
          />
        </>
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(10_10_11/0.1),rgb(10_10_11/0.34)_76%,rgb(10_10_11/0.68)),radial-gradient(circle_at_50%_42%,rgb(var(--listen-primary)/0.1),transparent_60%)]" />

      {presentation.activeMode === "ambient-waveform" ? (
        <AmbientWaveformPrototype
          active={active}
          mediaPositionSeconds={currentPosition}
          seedKey={activeMediaId ?? currentItem?.sourceUrl ?? title}
          theme={theme}
        />
      ) : presentation.activeMode !== "static-artwork" &&
        presentation.activeMode !== "off" ? (
        <ListenVisualization
          active={active}
          activeMediaId={activeMediaId}
          className="!inset-0 !h-full"
          companion={companion}
          intensity={intensity}
          mediaPositionSeconds={currentPosition}
          mode={visualizationMode}
          nowMs={nowMs}
          playbackOccurrenceId={playbackOccurrenceId}
          roomRhythmProfile={roomRhythmProfile}
          theme={theme}
        />
      ) : null}

      <VisualizerStatusInfo
        fallbackActive={presentation.fallbackActive}
        message={presentation.message}
        rendererLabel={presentation.rendererLabel}
        statusLabel={presentation.statusLabel}
      />

      <div className="relative z-10 mt-auto grid justify-items-center gap-3 px-5 pb-7 pt-28 text-center sm:pb-9">
        <div className="max-w-[min(40rem,90%)]">
          <h2 className="line-clamp-2 text-headline-md font-semibold text-on-surface">
            {title || "No media playing"}
          </h2>
          <p className="mt-1 truncate text-body-md text-[rgb(var(--listen-primary))]">
            {artist}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-label-sm text-on-surface-variant">
            {formatSeconds(currentPosition)} / {formatSeconds(durationSeconds)}
          </span>
          {currentItem ? (
            <PreferenceHeartButton
              item={currentItem}
              onToggle={() =>
                void mediaPreferences.togglePreference(currentItem)
              }
              preference={preference}
              variant="circular"
            />
          ) : null}
        </div>
        <div
          aria-label={`Playback progress ${Math.round(progress)} percent`}
          className="h-1 w-[min(28rem,82%)] overflow-hidden rounded-full bg-white/12"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-[rgb(var(--listen-primary))]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
