"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { fetchYouTubeRecommendations } from "@/lib/youtube/recommendations-client";
import {
  buildRoomRecommendationRequest,
  fetchRoomRecommendations,
} from "@/lib/recommendations/room-client";
import {
  personalShelves,
  queuedPersonalTrack,
  type PersonalTrack,
} from "@/lib/recommendations/personal-discovery-model";
import {
  isDiscoverSuppressed,
  type DiscoverSurface,
} from "@/lib/recommendations/discover-contracts";
import { queueItemToDiscoverySourceCommand } from "@/lib/recommendations/listen-discovery-interactions";
import type { DiscoveryPanelProps } from "./discovery-panel";
import {
  buildProviderRecommendationQuery,
  youtubeMetadataToQueueItem,
} from "./media-cards";
import { PersonalTrackView } from "./personal-track";
import { usePersonalDiscovery } from "./use-personal-discovery";
import "./personal-discovery.css";

export function PersonalDiscoveryPanel(props: DiscoveryPanelProps) {
  const {
    room,
    currentItem,
    items,
    mediaPreferences,
    onAddQueueItem,
    canAddQueue,
    canPlay,
    canLoadSource,
  } = props;
  const discovery = usePersonalDiscovery(
    room.id,
    items,
    onAddQueueItem,
    mediaPreferences.revision,
  );
  const { data, observe } = discovery;
  const [browse, setBrowse] = useState<DiscoverSurface | null>(null);
  const browseTrigger = useRef<DiscoverSurface | null>(null);
  const [recommendations, setRecommendations] = useState<{
    key: string;
    items: PersonalTrack[];
    reasons: Map<string, string>;
    loading: boolean;
    message?: string;
  }>({ key: "", items: [], reasons: new Map(), loading: false });
  const shelves = useMemo(
    () => personalShelves(data?.items ?? [], data?.feedback ?? []),
    [data],
  );
  const seed = currentItem ?? shelves.regulars[0] ?? null;
  const query = buildProviderRecommendationQuery(seed);
  const key = `${room.id}:${query ?? ""}`;
  const recommendationsRef = useRef(recommendations);
  useEffect(() => {
    recommendationsRef.current = recommendations;
  }, [recommendations]);
  useEffect(() => {
    if (!data || !query) return;
    let disposed = false;
    const previous = recommendationsRef.current;
    if (previous.key !== key)
      setRecommendations({ key, items: [], reasons: new Map(), loading: true });
    void (async () => {
      const provider = await fetchYouTubeRecommendations({
        kind: "recommended",
        query,
        roomId: room.id,
      });
      const candidates = provider.items.map((item) =>
        youtubeMetadataToQueueItem(item, "Personal discovery"),
      );
      if (candidates.length === 0) {
        if (!disposed)
          setRecommendations({
            key,
            items: [],
            reasons: new Map(),
            loading: false,
            message:
              provider.reason ??
              "No new suggestions for this track yet. Your regulars are still available.",
          });
        return;
      }
      const result = await fetchRoomRecommendations(
        buildRoomRecommendationRequest({
          candidates,
          currentItem: seed,
          items,
          roomId: room.id,
          preferenceRevision: mediaPreferences.revision,
        }),
      );
      if (result.status !== "available") {
        if (!disposed)
          setRecommendations({
            key,
            items: [],
            reasons: new Map(),
            loading: false,
            message:
              "Suggestions are temporarily unavailable. Your regulars and manual search are still available.",
          });
        return;
      }
      const byId = new Map(candidates.map((item) => [item.id, item]));
      const ranked = result.items.flatMap((item) =>
        byId.has(item.candidateId) ? [byId.get(item.candidateId)!] : [],
      );
      // Keep confirmed queue selections visible on this query instead of immediately refilling their slots.
      const held =
        previous.key === key
          ? previous.items.filter((item) => queuedPersonalTrack(item, items))
          : [];
      const combined = [
        ...new Map(
          [...held, ...ranked].map((item) => [item.videoId, item]),
        ).values(),
      ];
      if (!disposed)
        setRecommendations({
          key,
          items: combined,
          loading: false,
          reasons: new Map(
            result.items.map((item) => [
              item.candidateId,
              item.reasons[0]?.label ?? "Selected for this room",
            ]),
          ),
        });
    })().catch(() => {
      if (!disposed)
        setRecommendations({
          key,
          items: [],
          reasons: new Map(),
          loading: false,
          message:
            "Suggestions are unavailable. You can still choose your music.",
        });
    });
    return () => {
      disposed = true;
    };
    // Queue and Like changes rerank the existing provider query; provider cache coalesces retrieval.
  }, [query, key, room.id, data, seed, items, mediaPreferences.revision]);

  const recommended =
    recommendations.key === key
      ? recommendations.items.filter(
          (item) =>
            !shelves.blocked.has(item.videoId ?? "") &&
            item.sourceType === "youtube",
        )
      : [];
  const activeFeedback =
    data?.feedback.filter((f) => isDiscoverSuppressed(f)) ?? [];
  function play(item: PersonalTrack, surface: DiscoverSurface) {
    const queued = queuedPersonalTrack(item, items);
    if (queued ? !canPlay : !canLoadSource) return;
    observe(item.videoId!, surface, "play_requested");
    if (queued) props.onPlayQueueItem(queued.id);
    else props.onLoadSource(queueItemToDiscoverySourceCommand(item));
  }
  function renderTrack(
    item: PersonalTrack,
    surface: DiscoverSurface,
    regular = false,
  ) {
    const queued = queuedPersonalTrack(item, items);
    const id = item.videoId!;
    return (
      <PersonalTrackView
        key={id}
        item={item}
        surface={surface}
        regular={regular}
        reason={
          surface === "recommended"
            ? (recommendations.reasons.get(item.id) ??
              "YouTube search suggestion")
            : undefined
        }
        queued={!!queued}
        added={discovery.added.has(id)}
        pending={discovery.pending.has(id)}
        canPlay={queued ? canPlay : canLoadSource}
        canAdd={canAddQueue}
        busy={discovery.busyFeedback}
        preferences={mediaPreferences}
        onPlay={() => play(item, surface)}
        onAdd={(next) => discovery.addTrack(item, surface, next)}
        onFeedback={(state) => void discovery.feedback(id, surface, state)}
        onShown={() => observe(id, surface, "shown")}
      />
    );
  }
  function viewAll(surface: DiscoverSurface) {
    browseTrigger.current = surface;
    setBrowse(surface);
  }
  function closeBrowse() {
    setBrowse(null);
    requestAnimationFrame(() =>
      document
        .getElementById(`personal-view-${browseTrigger.current}`)
        ?.focus(),
    );
  }
  const titles = {
    regulars: "Your regulars",
    recommended: "Recommended for you",
    rediscover: "Rediscover",
  };
  const selected =
    browse === "regulars"
      ? shelves.regulars
      : browse === "rediscover"
        ? shelves.rediscover
        : recommended;

  return (
    <section className="personal-discovery" aria-label="Personal Discover">
      {discovery.error ? (
        <div className="personal-message" role="alert">
          <p>{discovery.error}</p>
          <button onClick={() => void discovery.refresh()}>
            <RefreshCw size={16} aria-hidden />
            Retry Discover
          </button>
        </div>
      ) : !data ? (
        <div className="personal-loading" role="status">
          <p>Loading your music…</p>
          <div className="personal-regular-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="personal-skeleton" key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {browse ? (
            <>
              <button className="personal-back" onClick={closeBrowse}>
                <ArrowLeft size={16} aria-hidden />
                Back to Discover
              </button>
              <header className="personal-section-header">
                <h2>{titles[browse]}</h2>
              </header>
              <div
                className={
                  browse === "regulars"
                    ? "personal-regular-grid"
                    : "personal-track-list"
                }
              >
                {selected.map((item) =>
                  renderTrack(item, browse, browse === "regulars"),
                )}
              </div>
            </>
          ) : (
            <>
              <header className="personal-section-header">
                <div>
                  <h2>Your regulars</h2>
                  <p>Favourites and music you return to</p>
                </div>
                {shelves.regulars.length > 8 && (
                  <button
                    id="personal-view-regulars"
                    onClick={() => viewAll("regulars")}
                  >
                    View all <span className="sr-only">regulars</span>
                  </button>
                )}
              </header>
              <details className="personal-count-help">
                <summary>
                  Recorded plays · last {data.countWindowDays} days · About
                  counts
                </summary>
                <p>
                  Counts recorded completed playback in this room, including
                  repeats. Seeking can qualify. These are not lifetime totals or
                  proof of uninterrupted listening.
                </p>
              </details>
              {shelves.regulars.length ? (
                <div className="personal-regular-grid">
                  {shelves.regulars
                    .slice(0, 8)
                    .map((item) => renderTrack(item, "regulars", true))}
                </div>
              ) : (
                <p className="personal-empty">
                  Like songs and listen in your Personal room to build your
                  regulars. No listening history is invented.
                </p>
              )}
              <div className="personal-lower">
                <section
                  className="personal-recommendations"
                  aria-labelledby="personal-recommended-title"
                >
                  <header className="personal-section-header">
                    <div>
                      <h2 id="personal-recommended-title">
                        Recommended for you
                      </h2>
                      <p>Choose what plays next</p>
                    </div>
                  </header>
                  {recommendations.message && (
                    <p className="personal-source-note">
                      {recommendations.message}
                    </p>
                  )}
                  {recommendations.loading ? (
                    <p role="status" className="personal-empty">
                      Finding suggestions…
                    </p>
                  ) : recommended.length ? (
                    <div className="personal-track-list">
                      {recommended.map((item) =>
                        renderTrack(item, "recommended"),
                      )}
                    </div>
                  ) : (
                    <p className="personal-empty">
                      {shelves.blocked.size
                        ? "No eligible suggestions right now. Your feedback stays in place."
                        : "Choose a song to find suggestions. Nothing is added automatically."}
                    </p>
                  )}
                </section>
                <section
                  className="personal-rediscover"
                  aria-labelledby="personal-rediscover-title"
                >
                  <header className="personal-section-header">
                    <div>
                      <h2 id="personal-rediscover-title">Rediscover</h2>
                      <p>Worth another listen</p>
                    </div>
                    {shelves.rediscover.length > 3 && (
                      <button
                        id="personal-view-rediscover"
                        onClick={() => viewAll("rediscover")}
                      >
                        View all <span className="sr-only">rediscover</span>
                      </button>
                    )}
                  </header>
                  {shelves.rediscover.length ? (
                    shelves.rediscover
                      .slice(0, 3)
                      .map((item) => renderTrack(item, "rediscover"))
                  ) : (
                    <p className="personal-empty">
                      Music you last played over a week ago will appear here.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {activeFeedback.length > 0 && (
            <details className="personal-feedback-history">
              <summary>
                Suggestion controls · {activeFeedback.length} hidden
              </summary>
              <p>
                Hidden from suggestions only. You can still play these tracks
                manually.
              </p>
              {activeFeedback.map((f) => (
                <div key={f.mediaId}>
                  <span>
                    {data.items.find((i) => i.mediaId === f.mediaId)?.title ??
                      recommendations.items.find((i) => i.videoId === f.mediaId)
                        ?.title ??
                      `YouTube video ${f.mediaId}`}
                    <small>
                      {f.state === "not_now"
                        ? "Paused for 7 days"
                        : f.state === "wrong_version"
                          ? "Wrong version"
                          : "Don't suggest"}
                    </small>
                  </span>
                  <button
                    disabled={discovery.busyFeedback}
                    onClick={() =>
                      void discovery.feedback(
                        f.mediaId,
                        "recommended",
                        "neutral",
                        f.revision,
                      )
                    }
                  >
                    Allow suggestions again
                  </button>
                </div>
              ))}
            </details>
          )}
        </>
      )}
      {discovery.actionError && (
        <p className="personal-message" role="alert">
          {discovery.actionError}
        </p>
      )}
      {discovery.undo && (
        <div className="personal-feedback-notice" role="status">
          <span>
            {discovery.undo.state === "not_now"
              ? "Hidden from suggestions for 7 days."
              : discovery.undo.state === "wrong_version"
                ? "This video version is hidden from suggestions."
                : "This track is hidden from suggestions."}
          </span>
          <button
            disabled={discovery.busyFeedback}
            onClick={() =>
              void discovery.feedback(
                discovery.undo!.mediaId,
                "recommended",
                "neutral",
                discovery.undo!.revision,
              )
            }
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
