"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, Play, Square } from "lucide-react";
import { useListenAmbientPreference } from "@/components/room/listen/theme/use-listen-ambient-preference";
import { useArtworkTheme } from "@/components/room/listen/theme/listen-theme";
import { ListenVisualization } from "@/components/room/listen/theme/listen-visualization";
import { useListenVisualizationPreference } from "@/components/room/listen/theme/use-listen-visualization-preference";
import {
  getListenPresentationVariables,
  LISTEN_BACKGROUND_DIMMING,
  LISTEN_BACKGROUND_VIBRANCY,
  LISTEN_VISUAL_INTENSITY,
  listenVisualizationModes,
  type ListenVisualizationMode,
} from "@/lib/player/listen-visualization";
import type { ListenTheme } from "@/components/room/listen/shared";
import { cx } from "@/lib/ui";
import { useAudioCompanion } from "@/lib/audio-companion/use-audio-companion";

const FALLBACK_PREVIEW_ARTWORK = "/brand/logo-concept-01-signal-aperture.png";
const previewFallbackTheme = {
  backgroundPrimary: "19 42 45",
  backgroundSecondary: "28 23 11",
  primary: "0 219 233",
  secondary: "255 186 32",
  shadow: "0 219 233",
  wave: "219 252 255",
} satisfies ListenTheme;

