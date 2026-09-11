import { NextResponse, after, type NextRequest } from "next/server";
import { runMusicbrainzJobs } from "@/lib/recommendations/musicbrainz-worker";
import { runDurableShadowEnrichment } from "@/lib/recommendations/shadow-worker";

import { drainDurableRecommendationOutbox } from "@/lib/recommendations/durable-outbox-drain";
import { runMusicCatalogueMaintenance } from "@/lib/recommendations/catalogue-service";
import { maintainBeforeRoomDrain } from "@/lib/recommendations/catalogue-worker-core";
export const maxDuration = 60;

function isAuthorizedDrainRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: NextRequest) {
  const providerDeadline = Date.now() + 55_000;
  if (!isAuthorizedDrainRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    after(async () => {
      try {
        if (process.env.SHADOW_ENRICHMENT_ENABLED === "true") {
          await runDurableShadowEnrichment(providerDeadline);
        } else {
          await runMusicbrainzJobs();
        }
      } catch {
        /* Pending jobs remain retryable. */
      }
    });
    return NextResponse.json(
      await maintainBeforeRoomDrain(
        runMusicCatalogueMaintenance,
        drainDurableRecommendationOutbox,
      ),
    );
  } catch (error) {
    console.error("[recommendations:drain]", error);
    return NextResponse.json(
      { error: "Recommendation event drain could not run." },
      { status: 500 },
    );
  }
}

export const GET = POST;
