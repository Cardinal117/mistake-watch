import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/recommendations/bounded-json";
import { normalizeDiscoverRoomId } from "@/lib/recommendations/discover-contracts";
import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
const unavailable = (reason: string, status: number) =>
  reply({ reason, status: "unavailable" }, status);
function failure(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "40001")
    return unavailable(
      "Settings changed elsewhere. Review the refreshed settings before trying again.",
      409,
    );
  if (code === "42501")
    return unavailable("Account access is required for these settings.", 403);
  if (code === "22023")
    return unavailable("Invalid listening settings request.", 400);
  return unavailable("Listening settings are temporarily unavailable.", 503);
}
async function authorize(roomId: string, write = false) {
  const auth = await requireRecommendationRoomAccess(
    roomId,
    write ? "preference-write" : "preference-read",
  );
  if (!auth.ok) return { response: reply(auth.body, auth.status) };
  if (!auth.access.accountUserId)
    return {
      response: unavailable(
        "Sign in to manage account listening history.",
        403,
      ),
    };
  return { accountId: auth.access.accountUserId };
}
export async function GET(request: Request) {
  const roomId = normalizeDiscoverRoomId(
    new URL(request.url).searchParams.get("roomId"),
  );
  if (!roomId) return unavailable("Invalid room context.", 400);
  try {
    const auth = await authorize(roomId);
    if (auth.response) return auth.response;
    const result = await createSupabaseAdminClient()
      .rpc("read_listening_settings", {
        target_room: roomId,
        target_account: auth.accountId!,
      })
      .abortSignal(AbortSignal.timeout(5000));
    if (result.error) return failure(result.error);
    return reply({ settings: result.data });
  } catch (error) {
    return failure(error);
  }
}
async function mutate(request: Request, clear: boolean) {
  if (
    request.headers.get("Origin") &&
    request.headers.get("Origin") !== new URL(request.url).origin
  )
    return unavailable("Invalid request origin.", 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return unavailable("Expected a JSON request.", 415);
  const body = await readBoundedJson(request, 2048);
  if (!body.ok)
    return unavailable(
      "Invalid listening settings request.",
      body.reason === "too-large" ? 413 : 400,
    );
  if (
    !body.value ||
    typeof body.value !== "object" ||
    Array.isArray(body.value)
  )
    return unavailable("Invalid request.", 400);
  const input = body.value as Record<string, unknown>;
  const roomId = normalizeDiscoverRoomId(input.roomId);
  const keys = clear
    ? ["roomId", "expectedGeneration"]
    : ["roomId", "allowListening", "purposeVersion", "expectedEpoch"];
  if (
    !roomId ||
    Object.keys(input).some((key) => !keys.includes(key)) ||
    (clear
      ? !Number.isSafeInteger(input.expectedGeneration) ||
        (input.expectedGeneration as number) < 0
      : typeof input.allowListening !== "boolean" ||
        input.purposeVersion !== 1 ||
        !(
          input.expectedEpoch === null ||
          (typeof input.expectedEpoch === "string" &&
            /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
              input.expectedEpoch,
            ))
        ))
  )
    return unavailable("Invalid listening settings request.", 400);
  try {
    const auth = await authorize(roomId, true);
    if (auth.response) return auth.response;
    const client = createSupabaseAdminClient();
    const result = clear
      ? await client
          .rpc("clear_account_listening_history", {
            target_account: auth.accountId!,
            expected_generation: input.expectedGeneration as number,
          })
          .abortSignal(AbortSignal.timeout(5000))
      : await client
          .rpc("set_room_listening_consent", {
            target_room: roomId,
            target_account: auth.accountId!,
            allow_listening: input.allowListening as boolean,
            purpose_version: 1,
            expected_epoch: input.expectedEpoch as string | null,
          })
          .abortSignal(AbortSignal.timeout(5000));
    if (result.error) return failure(result.error);
    return reply(clear ? { history: result.data } : { settings: result.data });
  } catch (error) {
    return failure(error);
  }
}
export const PATCH = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
