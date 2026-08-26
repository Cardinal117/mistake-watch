"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ChevronUp,
  MoreVertical,
  Pin,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import { type QueueMode } from "@/lib/queue/model";
import { type DerivedQueueState } from "@/lib/queue/derived";
import { getQueueMetadataPriority } from "@/lib/queue/metadata-priority";
import {
  getQueueScrollTopForIndex,
  getQueueVirtualWindow,
} from "@/lib/queue/virtualization";
import {
  completeQueuePerformanceMeasure,
  recordQueuePerformanceGauge,
  startQueuePerformanceMeasure,
  type QueuePerformanceMeasure,
} from "@/lib/performance/queue";
import { useQueueActionPerformance } from "@/lib/performance/use-queue-action-performance";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import {
  type QueueAddInput,
  MIN_LISTEN_DRAWER_HEIGHT,
  MAX_LISTEN_DRAWER_HEIGHT,
  COMPACT_QUEUE_ROW_HEIGHT,
  DENSE_QUEUE_ROW_HEIGHT,
  DEFAULT_LISTEN_DRAWER_HEIGHT,
} from "@/components/room/listen/shared";
import { ListenQueueRow } from "@/components/room/listen/queue/queue-row";
import {
  useDenseListenQueueRows,
  readStoredDrawerHeight,
} from "@/components/room/listen/hooks/listen-hooks";
import {
  clampNumber,
  formatQueueRemainingDuration,
} from "@/components/room/listen/helpers";

