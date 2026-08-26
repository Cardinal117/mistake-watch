"use client";

import { useEffect, useRef } from "react";

import type { ListenCanvasTheme } from "@/lib/player/listen-canvas-renderer-shared";
import { createAmbientWaveformSamples } from "@/lib/player/listen-visualization";

const FPS = 12;
const FRAME_INTERVAL_MS = 1_000 / FPS;
const SAMPLE_COUNT = 48;

export function AmbientWaveformPrototype({
  active,
  mediaPositionSeconds,
  seedKey,
  theme,
}: {
  active: boolean;
  mediaPositionSeconds: number;
  seedKey: string;
  theme: ListenCanvasTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const syncMotionRef = useRef<(() => void) | null>(null);
  const latestRef = useRef({ active, mediaPositionSeconds, seedKey, theme });

  useEffect(() => {
    latestRef.current = { active, mediaPositionSeconds, seedKey, theme };
    syncMotionRef.current?.();
  }, [active, mediaPositionSeconds, seedKey, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let running = false;
    let lastFrameAt = -Infinity;
    let sampledAt = performance.now();
    let sampledPosition = latestRef.current.mediaPositionSeconds;

    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth));
      const height = Math.max(1, Math.round(canvas.clientHeight));
      canvas.width = width;
      canvas.height = height;
      context.setTransform(1, 0, 0, 1, 0, 0);
      drawAmbientWaveform(context, latestRef.current, sampledPosition);
    };
    const observer = new ResizeObserver(resize);

    const canMove = () =>
      latestRef.current.active && !document.hidden && !motionQuery.matches;
    const stop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      running = false;
    };
    const frame = (timestamp: number) => {
      if (!canMove()) {
        stop();
        return;
      }
      if (timestamp - lastFrameAt >= FRAME_INTERVAL_MS) {
        const latest = latestRef.current;
        const nextSampledPosition =
          sampledPosition + Math.max(0, timestamp - sampledAt) / 1_000;
        drawAmbientWaveform(context, latest, nextSampledPosition);
        lastFrameAt = timestamp;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    const syncMotion = () => {
      sampledAt = performance.now();
      sampledPosition = latestRef.current.mediaPositionSeconds;
      if (!canMove()) {
        stop();
        drawAmbientWaveform(context, latestRef.current, sampledPosition);
        return;
      }
      if (!running) {
        running = true;
        animationFrame = window.requestAnimationFrame(frame);
      }
    };

    observer.observe(canvas);
    motionQuery.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    resize();
    syncMotionRef.current = syncMotion;
    syncMotion();

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      syncMotionRef.current = null;
      stop();
    };
  }, []);

  return (
    <canvas
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-1/2 h-[42%] w-full -translate-y-1/2"
      data-ambient-waveform-prototype
      ref={canvasRef}
    />
  );
}

function drawAmbientWaveform(
  context: CanvasRenderingContext2D,
  state: {
    seedKey: string;
    theme: ListenCanvasTheme;
  },
  mediaPositionSeconds: number,
) {
  const { height, width } = context.canvas;
  const samples = createAmbientWaveformSamples(
    state.seedKey,
    mediaPositionSeconds,
    SAMPLE_COUNT,
  );
  const centerY = height / 2;
  const amplitude = height * 0.38;

  context.clearRect(0, 0, width, height);
  drawStroke(context, samples, width, centerY, amplitude, {
    color: `rgb(${state.theme.shadow} / 0.22)`,
    lineWidth: 7,
  });
  drawStroke(context, samples, width, centerY, amplitude, {
    color: `rgb(${state.theme.wave} / 0.82)`,
    lineWidth: 1.75,
  });
}

function drawStroke(
  context: CanvasRenderingContext2D,
  samples: readonly number[],
  width: number,
  centerY: number,
  amplitude: number,
  style: { color: string; lineWidth: number },
) {
  context.beginPath();
  samples.forEach((sample, index) => {
    const x = (index / (samples.length - 1)) * width;
    const y = centerY + sample * amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = style.lineWidth;
  context.strokeStyle = style.color;
  context.stroke();
}
