"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowLeftRight,
  GripHorizontal,
  Home,
  Library,
  Link2,
  ListVideo,
  Maximize2,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { useMediaPreferences } from "@/lib/recommendations/use-media-preferences";
import { MediaStage } from "../media-stage";
import { TransportControls } from "../transport-controls";
import type { WatchModeLayoutProps } from "./contracts";
import { getQueueItems } from "./presentation";
import { useMediaLibrary } from "./media-hub/use-media-library";
import { WatchBrowser } from "./browse/watch-browser";
import { WatchRoomHeader } from "./watch-room-header";
import { LazyMediaPoster } from "./library/lazy-media-poster";
import { useWatchViewport } from "./use-watch-viewport";
import { useWatchDock } from "./use-watch-dock";
import type { WatchHomeView, WatchWorkspace } from "./watch-navigation";
import { ListenAmbientBackdrop } from "../listen/theme/listen-theme";
import { useWatchTheme } from "./use-watch-theme";
import {
  useWatchFullscreen,
  WatchFullscreenContext,
} from "./use-watch-fullscreen";
import "./watch-room.css";
import "./watch-fullscreen.css";

function WatchPanelLoading() {
  return (
    <div className="watch-workspace-content" role="status">
      Loading panel…
    </div>
  );
}
const WatchWorkspaces = dynamic(
  () => import("./watch-workspaces").then((m) => m.WatchWorkspaces),
  { loading: WatchPanelLoading },
);
const WatchMediaHubDiscovery = dynamic(
  () =>
    import("./media-hub/watch-media-hub").then((m) => m.WatchMediaHubDiscovery),
  { loading: WatchPanelLoading },
);
const destinations = [
  ["home", Home, "Home"],
  ["queue", ListVideo, "Queue"],
  ["add", Plus, "Add"],
  ["social", Users, "Social"],
  ["more", MoreHorizontal, "More"],
] as const;