export function ListenQueueDrawer({
  canAddQueue,
  canManageQueue,
  desktopShell,
  isConnected,
  nextPreparation,
  onOpenChange,
  onAddQueueItem,
  onClearQueue,
  onMoveQueueItem,
  onPinnedFirst,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  onShuffle,
  onSmartShuffle,
  open,
  queueState,
  remainingLoading,
  remainingSeconds,
}: {
  canAddQueue: boolean;
  canManageQueue: boolean;
  desktopShell: boolean;
  isConnected: boolean;
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
  onOpenChange(open: boolean): void;
  onAddQueueItem(input: QueueAddInput): void;
  onClearQueue(): void;
  onMoveQueueItem(queueItemId: string, position: number): void;
  onPinnedFirst(): void;
  onPlayQueueItem(queueItemId: string): void;
  onQueueItemPriorityChange(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onRemoveQueueItem(queueItemId: string): void;
  onShuffle(): void;
  onSmartShuffle(): void;
  open: boolean;
  queueState: DerivedQueueState<RoomQueueItem>;
  queueMode: QueueMode;
  remainingLoading: boolean;
  remainingSeconds: number | null;
}) {
  const [query, setQuery] = useState("");
  const [drawerView, setDrawerView] = useState<"history" | "queue">("queue");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const drawerOpenMeasureRef = useRef<QueuePerformanceMeasure | null>(null);
  const drawerToggleRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const rowsViewportRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef(0);
  const hasOpenedDrawerRef = useRef(false);
  const wasOpenRef = useRef(open);
  const denseQueueRows = useDenseListenQueueRows();
  const [virtualViewport, setVirtualViewport] = useState({
    height: 0,
    scrollTop: 0,
  });
  const [drawerHeight, setDrawerHeight] = useState<number>(
    DEFAULT_LISTEN_DRAWER_HEIGHT,
  );
  const {
    currentItem,
    playedItems: historyItems,
    queuedIndexById,
    queuedItems,
    upcomingItems: queueViewItems,
  } = queueState;
  const baseVisibleItems =
    drawerView === "history" ? historyItems : queueViewItems;
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return baseVisibleItems.filter((item) => {
      const searchable =
        `${item.title} ${item.artist ?? ""} ${item.channelName ?? ""}`.toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [baseVisibleItems, query]);
  const manageDisabled = !canManageQueue || !isConnected;
  const playDisabled = !canManageQueue || !isConnected;
  const activeIndex = currentItem
    ? queueViewItems.findIndex((item) => item.id === currentItem.id)
    : -1;
  const activeQueueLabel =
    activeIndex >= 0
      ? `${activeIndex + 1} / ${queueViewItems.length}`
      : `0 / ${queueViewItems.length}`;
  const drawerCountLabel =
    drawerView === "history"
      ? `${historyItems.length} played`
      : activeQueueLabel;
  const compactRemainingLabel = remainingSeconds
    ? `${formatQueueRemainingDuration(remainingSeconds)}${remainingLoading ? " +" : ""}`
    : remainingLoading
      ? "Calculating time"
      : null;
  const nextPreview =
    nextPreparation.status !== "idle" ? nextPreparation.target : null;
  const collapsedDrawerHeight = nextPreview ? "4.5rem" : "3rem";
  const queueRowHeight = denseQueueRows
    ? DENSE_QUEUE_ROW_HEIGHT
    : COMPACT_QUEUE_ROW_HEIGHT;
  const virtualWindow = useMemo(
    () =>
      getQueueVirtualWindow({
        itemCount: visibleItems.length,
        rowHeight: queueRowHeight,
        scrollTop: virtualViewport.scrollTop,
        viewportHeight: virtualViewport.height,
      }),
    [
      queueRowHeight,
      virtualViewport.height,
      virtualViewport.scrollTop,
      visibleItems.length,
    ],
  );
  const virtualItems = useMemo(
    () => visibleItems.slice(virtualWindow.startIndex, virtualWindow.endIndex),
    [visibleItems, virtualWindow.endIndex, virtualWindow.startIndex],
  );
  const expandedDrawerHeight = `min(${drawerHeight}dvh, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(0.5rem, env(safe-area-inset-bottom))))`;
  const drawerStyle = {
    height: open ? expandedDrawerHeight : collapsedDrawerHeight,
    maxHeight: open ? expandedDrawerHeight : collapsedDrawerHeight,
  } as CSSProperties;
  const measureQueueAction = useQueueActionPerformance(queueState);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDrawerHeight(readStoredDrawerHeight());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = rowsViewportRef.current;

    if (!viewport) {
      return;
    }

    const viewportElement = viewport;

    if (
      !hasOpenedDrawerRef.current &&
      drawerView === "queue" &&
      query.length === 0 &&
      activeIndex >= 0
    ) {
      savedScrollTopRef.current = getQueueScrollTopForIndex({
        index: activeIndex,
        itemCount: visibleItems.length,
        rowHeight: queueRowHeight,
        viewportHeight: viewportElement.clientHeight || queueRowHeight * 6,
      });
    }

    hasOpenedDrawerRef.current = true;
    viewportElement.scrollTop = savedScrollTopRef.current;

    let scrollFrame = 0;

    function syncViewport() {
      savedScrollTopRef.current = viewportElement.scrollTop;
      setVirtualViewport((current) => {
        const nextHeight = viewportElement.clientHeight;
        const nextScrollTop = viewportElement.scrollTop;

        if (
          current.height === nextHeight &&
          current.scrollTop === nextScrollTop
        ) {
          return current;
        }

        return { height: nextHeight, scrollTop: nextScrollTop };
      });
    }

    function scheduleViewportSync() {
      if (scrollFrame !== 0) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        syncViewport();
      });
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleViewportSync);

    syncViewport();
    viewportElement.addEventListener("scroll", scheduleViewportSync, {
      passive: true,
    });
    window.addEventListener("resize", scheduleViewportSync);
    resizeObserver?.observe(viewportElement);

    return () => {
      if (scrollFrame !== 0) {
        window.cancelAnimationFrame(scrollFrame);
      }

      viewportElement.removeEventListener("scroll", scheduleViewportSync);
      window.removeEventListener("resize", scheduleViewportSync);
      resizeObserver?.disconnect();
    };
  }, [
    activeIndex,
    drawerView,
    open,
    query,
    queueRowHeight,
    visibleItems.length,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    recordQueuePerformanceGauge(
      "mounted-rows",
      virtualWindow.mountedItemCount,
      {
        drawerView,
      },
    );
    completeQueuePerformanceMeasure(drawerOpenMeasureRef.current, {
      drawerView,
      mountedRows: virtualWindow.mountedItemCount,
    });
    drawerOpenMeasureRef.current = null;
  }, [drawerView, open, virtualWindow.mountedItemCount]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (open && !wasOpen) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : drawerToggleRef.current;
    }

    if (!open && wasOpen) {
      const focusTarget = restoreFocusRef.current ?? drawerToggleRef.current;
      const frame = window.requestAnimationFrame(() => {
        if (focusTarget?.isConnected) {
          focusTarget.focus();
        } else {
          drawerToggleRef.current?.focus();
        }
      });

      restoreFocusRef.current = null;
      wasOpenRef.current = open;

      return () => window.cancelAnimationFrame(frame);
    }

    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(false);
      onOpenChange(false);
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  function toggleDrawer() {
    if (!open) {
      drawerOpenMeasureRef.current = startQueuePerformanceMeasure(
        "drawer-open-to-committed-rows",
        { queueItems: queueViewItems.length },
      );
    }

    onOpenChange(!open);
  }

  function setHeight(nextHeight: number) {
    const safeHeight = clampNumber(
      nextHeight,
      MIN_LISTEN_DRAWER_HEIGHT,
      MAX_LISTEN_DRAWER_HEIGHT,
    );

    setDrawerHeight(safeHeight);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "mw_listen_queue_drawer_height",
        String(safeHeight),
      );
    }
  }

  function resetDrawerScroll() {
    savedScrollTopRef.current = 0;

    if (rowsViewportRef.current) {
      rowsViewportRef.current.scrollTop = 0;
    }

    setVirtualViewport((current) =>
      current.scrollTop === 0 ? current : { ...current, scrollTop: 0 },
    );
  }

  function selectDrawerView(view: "history" | "queue") {
    resetDrawerScroll();
    setDrawerView(view);
  }

  function updateQuery(nextQuery: string) {
    resetDrawerScroll();
    setQuery(nextQuery);
  }

  return (
    <section
      data-listen-queue-drawer
      className={cx(
        "fixed z-50 flex flex-col overflow-hidden border border-white/10 backdrop-blur-xl transition-[height,max-height,border-color,background-color,box-shadow,left,right,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        desktopShell
          ? "bottom-[max(var(--listen-shell-inset),env(safe-area-inset-bottom))] left-[calc(var(--listen-workspace-left)+var(--listen-workspace-inset))] right-[max(calc(var(--listen-shell-inset)+var(--listen-workspace-inset)),env(safe-area-inset-right))] rounded-lg shadow-[0_-18px_48px_rgb(0_0_0_/_0.32)]"
          : "bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] rounded-lg shadow-[0_-18px_48px_rgb(0_0_0_/_0.32)]",
        open
          ? "border-[rgb(var(--listen-primary)/0.28)] bg-surface/94"
          : "max-h-12 border-white/10 bg-surface/66",
      )}
      style={drawerStyle}
    >
      <button
        aria-expanded={open}
        aria-label={open ? "Collapse queue drawer" : "Open queue drawer"}
        className={cx(
          "group mx-auto grid min-h-11 w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-[rgb(var(--listen-primary))] outline-none transition hover:bg-[rgb(var(--listen-primary)/0.08)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--listen-primary)/0.72)] sm:px-4",
          open ? "border-b border-white/10" : "h-full",
        )}
        onClick={toggleDrawer}
        ref={drawerToggleRef}
        type="button"
      >
        <span className="grid min-w-0 gap-1 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <span className="technical-label text-on-surface">Queue</span>
            <span className="text-label-sm text-on-surface-variant">
              {drawerCountLabel}
            </span>
          </span>
          {nextPreview && !desktopShell ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
                Next
              </span>
              <span className="truncate text-label-sm font-semibold text-on-surface-variant">
                {nextPreview.title}
              </span>
            </span>
          ) : null}
        </span>
        <span className="flex h-8 min-w-20 items-center justify-center rounded-full border border-[rgb(var(--listen-primary)/0.28)] bg-surface-container-low/76 px-4 text-[rgb(var(--listen-primary))] shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_0_18px_rgb(var(--listen-shadow)/0.1)] transition-colors group-hover:border-[rgb(var(--listen-primary)/0.48)] group-hover:bg-[rgb(var(--listen-primary)/0.09)]">
          <ChevronUp
            className={cx(
              "h-4 w-4 stroke-[2.25] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
        <span className="grid min-w-0 justify-items-end gap-1 text-right text-label-sm text-on-surface-variant">
          {compactRemainingLabel ? (
            <span className="whitespace-nowrap text-[rgb(var(--listen-primary))]">
              {compactRemainingLabel}
            </span>
          ) : null}
          <span className="hidden min-[440px]:block">
            {open ? "Hide details" : "Open queue"}
          </span>
        </span>
      </button>
      {open ? (
        <div className="flex min-h-0 flex-1 translate-y-0 flex-col overflow-hidden opacity-100 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
          <div className="grid shrink-0 gap-3 border-b border-white/10 p-3 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-body-lg font-semibold text-on-surface">
                  {drawerView === "history" ? "History" : "Queue"}
                </h3>
                <span className="text-label-sm text-on-surface-variant">
                  {drawerCountLabel}
                </span>
              </div>
              <div className="inline-grid h-9 shrink-0 grid-cols-2 rounded-sm border border-white/10 bg-surface-container-lowest p-1">
                {[
                  ["queue", "Queue", queueViewItems.length],
                  ["history", "History", historyItems.length],
                ].map(([view, label, count]) => (
                  <button
                    className={cx(
                      "rounded-sm px-3 text-label-sm font-semibold transition",
                      drawerView === view
                        ? "bg-[rgb(var(--listen-primary)/0.12)] text-[rgb(var(--listen-primary))]"
                        : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
                    )}
                    key={view}
                    onClick={() =>
                      selectDrawerView(view as "history" | "queue")
                    }
                    type="button"
                  >
                    {label}
                    <span className="ml-1 text-[11px] opacity-70">{count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_auto] md:items-center">
              <label className="grid h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-sm border border-white/10 bg-surface-container-low px-3">
                <Search
                  className="h-4 w-4 text-on-surface-variant"
                  aria-hidden
                />
                <input
                  className="min-w-32 bg-transparent text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55"
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search in queue"
                  value={query}
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                <Button
                  disabled={manageDisabled || queuedItems.length < 2}
                  onClick={() => measureQueueAction("shuffle", onShuffle)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Shuffle className="h-4 w-4" aria-hidden />
                  Shuffle
                </Button>
                <Button
                  disabled={manageDisabled || queuedItems.length < 2}
                  onClick={() =>
                    measureQueueAction("smart-shuffle", onSmartShuffle)
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Smart Shuffle
                </Button>
                <Button
                  disabled={manageDisabled || queuedItems.length < 2}
                  onClick={() =>
                    measureQueueAction("pinned-first", onPinnedFirst)
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Pin className="h-4 w-4" aria-hidden />
                  Pinned first
                </Button>
                <Button
                  disabled={manageDisabled || queuedItems.length === 0}
                  onClick={() => measureQueueAction("clear", onClearQueue)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear
                </Button>
                <button
                  aria-expanded={settingsOpen}
                  aria-label="Queue drawer settings"
                  className={cx(
                    "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface",
                    settingsOpen &&
                      "border-[rgb(var(--listen-primary)/0.35)] bg-[rgb(var(--listen-primary)/0.1)] text-[rgb(var(--listen-primary))]",
                  )}
                  onClick={() => setSettingsOpen((current) => !current)}
                  title="Queue drawer settings"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            {settingsOpen ? (
              <div className="rounded-sm border border-white/10 bg-surface-container-lowest/70 p-3">
                <label className="grid gap-2 sm:grid-cols-[auto_minmax(10rem,1fr)_auto] sm:items-center">
                  <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Drawer height
                  </span>
                  <input
                    aria-label="Queue drawer height"
                    className="h-2 min-w-0 accent-[rgb(var(--listen-primary))]"
                    max={MAX_LISTEN_DRAWER_HEIGHT}
                    min={MIN_LISTEN_DRAWER_HEIGHT}
                    onChange={(event) =>
                      setHeight(Number(event.currentTarget.value))
                    }
                    step={1}
                    type="range"
                    value={drawerHeight}
                  />
                  <span className="text-label-sm font-semibold text-[rgb(var(--listen-primary))]">
                    {drawerHeight}vh
                  </span>
                </label>
              </div>
            ) : null}
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]"
            ref={rowsViewportRef}
          >
            {visibleItems.length > 0 ? (
              <div
                aria-label={
                  drawerView === "history" ? "Queue history" : "Queue items"
                }
                className="relative"
                role="list"
                style={{ height: virtualWindow.totalHeight }}
              >
                <div
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `translateY(${virtualWindow.offsetTop}px)`,
                  }}
                >
                  {virtualItems.map((item, localIndex) => {
                    const index = virtualWindow.startIndex + localIndex;
                    const queuedIndex = queuedIndexById.get(item.id) ?? -1;

                    return (
                      <div
                        aria-posinset={index + 1}
                        aria-setsize={visibleItems.length}
                        data-queue-row-index={index}
                        key={item.id}
                        role="listitem"
                        style={{ height: queueRowHeight }}
                      >
                        <ListenQueueRow
                          canAddQueue={canAddQueue}
                          current={item.id === currentItem?.id}
                          desktopShell={desktopShell}
                          index={index}
                          item={item}
                          manageDisabled={manageDisabled}
                          metadataPriority={getQueueMetadataPriority({
                            current: item.id === currentItem?.id,
                            firstVisibleIndex: virtualWindow.firstVisibleIndex,
                            itemIndex: index,
                            overscanEndIndex: virtualWindow.endIndex,
                            overscanStartIndex: virtualWindow.startIndex,
                            queuedIndex,
                            visibleEndIndex: virtualWindow.visibleEndIndex,
                          })}
                          onAddQueueItem={onAddQueueItem}
                          onMoveQueueItem={(queueItemId, position) =>
                            measureQueueAction("move", () =>
                              onMoveQueueItem(queueItemId, position),
                            )
                          }
                          onPlayQueueItem={(queueItemId) =>
                            measureQueueAction("play", () =>
                              onPlayQueueItem(queueItemId),
                            )
                          }
                          playDisabled={playDisabled}
                          onQueueItemPriorityChange={(queueItemId, input) =>
                            measureQueueAction("priority", () =>
                              onQueueItemPriorityChange(queueItemId, input),
                            )
                          }
                          onRemoveQueueItem={(queueItemId) =>
                            measureQueueAction("remove", () =>
                              onRemoveQueueItem(queueItemId),
                            )
                          }
                          queuedIndex={queuedIndex}
                          queuedItemsLength={queuedItems.length}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="p-4 text-body-md text-on-surface-variant">
                {drawerView === "history"
                  ? "No history rows match this search."
                  : "No queue rows match this search."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
