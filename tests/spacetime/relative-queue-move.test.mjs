import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function reducer() {
  const path = "spacetime/src/relative-queue-move.ts";
  const modern = existsSync(path);
  const source = modern
    ? readFileSync(path, "utf8")
    : readFileSync("spacetime/src/index.ts", "utf8")
        .split("export const move_queue_item =")[1]
        .split("export const remove_queue_item")[0];
  const mod = { exports: {} };
  const type = { string: () => ({}), u32: () => ({}), option: () => ({}) };
  const helpers = {
    getAuthorizedQueueManager: (ctx) => (ctx.allowed ? {} : null),
    queuedQueueItems: (ctx) =>
      ctx.items
        .filter((i) => i.status === "queued")
        .sort((a, b) => a.position - b.position),
    replaceQueueItem: (ctx, item, patch) => Object.assign(item, patch),
    recordQueueRecommendationEvent() {},
  };
  vm.runInNewContext(
    ts.transpileModule(modern ? source : `exports.move = ${source}`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: mod,
      exports: mod.exports,
      t: type,
      spacetimedb: { reducer: (_, fn) => fn },
      ...helpers,
      require(name) {
        if (name === "spacetimedb/server")
          return { t: type, SenderError: Error };
        if (name === "./module-schema")
          return { spacetimedb: { reducer: (_, fn) => fn } };
        throw new Error(name);
      },
    },
  );
  return modern
    ? mod.exports.registerRelativeQueueMove(helpers)
    : mod.exports.move;
}
function context() {
  const items = ["a", "b", "c", "d"].map((id, position) => ({
    queue_item_id: id,
    room_id: "room",
    status: "queued",
    position,
    is_pinned: id === "b",
    is_play_next: id === "a",
  }));
  return {
    allowed: true,
    items,
    db: {
      live_queue_item: {
        queue_item_id: {
          find: (id) => items.find((i) => i.queue_item_id === id),
        },
      },
    },
  };
}
const args = (id, anchor, edge = "before") => ({
  actor_member_id: "host",
  client_action_id: "action",
  queue_item_id: id,
  anchor_queue_item_id: anchor,
  edge,
  room_id: "room",
  position: 0,
});
const ids = (ctx) =>
  ctx.items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => i.queue_item_id);
test("relative destination survives a preceding remote move", () => {
  const ctx = context(),
    move = reducer();
  move(ctx, args("d", "a"));
  move(ctx, args("b", "c", "after"));
  assert.deepEqual(ids(ctx), ["d", "a", "c", "b"]);
  assert.equal(ctx.items.find((i) => i.queue_item_id === "b").is_pinned, true);
});
test("four valid actors moving the same item converge by server order", () => {
  const ctx = context(),
    move = reducer();
  for (const [actor, anchor, edge] of [
    ["1", "a", "before"],
    ["2", "b", "after"],
    ["3", "c", "before"],
    ["4", "c", "after"],
  ])
    move(ctx, { ...args("d", anchor, edge), actor_member_id: actor });
  assert.deepEqual(ids(ctx), ["a", "b", "c", "d"]);
});
for (const fault of ["denied", "anchor-removed", "playing"])
  test(`reject ${fault} without moving any item`, () => {
    const ctx = context(),
      move = reducer();
    if (fault === "denied") ctx.allowed = false;
    if (fault === "anchor-removed") ctx.items[1].status = "played";
    if (fault === "playing") ctx.items[3].status = "playing";
    const before = JSON.stringify(ctx.items);
    assert.throws(() => move(ctx, args("d", "b")));
    assert.equal(JSON.stringify(ctx.items), before);
  });
