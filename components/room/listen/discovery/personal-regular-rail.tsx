"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { PersonalTrack } from "@/lib/recommendations/personal-discovery-model";

const PAGE_GAP_PX = 12;
const SWIPE_THRESHOLD_PX = 36;

function pageSizeFor(width: number) {
  const tile = width <= 650 ? 96 : 112;
  return Math.max(1, Math.floor((width + PAGE_GAP_PX) / (tile + PAGE_GAP_PX)));
}

export function PersonalRegularRail({
  countWindowDays,
  items,
  onViewAll,
  renderTrack,
}: {
  countWindowDays: number;
  items: PersonalTrack[];
  onViewAll(): void;
  renderTrack(item: PersonalTrack): ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const infoButton = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{
    id: number;
    startX: number;
    startY: number;
    dragging: boolean;
    offsetX: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [pageSize, setPageSize] = useState(1);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [dragOffset, setDragOffset] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () =>
      items.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize,
      ),
    [currentPage, items, pageSize],
  );

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const resize = () => setPageSize(pageSizeFor(node.clientWidth));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!infoOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !info.current?.contains(event.target))
        setInfoOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setInfoOpen(false);
      infoButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [infoOpen]);

  function move(nextPage: number) {
    const bounded = Math.max(0, Math.min(pageCount - 1, nextPage));
    if (bounded === currentPage) return;
    setDirection(bounded > currentPage ? "next" : "previous");
    setPage(bounded);
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    pointer.current = null;
    if (active.dragging) {
      suppressClick.current = true;
      if (active.offsetX <= -SWIPE_THRESHOLD_PX) move(currentPage + 1);
      else if (active.offsetX >= SWIPE_THRESHOLD_PX) move(currentPage - 1);
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    setDragOffset(0);
  }

  function cancelPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDragOffset(0);
  }

  return (
    <section className="personal-regular-rail" aria-labelledby="personal-regular-title">
      <header className="personal-section-header personal-regular-header">
        <div className="personal-regular-heading">
          <h2 id="personal-regular-title">Your regulars</h2>
          <div ref={info} className="personal-count-help">
            <button
              ref={infoButton}
              type="button"
              aria-label="About regular counts"
              aria-expanded={infoOpen}
              aria-controls="personal-regular-count-help"
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Info size={15} aria-hidden />
            </button>
            {infoOpen && (
              <p id="personal-regular-count-help">
                Counts recorded completed playback in this room over the last{" "}
                {countWindowDays} days, including repeats. Seeking can qualify.
                These are not lifetime totals or proof of uninterrupted listening.
              </p>
            )}
          </div>
        </div>
        <div className="personal-regular-header-actions">
          <button
            id="personal-view-regulars"
            aria-label="View all regulars"
            onClick={onViewAll}
            type="button"
          >
            View all
          </button>
          <div className="personal-regular-paging">
            <button
              type="button"
              aria-label="Previous regulars page"
              disabled={currentPage <= 0}
              onClick={() => move(currentPage - 1)}
            >
              <ChevronLeft size={17} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next regulars page"
              disabled={currentPage >= pageCount - 1}
              onClick={() => move(currentPage + 1)}
            >
              <ChevronRight size={17} aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <div
        ref={viewport}
        className="personal-regular-viewport"
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={cancelPointer}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          pointer.current = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            dragging: false,
            offsetX: 0,
          };
        }}
        onPointerMove={(event) => {
          const active = pointer.current;
          if (!active || active.id !== event.pointerId) return;
          const x = event.clientX - active.startX;
          const y = event.clientY - active.startY;
          if (!active.dragging && (Math.abs(x) < 8 || Math.abs(x) <= Math.abs(y)))
            return;
          active.dragging = true;
          active.offsetX = x;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
          setDragOffset(x);
        }}
        onPointerUp={finishPointer}
      >
        <div
          key={`${currentPage}:${pageSize}`}
          className="personal-regular-page"
          data-dragging={dragOffset !== 0}
          data-direction={direction}
          style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}
        >
          {visible.map(renderTrack)}
        </div>
      </div>
      <span className="personal-regular-page-status" aria-live="polite">
        Page {currentPage + 1} of {pageCount}
      </span>
    </section>
  );
}
