import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const allowedId = "00000000-0000-4000-8000-000000000001";
function summary({
  id = allowedId,
  status = "active",
  google = true,
  config = allowedId,
} = {}) {
  const exports = {};
  function load(file) {
    const target = {};
    vm.runInNewContext(
      ts.transpileModule(
        readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        },
      ).outputText,
      {
        exports: target,
        process: { env: { COMPACT_PLAYBACK_ACCOUNT_IDS: config } },
        require: () => ({}),
      },
    );
    return target;
  }
  const source =
    readFileSync(
      new URL("../../lib/account/server.ts", import.meta.url),
      "utf8",
    ) +
    '\nensureProfileForUser = async () => ({ id: "' +
    id +
    '", account_status: "' +
    status +
    '", role: "owner" });';
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      process: { env: { COMPACT_PLAYBACK_ACCOUNT_IDS: config } },
      require(name) {
        if (name.endsWith("compact-playback"))
          return load("lib/account/compact-playback.ts");
        if (name === "@/lib/supabase")
          return {
            createSupabaseServerClient: async () => ({
              auth: {
                getUser: async () => ({
                  data: {
                    user: {
                      id,
                      identities: google ? [{ provider: "google" }] : [],
                      user_metadata: {
                        canUseCompactPlayback: true,
                        provider: "google",
                      },
                    },
                  },
                }),
              },
            }),
          };
        return {};
      },
    },
  );
  return exports.getAccountSummary();
}
test("only active allowlisted Google identities receive compact capability", async () => {
  assert.equal((await summary()).canUseCompactPlayback, true);
  for (const input of [
    { status: "disabled" },
    { google: false },
    { config: "" },
    { id: "00000000-0000-4000-8000-000000000002" },
  ]) {
    assert.equal((await summary(input)).canUseCompactPlayback, false);
  }
});