export function WatchModeLayout({
  account,
  accountNotice,
  liveRoom,
  room,
  stageRef,
}: WatchModeLayoutProps) {
  const [screen, setScreen] = useState<WatchWorkspace>("home");
  const [homeView, setHomeView] = useState<WatchHomeView>(
    liveRoom.snapshot.session?.sourceUrl ? "watch" : "browse",
  );
  const [cinema, setCinema] = useState(false);
  const [cinemaReturn, setCinemaReturn] = useState<WatchWorkspace>("home");
  const [expanded, setExpanded] = useState(false);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    active: fullscreenActive,
    error: fullscreenError,
    playerRef: fullscreenPlayerRef,
    reveal: revealFullscreen,
    shown: fullscreenShown,
    toggle: toggleFullscreen,
  } = useWatchFullscreen(
    liveRoom.snapshot.session?.status === "playing",
    liveRoom.snapshot.session?.sourceType,
  );
  const dock = useWatchDock();
  const viewport = useWatchViewport();
  const library = useMediaLibrary();
  const preferences = useMediaPreferences({
    roomId: room.id,
    allowUploaded: library.libraryAccess?.canAccessUploadedCatalogue === true,
  });
  const items = useMemo(() => getQueueItems(liveRoom, room), [liveRoom, room]);
  const themeStyle = useWatchTheme(liveRoom, items);
  const upcoming = items.filter((i) => i.status === "queued");
  const connected = liveRoom.connectionStatus === "connected";
  const isOwner =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active";
  const docked =
    Boolean(liveRoom.snapshot.session?.sourceUrl) &&
    !cinema &&
    (screen !== "home" || homeView === "browse");

  useEffect(() => {
    // Each workspace starts at its heading; the catalogue owns its own preserved scroll.
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  function navigate(next: WatchWorkspace) {
    setScreen(next);
    setCinema(false);
    setExpanded(false);
    if (next === "home") setHomeView("watch");
    requestAnimationFrame(() =>
      (next === "home" ? stageRef.current : contentRef.current)?.focus(),
    );
  }
  function browse() {
    if (screen === "manage") void library.refreshMediaLibrary();
    setScreen("home");
    setHomeView("browse");
    setCinema(false);
    setExpanded(false);
  }
  function openCinema() {
    setCinemaReturn(screen);
    restoreFocus.current = document.activeElement as HTMLElement;
    setCinema(true);
    setScreen("home");
  }
  function backToBrowse() {
    if (cinemaReturn === "home") browse();
    else {
      setScreen(cinemaReturn);
      setCinema(false);
    }
    requestAnimationFrame(() => restoreFocus.current?.focus());
  }
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      if (fullscreenActive) return;
      if (cinema) backToBrowse();
      else if (expanded) setExpanded(false);
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  });

  return (
    <WatchFullscreenContext.Provider
      value={{ active: fullscreenActive, toggle: toggleFullscreen }}
    >
      <div
        className="watch-redesign"
        style={{ ...themeStyle, ...viewport.style }}
        data-short={viewport.short}
        data-cinema={cinema}
        data-screen={screen}
        data-home={homeView}
        data-docked={docked}
        data-provider={liveRoom.snapshot.session?.sourceType}
        data-expanded={expanded}
        data-anchor={dock.anchor}
        data-dragging={dock.dragging}
      >
        <div className="watch-ambient" aria-hidden="true">
          <ListenAmbientBackdrop mode="static-artwork" />
          <div className="watch-ambient-wash" />
        </div>
        <WatchRoomHeader
          account={account}
          room={room}
          liveRoom={liveRoom}
          navigate={navigate}
          themeStyle={themeStyle}
        />
        <div className="watch-viewbar">
          {cinema ? (
            <button onClick={backToBrowse}>
              <ArrowLeft />
              {cinemaReturn === "home"
                ? "Back to browsing"
                : "Back to " +
                  (cinemaReturn === "manage"
                    ? "library management"
                    : cinemaReturn)}
            </button>
          ) : (
            <>
              <button
                className="watch-mobile-watch"
                aria-pressed={screen === "home" && homeView === "watch"}
                onClick={() => navigate("home")}
              >
                Watch
              </button>
              <button
                aria-pressed={screen === "home" && homeView === "browse"}
                onClick={browse}
              >
                Browse media
              </button>
              {screen !== "home" && (
                <span>{screen === "manage" ? "Manage library" : screen}</span>
              )}
            </>
          )}
        </div>
        <main className="watch-main">
          <section
            className="watch-player"
            aria-label="Watch stage"
            ref={fullscreenPlayerRef}
            data-watch-fullscreen
            data-provider={liveRoom.snapshot.session?.sourceType}
            data-controls-visible={fullscreenShown}
            onPointerMove={revealFullscreen}
            onPointerDown={revealFullscreen}
            onFocusCapture={revealFullscreen}
          >
            <div className="watch-dock-frame">
              <button
                className="watch-drag-handle"
                aria-label="Drag player to a corner"
                onKeyDown={dock.keyDown}
                onPointerMove={dock.moveDrag}
                onPointerDown={dock.startDrag}
                onPointerUp={dock.endDrag}
                onPointerCancel={dock.cancelDrag}
              >
                <GripHorizontal />
              </button>
              <button aria-label={dock.nextLabel} onClick={dock.cycle}>
                <ArrowLeftRight />
              </button>
              <button
                aria-label={expanded ? "Shrink player" : "Expand player"}
                onClick={() => setExpanded((v) => !v)}
              >
                <Maximize2 />
              </button>
              <button
                aria-label="Open full player"
                onClick={() => navigate("home")}
              >
                <Home />
              </button>
            </div>
            <div
              className="watch-viewport room-stage-mode-panel"
              data-mode="watch"
              ref={stageRef}
              tabIndex={-1}
            >
              <MediaStage
                liveRoom={liveRoom}
                room={room}
                showYouTubeControls={false}
              />
            </div>
            <TransportControls
              liveRoom={liveRoom}
              room={room}
              presentation="watch"
            />
            {fullscreenError && (
              <p className="watch-fullscreen-error" role="alert">
                {fullscreenError}
              </p>
            )}
            <button
              hidden={cinema}
              className="watch-cinema-button"
              onClick={openCinema}
            >
              <Maximize2 />
              Open cinema
            </button>
            {!cinema && (
              <div className="watch-up-next">
                <div className="watch-shelf-heading">
                  <h3>
                    Up next <small>{upcoming.length}</small>
                  </h3>
                  <button onClick={() => navigate("queue")}>View queue</button>
                </div>
                {upcoming.slice(0, 3).map((item, index) => (
                  <button
                    className="watch-up-next-item"
                    key={item.id}
                    onClick={() => navigate("queue")}
                  >
                    <span>{index + 1}</span>
                    <span className="watch-up-next-art">
                      {item.thumbnailUrl && (
                        <LazyMediaPoster src={item.thumbnailUrl} />
                      )}
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.duration}</small>
                    </span>
                  </button>
                ))}
                {!upcoming.length && (
                  <p>Nothing queued yet. Find your next watch.</p>
                )}
              </div>
            )}
          </section>
          <div className="watch-content" ref={contentRef} tabIndex={-1}>
            {(screen === "home" || screen === "add") && (
              <div className="watch-source-bar">
                <div
                  className="watch-source-switch"
                  role="group"
                  aria-label="Media source"
                >
                  <button aria-pressed={screen === "home"} onClick={browse}>
                    <Library aria-hidden /> Catalogue
                  </button>
                  <button
                    aria-pressed={screen === "add"}
                    onClick={() => navigate("add")}
                  >
                    <Link2 aria-hidden /> YouTube & links
                  </button>
                </div>
              </div>
            )}
            <div className="watch-home-content" hidden={screen !== "home"}>
              <WatchBrowser
                library={library}
                items={items}
                liveRoom={liveRoom}
                roomId={room.id}
                preferences={preferences}
                onAdd={() => navigate("add")}
                onManage={() => navigate("manage")}
                isOwner={isOwner}
              />
            </div>
            {screen !== "home" && screen !== "manage" && (
              <WatchWorkspaces
                screen={screen}
                room={room}
                liveRoom={liveRoom}
                account={account}
                accountNotice={accountNotice}
                items={items}
                onClose={browse}
                onManage={() => navigate("manage")}
              />
            )}
            {screen === "manage" && isOwner && (
              <div className="watch-workspace-content">
                <h2 className="watch-page-title">Manage library</h2>
                <WatchMediaHubDiscovery
                  initialTab="uploads"
                  isOwner
                  items={items}
                  roomId={room.id}
                  canAddQueue={liveRoom.canAddQueue && connected}
                  canLoadSource={liveRoom.canManageAuthority && connected}
                  canManageQueue={liveRoom.canManageQueue && connected}
                  onAddQueueItem={liveRoom.addQueueItem}
                  onLoadSource={liveRoom.loadMediaSource}
                  onPlayQueueItem={liveRoom.playQueueItemNow}
                  onPlayNext={(id) =>
                    liveRoom.setQueueItemPriority(id, { isPlayNext: true })
                  }
                />
              </div>
            )}
          </div>
        </main>
        {liveRoom.errorMessage && (
          <div className="watch-room-error" role="alert">
            {liveRoom.errorMessage}
          </div>
        )}
        <nav className="watch-mobile-nav" aria-label="Room navigation">
          {destinations.map(([id, Icon, label]) => (
            <button
              key={id}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </WatchFullscreenContext.Provider>
  );
}
