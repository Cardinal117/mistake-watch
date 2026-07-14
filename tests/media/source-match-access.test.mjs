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
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-source-match-access-"),
);
const sourcePath = path.join(rootDir, "lib/media/source-match-access.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "source-match-access.mjs");

await writeFile(sourceModulePath, sourceJs);

const {
  canExposeSourceMatchedAsset,
  getSourceMatchVisibilityFilter,
  redactSourceMatchedAssetForResponse,
} = await import(pathToFileURL(sourceModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const guestAccount = { status: "guest" };
const memberAccount = {
  accountStatus: "active",
  id: "member-1",
  role: "member",
  status: "signed-in",
};
const activeOwnerAccount = {
  accountStatus: "active",
  id: "owner-1",
  role: "owner",
  status: "signed-in",
};
const disabledOwnerAccount = {
  accountStatus: "disabled",
  id: "owner-1",
  role: "owner",
  status: "signed-in",
};

const readyPublicAsset = {
  owner_user_id: "owner-1",
  status: "ready",
  visibility: "public",
};
const readyOwnerOnlyAsset = {
  owner_user_id: "owner-1",
  status: "ready",
  visibility: "owner_only",
};

test("guests can source-match ready public assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(readyPublicAsset, guestAccount),
    true,
  );
});

test("guests cannot source-match owner-only uploaded assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(readyOwnerOnlyAsset, guestAccount),
    false,
  );
});

test("signed-in non-owner members cannot source-match owner-only uploaded assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(readyOwnerOnlyAsset, memberAccount),
    false,
  );
});

test("active owners can source-match their own owner-only uploaded assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(readyOwnerOnlyAsset, activeOwnerAccount),
    true,
  );
});

test("active owners cannot source-match another owner's owner-only uploaded assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(
      { ...readyOwnerOnlyAsset, owner_user_id: "owner-2" },
      activeOwnerAccount,
    ),
    false,
  );
});

test("disabled owners cannot source-match owner-only uploaded assets", () => {
  assert.equal(
    canExposeSourceMatchedAsset(readyOwnerOnlyAsset, disabledOwnerAccount),
    false,
  );
});

test("non-ready public assets are not exposed through source matching", () => {
  assert.equal(
    canExposeSourceMatchedAsset(
      { ...readyPublicAsset, status: "processing" },
      guestAccount,
    ),
    false,
  );
});

test("visibility query filter is public-only unless the account is an active owner", () => {
  assert.deepEqual(getSourceMatchVisibilityFilter(guestAccount), {
    kind: "public",
  });
  assert.deepEqual(getSourceMatchVisibilityFilter(memberAccount), {
    kind: "public",
  });
  assert.deepEqual(getSourceMatchVisibilityFilter(disabledOwnerAccount), {
    kind: "public",
  });
  assert.deepEqual(getSourceMatchVisibilityFilter(activeOwnerAccount), {
    kind: "owner",
    ownerUserId: "owner-1",
  });
});

test("source-match response redaction removes storage object keys", () => {
  assert.deepEqual(
    redactSourceMatchedAssetForResponse({
      contentUrl: "/api/media/assets/asset-1/content",
      id: "asset-1",
      thumbnailUrl: "/api/media/assets/asset-1/poster",
      title: "Uploaded Video",
    }),
    {
      contentUrl: null,
      id: "asset-1",
      thumbnailUrl: null,
      title: "Uploaded Video",
    },
  );
});

test("source-match helper is wired through the access gate and response redaction", async () => {
  const sourceMatchServiceSource = await readFile(
    path.join(rootDir, "lib/media/source-matches/service.ts"),
    "utf8",
  );
  const assetsFacadeSource = await readFile(
    path.join(rootDir, "lib/media/assets.ts"),
    "utf8",
  );
  const routeSource = await readFile(
    path.join(rootDir, "app/api/media/source-matches/route.ts"),
    "utf8",
  );

  assert.match(sourceMatchServiceSource, /getSourceMatchVisibilityFilter/);
  assert.match(sourceMatchServiceSource, /canExposeSourceMatchedAsset/);
  assert.match(sourceMatchServiceSource, /redactSourceMatchedAssetForResponse/);
  assert.match(assetsFacadeSource, /findReadyMediaMatches/);
  assert.match(routeSource, /findReadyMediaMatches/);
});
