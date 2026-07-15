import { schema } from "spacetimedb/server";
import {
  guestMediaPreference,
  recommendationEventOverflow,
  recommendationEventOutbox,
  recommendationPlaybackMemory,
  recommendationPlaybackOccurrence,
  recommendationProcessedAction,
  recommendationRoomSession,
} from "./recommendation-events";
import {
  liveQueueItem,
  roomChatMessage,
  roomError,
  roomKick,
  roomParticipant,
  roomPermission,
  roomSeedGrant,
  roomSession,
  trustedSeedIssuer,
} from "./room-tables";

export const spacetimedb = schema({
  guest_media_preference: guestMediaPreference,
  live_queue_item: liveQueueItem,
  recommendation_event_outbox: recommendationEventOutbox,
  recommendation_event_overflow: recommendationEventOverflow,
  recommendation_playback_memory: recommendationPlaybackMemory,
  recommendation_playback_occurrence: recommendationPlaybackOccurrence,
  recommendation_processed_action: recommendationProcessedAction,
  recommendation_room_session: recommendationRoomSession,
  room_chat_message: roomChatMessage,
  room_error: roomError,
  room_kick: roomKick,
  room_permission: roomPermission,
  room_participant: roomParticipant,
  room_seed_grant: roomSeedGrant,
  room_session: roomSession,
  trusted_seed_issuer: trustedSeedIssuer,
});
