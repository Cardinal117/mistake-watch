import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as avatars from "../../lib/identity/avatars.ts";

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL("../../lib/spacetime/live-room/snapshot.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
);
const exported = {};
new Function("exports", "require", outputText)(exported, (id) => {
  assert.equal(id, "@/lib/identity/avatars");
  return avatars;
});

function displayedQueue({ live, saved, role = "guest" }) {
  const room = {
    participantsList: [{ id: "member", permissions: { queue: saved } }],
  };
  const snapshot = {
    participants: [
      {
        memberId: "member",
        role,
        displayName: "QA participant",
        status: "online",
      },
    ],
    permissions:
      live === undefined ? [] : [{ memberId: "member", canAddQueue: live }],
    session: { hostMemberId: "host" },
  };
  return exported.mapLiveParticipants(room, snapshot)[0].permissions;
}

test("Live queue revocation overrides an older saved grant so the toggle can grant it again", () => {
  const permissions = displayedQueue({ live: false, saved: true });
  assert.equal(permissions.queue, false);
  assert.equal(permissions.manageQueue, false);
  assert.equal(displayedQueue({ live: true, saved: false }).queue, true);
});

test("Missing live permission still uses the saved fallback and host authority stays explicit", () => {
  assert.equal(displayedQueue({ live: undefined, saved: true }).queue, true);
  assert.equal(displayedQueue({ live: undefined, saved: false }).queue, false);
  assert.equal(
    displayedQueue({ live: false, saved: false, role: "host" }).queue,
    true,
  );
});
