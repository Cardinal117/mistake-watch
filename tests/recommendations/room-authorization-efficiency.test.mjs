import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("account recommendation authorization validates account identity once per request", async () => {
  let identityReads = 0;
  let accountLoads = 0;
  let accountLoadOptions;
  let accessAccount;
  const account = {
    accountStatus: "active",
    id: "owner",
    isAnonymous: false,
    role: "owner",
    status: "signed-in",
  };
  const admin = {
    from(table) {
      const query = {
        eq() {
          return query;
        },
        maybeSingle: async () => ({
          data:
            table === "rooms"
              ? {
                  id: "room-1",
                  mode: "listen",
                  owner_user_id: "owner",
                  room_kind: "personal",
                  status: "open",
                }
              : { id: "member-1" },
          error: null,
        }),
        select() {
          return query;
        },
      };
      return query;
    },
  };
  class Cache {
    get() {
      return { value: undefined };
    }
    set() {}
  }
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("lib/recommendations/room-authorization.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      require(name) {
        if (name === "server-only") return {};
        if (name === "@/lib/account/server")
          return {
            getAccountSummary: async () => {
              identityReads++;
              return account;
            },
            getAccountSummaryForVerifiedUser: async (_user, options) => {
              accountLoads++;
              accountLoadOptions = options;
              return account;
            },
          };
        if (name === "@/lib/rooms/personal-access")
          return {
            canAccessAccountRoom: async (_room, suppliedAccount) => {
              accessAccount = suppliedAccount;
              return true;
            },
          };
        if (name === "@/lib/media/uploaded-catalogue-access")
          return {
            getUploadedCatalogueAccess: async () => ({
              allowed: true,
              scope: "owner",
            }),
          };
        if (name === "@/lib/supabase")
          return {
            createSupabaseAdminClient: () => admin,
            createSupabaseServerClient: async () => ({
              auth: {
                getUser: async () => {
                  identityReads++;
                  return {
                    data: {
                      user: { id: "owner", is_anonymous: false },
                    },
                    error: null,
                  };
                },
              },
            }),
          };
        if (name === "./bounded-cache") return { BoundedTtlCache: Cache };
        if (name === "./request-budget")
          return {
            consumeFixedWindowRequest: () => ({
              allowed: true,
              state: {},
              ttlMs: 60_000,
            }),
            recommendationRequestLimits: { "recommendation-read": 100 },
          };
        if (name === "next/headers") return { cookies: async () => new Map() };
        if (name === "@/lib/identity") return {};
        return {};
      },
    },
  );

  const result = await exports.requireRecommendationRoomAccess(
    "room-1",
    "recommendation-read",
  );

  assert.equal(result.ok, true);
  assert.equal(identityReads, 1);
  assert.equal(accountLoads, 1);
  assert.equal(accountLoadOptions.requireExistingProfile, true);
  assert.equal(accessAccount, account);
  assert.equal(result.access.accountUserId, "owner");
});