export function PersonalizationSection({
  artworkUrl,
}: {
  artworkUrl?: string | null;
}) {
  const { mode, setMode } = useListenVisualizationPreference();
  const audioCompanion = useAudioCompanion();
  const {
    ambientFallbackEnabled,
    backgroundDimming,
    backgroundVibrancy,
    setAmbientFallbackEnabled,
    setBackgroundDimming,
    setBackgroundVibrancy,
    setVisualizerArtworkEnabled,
    setVisualIntensity,
    visualizerArtworkEnabled,
    visualIntensity,
  } = useListenAmbientPreference();
  const [previewMode, setPreviewMode] =
    useState<ListenVisualizationMode | null>(null);
  const previewArtworkUrl = artworkUrl ?? FALLBACK_PREVIEW_ARTWORK;
  const previewArtworkTheme = useArtworkTheme(
    previewArtworkUrl,
    previewFallbackTheme,
  );
  const previewTheme = {
    ...getListenPresentationVariables(
      visualIntensity,
      backgroundDimming,
      backgroundVibrancy,
    ),
    "--listen-background-primary": previewArtworkTheme.backgroundPrimary,
    "--listen-background-secondary": previewArtworkTheme.backgroundSecondary,
    "--listen-primary": previewArtworkTheme.primary,
    "--listen-secondary": previewArtworkTheme.secondary,
    "--listen-shadow": previewArtworkTheme.shadow,
    "--listen-wave": previewArtworkTheme.wave,
  } as CSSProperties;

  useEffect(() => {
    if (!previewMode) {
      return;
    }

    const timer = window.setTimeout(() => setPreviewMode(null), 5_000);

    return () => window.clearTimeout(timer);
  }, [previewMode]);

  function selectMode(nextMode: ListenVisualizationMode) {
    setMode(nextMode);
    const option = listenVisualizationModes.find(
      (candidate) => candidate.id === nextMode,
    );
    setPreviewMode(option?.motionLayers ? nextMode : null);
  }

  return (
    <section aria-labelledby="listen-visualization-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="technical-label text-primary-fixed-dim">
            Visual experience
          </p>
          <h4
            className="mt-1 text-headline-md font-semibold text-on-surface"
            id="listen-visualization-title"
          >
            Listen visualization
          </h4>
        </div>
        <p className="technical-label text-on-surface-variant">
          Saved on this browser
        </p>
      </div>
      <p
        className="mt-2 text-label-sm text-on-surface-variant"
        data-audio-companion-status={audioCompanion.snapshot.status}
      >
        Audio companion: {companionStatusLabel(audioCompanion.snapshot.status)}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AmbientToggleControl
          checked={ambientFallbackEnabled}
          description="Use a deterministic, non-reactive waveform when a selected visualizer has no usable signal."
          label="Ambient fallback"
          onChange={setAmbientFallbackEnabled}
        />
        <AmbientToggleControl
          checked={visualizerArtworkEnabled}
          description="Keep the current media artwork behind moving visualizers and Ambient fallback."
          label="Show artwork with visualizers"
          onChange={setVisualizerArtworkEnabled}
        />
      </div>

      <div
        aria-label="Listen visualization"
        className="mt-5 grid gap-3 md:grid-cols-2"
        role="radiogroup"
      >
        {listenVisualizationModes.map((option) => {
          const selected = option.id === mode;
          const previewing = option.id === previewMode;

          return (
            <article
              className={cx(
                "overflow-hidden rounded-md border bg-surface-container-lowest/42",
                selected ? "border-primary-fixed-dim/55" : "border-white/10",
              )}
              key={option.id}
            >
              <div
                className={cx(
                  "relative h-28 overflow-hidden border-b border-white/10 bg-surface-container-lowest",
                  option.id === "off" && "bg-surface",
                )}
                style={previewTheme}
              >
                {option.id !== "off" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- A transient preview may use provider artwork from the active room. */}
                    <img
                      alt=""
                      className="absolute -inset-[8%] h-[116%] w-[116%] object-cover blur-sm saturate-150"
                      src={previewArtworkUrl}
                      style={{
                        opacity: "var(--listen-artwork-opacity, 0.48)",
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg,rgb(14 14 15 / var(--listen-dim-left,0.58)),rgb(19 19 20 / var(--listen-dim-middle,0.34)) 38%,rgb(14 14 15 / var(--listen-dim-edge,0.88))),linear-gradient(180deg,rgb(14 14 15 / var(--listen-dim-top,0.18)),rgb(14 14 15 / var(--listen-dim-bottom,0.9)))",
                      }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_30%,rgb(var(--listen-primary)_/_0.18),transparent_46%)]" />
                  </>
                ) : null}
                <ListenVisualization
                  active={previewing}
                  companion={audioCompanion}
                  intensity={visualIntensity}
                  mode={option.id}
                  preview={previewing}
                  theme={previewArtworkTheme}
                />
                {option.motionLayers > 0 ? (
                  <button
                    aria-label={`${previewing ? "Stop" : "Play"} ${option.label} preview`}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/12 bg-surface-container-lowest/85 text-on-surface transition hover:border-primary-fixed-dim/45 hover:text-primary-fixed-dim"
                    onClick={() =>
                      setPreviewMode(previewing ? null : option.id)
                    }
                    title={`${previewing ? "Stop" : "Play"} preview`}
                    type="button"
                  >
                    {previewing ? (
                      <Square className="h-4 w-4" aria-hidden />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
              <label className="relative flex cursor-pointer items-start gap-3 p-4">
                <input
                  checked={selected}
                  className="peer absolute left-4 top-4 h-5 w-5 opacity-0"
                  name="listen-visualization"
                  onChange={() => selectMode(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span
                  aria-hidden
                  className={cx(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border peer-focus-visible:ring-2 peer-focus-visible:ring-primary-fixed-dim peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface",
                    selected
                      ? "border-primary-fixed-dim bg-primary-fixed-dim text-on-primary-fixed"
                      : "border-outline-variant bg-surface-container",
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-body-md font-semibold text-on-surface">
                      {option.label}
                    </span>
                    <span
                      className={cx(
                        "technical-label rounded-sm border px-1.5 py-0.5",
                        option.powerProfile === "recommended"
                          ? "border-primary-fixed-dim/45 text-primary-fixed-dim"
                          : option.powerProfile === "lowest"
                            ? "border-white/12 text-on-surface-variant"
                            : option.powerProfile === "beta"
                              ? "border-primary-fixed-dim/35 text-primary-fixed-dim"
                              : "border-secondary-fixed-dim/35 text-secondary-fixed-dim",
                      )}
                    >
                      {option.powerLabel}
                    </span>
                  </span>
                  <span className="mt-1 block text-label-sm text-on-surface-variant">
                    {option.description}
                  </span>
                  {option.inputSource !== "none" ? (
                    <span className="technical-label mt-2 block text-on-surface-variant">
                      {option.inputSource === "local-detail"
                        ? "Local companion detail"
                        : "Shared room rhythm"}
                    </span>
                  ) : null}
                </span>
              </label>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-3">
        <AmbientRangeControl
          bounds={LISTEN_VISUAL_INTENSITY}
          description="Controls artwork and visualization presence."
          id="listen-visual-intensity"
          label="Visual intensity"
          onChange={setVisualIntensity}
          value={visualIntensity}
        />
        <AmbientRangeControl
          bounds={LISTEN_BACKGROUND_DIMMING}
          description="Darkens the artwork behind room content."
          id="listen-background-dimming"
          label="Background dimming"
          onChange={setBackgroundDimming}
          value={backgroundDimming}
        />
        <AmbientRangeControl
          bounds={LISTEN_BACKGROUND_VIBRANCY}
          description="Strengthens the extracted room gradient without changing its colors."
          id="listen-background-vibrancy"
          label="Background vibrancy"
          onChange={setBackgroundVibrancy}
          value={backgroundVibrancy}
        />
      </div>
    </section>
  );
}

function AmbientToggleControl({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange(value: boolean): void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-surface-container-lowest/42 p-3.5">
      <div className="min-w-0">
        <p className="text-body-md font-semibold text-on-surface">{label}</p>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          {description}
        </p>
      </div>
      <button
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 overflow-hidden rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          checked
            ? "border-primary-fixed-dim/65 bg-primary-fixed-dim/22"
            : "border-white/14 bg-surface-container-high",
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          aria-hidden
          className={cx(
            "absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-transform",
            checked
              ? "translate-x-5 bg-primary-fixed-dim shadow-[0_0_12px_rgb(0_219_233/0.35)]"
              : "translate-x-0 bg-on-surface-variant",
          )}
        />
      </button>
    </div>
  );
}

function companionStatusLabel(status: string) {
  switch (status) {
    case "inactive":
      return "installed, capture inactive";
    case "detecting":
      return "detecting rhythm";
    case "locked":
      return "rhythm locked";
    case "stale":
      return "signal stale";
    case "disconnected":
      return "reconnecting";
    default:
      return "not available";
  }
}

function AmbientRangeControl({
  bounds,
  description,
  id,
  label,
  onChange,
  value,
}: {
  bounds: { max: number; min: number; step: number };
  description: string;
  id: string;
  label: string;
  onChange(value: number): void;
  value: number;
}) {
  const descriptionId = `${id}-description`;
  const progress = ((value - bounds.min) / (bounds.max - bounds.min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-body-md font-semibold text-on-surface"
          htmlFor={id}
        >
          {label}
        </label>
        <output className="technical-label text-primary-fixed-dim" htmlFor={id}>
          {value}%
        </output>
      </div>
      <p
        className="mt-1 text-label-sm text-on-surface-variant"
        id={descriptionId}
      >
        {description}
      </p>
      <input
        aria-describedby={descriptionId}
        className="mistake-slider mt-3 w-full"
        id={id}
        max={bounds.max}
        min={bounds.min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={bounds.step}
        style={{ "--slider-progress": `${progress}%` } as CSSProperties}
        type="range"
        value={value}
      />
    </div>
  );
}
