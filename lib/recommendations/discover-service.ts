import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { getYouTubeMetadata } from "@/lib/youtube/metadata";
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

async function readProjection(access: PersonalAccess) {
  if (access.roomKind !== "personal" || !access.accountUserId)
    throw new Error("Personal owner required");
  const { data, error } = await createSupabaseAdminClient().rpc(
    "read_personal_discover",
    {
      target_room: access.roomId,
      target_account: access.accountUserId,
    },
  );
  if (error) throw error;
  return data;
}

export async function getPersonalDiscover(access: RecommendationRoomAccess) {
  return createPersonalDiscoverReader(
    () => readProjection(access),
    getYouTubeMetadata,
  )();
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
