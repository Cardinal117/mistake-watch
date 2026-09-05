import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function command({
  sourceType = "direct",
  status = "ended",
  position = 120,
  role = "host",
  admitted = true,
} = {}) {
  const sent = [];
  const snapshot = {
    session: {
      sourceType,
      status,
      positionSeconds: 120,
      sourceDurationSeconds: 120,
    },
    participants: [],
    permissions: [],
    kicks: [],
    queue: [],
    participantPresences: admitted
      ? [{ admissionId: "fixture", memberId: "member", status: "online" }]
      : [],
  };
  const root = process.cwd();
  function load(relative) {
    const mod = { exports: {} };
    vm.runInNewContext(
      ts.transpileModule(readFileSync(path.join(root, relative), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: relative,
      }).outputText,
      {
        module: mod,
        exports: mod.exports,
        require(spec) {
          if (spec === "react")
            return { useMemo: (fn) => fn(), useEffect() {} };
          if (spec === "./live-room/use-room-connection")
            return {
              useRoomConnection: () => ({
                snapshot,
                admissionId: "fixture",
                reducers: { setPlaybackState: (value) => sent.push(value) },
              }),
            };
          if (spec === "./live-room/admission")
            return load("lib/spacetime/live-room/admission.ts");
          if (spec === "./live-room/snapshot")
            return { mapLiveParticipants: () => [] };
          if (
            [
              "@/lib/rooms/actions",
              "@/lib/media/uploaded-playback-reference",
              "@/lib/media/uploaded-room-session-client",
              "@/lib/player/next-item-preparation",
            ].includes(spec)
          )
            return {};
          throw new Error(`Unexpected dependency ${spec}`);
        },
      },
    );
    return mod.exports;
  }
  const live = load("lib/spacetime/use-live-room.ts").useLiveRoom({
    id: "room",
    currentMember: { id: "member", role },
  });
  live.setPlaybackState({ positionSeconds: position, status: "playing" });
  return sent;
}

for (const sourceType of ["direct", "hls"]) {
  test(`${sourceType}: Play after completion restarts through canonical room authority`, () => {
    const sent = command({ sourceType });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].positionSeconds, 0);
    assert.equal(sent[0].status, "playing");
    assert.equal(sent[0].actorMemberId, "member");
  });
}

test("an explicit earlier seek after completion preserves its requested position", () => {
  assert.equal(command({ position: 30 })[0].positionSeconds, 30);
});
test("ordinary pause/resume preserves its requested position", () => {
  assert.equal(
    command({ status: "paused", position: 60 })[0].positionSeconds,
    60,
  );
});
test("YouTube commands retain existing behavior", () => {
  assert.equal(command({ sourceType: "youtube" })[0].positionSeconds, 120);
});
test("replay cannot bypass guest permissions or missing live admission", () => {
  assert.equal(command({ role: "guest" }).length, 0);
  assert.equal(command({ admitted: false }).length, 0);
});
