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
  path.join(tmpdir(), "mistake-watch-delivery-policy-"),
);
const sourcePath = path.join(rootDir, "lib/media/catalogue-delivery-policy.ts");
const outputPath = path.join(tempDir, "catalogue-delivery-policy.mjs");
const output = ts.transpileModule(await readFile(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;

await writeFile(outputPath, output);
const { canDeliverCatalogueAsset } = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const owner = {
  accountStatus: "active",
  id: "owner-1",
  role: "owner",
  status: "signed-in",
};
const member = {
  accountStatus: "active",
  id: "member-1",
  role: "member",
  status: "signed-in",
};
const publicAsset = {
  ownerUserId: "owner-1",
  posterReady: true,
  status: "ready",
  visibility: "public",
};

test("catalogue delivery requires an authorized signed-in account", () => {
  assert.equal(
    canDeliverCatalogueAsset({
      account: { status: "guest" },
      asset: publicAsset,
      catalogueAllowed: true,
      kind: "content",
    }),
    false,
  );
  assert.equal(
    canDeliverCatalogueAsset({
      account: member,
      asset: publicAsset,
      catalogueAllowed: false,
      kind: "content",
    }),
    false,
  );
});

test("allowlisted members can deliver public assets but not owner-only assets", () => {
  assert.equal(
    canDeliverCatalogueAsset({
      account: member,
      asset: publicAsset,
      catalogueAllowed: true,
      kind: "content",
    }),
    true,
  );
  assert.equal(
    canDeliverCatalogueAsset({
      account: member,
      asset: { ...publicAsset, visibility: "owner_only" },
      catalogueAllowed: true,
      kind: "content",
    }),
    false,
  );
});

test("the active owner can deliver their owner-only asset", () => {
  assert.equal(
    canDeliverCatalogueAsset({
      account: owner,
      asset: { ...publicAsset, visibility: "owner_only" },
      catalogueAllowed: true,
      kind: "content",
    }),
    true,
  );
});

test("content and poster readiness are checked independently", () => {
  assert.equal(
    canDeliverCatalogueAsset({
      account: owner,
      asset: { ...publicAsset, status: "processing" },
      catalogueAllowed: true,
      kind: "content",
    }),
    false,
  );
  assert.equal(
    canDeliverCatalogueAsset({
      account: owner,
      asset: { ...publicAsset, posterReady: false },
      catalogueAllowed: true,
      kind: "poster",
    }),
    false,
  );
});

test("client asset mapping never exposes stored permanent URLs or object keys", async () => {
  const sharedSource = await readFile(
    path.join(rootDir, "lib/media/shared.ts"),
    "utf8",
  );
  const uploadSource = await readFile(
    path.join(rootDir, "lib/media/uploads/create.ts"),
    "utf8",
  );
  const contentRoute = await readFile(
    path.join(rootDir, "app/api/media/assets/[assetId]/content/route.ts"),
    "utf8",
  );

  assert.doesNotMatch(sharedSource, /asset\.public_url/);
  assert.doesNotMatch(sharedSource, /thumbnailObjectKey:/);
  assert.doesNotMatch(uploadSource, /publicUrl/);
  const responseBlock = uploadSource.slice(
    uploadSource.lastIndexOf("return {"),
  );
  assert.doesNotMatch(responseBlock, /\bobjectKey\b/);
  assert.match(contentRoute, /getCatalogueAssetDelivery/);
  assert.match(contentRoute, /createPresignedR2GetUrl/);
  assert.match(contentRoute, /Cache-Control.*private, no-store/s);
});
