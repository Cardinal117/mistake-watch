import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../../lib/queue/move-intent.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const { projectQueueMove, queuePlacement, canonicalQueuePlacement } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const initial = [
  { id: "now", status: "now" },
  ..."abcd"
    .split("")
    .map((id) => ({
      id,
      status: "queued",
      isPinned: id === "b",
      isPlayNext: id === "c",
    })),
  { id: "past", status: "played" },
];
test("pending additions never become authoritative move anchors or move targets", () => {
  const rows = ["a", "pending:x", "b", "c"].map(id => ({ id, status: "queued", pendingAdd: id.startsWith("pending:") ? "sending" : undefined }));
  assert.deepEqual(canonicalQueuePlacement(rows, "c", 1), { position: 1, placement: { edge: "before", anchorQueueItemId: "b" } });
  assert.deepEqual(canonicalQueuePlacement(rows, "a", 2), { position: 1, placement: { edge: "before", anchorQueueItemId: "c" } });
  assert.equal(canonicalQueuePlacement(rows, "pending:x", 0), null);
});
const order = (items) => items.map((i) => i.id).join(",");
const intent = (id, position) => ({
  id,
  actionId: id,
  ...queuePlacement(["a", "b", "c", "d"], id, position),
});
test("pending projection uses latest identities without changing canonical playback or flags", () => {
  const remote = projectQueueMove(initial, intent("a", 3));
  const visible = projectQueueMove(remote, intent("d", 1));
  assert.equal(order(visible), "now,d,b,c,a,past");
  assert.equal(order(initial), "now,a,b,c,d,past");
  assert.equal(visible[0], initial[0]);
  assert.equal(visible.at(-1), initial.at(-1));
  assert.equal(visible.find((i) => i.id === "b").isPinned, true);
  assert.equal(visible.find((i) => i.id === "c").isPlayNext, true);
});
test("missing source or anchor and automatic advance never resurrect a queued item", () => {
  const move = intent("d", 1);
  for (const current of [
    initial.filter((i) => i.id !== "d"),
    initial.filter((i) => i.id !== "b"),
    initial.map((i) => (i.id === "d" ? { ...i, status: "now" } : i)),
  ])
    assert.equal(projectQueueMove(current, move), current);
});
test("remaining pending actions rebase independently after one settles", () => {
  const first = intent("d", 0),
    second = intent("c", 3);
  const all = [first, second].reduce(projectQueueMove, initial);
  assert.equal(order(all), "now,d,a,b,c,past");
  assert.equal(
    order([second].reduce(projectQueueMove, initial)),
    "now,a,b,d,c,past",
  );
});
test("move edges and invalid sources are explicit", () => {
  assert.deepEqual(queuePlacement(["a", "b"], "b", -10), { edge: "start" });
  assert.deepEqual(queuePlacement(["a", "b"], "a", 99), { edge: "end" });
  assert.equal(queuePlacement(["a"], "z", 0), null);
  assert.equal(queuePlacement(["a"], "a", NaN), null);
});
