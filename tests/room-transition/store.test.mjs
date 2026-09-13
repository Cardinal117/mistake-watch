import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(readFileSync("lib/room-transition/store.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module: mod, exports: mod.exports, Date, Set },
);
const create = mod.exports.createTransitionStore;
const facts = (mode = "listen", ready = true, epoch = 1) => ({
  roomId: "a",
  mode,
  ready,
  epoch,
});
function baseline() {
  const s = create();
  s.mounted("a", "listen", 1);
  s.observe(facts());
  return s;
}
test("optimistic mount and request success cannot replace confirmed mode", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.mounted("a", "watch", 1);
  s.settle(id);
  assert.ok(s.getSnapshot());
  s.observe(facts("watch"));
  assert.equal(s.getSnapshot(), null);
});
test("confirmation before request completion remains covered", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.observe(facts("watch"));
  s.mounted("a", "watch", 1);
  assert.ok(s.getSnapshot());
  s.settle(id);
  assert.equal(s.getSnapshot(), null);
});
test("destination must mount, optional media is not a gate", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.observe(facts("watch"));
  s.settle(id);
  assert.ok(s.getSnapshot());
  s.mounted("a", "watch", 1);
  assert.equal(s.getSnapshot(), null);
});
test("superseded request cannot settle or fail a newer navigation", () => {
  const s = baseline(),
    old = s.mode("watch");
  const newer = s.begin({
    kind: "navigation",
    path: "/",
    pending: false,
    label: "Leaving",
  });
  s.fail(old, "denied");
  s.settle(old);
  assert.equal(s.getSnapshot().id, newer);
  s.route("/");
  assert.equal(s.getSnapshot(), null);
});
test("remote mode changes require shell but no initiator promise", () => {
  const s = baseline();
  s.observe(facts("watch"));
  assert.ok(s.getSnapshot());
  s.mounted("a", "watch", 1);
  assert.equal(s.getSnapshot(), null);
});
test("reconnect rejects old epoch readiness", () => {
  const s = baseline();
  s.observe(facts("listen", false, 2));
  s.observe(facts("listen", true, 1));
  assert.ok(s.getSnapshot());
  s.observe(facts("listen", true, 2));
  s.mounted("a", "listen", 2);
  assert.equal(s.getSnapshot(), null);
});
test("error stays actionable despite matching snapshots", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.fail(id, "Denied");
  s.observe(facts("watch"));
  s.mounted("a", "watch", 1);
  assert.equal(s.getSnapshot().error, "Denied");
});
test("route handoff cannot be cancelled by outgoing form cleanup", () => {
  const s = create(),
    id = s.begin({ kind: "action", pending: true, label: "Joining" });
  s.observe(facts());
  s.releaseAction(id);
  assert.ok(s.getSnapshot());
  s.mounted("a", "listen", 1);
  assert.equal(s.getSnapshot(), null);
});
test("repeated local request cannot overlap an unresolved server write", () => {
  const s = baseline();
  s.mode("watch");
  assert.equal(s.mode("listen"), null);
});

test("a reconnect supersedes old requests and needs a shell from the new epoch", () => {
  const s = baseline(),
    old = s.mode("watch");
  s.observe(facts("listen", false, 2));
  const recovery = s.getSnapshot().id;
  s.settle(old);
  assert.equal(s.getSnapshot().id, recovery);
  s.observe(facts("listen", true, 2));
  assert.ok(s.getSnapshot());
  s.mounted("a", "listen", 1);
  assert.ok(s.getSnapshot());
  s.mounted("a", "listen", 2);
  assert.equal(s.getSnapshot(), null);
});
test("superseding presentation does not authorize overlapping writes", () => {
  const s = baseline(),
    old = s.mode("watch");
  s.observe(facts("listen", false, 2));
  assert.equal(s.mode("listen"), null);
  s.fail(old, "Old connection");
  assert.ok(s.mode("listen"));
});
test("confirmed newer remote mode supersedes a formerly confirmed local destination", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.observe(facts("watch"));
  s.observe(facts("listen"));
  s.settle(id);
  assert.equal(s.getSnapshot(), null);
});
test("mode permission failure does not inherit a connection retry", () => {
  const s = baseline(),
    id = s.mode("watch");
  s.observe({
    ...facts(),
    retry: () => {
      throw Error("Wrong recovery");
    },
  });
  s.fail(id, "Permission denied");
  assert.equal(s.getSnapshot().retry, undefined);
  assert.equal(s.getSnapshot().pending, false);
});
test("connection retry is exposed only on a terminal connection error", () => {
  const s = baseline(),
    retry = () => {};
  s.observe({ ...facts("listen", false), retry });
  assert.equal(s.getSnapshot().retry, undefined);
  s.observe({ ...facts("listen", false), retry, error: "Admission failed" });
  assert.equal(s.getSnapshot().retry, retry);
});
test("room B cannot complete using room A shell", () => {
  const s = baseline();
  s.begin({
    kind: "navigation",
    path: "/rooms/b",
    label: "Opening",
    pending: false,
  });
  s.observe({ ...facts(), roomId: "b" });
  assert.ok(s.getSnapshot());
  s.mounted("a", "listen", 1);
  assert.ok(s.getSnapshot());
  s.mounted("b", "listen", 1);
  assert.equal(s.getSnapshot(), null);
});
test("cancelled navigation ignores late completion and supports redirect", () => {
  const s = baseline();
  s.begin({
    kind: "navigation",
    path: "/rooms/deleted",
    label: "Opening",
    pending: false,
  });
  s.route("/");
  assert.equal(s.getSnapshot(), null);
});
