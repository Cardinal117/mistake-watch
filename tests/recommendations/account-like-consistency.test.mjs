import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function load(file, overrides = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = (name) => {
    if (name in overrides) return overrides[name];
    if (name === "server-only") return {};
    if (name.startsWith("."))
      return load(path.resolve(path.dirname(file), name + ".ts"), overrides);
    throw new Error(`Unexpected dependency ${name}`);
  };
  new Function("require", "exports", source)(require, exports);
  return exports;
}

function fixture({ live = [], rows = [] } = {}) {
  const calls = [];
  const admin = {
    from(table) {
      let start = 0,
        end = 999,
        account;
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          if (key === "user_id") account = value;
          return q;
        },
        order() {
          return q;
        },
        limit(n) {
          end = n - 1;
          return q;
        },
        range(a, b) {
          start = a;
          end = b;
          return q;
        },
        then(resolve) {
          calls.push({ table, account, start, end });
          return Promise.resolve({
            data: rows
              .filter((r) => r.user_id === account)
              .slice(start, end + 1),
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
  const service = load("lib/recommendations/preference-service.ts", {
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => admin },
    "./room-preference-bridge": { readRoomMediaPreferences: async () => live },
  });
  return {
    read: (accountUserId) =>
      service.listAuthorizedPreferences({
        accountUserId,
        catalogueScope: "none",
        memberId: "member",
        roomId: "room",
      }),
    calls,
  };
}
const row = (liked, time, id = "vlrN8Mso-6Y") => ({
  user_id: "owner",
  media_id: id,
  source_type: "youtube",
  preference_state: liked ? "liked" : "neutral",
  source_event_at: new Date(time).toISOString(),
});
const live = (liked, time) => ({
  liked,
  updatedAtMs: time,
  mediaId: "vlrN8Mso-6Y",
  sourceType: "youtube",
  revision: 7,
});

for (const liked of [true, false])
  test(`newer account ${liked ? "Like" : "unlike"} beats stale room with local CAS retained`, async () => {
    const f = fixture({ live: [live(!liked, 1000)], rows: [row(liked, 2000)] });
    const [result] = await f.read("owner");
    assert.equal(result.liked, liked);
    assert.equal(result.revision, 7);
  });
test("newer unpersisted room intent wins and another account cannot read durable Likes", async () => {
  assert.equal(
    (
      await fixture({
        live: [live(false, 3000)],
        rows: [row(true, 2000)],
      }).read("owner")
    )[0].liked,
    false,
  );
  assert.equal(
    (await fixture({ rows: [row(true, 2000)] }).read("someone-else")).length,
    0,
  );
});

test("a live account Like older than neutral retention cannot resurrect a pruned unlike", async () => {
  const f = fixture({ live: [live(true, Date.now() - 31 * 86400000)] });
  const [account] = await f.read("owner");
  assert.equal(account.liked, false);
  assert.equal(account.revision, 7);
  assert.equal((await f.read(null))[0].liked, true);
  assert.equal(
    (
      await fixture({ live: [live(true, Date.now() - 29 * 86400000)] }).read(
        "owner",
      )
    )[0].liked,
    true,
  );
});
test("account preference read includes 1,251 Likes beyond former cap and REST default", async () => {
  const rows = Array.from({ length: 1251 }, (_, i) =>
    row(true, 2000, `video${String(i).padStart(6, "0")}`),
  );
  const f = fixture({ rows });
  assert.equal((await f.read("owner")).length, 1251);
  assert.ok(f.calls.every((c) => c.account === "owner"));
});

function table(key) {
  const rows = new Map();
  return {
    [key]: { find: (id) => rows.get(id) },
    iter: () => rows.values(),
    insert: (r) => (rows.set(r[key], r), r),
    delete: (r) => rows.delete(r[key]),
  };
}
test("trusted same-state intent reasserts once while CAS and old-client no-op remain", () => {
  const events = load("spacetime/src/recommendation-events.ts", {
    "./recommendation-tables": {
      RECOMMENDATION_EVENT_SCHEMA_VERSION: 1,
      RECOMMENDATION_GUEST_PREFERENCE_MEMBER_LIMIT: 1000,
      RECOMMENDATION_OUTBOX_ROOM_LIMIT: 5000,
    },
    "./recommendation-policy": {},
    "./room-keys": {},
  });
  let id = 0;
  const ctx = {
    newUuidV7: () => String(++id),
    db: {
      recommendation_room_session: table("room_id"),
      guest_media_preference: table("preference_key"),
      recommendation_event_outbox: table("idempotency_key"),
      recommendation_processed_action: table("action_key"),
    },
  };
  const input = {
    actorMemberId: "member",
    roomId: "room",
    sourceType: "youtube",
    mediaId: "vlrN8Mso-6Y",
    liked: true,
    expectedRevision: 0,
  };
  events.setGuestMediaPreference(ctx, input, 1000n);
  const asserted = events.setGuestMediaPreference(
    ctx,
    { ...input, expectedRevision: 1, reassertIntent: true },
    3000n,
  );
  assert.equal(asserted.revision, 2);
  assert.equal([...ctx.db.recommendation_event_outbox.iter()].length, 2);
  events.setGuestMediaPreference(
    ctx,
    { ...input, expectedRevision: 1, reassertIntent: true },
    4000n,
  );
  events.setGuestMediaPreference(ctx, { ...input, expectedRevision: 2 }, 5000n);
  assert.equal([...ctx.db.recommendation_event_outbox.iter()].length, 2);
});

function hookFixture({ deferWrites = false } = {}) {
  const values = [],
    effects = [],
    pending = [],
    writes = [],
    mutationResults = [];
  let cursor = 0;
  const react = {
    useState(init) {
      const i = cursor++;
      if (!(i in values)) values[i] = init;
      return [
        values[i],
        (v) => (values[i] = typeof v === "function" ? v(values[i]) : v),
      ];
    },
    useRef(init) {
      const i = cursor++;
      return (values[i] ??= { current: init });
    },
    useMemo(fn) {
      return fn();
    },
    useCallback(fn) {
      return fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const previous = values[i];
      if (!previous || deps.some((v, j) => v !== previous.deps[j]))
        effects.push(() => {
          previous?.cleanup?.();
          values[i] = { deps, cleanup: fn() };
        });
    },
  };
  const client = {
    fetchRoomMediaPreferences: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject })),
    queueItemRecommendationIdentity: () => ({
      mediaId: "vlrN8Mso-6Y",
      sourceType: "youtube",
    }),
    updateRoomMediaPreference: async (input) => {
      writes.push(input);
      if (deferWrites)
        return new Promise((resolve) => mutationResults.push(resolve));
      return { ...input, mediaKey: "youtube:vlrN8Mso-6Y", revision: 1 };
    },
    PreferenceReadError: class extends Error {},
    PreferenceMutationError: class extends Error {},
  };
  const hook = load("lib/recommendations/use-media-preferences.ts", {
    react,
    "./room-client": client,
  });
  globalThis.window = {
    setInterval: () => 1,
    clearInterval() {},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  return {
    pending,
    writes,
    mutationResults,
    render(identityKey = "owner") {
      cursor = 0;
      const result = hook.useMediaPreferences({
        allowUploaded: false,
        roomId: "room",
        identityKey,
      });
      while (effects.length) effects.shift()();
      return result;
    },
  };
}
test("initial preference loading and failure cannot send an accidental Like", async () => {
  const f = hookFixture();
  let controller = f.render();
  assert.equal(controller.getPreference({}).available, false);
  await controller.togglePreference({});
  assert.equal(f.writes.length, 0);
  f.pending[0].reject(new Error("offline"));
  await new Promise((resolve) => setImmediate(resolve));
  controller = f.render();
  assert.equal(controller.getPreference({}).available, false);
  assert.match(controller.getPreference({}).error, /unavailable/i);
});
test("same-room identity switch hides old Likes and discards the old request", async () => {
  const f = hookFixture();
  f.render();
  f.render("other");
  f.pending[0].resolve([
    { ...live(true, 1000), mediaKey: "youtube:vlrN8Mso-6Y" },
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.render("other").getPreference({}).loaded, false);
  assert.equal(f.pending.length, 2);
  f.pending[1].resolve([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.render("other").getPreference({}).liked, false);
});

test("settled mutation clears pending and a switched identity rejects old write response", async () => {
  const f = hookFixture({ deferWrites: true });
  f.render();
  f.pending[0].resolve([]);
  await new Promise((resolve) => setImmediate(resolve));
  const write = f.render().togglePreference({});
  assert.equal(f.render().getPreference({}).pending, true);
  f.mutationResults[0]({
    ...live(true, 1000),
    mediaKey: "youtube:vlrN8Mso-6Y",
  });
  await write;
  assert.equal(f.render().getPreference({}).pending, false);
  const staleWrite = f.render().togglePreference({});
  f.render("other");
  f.pending[1].resolve([]);
  await new Promise((resolve) => setImmediate(resolve));
  f.mutationResults[1]({
    ...live(true, 2000),
    mediaKey: "youtube:vlrN8Mso-6Y",
  });
  await staleWrite;
  assert.equal(f.render("other").getPreference({}).liked, false);
  assert.equal(f.render("other").getPreference({}).pending, false);
});

test("a callback retained from the previous account cannot start a write", async () => {
  const f = hookFixture();
  f.render();
  f.pending[0].resolve([]);
  await new Promise((resolve) => setImmediate(resolve));
  const old = f.render();
  f.render("other");
  await old.togglePreference({});
  assert.equal(f.writes.length, 0);
});

test("loaded neutral state beats stale catalogue fallback when toggling", async () => {
  const f = hookFixture();
  f.render();
  f.pending[0].resolve([]);
  await new Promise((resolve) => setImmediate(resolve));
  await f.render().togglePreference({}, true);
  assert.equal(f.writes[0].liked, true);
});
