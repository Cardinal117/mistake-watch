import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../../lib/recommendations/personal-feedback-copy.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const { personalFeedbackCopy, defaultPersonalFeedbackCopy } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

const personalizedCopy = {
  snooze: "Fokof vir 7 dae",
  exclude: "Fok nee, vat die kak weg",
};
const accountId = "account-a";
const eligibleAccount = {
  status: "signed-in",
  accountStatus: "active",
  personalFeedbackStyle: "af-casual",
  id: accountId,
};
const ownedPersonalRoom = {
  kind: "personal",
  currentMember: { role: "host", userId: accountId },
};

test("eligible account gets its requested copy in its own Personal room", () => {
  assert.deepEqual(
    personalFeedbackCopy(eligibleAccount, ownedPersonalRoom),
    personalizedCopy,
  );
});

test("personalized copy requires every account eligibility gate", () => {
  for (const account of [
    { status: "guest" },
    { ...eligibleAccount, accountStatus: "disabled" },
    { ...eligibleAccount, personalFeedbackStyle: undefined },
    { ...eligibleAccount, personalFeedbackStyle: "other-style" },
  ]) {
    assert.deepEqual(
      personalFeedbackCopy(account, ownedPersonalRoom),
      defaultPersonalFeedbackCopy,
    );
  }
});

test("personalized copy requires the account's own host membership in Personal", () => {
  for (const room of [
    { ...ownedPersonalRoom, kind: "shared" },
    { ...ownedPersonalRoom, kind: "themed" },
    { ...ownedPersonalRoom, kind: "legacy" },
    { ...ownedPersonalRoom, currentMember: null },
    {
      ...ownedPersonalRoom,
      currentMember: { role: "guest", userId: accountId },
    },
    {
      ...ownedPersonalRoom,
      currentMember: { role: "host", userId: "account-b" },
    },
    { ...ownedPersonalRoom, currentMember: { role: "host" } },
  ]) {
    assert.deepEqual(
      personalFeedbackCopy(eligibleAccount, room),
      defaultPersonalFeedbackCopy,
    );
  }
});
