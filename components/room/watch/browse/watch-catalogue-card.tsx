"use client";

import type { RefObject } from "react";
import { Film, ListPlus, Play, Plus } from "lucide-react";
import type { LiveRoomState } from "@/lib/spacetime";
import type { WatchMediaHubItem } from "../contracts";
import { LazyMediaPoster } from "../library/lazy-media-poster";
import {
  useWatchMediaActions,
  type WatchMediaAction,
  type WatchPlayCoordinator,
} from "./use-watch-media-actions";

const actions = [
  ["play", "Play now", Play],
  ["add", "Add to queue", Plus],
  ["next", "Play next", ListPlus],
] as const;

export function WatchCatalogueCard({
  eager,
  item,
  liveRoom,
  onDetails,
  playCoordinator,
  roomId,
  scrollRootRef,
  showActions,
}: {
  eager: boolean;
  item: WatchMediaHubItem;
  liveRoom: LiveRoomState;
  onDetails(): void;
  playCoordinator: WatchPlayCoordinator;
  roomId: string;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  showActions: boolean;
}) {
  return (
    <article className="watch-media-card">
      <button
        className="watch-card-details"
        onClick={onDetails}
        aria-label={`Details: ${item.title}`}
      >
        <span className="watch-card-art">
          {item.thumbnailUrl ? (
            <LazyMediaPoster
              src={item.thumbnailUrl}
              eager={eager}
              scrollRootRef={scrollRootRef}
            />
          ) : (
            <Film aria-hidden />
          )}
          {item.isUnavailable && (
            <span className="watch-unavailable">Unavailable</span>
          )}
        </span>
        <span className="watch-card-title">{item.title}</span>
        <span className="watch-card-meta">
          {item.sourceType === "youtube"
            ? "YouTube"
            : item.status === "library"
              ? "Library"
              : "Room media"}
          <span>{item.duration}</span>
        </span>
      </button>
      {showActions && !item.isUnavailable && (
        <WatchCatalogueCardActions
          item={item}
          liveRoom={liveRoom}
          playCoordinator={playCoordinator}
          roomId={roomId}
        />
      )}
    </article>
  );
}

function WatchCatalogueCardActions({
  item,
  liveRoom,
  playCoordinator,
  roomId,
}: {
  item: WatchMediaHubItem;
  liveRoom: LiveRoomState;
  playCoordinator: WatchPlayCoordinator;
  roomId: string;
}) {
  const { act, canAdd, canNext, canPlay, notice, pending } =
    useWatchMediaActions({ item, liveRoom, playCoordinator, roomId });
  const enabled: Record<WatchMediaAction, boolean> = {
    play: canPlay,
    add: canAdd,
    next: canNext,
  };
  return (
    <span
      className="watch-card-actions"
      role="group"
      aria-label={`Actions for ${item.title}`}
    >
      {actions.map(([action, label, Icon]) => (
        <button
          key={action}
          aria-label={`${label}: ${item.title}`}
          title={label}
          disabled={pending || !enabled[action]}
          onClick={() => void act(action)}
        >
          <Icon aria-hidden />
        </button>
      ))}
      {(notice || pending) && (
        <span className="watch-card-action-status" role="status">
          {pending ? "Requesting room action…" : notice}
        </span>
      )}
    </span>
  );
}
