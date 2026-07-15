import { createHash } from "node:crypto";

import { BoundedTtlCache } from "./bounded-cache";
import { recommendationMediaKey } from "./media-identity";
import { rankRecommendations } from "./rank";
import type {
  RoomRecommendationRequest,
  RoomRecommendationResponse,
} from "./room-contracts";
import type {
  RecommendationAggregate,
  RecommendationPreference,
} from "./scoring";

const DEFAULT_SUCCESS_TTL_MS = 30_000;
const DEFAULT_FAILURE_TTL_MS = 5_000;
const DEFAULT_CACHE_CAPACITY = 500;

export type RoomRecommendationPrincipal = {
  accountUserId: string | null;
  catalogueScope: "allowlisted" | "none" | "owner";
  identityKey: string;
  roomId: string;
};

export type UploadedRecommendationAsset = {
  id: string;
  ownerUserId: string;
  status: string;
  visibility: string;
};

export type RoomRecommendationServiceDependencies = {
  cacheOptions?: {
    capacity?: number;
    failureTtlMs?: number;
    now?: () => number;
    successTtlMs?: number;
  };
  loadAggregates(
    access: RoomRecommendationPrincipal,
  ): Promise<RecommendationAggregate[]>;
  loadPreferences(
    access: RoomRecommendationPrincipal,
  ): Promise<RecommendationPreference[]>;
  loadUploadedAssets(
    assetIds: string[],
  ): Promise<UploadedRecommendationAsset[]>;
  now?: () => number;
};

export function createRoomRecommendationService(
  dependencies: RoomRecommendationServiceDependencies,
) {
  const successTtlMs =
    dependencies.cacheOptions?.successTtlMs ?? DEFAULT_SUCCESS_TTL_MS;
  const failureTtlMs =
    dependencies.cacheOptions?.failureTtlMs ?? DEFAULT_FAILURE_TTL_MS;
  const cache = new BoundedTtlCache<Omit<RoomRecommendationResponse, "cache">>(
    successTtlMs,
    dependencies.cacheOptions?.capacity ?? DEFAULT_CACHE_CAPACITY,
    dependencies.cacheOptions?.now,
  );
  const now = dependencies.now ?? Date.now;

  return {
    async getRecommendations({
      access,
      request,
      sessionPreferences = [],
    }: {
      access: RoomRecommendationPrincipal;
      request: RoomRecommendationRequest;
      sessionPreferences?: RecommendationPreference[];
    }): Promise<RoomRecommendationResponse> {
      if (access.roomId !== request.roomId) {
        return unavailable("Recommendation room context is no longer valid.");
      }

      const cacheKey = recommendationCacheKey(
        access,
        request,
        sessionPreferences,
      );
      const cached = cache.get(cacheKey);

      if (cached.value) {
        return { ...cached.value, cache: "hit" };
      }

      try {
        const [aggregates, durablePreferences, uploadedAssets] =
          await Promise.all([
            dependencies.loadAggregates(access),
            dependencies.loadPreferences(access),
            dependencies.loadUploadedAssets(
              request.candidates
                .filter((candidate) => candidate.sourceType === "uploaded")
                .map((candidate) => candidate.mediaId),
            ),
          ]);
        const preferences = mergePreferences(
          durablePreferences,
          sessionPreferences,
        );
        const candidates = applyCatalogueAuthorization({
          access,
          candidates: request.candidates,
          uploadedAssets,
        });
        const ranking = rankRecommendations({
          aggregates,
          candidates,
          context: {
            activeContributorMemberIds: [],
            currentMedia: request.currentMedia,
            nowMs: now(),
            queuedMedia: request.queuedMedia,
            recentHistory: request.recentHistory,
          },
          limit: request.limit,
          preferences,
        });
        const response: Omit<RoomRecommendationResponse, "cache"> = {
          items: ranking.ranked.map(({ candidate, mediaKey, reasons }) => ({
            artist: candidate.artist,
            candidateId: candidate.candidateId,
            channelName: candidate.channelName,
            mediaId: candidate.mediaId,
            mediaKey,
            playlistId: candidate.playlistId,
            reasons,
            sourceType: candidate.sourceType,
            title: candidate.title,
          })),
          source: "first-party",
          status: "available",
        };

        cache.set(cacheKey, response);
        return { ...response, cache: "miss" };
      } catch {
        const response = unavailable(
          "First-party recommendations are temporarily unavailable.",
        );
        const { cache: _cache, ...cacheable } = response;

        cache.set(cacheKey, cacheable, failureTtlMs);
        return response;
      }
    },
  };
}

function applyCatalogueAuthorization({
  access,
  candidates,
  uploadedAssets,
}: {
  access: RoomRecommendationPrincipal;
  candidates: RoomRecommendationRequest["candidates"];
  uploadedAssets: UploadedRecommendationAsset[];
}) {
  const assetById = new Map(uploadedAssets.map((asset) => [asset.id, asset]));

  return candidates.map((candidate) => {
    if (candidate.sourceType !== "uploaded") {
      return candidate;
    }

    const asset = assetById.get(candidate.mediaId);
    const catalogueAuthorized = Boolean(
      asset &&
      asset.status === "ready" &&
      access.catalogueScope !== "none" &&
      (asset.visibility === "public" ||
        (access.catalogueScope === "owner" &&
          asset.ownerUserId === access.accountUserId)),
    );

    return { ...candidate, catalogueAuthorized };
  });
}

function recommendationCacheKey(
  access: RoomRecommendationPrincipal,
  request: RoomRecommendationRequest,
  sessionPreferences: RecommendationPreference[],
) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        candidates: request.candidates,
        currentMedia: request.currentMedia,
        limit: request.limit,
        queuedMedia: request.queuedMedia,
        recentHistory: request.recentHistory,
        revision: request.revision,
        sessionPreferences: [...sessionPreferences].sort((left, right) =>
          recommendationMediaKey(left).localeCompare(
            recommendationMediaKey(right),
          ),
        ),
      }),
    )
    .digest("base64url");

  return [
    access.roomId,
    access.identityKey,
    access.catalogueScope,
    digest,
  ].join(":");
}

function mergePreferences(
  durable: RecommendationPreference[],
  session: RecommendationPreference[],
) {
  const byKey = new Map(
    durable.map((preference) => [
      recommendationMediaKey(preference),
      preference,
    ]),
  );

  for (const preference of session) {
    byKey.set(recommendationMediaKey(preference), preference);
  }

  return [...byKey.values()];
}

function unavailable(reason: string): RoomRecommendationResponse {
  return {
    cache: "miss",
    items: [],
    reason,
    source: "fallback",
    status: "unavailable",
  };
}
