import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { readSourceTree } from "../helpers/read-source-tree.mjs";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-uploaded-catalogue-policy-"),
);
const sourcePath = path.join(rootDir, "lib/media/uploaded-catalogue-policy.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "uploaded-catalogue-policy.mjs");

await writeFile(sourceModulePath, sourceJs);

const { canAccessUploadedCatalogue } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const guestAccount = { status: "guest" };
const activeMemberAccount = {
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
const activeAuthorization = {
  status: "active",
  user_id: "member-1",
};

test("guests cannot access uploaded catalogue content", () => {
  assert.deepEqual(canAccessUploadedCatalogue(guestAccount, null), {
    allowed: false,
    reason: "guest",
    scope: "none",
  });
});

test("signed-in non-allowlisted users cannot access uploaded catalogue content", () => {
  assert.deepEqual(canAccessUploadedCatalogue(activeMemberAccount, null), {
    allowed: false,
    reason: "not_allowlisted",
    scope: "none",
  });
});

test("active owners can access the uploaded catalogue without an allowlist row", () => {
  assert.deepEqual(canAccessUploadedCatalogue(activeOwnerAccount, null), {
    allowed: true,
    reason: "active_owner",
    scope: "owner",
  });
});

test("disabled owner accounts cannot access the uploaded catalogue", () => {
  assert.deepEqual(
    canAccessUploadedCatalogue(disabledOwnerAccount, {
      status: "active",
      user_id: "owner-1",
    }),
    {
      allowed: false,
      reason: "disabled_account",
      scope: "none",
    },
  );
});

test("active allowlist rows grant uploaded catalogue access", () => {
  assert.deepEqual(
    canAccessUploadedCatalogue(activeMemberAccount, activeAuthorization),
    {
      allowed: true,
      reason: "active_allowlist",
      scope: "allowlisted",
    },
  );
});

test("revoked allowlist rows do not grant uploaded catalogue access", () => {
  assert.deepEqual(
    canAccessUploadedCatalogue(activeMemberAccount, {
      ...activeAuthorization,
      status: "revoked",
    }),
    {
      allowed: false,
      reason: "revoked_allowlist",
      scope: "none",
    },
  );
});

test("allowlist rows must belong to the current account", () => {
  assert.deepEqual(
    canAccessUploadedCatalogue(activeMemberAccount, {
      status: "active",
      user_id: "member-2",
    }),
    {
      allowed: false,
      reason: "not_allowlisted",
      scope: "none",
    },
  );
});

test("uploaded catalogue migration keeps allowlist app-owned and RLS enabled", async () => {
  const migrationSource = await readFile(
    path.join(
      rootDir,
      "supabase/migrations/20260709054334_uploaded_catalogue_authorization.sql",
    ),
    "utf8",
  );

  assert.match(migrationSource, /uploaded_catalogue_authorizations/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /revoke all on public\.uploaded_catalogue_authorizations/);
  assert.match(migrationSource, /to service_role/);
  assert.doesNotMatch(migrationSource, /to authenticated/);
  assert.doesNotMatch(migrationSource, /to anon/);
});

test("catalogue API and UI are wired through the uploaded catalogue access result", async () => {
  const assetsSource = await readFile(
    path.join(rootDir, "lib/media/assets.ts"),
    "utf8",
  );
  const watchLayoutSource = await readSourceTree(
    rootDir,
    "components/room/watch-mode-layout.tsx",
    "components/room/watch",
  );

  assert.match(assetsSource, /getUploadedCatalogueAccess/);
  assert.match(assetsSource, /canAccessUploadedCatalogue/);
  assert.match(watchLayoutSource, /No permission to access uploaded content/);
  assert.match(watchLayoutSource, /canAccessUploadedCatalogue/);
});
