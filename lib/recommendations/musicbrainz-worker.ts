import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lookupRecording, MBID } from "./musicbrainz-core";

export async function runMusicbrainzJobs() {
  if (process.env.MUSICBRAINZ_IDENTITY_ENABLED !== "true") return;
  const client = createSupabaseAdminClient();
  const deadline = Date.now() + 40_000;
  // Small bounded background pump; never awaited by player/queue commands.
  for (let n = 0; n < 3; n++) {
    if (n) await new Promise((resolve) => setTimeout(resolve, 2100));
    if (Date.now() > deadline - 18_000) return;
    const result = await client
      .rpc("claim_musicbrainz_lookup")
      .abortSignal(AbortSignal.timeout(5000));
    if (result.error) return;
    const claim = result.data as {
      mbid?: string;
      token?: string;
      leaseUntil?: string;
    };
    if (!claim.mbid || !claim.token) continue;
    if (
      !MBID.test(claim.mbid) ||
      !MBID.test(claim.token) ||
      !claim.leaseUntil ||
      !Number.isFinite(Date.parse(claim.leaseUntil)) ||
      Date.parse(claim.leaseUntil) < Date.now() + 10000
    )
      return;
    const outcome = await lookupRecording(claim.mbid);
    const completed = await client
      .rpc("complete_musicbrainz_lookup", {
        claim_token: claim.token,
        recording_mbid: claim.mbid,
        outcome,
      })
      .abortSignal(AbortSignal.timeout(5000));
    if (completed.error || !completed.data || outcome.status === "retry")
      return;
  }
}
