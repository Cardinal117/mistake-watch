import { SenderError, t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
type Context = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];
type Item = NonNullable<
  ReturnType<Context["db"]["live_queue_item"]["queue_item_id"]["find"]>
>;
type Helpers = {
  getAuthorizedQueueManager(ctx: Context, room: string, actor: string): unknown;
  queuedQueueItems(ctx: Context, room: string): Item[];
  replaceQueueItem(ctx: Context, item: Item, patch: { position: number }): void;
  recordQueueRecommendationEvent(
    ctx: Context,
    item: Item,
    event: {
      actionId: string;
      actorMemberId: string;
      eventType: "queue_reordered";
      reason: string;
    },
  ): unknown;
};

/** Additive API: legacy numeric moves retain their existing contract. */
export function registerRelativeQueueMove(h: Helpers) {
  return spacetimedb.reducer(
    {
      actor_member_id: t.string(),
      client_action_id: t.string(),
      room_id: t.string(),
      queue_item_id: t.string(),
      anchor_queue_item_id: t.option(t.string()),
      edge: t.string(),
    },
    (ctx, args) => {
      if (!h.getAuthorizedQueueManager(ctx, args.room_id, args.actor_member_id))
        throw new SenderError(
          "You no longer have permission to reorder this queue.",
        );
      if (
        !args.client_action_id.trim() ||
        !["before", "after", "start", "end"].includes(args.edge)
      )
        throw new SenderError("Invalid queue move.");
      const items = h.queuedQueueItems(ctx, args.room_id);
      const moving = items.find((i) => i.queue_item_id === args.queue_item_id);
      if (!moving)
        throw new SenderError("This item is no longer in the upcoming queue.");
      const ordered = items.filter((i) => i !== moving);
      const anchor = ordered.findIndex(
        (i) => i.queue_item_id === args.anchor_queue_item_id,
      );
      if ((args.edge === "before" || args.edge === "after") && anchor < 0)
        throw new SenderError(
          "The destination changed. Please move the item again.",
        );
      const position =
        args.edge === "start"
          ? 0
          : args.edge === "end"
            ? ordered.length
            : anchor + Number(args.edge === "after");
      ordered.splice(position, 0, moving);
      // Only changed positions enter the transaction/subscription update.
      ordered.forEach((item, index) => {
        if (item.position !== index)
          h.replaceQueueItem(ctx, item, { position: index });
      });
      h.recordQueueRecommendationEvent(
        ctx,
        { ...moving, position },
        {
          actionId: args.client_action_id,
          actorMemberId: args.actor_member_id,
          eventType: "queue_reordered",
          reason: "manual_reorder",
        },
      );
    },
  );
}
