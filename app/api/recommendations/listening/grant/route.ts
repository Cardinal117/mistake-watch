import { after, NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/recommendations/bounded-json";
import { normalizeDiscoverRoomId } from "@/lib/recommendations/discover-contracts";
import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { grantListenerLearning } from "@/lib/recommendations/listener-bridge";
import { deliverRecommendationEventsInBackground } from "@/lib/recommendations/durable-outbox-drain";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ allowed: false }, { status: 403, headers });
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return NextResponse.json({ allowed: false }, { status: 415, headers });
  const body = await readBoundedJson(request, 1024);
  const input =
    body.ok && body.value && typeof body.value === "object"
      ? (body.value as Record<string, unknown>)
      : {};
  const roomId = normalizeDiscoverRoomId(input.roomId);
  if (
    Object.keys(input).some(
      (key) => !["roomId", "identityHex", "admissionId"].includes(key),
    ) ||
    !roomId ||
    typeof input.identityHex !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.identityHex) ||
    typeof input.admissionId !== "string" ||
    !/^[a-zA-Z0-9_-]{24}$/.test(input.admissionId)
  )
    return NextResponse.json({ allowed: false }, { status: 400, headers });
  const auth = await requireRecommendationRoomAccess(
    roomId,
    "recommendation-read",
  );
  if (!auth.ok || !auth.access.accountUserId)
    return NextResponse.json(
      { allowed: false },
      { status: auth.ok ? 403 : auth.status, headers },
    );
  try {
    const client = createSupabaseAdminClient();
    const { data, error } = await client
      .rpc("read_listening_settings", {
        target_room: roomId,
        target_account: auth.access.accountUserId,
      })
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw new Error("Listening settings unavailable");
    if (!data?.allowed || !data.epoch || data.memberId !== auth.access.memberId)
      return NextResponse.json({ allowed: false }, { headers });
    const now = Date.now();
    const expiresAt = now + 110000;
    await grantListenerLearning({
      roomId,
      memberId: auth.access.memberId,
      accountId: auth.access.accountUserId,
      identityHex: input.identityHex,
      admissionId: input.admissionId,
      consentEpoch: data.epoch,
      historyGeneration: BigInt(data.historyGeneration),
      validFromMs: BigInt(now),
      expiresMs: BigInt(expiresAt),
    });
    after(deliverRecommendationEventsInBackground);
    return NextResponse.json({ allowed: true, expiresAt }, { headers });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 503, headers });
  }
}
