import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { hasLiveRoomAdmission } from "../../lib/spacetime/live-room/admission.ts";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (file) => readFile(path.join(root, file), "utf8");
const [
  indexSource,
  participationSource,
  participantStateSource,
  tableSource,
  admissionSource,
  serverSource,
  clientSource,
  recommendationSource,
] = await Promise.all([
  read("spacetime/src/index.ts"),
  read("spacetime/src/room-participation.ts"),
  read("spacetime/src/room-participant-state.ts"),
  read("spacetime/src/room-tables.ts"),
  read("spacetime/src/room-admission.ts"),
  read("lib/rooms/live-admission.ts"),
  read("lib/spacetime/use-live-room.ts"),
  read("spacetime/src/recommendation-authority.ts"),
]);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("admission grants and live sessions remain private", () => {
  for (const [start, end] of [
    [
      "export const roomParticipantSession",
      "export const roomParticipantPresence",
    ],
    ["export const roomAdmissionGrant", "export const trustedSeedIssuer"],
  ]) {
    const table = sectionBetween(tableSource, start, end);
    assert.doesNotMatch(table, /public:\s*true/);
  }

  const presence = sectionBetween(
    tableSource,
    "export const roomParticipantPresence",
    "export const roomPermission",
  );
  assert.match(presence, /public:\s*true/);
  assert.doesNotMatch(
    presence,
    /admission_token|identity|connection_id|authorization_kind|user_id|email/,
  );
});

test("trusted issuer creates bounded identity-bound grants", () => {
  const reducer = sectionBetween(
    participationSource,
    "export const issue_room_admission_grant",
    "export const join_room",
  );
  assert.ok(
    reducer.indexOf("!isTrustedRecommendationAuthority(ctx)") <
      reducer.indexOf("ctx.db.room_admission_grant.insert"),
  );
  assert.match(reducer, /identity_hex/);
  assert.match(reducer, /expires_ms <= now/);
  assert.match(reducer, /ADMISSION_GRANT_MEMBER_LIMIT/);
  assert.match(reducer, /grant\.expires_ms < now/);
});

test("first admission validates and consumes a one-time grant", () => {
  const reducer = sectionBetween(
    participationSource,
    "export const join_room",
    "export const leave_room",
  );
  const validate = reducer.indexOf("getValidRoomAdmissionGrant");
  const consume = reducer.indexOf(
    "ctx.db.room_admission_grant.delete(admissionGrant)",
  );
  const insert = reducer.indexOf("ctx.db.room_participant_session.insert");

  assert.ok(validate >= 0 && validate < consume);
  assert.ok(consume < insert);
  assert.match(reducer, /code: "admission_denied"/);
  assert.match(reducer, /isCurrentParticipantSession/);
  assert.doesNotMatch(reducer, /member_identity_conflict/);
  assert.match(reducer, /avatar_key: normalizeAvatarKey\(avatar_key\)/);
  assert.match(reducer, /display_name/);
});

test("grant validation binds room, member, role, identity, expiry, and token", () => {
  assert.match(admissionSource, /grant\.admission_id !== claim\.admissionId/);
  assert.match(admissionSource, /grant\.room_id !== claim\.roomId/);
  assert.match(admissionSource, /grant\.member_id !== claim\.memberId/);
  assert.match(admissionSource, /grant\.role !== claim\.role/);
  assert.match(
    admissionSource,
    /grant\.identity_hex !== senderIdentityHex\(ctx\)/,
  );
  assert.match(admissionSource, /grant\.expires_ms < nowMs\(\)/);
  assert.match(admissionSource, /constantTimeStringEqual/);
});

test("mutation and guest preference authority use the private live session", () => {
  assert.match(participantStateSource, /return isCurrentParticipantSession\(/);
  assert.match(recommendationSource, /isCurrentParticipantSession\(/);
  assert.match(recommendationSource, /participantSessionKey\(/);
  assert.doesNotMatch(
    sectionBetween(
      recommendationSource,
      "export const set_guest_media_preference",
      "export const set_verified_room_media_preference",
    ),
    /actor\.identity\.isEqual\(ctx\.sender\)/,
  );
});

test("server admission revalidates durable account or guest membership", () => {
  assert.match(serverSource, /getAccountSummary\(\)/);
  assert.match(serverSource, /account\.accountStatus !== "active"/);
  assert.match(serverSource, /\.eq\("status", "open"\)/);
  assert.match(serverSource, /\.eq\("user_id", account\.id\)/);
  assert.match(serverSource, /reclaimGuestMembership/);
  assert.match(serverSource, /SPACETIME_SERVER_AUTH_TOKEN/);
  assert.match(serverSource, /randomBytes\(TOKEN_BYTES\)/);
  assert.doesNotMatch(serverSource, /getSession\(/);
});

test("current-browser receipt is required before controls become authoritative", () => {
  assert.match(clientSource, /hasLiveRoomAdmission/);
  assert.match(clientSource, /hasCurrentLiveAuthority &&/);
  assert.match(
    clientSource,
    /currentMember\?\.role === "host" && hasCurrentLiveAuthority/,
  );

  const presences = [
    {
      admissionId: "browser-a",
      memberId: "member-1",
      status: "online",
    },
    {
      admissionId: "browser-b",
      memberId: "member-1",
      status: "online",
    },
  ];

  assert.equal(
    hasLiveRoomAdmission({
      admissionId: "browser-b",
      memberId: "member-1",
      presences,
    }),
    true,
  );
  assert.equal(
    hasLiveRoomAdmission({
      admissionId: "missing",
      memberId: "member-1",
      presences,
    }),
    false,
  );
  assert.equal(
    hasLiveRoomAdmission({
      admissionId: "browser-a",
      memberId: "other-member",
      presences,
    }),
    false,
  );
});
