"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AudioCompanionClient,
  AudioCompanionSnapshot,
  VisualFrameV1,
} from "@/lib/audio-companion/client";
import {
  isUsableRoomRhythmProfile,
  ROOM_RHYTHM_ALGORITHM_VERSION,
} from "@/lib/audio-companion/room-rhythm";
import { ListenCanvasEngine } from "@/lib/player/listen-canvas-engine";
import type { ListenCanvasTheme } from "@/lib/player/listen-canvas-renderer-shared";
import { createListenCanvasRenderer } from "@/lib/player/listen-canvas-renderers";
import {
  createIdleVisualizerInput,
  createListenVisualizerInputBuffers,
  createLocalDetailVisualizerInput,
  createPreviewVisualizerInput,
  createSharedRhythmVisualizerInput,
  resolveListenVisualizationCapability,
} from "@/lib/player/listen-visualizer-input";
import type { ListenVisualizationMode } from "@/lib/player/listen-visualization";
import type { LiveRoomRhythmProfile } from "@/lib/spacetime/types";
import { cx } from "@/lib/ui";

const DPR_CAP = 1.25;

type ListenVisualizationProps = {
  active: boolean;
  activeMediaId?: string | null;
  className?: string;
  companion: {
    client: AudioCompanionClient;
    snapshot: AudioCompanionSnapshot;
  };
  intensity?: number;
  mediaPositionSeconds?: number;
  mode: ListenVisualizationMode;
  nowMs?: number;
  playbackOccurrenceId?: string | null;
  preview?: boolean;
  roomRhythmProfile?: LiveRoomRhythmProfile | null;
  theme: ListenCanvasTheme;
};

export function ListenVisualization(props: ListenVisualizationProps) {
  const {
    active,
    activeMediaId,
    className,
    companion,
    intensity = 75,
    mediaPositionSeconds = 0,
    mode,
    nowMs = 0,
    playbackOccurrenceId,
    preview = false,
    roomRhythmProfile = null,
    theme,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualFrameRef = useRef<VisualFrameV1 | null>(null);
  const visualReceivedAtRef = useRef(0);
  const latestRef = useRef({
    active,
    companion: companion.snapshot,
    intensity,
    mediaPositionSeconds,
    positionSampledAt: 0,
    preview,
    profile: roomRhythmProfile,
    theme,
  });
  const motionAllowed = useVisualizationMotion(active || preview);
  const hasSharedRhythm = Boolean(
    activeMediaId &&
    playbackOccurrenceId &&
    isUsableRoomRhythmProfile(roomRhythmProfile, {
      algorithmVersion: ROOM_RHYTHM_ALGORITHM_VERSION,
      mediaId: activeMediaId,
      nowMs,
      playbackOccurrenceId,
    }),
  );
  const capability = useMemo(
    () =>
      resolveListenVisualizationCapability(mode, {
        hasLocalDetail: companion.snapshot.hasVisualDetail,
        hasSharedRhythm,
        preview,
      }),
    [companion.snapshot.hasVisualDetail, hasSharedRhythm, mode, preview],
  );
  const boundedRibbon = capability.effectiveMode === "siri-ribbon";

  useEffect(() => {
    latestRef.current = {
      active,
      companion: companion.snapshot,
      intensity,
      mediaPositionSeconds,
      positionSampledAt: performance.now(),
      preview,
      profile: roomRhythmProfile,
      theme,
    };
  }, [
    active,
    companion.snapshot,
    intensity,
    mediaPositionSeconds,
    preview,
    roomRhythmProfile,
    theme,
  ]);

  useEffect(() => {
    visualFrameRef.current = null;
    visualReceivedAtRef.current = 0;
    if (capability.source !== "local-detail" || !motionAllowed) return;
    const unsubscribe = companion.client.subscribeVisual((frame) => {
      visualFrameRef.current = frame;
      visualReceivedAtRef.current = performance.now();
    });
    return () => {
      unsubscribe();
      visualFrameRef.current = null;
      visualReceivedAtRef.current = 0;
    };
  }, [capability.source, companion.client, motionAllowed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      capability.source === "fallback" ||
      capability.source === "none"
    ) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    const renderer = createListenCanvasRenderer(capability.effectiveMode);
    const inputBuffers = createListenVisualizerInputBuffers();
    renderer.init();
    const engine = new ListenCanvasEngine({
      fps: 24,
      getInput: (timestamp) => {
        const latest = latestRef.current;
        if (latest.preview) {
          return createPreviewVisualizerInput(timestamp / 1_000, inputBuffers);
        }
        if (capability.source === "local-detail") {
          const visual = visualFrameRef.current;
          if (!visual || timestamp - visualReceivedAtRef.current > 700) {
            return createIdleVisualizerInput();
          }
          return createLocalDetailVisualizerInput(
            latest.companion.rhythm ?? {
              bass: 0,
              bpm: null,
              confidence: 0,
              energy: 0,
              highs: 0,
              mids: 0,
              onset: 0,
            },
            visual,
            inputBuffers,
          );
        }
        if (latest.profile) {
          const elapsed = latest.active
            ? Math.max(0, timestamp - latest.positionSampledAt) / 1_000
            : 0;
          return createSharedRhythmVisualizerInput(
            latest.profile,
            latest.mediaPositionSeconds + elapsed,
            inputBuffers,
          );
        }
        return createIdleVisualizerInput();
      },
      onDispose: renderer.dispose,
      render: (input, timeMs, deltaMs) => {
        const latest = latestRef.current;
        renderer.render({
          compact: canvas.clientWidth < 640,
          context,
          deltaMs,
          height: canvas.clientHeight,
          input,
          intensity: latest.intensity / 100,
          theme: latest.theme,
          timeMs,
          width: canvas.clientWidth,
        });
      },
    });
    const resize = () => resizeCanvas(canvas, context, renderer);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (motionAllowed) engine.start();
    return () => {
      observer.disconnect();
      engine.dispose();
    };
  }, [capability.effectiveMode, capability.source, motionAllowed]);

  return (
    <div
      aria-hidden
      className={cx(
        "listen-visualization pointer-events-none absolute overflow-hidden",
        boundedRibbon ? "inset-x-0 top-[22%] h-[56%]" : "inset-0",
        className,
      )}
      data-companion-status={companion.snapshot.status}
      data-listen-visualization={mode}
      data-rendered-visualization={capability.effectiveMode}
      data-visualization-fallback={capability.reason ?? undefined}
    >
      {capability.source !== "fallback" && capability.source !== "none" ? (
        <canvas className="h-full w-full" ref={canvasRef} />
      ) : null}
    </div>
  );
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  renderer: ReturnType<typeof createListenCanvasRenderer>,
) {
  const width = Math.max(1, Math.round(canvas.clientWidth));
  const height = Math.max(1, Math.round(canvas.clientHeight));
  const dpr = Math.min(DPR_CAP, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.resize({ compact: width < 640, height, width });
}

function useVisualizationMotion(active: boolean) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setAllowed(active && !document.hidden && !query.matches);
    update();
    query.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      query.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [active]);
  return allowed;
}
