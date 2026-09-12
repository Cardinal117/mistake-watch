import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync("spacetime/src/index.ts", "utf8");
const tree = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
const selected = [];
const helpers = new Set(["playNextQueuePosition", "shiftQueuedItemsAtOrAfter", "replaceQueueItem", "normalizeQueuedPositions"]);
function visit(node) {
  if (ts.isFunctionDeclaration(node) && helpers.has(node.name?.text)) selected.push(node.getText(tree));
  if (ts.isVariableDeclaration(node) && ["add_queue_item", "set_queue_item_priority"].includes(node.name.getText(tree))) selected.push(`globalThis.${node.name.getText(tree)} = ${node.initializer.getText(tree)};`);
  ts.forEachChild(node, visit);
}
visit(tree);
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const calculations = { exports: {} };
vm.runInNewContext(compile(readFileSync("spacetime/src/queue-calculations.ts", "utf8")), { module: calculations, exports: calculations.exports });

function fixture(allowed = true) {
  const rows = new Map();
  for (const [id, position, status, pin, next, room] of [
    ["playing", 0, "playing", false, false, "r"],
    ["pin", 0, "queued", true, false, "r"],
    ["old-next", 8, "queued", false, true, "r"],
    ["chosen", 10, "queued", false, false, "r"],
    ["other-room", 0, "queued", false, true, "other"],
  ]) rows.set(id, { queue_item_id: id, position, status, is_pinned: pin, is_play_next: next, room_id: room });
  const table = { queue_item_id: { find: id => rows.get(id) }, delete: item => rows.delete(item.queue_item_id), insert: item => (rows.set(item.queue_item_id, item), item) };
  let id = 0;
  const ctx = { db: { live_queue_item: table }, newUuidV7: () => `added-${++id}` };
  const type = { default() { return this; } };
  const actions = new Set();
  const scope = vm.createContext({
    t: new Proxy({}, { get: () => () => type }), spacetimedb: { reducer: (_, fn) => fn },
    calculatePlayNextQueuePosition: calculations.exports.calculatePlayNextQueuePosition,
    queuedQueueItems: (_, room) => [...rows.values()].filter(row => row.room_id === room && row.status === "queued").sort((a,b) => a.position-b.position),
    getAuthorizedQueueManager: () => allowed ? {} : null,
    getAuthorizedQueueAddActor: () => allowed ? {} : null,
    findKnownProblemQueueItem: () => undefined, findDuplicateActiveQueueItem: () => undefined,
    recommendationContext: () => ({}), nowMs: () => 1,
    claimRecommendationAction: (_, { actionId }) => actions.has(actionId) ? false : (actions.add(actionId), true),
    normalizeDurationSeconds: value => value, normalizeSourceType: value => value,
    recordQueueRecommendationEvent() {}, recordRoomError() {},
  });
  vm.runInContext(compile(selected.join("\n")), scope);
  const base = { room_id: "r", actor_member_id: "owner", client_action_id: "action", is_play_next: true, is_pinned: false };
  return { rows,
    order: () => [...rows.values()].filter(row => row.room_id === "r" && row.status === "queued").sort((a,b) => a.position-b.position).map(row => row.queue_item_id),
    next: id => scope.set_queue_item_priority(ctx, { ...base, queue_item_id: id }),
    add: () => scope.add_queue_item(ctx, { ...base, allow_duplicate: true, source_url: "https://youtube.com/watch?v=fixture0001", source_type: "youtube", source_title: "Repeat" }),
  };
}

test("existing Next moves ahead of pins/old flags and repeated Next keeps it first", () => {
  const f = fixture(); f.next("chosen"); f.next("chosen");
  assert.deepEqual(f.order(), ["chosen", "pin", "old-next"]);
  assert.equal(f.rows.get("old-next").is_play_next, false);
  assert.equal(f.rows.get("pin").is_pinned, true);
  assert.equal(f.rows.get("playing").status, "playing");
  assert.equal(f.rows.get("other-room").is_play_next, true);
});
test("Add next creates the first upcoming occurrence and action retries do not duplicate it", () => {
  const f = fixture(); f.add(); f.add();
  assert.deepEqual(f.order(), ["added-1", "pin", "old-next", "chosen"]);
  assert.equal(f.rows.get("old-next").is_play_next, false);
});
test("denied Next actions leave ordering and flags unchanged", () => {
  const f = fixture(false); const before = JSON.stringify([...f.rows]);
  f.next("chosen"); f.add();
  assert.equal(JSON.stringify([...f.rows]), before);
});
