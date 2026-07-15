"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  buildListenDiscoveryResult,
  type ListenDiscoveryTab,
} from "@/lib/recommendations/listen-discovery";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import { fetchYouTubeRecommendations } from "@/lib/youtube/recommendations-client";
import type { YouTubeRecommendationResponse } from "@/lib/youtube/recommendations";
import {
  buildRoomRecommendationRequest,
  fetchRoomRecommendations,
} from "@/lib/recommendations/room-client";
import type { RoomRecommendationResponse } from "@/lib/recommendations/room-contracts";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import {
  type SourceLoadInput,
  type QueueAddInput,
} from "@/components/room/listen/shared";
import {
  buildProviderRecommendationQuery,
  youtubeMetadataToQueueItem,
  queueItemToSourceLoadInput,
  queueItemToQueueAddInput,
  RecommendationCard,
  EmptyListenPanel,
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
}) {
  const [activeFilter, setActiveFilter] =
    useState<ListenDiscoveryTab>("for-you");
  const [providerRecommendations, setProviderRecommendations] = useState<{
    key: string;
    response: YouTubeRecommendationResponse;
  } | null>(null);
  const [firstPartyRecommendations, setFirstPartyRecommendations] = useState<{
    key: string;
    response: RoomRecommendationResponse;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const picksRailRef = useRef<HTMLDivElement | null>(null);
  const providerQuery = useMemo(
    () => buildProviderRecommendationQuery(currentItem),
    [currentItem],
  );
  const providerRequestKey = `${activeFilter}:${providerQuery ?? ""}`;
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
      activeFilter === "recommended" && providerItems.length > 0
        ? buildRoomRecommendationRequest({
            candidates: providerItems,
            currentItem,
            items,
            preferenceRevision: mediaPreferences.revision,
            roomId: room.id,
          })
        : null,
    [
      activeFilter,
      currentItem,
      items,
      mediaPreferences.revision,
      providerItems,
      room.id,
    ],
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
    const rankedItems = ranked.response.items.flatMap((item) => {
      const providerItem = itemById.get(item.candidateId);

      if (!providerItem) {
        return [];
      }

      itemById.delete(item.candidateId);
      return [providerItem];
    });

    return rankedItems;
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
  const discovery = useMemo(
    () =>
      buildListenDiscoveryResult({
        activeTab: activeFilter,
        currentItem,
        items,
        providerItems: rankedProviderItems,
        providerRankedEmpty:
          firstPartyRecommendations?.key === firstPartyRequestKey &&
          firstPartyRecommendations.response.status === "available" &&
          rankedProviderItems.length === 0,
        providerUnavailable:
          providerRecommendations?.key === providerRequestKey &&
          (providerRecommendations.response.status === "not-configured" ||
            providerRecommendations.response.status === "unavailable"),
      }),
    [
      activeFilter,
      currentItem,
      firstPartyRecommendations,
      firstPartyRequestKey,
      items,
      rankedProviderItems,
      providerRecommendations,
      providerRequestKey,
    ],
  );
  const showProviderState = activeFilter === "recommended";

  function updatePicksScrollState() {
    const rail = picksRailRef.current;

    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(
      rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
    );
  }

  useEffect(() => {
    let cancelled = false;

    if (activeFilter !== "recommended") {
      return;
    }

    void fetchYouTubeRecommendations({
      kind: activeFilter,
      query: providerQuery,
      roomId: room.id,
    }).then((payload) => {
      if (!cancelled) {
        setProviderRecommendations({
          key: providerRequestKey,
          response: payload,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, providerQuery, providerRequestKey, room.id]);

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

  useEffect(() => {
    updatePicksScrollState();
  }, [discovery.items.length, activeFilter]);

  function scrollPicks(direction: "left" | "right") {
    const rail = picksRailRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -rail.clientWidth : rail.clientWidth,
    });
  }

  function handleAddRecommendation(item: RoomQueueItem, isPlayNext = false) {
    onAddQueueItem(queueItemToQueueAddInput(item, { isPlayNext }));
  }

  function handleLoadRecommendation(item: RoomQueueItem) {
    if (item.id.startsWith("provider:")) {
      onLoadSource(queueItemToSourceLoadInput(item));
      return;
    }

    onPlayQueueItem(item.id);
  }

  return (
    <div className="grid auto-rows-max content-start gap-5">
      <section className="overflow-hidden rounded-md border border-white/8 bg-surface-container-lowest/34 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.028)]">
        <div className="grid gap-3 border-b border-white/8 bg-surface-container-lowest/22 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-title-md font-semibold text-on-surface">
              Room picks
            </h3>
            <span className="technical-label border-0 p-0 text-on-surface-variant">
              {showProviderState &&
              providerRecommendations?.key !== providerRequestKey
                ? "Checking provider"
                : firstPartyRequest &&
                    firstPartyRecommendations?.key !== firstPartyRequestKey
                  ? "Ranking room picks"
                  : firstPartyRecommendations?.key === firstPartyRequestKey &&
                      firstPartyRecommendations.response.status === "available"
                    ? "Mistake Watch ranking"
                    : discovery.sourceLabel}
            </span>
          </div>
          <div className="max-w-full overflow-x-auto">
            <div className="inline-grid min-w-max grid-flow-col overflow-hidden rounded-sm border border-white/10 bg-background/55">
              {[
                ["for-you", "For you"],
                ["recommended", "Recommended"],
                ["top-listened", "Most listened"],
                ["playlist", "From your playlist"],
              ].map(([id, label], index) => (
                <button
                  className={cx(
                    "h-10 shrink-0 border-l border-white/8 px-5 text-label-sm font-semibold transition first:border-l-0",
                    activeFilter === id
                      ? "bg-[rgb(var(--listen-primary)/0.14)] text-[rgb(var(--listen-primary))] shadow-[inset_0_0_0_1px_rgb(var(--listen-primary)/0.35),0_0_20px_rgb(var(--listen-shadow)/0.12)]"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                    index === 0 && "border-l-0",
                  )}
                  key={id}
                  onClick={() => setActiveFilter(id as ListenDiscoveryTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {discovery.items.length > 0 ? (
          <div className="relative px-3 py-5 sm:px-4 sm:py-6">
            <div
              className="grid snap-x snap-mandatory auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto pb-1 [scrollbar-color:rgb(var(--listen-primary)_/_0.42)_transparent] [scrollbar-width:thin] lg:snap-none xl:auto-cols-[minmax(18rem,21rem)] xl:pr-10"
              onScroll={updatePicksScrollState}
              ref={picksRailRef}
            >
              {discovery.items.map((item) => (
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
              ))}
            </div>
            {canScrollLeft ? (
              <div className="pointer-events-none absolute inset-y-0 left-3 flex w-14 items-center justify-start bg-[linear-gradient(270deg,transparent,rgb(14_14_15_/_0.76)_62%,rgb(14_14_15_/_0.94))] sm:left-4">
                <button
                  aria-label="Scroll room picks left"
                  className="pointer-events-auto ml-2 inline-flex h-10 w-9 items-center justify-center rounded-sm border border-[rgb(var(--listen-primary)/0.28)] bg-background/85 text-[rgb(var(--listen-primary))] shadow-[0_0_16px_rgb(var(--listen-shadow)/0.12)] transition hover:bg-[rgb(var(--listen-primary)/0.12)]"
                  onClick={() => scrollPicks("left")}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
            {canScrollRight ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex w-14 items-center justify-end bg-[linear-gradient(90deg,transparent,rgb(14_14_15_/_0.76)_62%,rgb(14_14_15_/_0.94))] sm:right-4">
                <button
                  aria-label="Scroll room picks right"
                  className="pointer-events-auto mr-2 inline-flex h-10 w-9 items-center justify-center rounded-sm border border-[rgb(var(--listen-primary)/0.28)] bg-background/85 text-[rgb(var(--listen-primary))] shadow-[0_0_16px_rgb(var(--listen-shadow)/0.12)] transition hover:bg-[rgb(var(--listen-primary)/0.12)]"
                  onClick={() => scrollPicks("right")}
                  type="button"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <EmptyListenPanel>{discovery.emptyMessage}</EmptyListenPanel>
          </div>
        )}
        {showProviderState &&
        providerRecommendations?.key === providerRequestKey &&
        providerRecommendations.response.reason &&
        providerRecommendations.response.source === "unavailable" ? (
          <p className="border-t border-white/10 px-4 py-3 text-label-sm text-on-surface-variant">
            {providerRecommendations.response.reason}
          </p>
        ) : null}
      </section>
    </div>
  );
}
