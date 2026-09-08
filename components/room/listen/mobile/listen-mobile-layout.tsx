"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Home,
  ListMusic,
  Minimize2,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  SkipForward,
  Users,
} from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import { useCompactPlayback } from "@/lib/account/use-compact-playback";
import type { ListenModeLayoutProps } from "../shared";
import { Avatar } from "@/components/ui";
import {
  ListenMobilePresentation,
  ListenMobileStage,
  ListenMobileQueueNavigation,
} from "./listen-mobile-context";
import { ListenHomeToolbar } from "./listen-home-toolbar";
import { WatchLeaveButton } from "../../watch/watch-leave-button";
import dynamic from "next/dynamic";
import { ListenStageVisibility } from "../stage/listen-content-stage";
import type { ListenDestination } from "./listen-mobile-workspaces";
const ListenMobileWorkspaces = dynamic(
  () =>
    import("./listen-mobile-workspaces").then((m) => m.ListenMobileWorkspaces),
  { loading: () => <p role="status">Loading room tools...</p> },
);
import { useListenExpansion } from "./use-listen-expansion";
import "./listen-mobile.css";
import "./listen-desktop-bridge.css";
import "./listen-mobile-discovery.css";
const destinations = [
  ["home", "Home", Home],
  ["queue", "Queue", ListMusic],
  ["add", "Add", Plus],
  ["social", "Social", Users],
  ["more", "More", MoreHorizontal],
] as const;
export function ListenMobileLayout({
  desktopShell,
  desktopQueue,
  backdrop,
  account,
  accountNotice,
  room,
  liveRoom,
  items,
  header,
  player,
  discovery,
  style,
  title,
  artist,
  onPlaybackChange,
  onNext,
  onEnterTv,
}: ListenModeLayoutProps & {
  desktopShell: boolean;
  desktopQueue: ReactNode;
  backdrop: ReactNode;
  items: RoomQueueItem[];
  header: ReactNode;
  player: ReactNode;
  discovery: ReactNode;
  style: CSSProperties;
  title: string;
  artist: string;
  onPlaybackChange(status: "paused" | "playing"): void;
  onNext(): void;
  onEnterTv(): void;
}) {
  const [screen, setScreen] = useState<ListenDestination>("home");
  const [stageView, setStageView] = useState<"discover" | "visualizer">(
    "discover",
  );
  const [expanded, setExpanded] = useState(false);
  const [visited, setVisited] = useState<Set<ListenDestination>>(new Set());
  const handleRef = useRef<HTMLButtonElement>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo =
    account.status === "signed-in"
      ? (account.googleAvatarUrl ??
        (account.avatarSource === "google_avatar" ? account.avatarUrl : null))
      : null;
  const avatarPhoto = photo && photo !== failedPhoto ? photo : undefined;
  const session = liveRoom.snapshot.session;
  const hasSource = Boolean(session?.sourceUrl);
  const isExpanded = expanded && hasSource;
  const youtube = session?.sourceType === "youtube";
  const compact = useCompactPlayback(account);
  const compactYoutube =
    youtube && compact.allowed && compact.enabled && !desktopShell;
  const playing = session?.status === "playing";
  const canControl =
    liveRoom.canControlPlayback && liveRoom.connectionStatus === "connected";
  function settle(next: boolean) {
    setExpanded(next);
    requestAnimationFrame(() =>
      handleRef.current?.focus({ preventScroll: true }),
    );
  }
  const playerElementRef = useRef<HTMLElement>(null);
  const gesture = useListenExpansion(settle, isExpanded, playerElementRef);
  function navigate(next: ListenDestination) {
    setScreen(next);
    setExpanded(false);
    setVisited((current) => new Set(current).add(next));
  }
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        !isExpanded ||
        desktopShell
      )
        return;
      if (
        document.querySelector('[role="dialog"], dialog[open], details[open]')
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      event.preventDefault();
      settle(false);
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [isExpanded, desktopShell]);
  return (
    <ListenMobilePresentation.Provider value={!desktopShell}>
      <main
        className={
          desktopShell ? "listen-desktop-shell" : "listen-mobile-shell"
        }
        style={style}
        data-screen={screen}
        data-source={hasSource}
        data-youtube={youtube}
        data-embed-layout={youtube && !compactYoutube}
        data-compact-playback={compactYoutube}
        data-expanded={desktopShell || isExpanded}
      >
        {backdrop}
        <header
          className="listen-mobile-identity"
          inert={!desktopShell && isExpanded}
          aria-hidden={!desktopShell && isExpanded ? true : undefined}
        >
          <WatchLeaveButton className={desktopShell ? "hidden" : undefined}>
            <ArrowLeft aria-hidden />
            <span className="sr-only">Leave room</span>
          </WatchLeaveButton>
          {header}
          {!desktopShell && (
            <button
              className="listen-mobile-account"
              aria-label="Room and account settings"
              onClick={() => navigate("more")}
            >
              <Avatar
                src={avatarPhoto}
                onErrorCapture={() => {
                  if (avatarPhoto) setFailedPhoto(avatarPhoto);
                }}
                name={room.currentMember?.name ?? "Account"}
                seed={room.currentMember?.id}
                avatarKey={room.currentMember?.avatarKey}
                crowned={room.currentMember?.id === room.hostMemberId}
                className="h-9 w-9"
              />
            </button>
          )}
        </header>
        {!desktopShell &&
          (screen === "home" || screen === "more") &&
          !isExpanded && (
            <ListenHomeToolbar
              canSwitch={
                liveRoom.canManageAuthority &&
                liveRoom.connectionStatus === "connected"
              }
              onSwitchMode={liveRoom.switchMode}
              view={screen === "home" ? stageView : null}
              onSelect={(view) => {
                setStageView(view);
                navigate("home");
              }}
            />
          )}
        <div
          className="listen-mobile-workspace"
          inert={!desktopShell && isExpanded}
        >
          <section
            hidden={!desktopShell && screen !== "home"}
            className="listen-mobile-discovery"
          >
            {!hasSource && (
              <p className="listen-empty">
                Choose music for the room. Your player will appear here.
              </p>
            )}
            {/* Keep browse state while avoiding offscreen visualizer work. */}
            <ListenStageVisibility.Provider
              value={
                desktopShell ||
                ((screen === "home" || screen === "more") && !isExpanded)
              }
            >
              <ListenMobileStage.Provider
                value={{ view: stageView, select: setStageView }}
              >
                {discovery}
              </ListenMobileStage.Provider>
            </ListenStageVisibility.Provider>
          </section>
          {destinations
            .filter(([id]) => id !== "home" && visited.has(id))
            .map(([id]) => (
              <section
                key={id}
                hidden={desktopShell || screen !== id}
                className="listen-mobile-destination"
              >
                <ListenMobileWorkspaces
                  screen={id}
                  account={account}
                  accountNotice={accountNotice}
                  room={room}
                  liveRoom={liveRoom}
                  items={items}
                  onEnterTv={onEnterTv}
                />
              </section>
            ))}
        </div>
        <section
          className="listen-mobile-player"
          hidden={!hasSource && !desktopShell}
          data-expanded={desktopShell || isExpanded}
          ref={playerElementRef}
          style={
            {
              "--listen-expand": Number(isExpanded),
            } as CSSProperties
          }
          aria-label="Now playing"
        >
          <div className="listen-mobile-player-top" hidden={desktopShell}>
            <button
              ref={handleRef}
              className="listen-expand-handle"
              aria-label={isExpanded ? "Minimize player" : "Expand player"}
              aria-expanded={isExpanded}
              {...gesture.handle}
            >
              {isExpanded ? (
                <ChevronDown aria-hidden />
              ) : (
                <ChevronUp aria-hidden />
              )}
              <span>
                <strong>{isExpanded ? "Now playing" : title}</strong>
                <small>
                  {isExpanded
                    ? "Swipe down to browse"
                    : playing
                      ? artist
                      : "Paused"}
                </small>
              </span>
            </button>
            {!isExpanded && (
              <>
                {youtube && compact.allowed && (
                  <button
                    aria-label={
                      compact.enabled
                        ? "Show browsing player"
                        : "Use compact player"
                    }
                    title={
                      compact.enabled
                        ? "Show browsing player"
                        : "Use compact player"
                    }
                    aria-pressed={compact.enabled}
                    onClick={() => compact.setEnabled(!compact.enabled)}
                  >
                    {compact.enabled ? (
                      <Maximize2 aria-hidden />
                    ) : (
                      <Minimize2 aria-hidden />
                    )}
                  </button>
                )}
                <button
                  aria-label={playing ? "Pause" : "Play"}
                  disabled={!canControl}
                  onClick={() =>
                    onPlaybackChange(playing ? "paused" : "playing")
                  }
                >
                  {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                </button>
                <button
                  aria-label="Next song"
                  disabled={
                    !canControl || !items.some((i) => i.status === "queued")
                  }
                  onClick={onNext}
                >
                  <SkipForward aria-hidden />
                </button>
              </>
            )}
            {isExpanded && (
              <button
                className="listen-discover-button"
                onClick={() => {
                  setScreen("home");
                  settle(false);
                }}
              >
                Discover
              </button>
            )}
          </div>
          <div className="listen-mobile-player-body">
            <ListenMobileQueueNavigation.Provider
              value={desktopShell ? null : () => navigate("queue")}
            >
              {player}
            </ListenMobileQueueNavigation.Provider>
          </div>
        </section>
        {desktopShell && desktopQueue}
        <nav
          className="listen-mobile-nav"
          aria-label="Listen room"
          hidden={desktopShell}
        >
          {destinations.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </main>
    </ListenMobilePresentation.Provider>
  );
}
