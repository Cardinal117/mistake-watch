"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { SignalApertureMark } from "@/components/brand";
import type { Transition } from "@/lib/room-transition/store";
export function RoomLoadingScreen({
  state,
  onBack,
  onDismiss,
}: {
  state: Transition;
  onBack(): void;
  onDismiss(): void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const changed = new Map<HTMLElement, boolean>();
    const inertPortals = () => {
      for (const node of Array.from(document.body.children)) {
        if (
          !(node instanceof HTMLElement) ||
          node.matches(
            "script,style,[data-room-app-content],[data-room-loading-host]",
          ) ||
          node.contains(ref.current)
        )
          continue;
        if (!changed.has(node)) changed.set(node, node.inert);
        node.inert = true;
      }
    };
    inertPortals();
    const observer = new MutationObserver(inertPortals);
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
      for (const [node, previous] of changed) node.inert = previous;
    };
  }, []);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    ref.current?.focus();
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    return () => {
      queueMicrotask(() => {
        if (
          document.querySelector(
            "[data-room-loading-host] .room-loading-content",
          )
        )
          return;
        const destination = document.querySelector<HTMLElement>(
          '[aria-selected="true"][role="tab"]',
        );
        if ((state.kind === "mode" || state.kind === "room") && destination)
          destination.focus();
        else if (previous?.isConnected) previous.focus();
      });
    };
  }, [state.id, state.startedAt, state.kind]);
  useEffect(() => {
    const startedAt = state.startedAt || Date.now();
    let timer: number | undefined;
    const update = () => {
      window.clearInterval(timer);
      if (document.hidden || state.error) return;
      const age = Date.now() - startedAt;
      setElapsed(age);
      if (age < 20000) timer = window.setInterval(update, 150);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [state.startedAt, state.error]);
  const timedOut = elapsed >= 20000;
  const failed = !!state.error || timedOut;
  const showMark = elapsed >= 150 || failed;
  const palette = state.palette;
  return (
    <div
      className="room-loading-screen"
      data-loading-state={failed ? "failed" : "pending"}
      style={
        palette
          ? ({
              "--brand-primary": palette.primary,
              "--brand-secondary": palette.secondary,
              "--brand-background": palette.background,
            } as CSSProperties)
          : undefined
      }
    >
      <div
        className="room-loading-content"
        ref={ref}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(
            ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
          );
          if (!buttons.length) {
            event.preventDefault();
            return;
          }
          if (
            event.shiftKey &&
            (document.activeElement === buttons[0] ||
              document.activeElement === ref.current)
          ) {
            event.preventDefault();
            buttons.at(-1)?.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === buttons.at(-1)
          ) {
            event.preventDefault();
            buttons[0]?.focus();
          }
        }}
      >
        <div
          className="room-loading-mark"
          data-visible={showMark}
        >
          {/* Start motion at visibility, not underneath the anti-flash grace. */}
          {showMark && (
            <SignalApertureMark
              mode={state.target ?? "watch"}
              initialMode={state.fromMode}
              animated={!failed}
              className="room-loading-aperture"
            />
          )}
        </div>
        <div
          role={failed ? "alert" : "status"}
          aria-live={failed ? "assertive" : "polite"}
        >
          <h1>{failed ? "Your room needs attention" : state.label}</h1>
          <p>
            {state.error ??
              (timedOut
                ? "This is taking longer than expected. You can go back safely."
                : elapsed >= 8000
                  ? "Still preparing your room. You can return to the dashboard."
                  : (state.detail ?? "Preparing your room."))}
          </p>
        </div>
        {(elapsed >= 8000 || failed) && (
          <div className="room-loading-actions">
            <button onClick={onBack}>Back to dashboard</button>
            {!state.pending && state.retry && (
              <button
                onClick={() => {
                  onDismiss();
                  state.retry?.();
                }}
              >
                Retry connection
              </button>
            )}
            {failed &&
              !state.pending &&
              !state.retry &&
              state.kind !== "room" && (
                <button onClick={onDismiss}>Return to room</button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
