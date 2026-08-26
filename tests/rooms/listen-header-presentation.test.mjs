import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-header-"));
const sourcePath = path.join(
  rootDir,
  "components/room/listen/header/header-presentation.ts",
);
const outputPath = path.join(tempDir, "header-presentation.mjs");

test.before(async () => {
  const source = await readFile(sourcePath, "utf8");

  await writeFile(
    outputPath,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath,
    }).outputText,
  );
});

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function participant(id, status = "online") {
  return { id, status };
}

test("owner, member, and guest header actions preserve room authority", async () => {
  const { deriveListenHeaderPresentation } = await import(
    pathToFileURL(outputPath)
  );

  assert.deepEqual(
    deriveListenHeaderPresentation({
      canManageAuthority: true,
      participants: [participant("owner")],
    }).actions,
    { canOpenAudience: true, canSaveRoom: true },
  );
  assert.deepEqual(
    deriveListenHeaderPresentation({
      canManageAuthority: false,
      participants: [participant("member")],
    }).actions,
    { canOpenAudience: true, canSaveRoom: false },
  );
  assert.deepEqual(
    deriveListenHeaderPresentation({
      canManageAuthority: false,
      participants: [participant("guest")],
    }).actions,
    { canOpenAudience: true, canSaveRoom: false },
  );
});

test("participant entry keeps online avatars and counts the remaining population", async () => {
  const { deriveListenHeaderPresentation } = await import(
    pathToFileURL(outputPath)
  );
  const presentation = deriveListenHeaderPresentation({
    canManageAuthority: false,
    maxVisibleParticipants: 3,
    participants: [
      participant("owner"),
      participant("member-1"),
      participant("member-2"),
      participant("member-3"),
      participant("idle-member", "idle"),
    ],
  });

  assert.deepEqual(
    presentation.visibleParticipants.map(({ id }) => id),
    ["owner", "member-1", "member-2"],
  );
  assert.equal(presentation.hiddenParticipantCount, 2);
  assert.equal(presentation.onlineParticipantCount, 4);
  assert.equal(presentation.totalParticipantCount, 5);
});

test("empty rooms expose neither an audience trigger nor an overflow count", async () => {
  const { deriveListenHeaderPresentation } = await import(
    pathToFileURL(outputPath)
  );
  const presentation = deriveListenHeaderPresentation({
    canManageAuthority: true,
    participants: [],
  });

  assert.equal(presentation.actions.canOpenAudience, false);
  assert.equal(presentation.hiddenParticipantCount, 0);
  assert.deepEqual(presentation.visibleParticipants, []);
});
