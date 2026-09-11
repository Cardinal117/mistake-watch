import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { catalogueReason } from "./catalogue-discovery";
import { catalogueObject } from "./catalogue-contracts";
import type { RecommendationRoomAccess } from "./room-authorization";
import type { RoomRecommendationPrincipal } from "./room-service-core";
import {
  isDiscoverSuppressed,
  type DiscoverMutation,
} from "./discover-contracts";
import {
  createPersonalDiscoverReader,
  parseDiscoverFeedback,
  parseDiscoverProjection,
} from "./discover-service-core";

type PersonalAccess = Pick<
  RoomRecommendationPrincipal,
  "accountUserId" | "roomId" | "roomKind"
>;

async function readProjection(access: PersonalAccess, catalogue = false) {
  if (access.roomKind !== "personal" || !access.accountUserId)
    throw new Error("Personal owner required");
  const { data, error } = await createSupabaseAdminClient().rpc(
    catalogue ? "read_personal_catalogue" : "read_personal_discover",
    {
      target_room: access.roomId,
      target_account: access.accountUserId,
    },
  );
  if (error) throw error;
  return data;
}

export async function getPersonalDiscover(access: RecommendationRoomAccess) {
  const result = await createPersonalDiscoverReader(() =>
    readProjection(access, true),
  )();
  const ids = result.recommendations?.map((item) => item.mediaId) ?? [];
  if (!ids.length) return result;
  const decision = await createSupabaseAdminClient().rpc(
    "issue_personal_catalogue_decision",
    {
      target_room: access.roomId,
      target_account: access.accountUserId!,
      selected_ids: ids,
    },
  );
  if (decision.error) throw new Error("Catalogue decision recording failed");
  const body = decision.data;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.decisionId !== "string" ||
    typeof body.expiresAt !== "string"
  )
    throw new Error("Invalid catalogue decision");
  if (!Array.isArray(body.candidates) || body.candidates.length !== ids.length)
    throw new Error("Invalid catalogue decision candidates");
  const reasons = new Map(
    body.candidates.map((value) => {
      const item = catalogueObject(value);
      if (typeof item.mediaId !== "string" || !ids.includes(item.mediaId))
        throw new Error("Invalid catalogue decision identity");
      return [item.mediaId, catalogueReason(item.reason)] as const;
    }),
  );
  if (reasons.size !== ids.length)
    throw new Error("Duplicate catalogue decision identity");
  return {
    ...result,
    recommendations: result.recommendations?.map((item) => ({
      ...item,
      reason: reasons.get(item.mediaId)!,
    })),
    decisionId: body.decisionId,
    decisionExpiresAt: body.expiresAt,
  };
}

// Read explicit exclusions without metadata/provider requests. Missing schema fails
// closed through the room service; no stale cache may reintroduce blocked tracks.
export async function loadDiscoverSuppressedMedia(access: PersonalAccess) {
  const projection = parseDiscoverProjection(await readProjection(access));
  return projection.feedback
    .filter((item) => isDiscoverSuppressed(item))
    .map((item) => `youtube:${item.mediaId}`);
}

export async function recordPersonalDiscover(
  access: RecommendationRoomAccess,
  input: DiscoverMutation,
) {
  if (
    access.roomKind !== "personal" ||
    !access.accountUserId ||
    access.roomId !== input.roomId
  )
    throw new Error("Personal owner required");
  const { roomId: _roomId, ...observation } = input;
  const { data, error } = await createSupabaseAdminClient().rpc(
    "record_personal_discover",
    {
      target_room: access.roomId,
      target_account: access.accountUserId,
      observation: observation as unknown as Json,
    },
  );
  if (error) {
    if (error.code === "23505")
      return {
        status: 409,
        body: {
          reason: "This action was already used. Refresh and try again.",
        },
      };
    if (error.code === "54000")
      return {
        status: 409,
        body: {
          reason: "Your feedback list is full. Existing choices remain saved.",
        },
      };
    if (error.code === "42501")
      return {
        status: 403,
        body: { reason: "Your Personal room is no longer available." },
      };
    throw error;
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid Discover mutation response");
  if (data.item)
    return {
      status: data.status === "conflict" ? 409 : 200,
      body: {
        item: parseDiscoverFeedback(data.item),
        ...(data.status === "conflict"
          ? {
              reason:
                "Feedback changed on another device. Refresh and try again.",
            }
          : {}),
      },
    };
  if (data.ok !== true)
    throw new Error("Invalid Discover observation response");
  return { status: 200, body: { ok: true } };
}
