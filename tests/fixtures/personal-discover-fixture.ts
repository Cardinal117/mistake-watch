import type { Page } from "@playwright/test";
import { previewArtwork } from "./watch-preview-data";

export const personalDiscoverTracks = Array.from(
  { length: 12 },
  (_, index) => ({
    mediaId: `dQw4w9Wg${String(index).padStart(3, "0")}`,
    sourceType: "youtube",
    title: [
      "Sicilian Defense",
      "Fiery Dragon",
      "Paint It Black",
      "Dawn of Faith",
      "Hordes",
      "Arrival to Earth",
      "Guardians at the Gate",
      "Quantum Field",
    ][index % 8],
    artist: "Orchestral artist",
    thumbnailUrl: previewArtwork(index),
    completedPlayCount: 20 - index,
    liked: index < 3,
    lastCompletedAt: new Date(
      Date.now() - (index + 1) * 86400000,
    ).toISOString(),
    durationSeconds: 200,
  }),
);

export async function setupPersonalDiscover(
  page: Page,
  options: {
    catalogueLimited?: boolean;
    warming?: boolean;
    omitFirstPreference?: boolean;
    empty?: boolean;
    metadataExpiresAt?: string;
    decisionId?: string;
    recommendationCount?: number;
  } = {},
) {
  let feedback: Array<{
    mediaId: string;
    state: string;
    revision: number;
    expiresAt: string | null;
  }> = [];
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/recommendations/discover")) {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: {
            status: "available",
            decisionId: options.decisionId,
            decisionExpiresAt: options.decisionId
              ? new Date(Date.now() + 86400000).toISOString()
              : undefined,
            items: options.warming
              ? []
              : personalDiscoverTracks.map((track) => ({
                  ...track,
                  metadataExpiresAt: options.metadataExpiresAt,
                })),
            recommendations:
              options.catalogueLimited || options.warming
                ? []
                : Array.from(
                    { length: options.recommendationCount ?? 4 },
                    (_, index) => ({
                      ...personalDiscoverTracks[4 + (index % 8)],
                      mediaId: `dQw4w9Wg${String(index + 4).padStart(3, "0")}`,
                      metadataExpiresAt: options.metadataExpiresAt,
                      reason: {
                        code: "history",
                        label: "From your listening history",
                      },
                    }),
                  ),
            catalogue: {
              status: options.warming
                ? "warming"
                : options.catalogueLimited
                  ? "limited"
                  : "ready",
              pendingCount: options.warming ? 12 : 0,
            },
            feedback,
            countWindowDays: 180,
          },
        });
      const body = route.request().postDataJSON();
      if (body.kind === "feedback") {
        const existing = feedback.find((f) => f.mediaId === body.mediaId);
        if ((existing?.revision ?? 0) !== body.expectedRevision)
          return route.fulfill({
            status: 409,
            json: {
              reason:
                "Feedback changed on another device. Refresh and try again.",
            },
          });
        const item = {
          mediaId: body.mediaId,
          state: body.state,
          revision: body.expectedRevision + 1,
          expiresAt:
            body.state === "not_now"
              ? new Date(Date.now() + 7 * 86400000).toISOString()
              : null,
        };
        feedback = [
          ...feedback.filter((f) => f.mediaId !== item.mediaId),
          item,
        ];
        return route.fulfill({ json: { item } });
      }
      return route.fulfill({ json: { ok: true } });
    }
    if (url.includes("/youtube/recommendations"))
      return route.fulfill({
        json: {
          status: "available",
          items: personalDiscoverTracks.slice(4, 8).map((t) => ({
            ...t,
            videoId: t.mediaId,
            channelTitle: t.artist,
            availability: { playable: true },
          })),
        },
      });
    if (url.includes("/recommendations/room")) {
      const body = route.request().postDataJSON();
      return route.fulfill({
        json: options.catalogueLimited
          ? { status: "unavailable", items: [] }
          : {
              status: "available",
              items: body.candidates
                .filter(
                  (c: { mediaId: string }) =>
                    !body.queuedMedia.some(
                      (q: { mediaId: string }) => q.mediaId === c.mediaId,
                    ),
                )
                .map((c: { candidateId: string }) => ({
                  candidateId: c.candidateId,
                  reasons: [{ label: "Because you enjoy orchestral music" }],
                })),
            },
      });
    }
    if (url.includes("/preferences")) {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        return route.fulfill({
          json: {
            item: {
              ...body,
              mediaKey: `youtube:${body.mediaId}`,
              revision: body.expectedRevision + 1,
            },
          },
        });
      }
      return route.fulfill({
        json: {
          items: personalDiscoverTracks
            .filter((_, i) => !options.omitFirstPreference || i !== 0)
            .map((t) => ({
              ...t,
              mediaKey: `youtube:${t.mediaId}`,
              revision: 0,
            })),
        },
      });
    }
    return route.fulfill({ json: { items: [], status: "unavailable" } });
  });
  await page.goto(
    `/dev/listen-design?personal&owner&network${options.empty ? "&empty" : ""}`,
  );
  return {
    replaceDecision: (decisionId: string) => {
      options.decisionId = decisionId;
    },
    finishWarmup: () => {
      options.warming = false;
    },
    replaceFeedback: (value: typeof feedback) => {
      feedback = value;
    },
  };
}
