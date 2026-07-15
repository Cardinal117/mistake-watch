import { spacetimedb } from "./module-schema";

export function recordRoomError(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  {
    actorMemberId,
    actorSource,
    code,
    eventType,
    message,
    permanent = false,
    providerId,
    queueItemId,
    roomId,
    severity = "warning",
    sourceType,
    title,
  }: {
    actorMemberId?: string;
    actorSource?: "actor" | "system";
    code: string;
    eventType?: string;
    message: string;
    permanent?: boolean;
    providerId?: string;
    queueItemId?: string;
    roomId: string;
    severity?: "info" | "warning" | "error";
    sourceType?: string;
    title?: string;
  },
) {
  ctx.db.room_error.insert({
    actor_member_id: actorMemberId,
    actor_source: actorSource,
    code,
    created_ms: BigInt(Date.now()),
    error_id: ctx.newUuidV7().toString(),
    event_type: eventType,
    message,
    permanent,
    provider_id: providerId,
    queue_item_id: queueItemId,
    room_id: roomId,
    severity,
    source_type: sourceType,
    title,
  });

  const roomErrors = [...ctx.db.room_error.iter()]
    .filter((error) => error.room_id === roomId)
    .sort((left, right) => Number(right.created_ms - left.created_ms));

  roomErrors.slice(100).forEach((error) => {
    ctx.db.room_error.delete(error);
  });
}
