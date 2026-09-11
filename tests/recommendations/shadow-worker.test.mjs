import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { runShadowJob } = await loadRecommendationModule(
  "shadow-worker-core.ts",
);
const now = 1800000000000;
const id = "311c0000-0000-4000-8000-000000000011";
const token = "311c0000-0000-4000-8000-000000000012";
const account = "311c0000-0000-4000-8000-000000000013";
const snapshot = {
  mediaId: "abcdefghijk",
  title: "Song",
  channel: "Artist - Topic",
  durationSeconds: 100,
  expiresAt: now + 86400000,
};
const recording = {
  mbid: id,
  title: "Song",
  artistCredit: "Artist",
  disambiguation: "",
  lengthMs: 100000,
};
const claim = {
  jobId: id,
  token,
  leaseUntil: new Date(now + 30000).toISOString(),
  stage: "identity",
  snapshot,
  recording: null,
};
function fixture(changes = {}) {
  const calls = [],
    requests = [];
  const options = {
    enabled: true,
    account,
    now: () => now,
    deadline: now + 50000,
    store: {
      enqueue: async (a, n) => {
        calls.push(["enqueue", a, n]);
      },
      claim: async () => {
        calls.push(["claim"]);
        return claim;
      },
      complete: async (...args) => {
        calls.push(["complete", ...args]);
        return true;
      },
    },
    providers: {
      search: async () => {
        requests.push("search");
        return { status: "ready", complete: true, candidates: [recording] };
      },
      tags: async () => {
        requests.push("tags");
        return { status: "ready", data: ["rock"] };
      },
      audio: async () => {
        requests.push("audio");
        return { status: "missing" };
      },
    },
    ...changes,
  };
  return { calls, requests, options };
}
test("disabled or unconfigured worker has no database/provider effects", async () => {
  for (const changes of [{ enabled: false }, { account: "" }]) {
    const f = fixture(changes);
    await runShadowJob(f.options);
    assert.equal(f.calls.length, 0);
    assert.equal(f.requests.length, 0);
  }
});
test("one fresh identity claim completes provisional output under exact token", async () => {
  const f = fixture();
  await runShadowJob(f.options);
  assert.deepEqual(f.requests, ["search"]);
  assert.deepEqual(f.calls[0], ["enqueue", account, 5]);
  assert.equal(f.calls[2][1], id);
  assert.equal(f.calls[2][2], token);
  assert.equal(f.calls[2][3].status, "provisional");
});
test("bad and near-expiry claims never dispatch", async () => {
  for (const c of [
    { ...claim, token: "bad" },
    { ...claim, leaseUntil: new Date(now + 8000).toISOString() },
    { ...claim, snapshot: { ...snapshot, expiresAt: now } },
    { ...claim, stage: "audio", recording: null },
  ]) {
    const f = fixture();
    f.options.store.claim = async () => c;
    await runShadowJob(f.options);
    assert.deepEqual(f.requests, []);
  }
});
test("optional stage failure retries independently and never performs identity search", async () => {
  const f = fixture();
  f.options.store.claim = async () => ({ ...claim, stage: "audio", recording });
  f.options.providers.audio = async () => {
    throw Error("offline");
  };
  await runShadowJob(f.options);
  assert.equal(f.calls.at(-1)[3].status, "retry");
  assert.deepEqual(f.requests, []);
});
test("rejected late completion is not reported as completed or retried under another token", async () => {
  const f = fixture();
  let count = 0;
  f.options.store.complete = async () => {
    count++;
    return false;
  };
  assert.equal((await runShadowJob(f.options)).status, "stale");
  assert.equal(count, 1);
});
