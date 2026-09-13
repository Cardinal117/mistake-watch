"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/ui";
import styles from "./signal-aperture.module.css";
import { getApertureFrame, getIrisBladeAngle } from "./signal-aperture-motion";

export type SignalApertureMode = "listen" | "watch";
export type SignalApertureMarkProps = {
  animated?: boolean;
  className?: string;
  initialMode?: SignalApertureMode;
  label?: string;
  mode?: SignalApertureMode;
  tone?: "amber" | "cyan";
  transition?: boolean;
};
export type BrandLockupProps = {
  animated?: boolean;
  className?: string;
  compact?: boolean;
  label?: string;
  mode?: SignalApertureMode;
};

const SHEET = "M-400-400H640V81H-400Z";
const PIVOT = { x: 190.710678, y: 49.289322 };

function ModeSymbol({ mode }: { mode: SignalApertureMode }) {
  return mode === "listen" ? (
    <>
      <path
        d="M107 125v-6a13 13 0 0 1 26 0v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.6"
      />
      <rect height="13" rx="3" width="7" x="105" y="121" />
      <rect height="13" rx="3" width="7" x="128" y="121" />
    </>
  ) : (
    <path d="M112 106q-2-1-2 2v25q0 2 3 1l21-12q3-2 0-4Z" />
  );
}

export function SignalApertureMark({
  animated = false,
  className,
  initialMode,
  label,
  mode = "watch",
  tone,
  transition = true,
}: SignalApertureMarkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const previousModeRef = useRef(initialMode ?? mode);
  const [displayedMode, setDisplayedMode] = useState(initialMode ?? mode);
  const [motionActive, setMotionActive] = useState(false);
  const id = useId().replaceAll(":", "");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let frameRequest = 0;
    const previousMode = previousModeRef.current;
    const modeChanged = previousMode !== mode;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const drawStatic = () => {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      previousModeRef.current = mode;
      setMotionActive(false);
      setDisplayedMode(mode);
      const angle = getIrisBladeAngle(1);
      svg
        .querySelectorAll<SVGGElement>("[data-blade-motion]")
        .forEach((node) =>
          node.setAttribute(
            "transform",
            `rotate(${angle} ${PIVOT.x} ${PIVOT.y})`,
          ),
        );
      svg
        .querySelector<SVGGElement>("[data-aperture-rotor]")
        ?.setAttribute("transform", "rotate(0 120 120)");
    };

    const run = () => {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      if (document.hidden || media.matches) return drawStatic();
      const isTransition = transition && modeChanged;
      if (!animated && !isTransition) return drawStatic();
      setMotionActive(true);
      const startedAt = performance.now();
      let symbolSwapped = !isTransition;
      if (isTransition) setDisplayedMode(previousMode);
      const draw = (now: number) => {
        const elapsed = now - startedAt;
        if (isTransition && !animated && elapsed >= 650) {
          drawStatic();
          return;
        }
        const transitionElapsed = Math.min(elapsed, 650);
        const transitioning = isTransition && elapsed < 650;
        if (isTransition && !transitioning) previousModeRef.current = mode;
        const frame = getApertureFrame(
          transitioning ? transitionElapsed : elapsed - (isTransition ? 650 : 0),
          transitioning,
        );
        const angle = getIrisBladeAngle(frame.travel);
        svg
          .querySelectorAll<SVGGElement>("[data-blade-motion]")
          .forEach((node) =>
            node.setAttribute(
              "transform",
              `rotate(${angle} ${PIVOT.x} ${PIVOT.y})`,
            ),
          );
        svg
          .querySelector<SVGGElement>("[data-aperture-rotor]")
          ?.setAttribute("transform", `rotate(${frame.rotation} 120 120)`);
        if (!symbolSwapped && (!transitioning || frame.icon === "current")) {
          symbolSwapped = true;
          setDisplayedMode(mode);
        }
        if (animated || (isTransition && elapsed < 650))
          frameRequest = requestAnimationFrame(draw);
      };
      frameRequest = requestAnimationFrame(draw);
    };

    const visibility = () => (document.hidden ? drawStatic() : run());
    run();
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", run);
    return () => {
      cancelAnimationFrame(frameRequest);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", run);
    };
  }, [animated, mode, transition]);

  const masks = Array.from({ length: 6 }, (_, index) => `${id}-leaf-${index}`);
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cx(styles.mark, className)}
      data-motion={motionActive ? "active" : "static"}
      data-tone={tone}
      ref={svgRef}
      role={label ? "img" : undefined}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      {label ? <title>{label}</title> : null}
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle cx="120" cy="120" r="91" />
        </clipPath>
        {masks.map((mask, index) => (
          <mask
            height="240"
            id={mask}
            key={mask}
            maskUnits="userSpaceOnUse"
            width="240"
          >
            <rect fill="white" height="240" width="240" />
            <g transform={`rotate(${((index + 5) % 6) * 60} 120 120)`}>
              <g data-blade-motion>
                <path d={SHEET} fill="black" />
              </g>
            </g>
          </mask>
        ))}
      </defs>
      <circle className={styles.core} cx="120" cy="120" r="39" />
      <g className={styles.symbol}>
        <ModeSymbol mode={displayedMode} />
      </g>
      <g clipPath={`url(#${id}-disc)`} data-aperture-rotor>
        {masks.map((mask, index) => (
          <g key={mask} mask={`url(#${mask})`}>
            <g transform={`rotate(${index * 60} 120 120)`}>
              <g data-blade-motion>
                <path className={styles.blade} d={SHEET} />
                <path className={styles.bladeEdge} d="M-400 81H640" />
              </g>
            </g>
          </g>
        ))}
      </g>
      {animated ? (
        <g className={styles.orbit}>
          <circle className={styles.orbitTrack} cx="120" cy="120" r="108" />
          <circle className={styles.orbitArc} cx="120" cy="120" r="108" />
        </g>
      ) : null}
    </svg>
  );
}

export function BrandLockup({
  animated = false,
  className,
  compact = false,
  label = "Mistake Watch",
  mode = "watch",
}: BrandLockupProps) {
  return (
    <span
      aria-label={label}
      className={cx(styles.lockup, compact && styles.compact, className)}
      role="img"
    >
      <SignalApertureMark
        animated={animated}
        className={styles.lockupMark}
        mode={mode}
      />
      <svg
        aria-hidden
        className={styles.wordmark}
        viewBox="0 0 1343 165"
      >
        <use href="/brand/signal-aperture-wordmark.svg#signal-aperture-wordmark" />
      </svg>
    </span>
  );
}

export const SignalApertureLockup = BrandLockup;
