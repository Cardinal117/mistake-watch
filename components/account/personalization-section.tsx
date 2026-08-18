"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, Play, Square } from "lucide-react";
import { ListenVisualization } from "@/components/room/listen/theme/listen-visualization";
import { useListenVisualizationPreference } from "@/components/room/listen/theme/use-listen-visualization-preference";
import {
  listenVisualizationModes,
  type ListenVisualizationMode,
} from "@/lib/player/listen-visualization";
import { cx } from "@/lib/ui";

const previewTheme = {
  "--listen-primary": "0 219 233",
  "--listen-secondary": "255 186 32",
  "--listen-wave": "219 252 255",
} as CSSProperties;

export function PersonalizationSection() {
  const { mode, setMode } = useListenVisualizationPreference();
  const [previewMode, setPreviewMode] =
    useState<ListenVisualizationMode | null>(null);

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
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_30%,rgb(var(--listen-primary)_/_0.18),transparent_46%),linear-gradient(180deg,rgb(14_14_15_/_0.2),rgb(14_14_15_/_0.94))]" />
                ) : null}
                <ListenVisualization active={previewing} mode={option.id} />
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
              <label className="flex cursor-pointer items-start gap-3 p-4">
                <input
                  checked={selected}
                  className="sr-only"
                  name="listen-visualization"
                  onChange={() => selectMode(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span
                  aria-hidden
                  className={cx(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border",
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
                            : "border-secondary-fixed-dim/35 text-secondary-fixed-dim",
                      )}
                    >
                      {option.powerLabel}
                    </span>
                  </span>
                  <span className="mt-1 block text-label-sm text-on-surface-variant">
                    {option.description}
                  </span>
                </span>
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
