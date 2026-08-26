"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  buildListenDiscoveryShelves,
  type ListenDiscoveryShelfId,
} from "@/lib/recommendations/listen-discovery";
import {
  queueItemToDiscoveryQueueCommand,
  queueItemToDiscoverySourceCommand,
  reduceListenDiscoveryBrowseState,
} from "@/lib/recommendations/listen-discovery-interactions";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import { fetchYouTubeRecommendations } from "@/lib/youtube/recommendations-client";
import type { YouTubeRecommendationResponse } from "@/lib/youtube/recommendations";
import {
  buildRoomRecommendationRequest,
  fetchRoomRecommendations,
} from "@/lib/recommendations/room-client";
import type { RoomRecommendationResponse } from "@/lib/recommendations/room-contracts";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { cx } from "@/lib/ui";
import {
  type QueueAddInput,
  type SourceLoadInput,
} from "@/components/room/listen/shared";
import {
  DiscoveryShelf,
  DiscoveryShelfSkeleton,
} from "@/components/room/listen/discovery/discovery-shelf";
import {
  buildProviderRecommendationQuery,
  EmptyListenPanel,
  RecommendationCard,
  youtubeMetadataToQueueItem,
} from "@/components/room/listen/discovery/media-cards";

export function ListenDiscoveryPanel({
  canAddQueue,
  canLoadSource,
  canPlay,
  currentItem,
  items,
  mediaPreferences,
  onAddQueueItem,
  onLoadSource,
  onPlayQueueItem,
  room,
  embedded = false,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  currentItem: RoomQueueItem | null;
  items: RoomQueueItem[];
  mediaPreferences: MediaPreferenceController;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  onPlayQueueItem(queueItemId: string): void;
  room: RoomSnapshot;
  embedded?: boolean;
}) {
  const [providerRecommendations, setProviderRecommendations] = useState<{
    key: string;
    response: YouTubeRecommendationResponse;
  } | null>(null);
  const [firstPartyRecommendations, setFirstPartyRecommendations] = useState<{
    key: string;
    response: RoomRecommendationResponse;
  } | null>(null);
  const [browseShelfId, setBrowseShelfId] =
    useState<ListenDiscoveryShelfId | null>(null);
  const browseTriggerIdRef = useRef<string | null>(null);
  const providerQuery = useMemo(
    () => buildProviderRecommendationQuery(currentItem),
    [currentItem],
  );
  const providerRequestKey = `recommended:${providerQuery ?? "room"}`;
  const providerItems = useMemo(
    () =>
      providerRecommendations?.key === providerRequestKey
        ? providerRecommendations.response.items.map((item) =>
            youtubeMetadataToQueueItem(
              item,
              room.currentMember?.name ?? "Provider",
            ),
          )
        : [],
    [providerRecommendations, providerRequestKey, room.currentMember?.name],
  );
  const firstPartyRequest = useMemo(
    () =>
      providerItems.length > 0
        ? buildRoomRecommendationRequest({
            candidates: providerItems,
            currentItem,
            items,
            preferenceRevision: mediaPreferences.revision,
            roomId: room.id,
          })
        : null,
    [currentItem, items, mediaPreferences.revision, providerItems, room.id],
  );
  const firstPartyRequestKey = firstPartyRequest
    ? `${providerRequestKey}:${firstPartyRequest.revision}`
    : providerRequestKey;
  const rankedProviderItems = useMemo(() => {
    const ranked = firstPartyRecommendations;

    if (
      !firstPartyRequest ||
      ranked?.key !== firstPartyRequestKey ||
      ranked.response.status !== "available"
    ) {
      return providerItems;
    }

    const itemById = new Map(providerItems.map((item) => [item.id, item]));

    return ranked.response.items.flatMap((item) => {
      const providerItem = itemById.get(item.candidateId);

      if (!providerItem) {
        return [];
      }

      itemById.delete(item.candidateId);
      return [providerItem];
    });
  }, [
    firstPartyRecommendations,
    firstPartyRequest,
    firstPartyRequestKey,
    providerItems,
  ]);
  const recommendationReasons = useMemo(() => {
    if (
      firstPartyRecommendations?.key !== firstPartyRequestKey ||
      firstPartyRecommendations.response.status !== "available"
    ) {
      return new Map<string, string>();
    }

    return new Map(
      firstPartyRecommendations.response.items.flatMap((item) => {
        const label = item.reasons[0]?.label;
        return label ? [[item.candidateId, label] as const] : [];
      }),
    );
  }, [firstPartyRecommendations, firstPartyRequestKey]);
  const providerUnavailable =
    providerRecommendations?.key === providerRequestKey &&
    (providerRecommendations.response.status === "not-configured" ||
      providerRecommendations.response.status === "unavailable");
  const providerRankedEmpty =
    firstPartyRecommendations?.key === firstPartyRequestKey &&
    firstPartyRecommendations.response.status === "available" &&
    rankedProviderItems.length === 0;
  const isProviderLoading =
    Boolean(providerQuery) &&
    providerRecommendations?.key !== providerRequestKey;
  const shelves = useMemo(
    () =>
      buildListenDiscoveryShelves({
        currentItem,
        items,
        providerItems: rankedProviderItems,
        providerRankedEmpty,
        providerUnavailable,
        roomName: room.name,
      }),
    [
      currentItem,
      items,
      providerRankedEmpty,
      providerUnavailable,
      rankedProviderItems,
      room.name,
    ],
  );
  const visibleShelves = isProviderLoading
    ? shelves.filter((shelf) => shelf.id !== "because-listened")
    : shelves;
  const browseShelf = shelves.find((shelf) => shelf.id === browseShelfId);

  useEffect(() => {
    let cancelled = false;

    if (!providerQuery) {
      return;
    }

    void fetchYouTubeRecommendations({
      kind: "recommended",
      query: providerQuery,
      roomId: room.id,
    }).then((response) => {
      if (!cancelled) {
        setProviderRecommendations({ key: providerRequestKey, response });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [providerQuery, providerRequestKey, room.id]);

  useEffect(() => {
    let cancelled = false;

    if (!firstPartyRequest) {
      return;
    }

    void fetchRoomRecommendations(firstPartyRequest).then((response) => {
      if (!cancelled) {
        setFirstPartyRecommendations({
          key: firstPartyRequestKey,
          response,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [firstPartyRequest, firstPartyRequestKey]);

  function handleAddRecommendation(item: RoomQueueItem, isPlayNext = false) {
    onAddQueueItem(queueItemToDiscoveryQueueCommand(item, { isPlayNext }));
  }

  function handleLoadRecommendation(item: RoomQueueItem) {
    if (item.id.startsWith("provider:")) {
      onLoadSource(queueItemToDiscoverySourceCommand(item));
      return;
    }

    onPlayQueueItem(item.id);
  }

  function openBrowseAll(
    shelfId: ListenDiscoveryShelfId,
    trigger: HTMLButtonElement,
  ) {
    browseTriggerIdRef.current = trigger.id;
    setBrowseShelfId((current) =>
      reduceListenDiscoveryBrowseState(current, {
        shelfId,
        type: "open",
      }),
    );
  }

  function closeBrowseAll() {
    setBrowseShelfId(null);
    requestAnimationFrame(() => {
      const triggerId = browseTriggerIdRef.current;

      if (triggerId) {
        document.getElementById(triggerId)?.focus();
      }
    });
  }

  function renderCard(item: RoomQueueItem) {
    return (
      <RecommendationCard
        canAddQueue={canAddQueue}
        canLoadSource={canLoadSource}
        canPlay={canPlay}
        current={item.id === currentItem?.id}
        inQueue={!item.id.startsWith("provider:")}
        item={item}
        key={item.id}
        mediaPreferences={mediaPreferences}
        onAddQueue={() => handleAddRecommendation(item)}
        onLoadNow={() => handleLoadRecommendation(item)}
        onPlayNext={() => handleAddRecommendation(item, true)}
        reason={recommendationReasons.get(item.id)}
      />
    );
  }

  if (browseShelf) {
    return (
      <section
        aria-labelledby="listen-discovery-browse-title"
        className={cx(
          "grid gap-3",
          embedded &&
            "h-full min-h-0 content-start overflow-y-auto overscroll-contain px-3 pb-3 pt-14 [scrollbar-color:rgb(var(--listen-primary)_/_0.4)_transparent] [scrollbar-width:thin] sm:px-4 sm:pb-4 sm:pt-14",
          !embedded &&
            "rounded-md border border-white/8 bg-surface-container-lowest/28 p-3 sm:p-4",
        )}
      >
        <header className="min-w-0">
          <button
            className="mb-2 inline-flex h-8 items-center gap-1 rounded-md text-label-sm font-semibold text-on-surface-variant transition hover:text-[rgb(var(--listen-primary))]"
            onClick={closeBrowseAll}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Discover
          </button>
          <h3
            className="text-title-lg font-semibold text-on-surface"
            id="listen-discovery-browse-title"
          >
            {browseShelf.title}
          </h3>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {browseShelf.items.length} available / {browseShelf.sourceLabel}
          </p>
        </header>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {browseShelf.items.map(renderCard)}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Discover room media"
      className={cx(
        "grid gap-3 px-3 py-3 sm:px-4 sm:py-3",
        embedded &&
          "h-full min-h-0 content-start overflow-y-auto overscroll-contain pt-14 [scrollbar-color:rgb(var(--listen-primary)_/_0.4)_transparent] [scrollbar-width:thin] sm:pt-14",
        !embedded &&
          "rounded-md border border-white/8 bg-surface-container-lowest/24 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.025)]",
      )}
    >
      {visibleShelves.length === 0 && !isProviderLoading ? (
        <EmptyListenPanel>
          Add media to build room picks from the current queue and history.
        </EmptyListenPanel>
      ) : null}
      {visibleShelves.map((shelf, index) => (
        <div className="grid gap-3" key={shelf.id}>
          <DiscoveryShelf
            onBrowseAll={(trigger) => openBrowseAll(shelf.id, trigger)}
            shelf={shelf}
          >
            {shelf.items.map(renderCard)}
          </DiscoveryShelf>
          {isProviderLoading && index === 0 ? <DiscoveryShelfSkeleton /> : null}
        </div>
      ))}
      {isProviderLoading && visibleShelves.length === 0 ? (
        <DiscoveryShelfSkeleton />
      ) : null}
    </section>
  );
}
