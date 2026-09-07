"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ChevronUp,
  Minus,
  GripHorizontal,
  Home,
  ListVideo,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { useMediaPreferences } from "@/lib/recommendations/use-media-preferences";
import { RoomHomeToolbar } from "../shared/room-home-toolbar";
import { MediaStage } from "../media-stage";
import { TransportControls } from "../transport-controls";
import type { WatchModeLayoutProps } from "./contracts";
import { getQueueItems } from "./presentation";
import { useMediaLibrary } from "./media-hub/use-media-library";
import { WatchBrowser } from "./browse/watch-browser";
import { WatchRoomHeader } from "./watch-room-header";
import { LazyMediaPoster } from "./library/lazy-media-poster";
import { useWatchViewport } from "./use-watch-viewport";
import { useWatchDockBounds } from "./use-watch-dock-bounds";
import { useWatchDock } from "./use-watch-dock";
import type { WatchHomeView, WatchWorkspace } from "./watch-navigation";
import { ListenAmbientBackdrop } from "../listen/theme/listen-theme";
import { useWatchTheme } from "./use-watch-theme";
import {
  useWatchFullscreen,
  WatchFullscreenContext,
} from "./use-watch-fullscreen";
import "./watch-room.css";
import "./watch-browse-layout.css";
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
  const [homeView, setHomeView] = useState<WatchHomeView>("browse");
  const [cinema, setCinema] = useState(false);
  const [cinemaReturn, setCinemaReturn] = useState<WatchWorkspace>("home");
  const [minimizedSource, setMinimizedSource] = useState<string | null>(null);
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
  const shellRef = useWatchDockBounds();
  const dock = useWatchDock(shellRef);
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
  const hasSource = Boolean(liveRoom.snapshot.session?.sourceUrl);
  // Only a resolved denial changes the default source surface. Loading and errors
  // remain in the catalogue so its status and retry action stay available.
  const catalogueDenied =
    !library.assetLoading &&
    !library.assetError &&
    library.libraryAccess?.canAccessUploadedCatalogue === false;
  const workspace = screen === "home" && catalogueDenied ? "add" : screen;
  const visibleHome = hasSource ? homeView : "browse";
  const paused = liveRoom.snapshot.session?.status === "paused";
  const activeItem = items.find((item) => item.status === "now");
  const sourceUrl = liveRoom.snapshot.session?.sourceUrl ?? "";
  const docked =
    hasSource && !cinema && (screen !== "home" || visibleHome === "browse");

  const minimized = docked && paused && minimizedSource === sourceUrl;

  useEffect(() => {
    // Each workspace starts at its heading; the catalogue owns its own preserved scroll.
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  function navigate(next: WatchWorkspace) {
    setScreen(next);
    setCinema(false);
    setMinimizedSource(null);
    if (next === "home") setHomeView(hasSource ? "watch" : "browse");
    requestAnimationFrame(() =>
      (next === "home" && hasSource
        ? stageRef.current
        : contentRef.current
      )?.focus(),
    );
  }
  function browse() {
    if (screen === "manage") void library.refreshMediaLibrary();
    setScreen("home");
    setHomeView("browse");
    setCinema(false);
    setMinimizedSource(null);
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
  // Install against the committed view before the next keyboard event, including
  // a fast Escape immediately after the dock's Cinema button is activated.
  useLayoutEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      if (fullscreenActive) return;
      if (cinema) backToBrowse();
      else if (minimizedSource) setMinimizedSource(null);
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
        ref={shellRef}
        style={{ ...themeStyle, ...viewport.style }}
        data-short={viewport.short}
        data-cinema={cinema && hasSource}
        data-screen={screen}
        data-home={visibleHome}
        data-has-source={hasSource}
        data-docked={docked}
        data-provider={liveRoom.snapshot.session?.sourceType}
        data-minimized={minimized}
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
          ) : null}
        </div>
        <main className="watch-main">
          <section
            className="watch-player"
            hidden={!hasSource}
            aria-label="Watch stage"
            ref={fullscreenPlayerRef}
            data-watch-fullscreen
            data-provider={liveRoom.snapshot.session?.sourceType}
            data-controls-visible={fullscreenShown}
            onPointerMove={revealFullscreen}
            onPointerDown={revealFullscreen}
            onFocusCapture={revealFullscreen}
          >
            <button
              className="watch-paused-bar"
              hidden={!minimized}
              aria-label={`Restore player: ${liveRoom.snapshot.session?.sourceTitle ?? "Paused media"}`}
              onClick={() => setMinimizedSource(null)}
            >
              <span className="watch-paused-art">
                {activeItem?.thumbnailUrl && (
                  <LazyMediaPoster src={activeItem.thumbnailUrl} />
                )}
              </span>
              <span>
                <strong>
                  {liveRoom.snapshot.session?.sourceTitle ?? "Paused media"}
                </strong>
                <small>Paused</small>
              </span>
              <ChevronUp aria-hidden />
            </button>
            <div className="watch-dock-frame">
              <button
                className="watch-drag-handle"
                aria-label="Move player"
                onKeyDown={dock.keyDown}
                onPointerMove={dock.moveDrag}
                onPointerDown={dock.startDrag}
                onPointerUp={dock.endDrag}
                onPointerCancel={dock.cancelDrag}
                onLostPointerCapture={dock.cancelDrag}
              >
                <GripHorizontal />
              </button>
              <button
                aria-label="Minimize player"
                disabled={!paused}
                title={paused ? "Minimize paused player" : "Pause to minimize"}
                onClick={() => setMinimizedSource(sourceUrl)}
              >
                <Minus />
              </button>
              <button aria-label="Open cinema" onClick={openCinema}>
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
            {(screen === "home" || screen === "add" || screen === "more") && (
              <RoomHomeToolbar
                mode="watch"
                canSwitch={liveRoom.canManageAuthority && connected}
                onSwitchMode={liveRoom.switchMode}
                selected={
                  workspace === "home"
                    ? "catalogue"
                    : workspace === "add"
                      ? "links"
                      : null
                }
                options={[
                  ...(!catalogueDenied
                    ? [{ id: "catalogue", label: "Catalogue" }]
                    : []),
                  { id: "links", label: "YouTube & links" },
                ]}
                onSelect={(id) =>
                  id === "catalogue" ? browse() : navigate("add")
                }
              />
            )}
            <div className="watch-home-content" hidden={workspace !== "home"}>
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
            {workspace !== "home" && workspace !== "manage" && (
              <WatchWorkspaces
                screen={workspace}
                catalogueAvailable={!catalogueDenied}
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
                <button
                  className="room-settings-back"
                  onClick={() => navigate("more")}
                >
                  <ArrowLeft aria-hidden />
                  Back to settings
                </button>
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
