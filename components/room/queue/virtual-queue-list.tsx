"use client";
import {
  Fragment,
  createContext,
  useCallback,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getQueueVirtualWindow } from "@/lib/queue/virtualization";
import type { RoomQueueItem } from "@/lib/rooms";
import "./compact-queue.css";

export const QueueDragContext = createContext<{
  begin(id: string): void;
  target(y: number): number;
  finish(): void;
} | null>(null);
const ROW_HEIGHT = 82;

/** One scroll owner; one held row is retained while the visible window recycles. */
export function VirtualQueueList({
  items,
  indices,
  children,
  enabled = true,
  label = "Queue items",
}: {
  items: RoomQueueItem[];
  indices: Map<string, number>;
  children(item: RoomQueueItem): ReactNode;
  label?: string;
  enabled?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });
  const [held, setHeld] = useState<string | null>(null);
  const [destination, setDestination] = useState(-1);
  const lastDestination = useRef(-1);
  const [focused, setFocused] = useState<string | null>(null);
  const scrollOwner = useRef<HTMLElement | null>(null);
  const focusIndex = focused ? items.findIndex((i) => i.id === focused) : -1;
  const previousFocusIndex = useRef(-1);
  useEffect(() => {
    if (
      !held ||
      items.some((item) => item.id === held && item.status === "queued")
    )
      return;
    const frame = requestAnimationFrame(() => {
      setHeld(null);
      setDestination(-1);
    });
    return () => cancelAnimationFrame(frame);
  }, [held, items]);
  useLayoutEffect(() => {
    const node = list.current;
    if (!node) return;
    let scroller: HTMLElement | null = node.parentElement;
    while (
      scroller &&
      !/auto|scroll/.test(getComputedStyle(scroller).overflowY)
    )
      scroller = scroller.parentElement;
    const owner = scroller;
    scrollOwner.current = owner;
    let frame = 0;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      const parent = owner?.getBoundingClientRect();
      const top = parent?.top ?? 0;
      const height = parent?.height ?? innerHeight;
      setViewport((current) => {
        const next = { top: Math.max(0, top - bounds.top), height };
        return current.top === next.top && current.height === next.height
          ? current
          : next;
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    if (owner) observer.observe(owner);
    (owner ?? window).addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      (owner ?? window).removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  useLayoutEffect(() => {
    const owner = scrollOwner.current,
      node = list.current;
    if (
      focused &&
      focusIndex >= 0 &&
      previousFocusIndex.current >= 0 &&
      focusIndex !== previousFocusIndex.current &&
      owner &&
      node &&
      !held
    ) {
      const y =
        node.getBoundingClientRect().top -
        owner.getBoundingClientRect().top +
        focusIndex * ROW_HEIGHT;
      if (y < 0) owner.scrollTop += y;
      else if (y + ROW_HEIGHT > owner.clientHeight)
        owner.scrollTop += y + ROW_HEIGHT - owner.clientHeight;
    }
    previousFocusIndex.current = focusIndex;
  }, [focusIndex, focused, held]);
  const windowed = getQueueVirtualWindow({
    itemCount: items.length,
    rowHeight: ROW_HEIGHT,
    scrollTop: viewport.top,
    viewportHeight: viewport.height,
  });
  const from = held ? items.findIndex((i) => i.id === held) : -1;
  const mounted = Array.from(
    { length: windowed.endIndex - windowed.startIndex },
    (_, i) => i + windowed.startIndex,
  );
  if (from >= 0 && !mounted.includes(from)) mounted.push(from);
  if (!held && focusIndex >= 0 && !mounted.includes(focusIndex))
    mounted.push(focusIndex);
  mounted.sort((a, b) => a - b);
  const target = useCallback(
    (y: number) => {
      const bounds = list.current?.getBoundingClientRect();
      if (!bounds) return -1;
      let index = Math.max(
        0,
        Math.min(items.length - 1, Math.floor((y - bounds.top) / ROW_HEIGHT)),
      );
      if ((indices.get(items[index]?.id) ?? -1) < 0) {
        const firstQueued = items.findIndex((item) => indices.has(item.id));
        if (firstQueued >= 0) index = firstQueued;
      }
      const queueIndex = indices.get(items[index]?.id) ?? -1;
      if (queueIndex >= 0 && lastDestination.current !== index) {
        lastDestination.current = index;
        setDestination(index);
      }
      return queueIndex;
    },
    [items, indices],
  );
  const context = useMemo(
    () => ({
      begin(id: string) {
        setHeld(id);
      },
      target,
      finish() {
        lastDestination.current = -1;
        setHeld(null);
        setDestination(-1);
      },
    }),
    [target],
  );
  if (!enabled)
    return (
      <ol className="grid gap-2" aria-label={label}>
        {items.map((item) => (
          <Fragment key={item.id}>{children(item)}</Fragment>
        ))}
      </ol>
    );
  return (
    <QueueDragContext.Provider value={context}>
      <div
        ref={list}
        role="list"
        aria-label={label}
        onFocusCapture={(e) =>
          setFocused(
            (e.target as HTMLElement).closest<HTMLElement>("[data-queue-id]")
              ?.dataset.queueId ?? null,
          )
        }
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setFocused(null);
        }}
        className="compact-virtual-queue"
        style={{ height: windowed.totalHeight }}
      >
        {mounted.map((index) => {
          const item = items[index];
          const shift =
            from < 0 || destination < 0 || index === from
              ? 0
              : from < destination && index > from && index <= destination
                ? -ROW_HEIGHT
                : from > destination && index >= destination && index < from
                  ? ROW_HEIGHT
                  : 0;
          return (
            <div
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={items.length}
              className="compact-queue-slot"
              key={item.id}
              data-held={item.id === held}
              style={{
                transform: `translateY(${index * ROW_HEIGHT + shift}px)`,
              }}
            >
              {children(item)}
            </div>
          );
        })}
        {held && destination >= 0 && (
          <div
            role="presentation"
            aria-hidden
            className="compact-queue-gap"
            style={{ transform: `translateY(${destination * ROW_HEIGHT}px)` }}
          />
        )}
      </div>
    </QueueDragContext.Provider>
  );
}
