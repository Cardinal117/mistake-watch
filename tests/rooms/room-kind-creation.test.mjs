import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");

function fixture() {
  const created = [];
  const stubs = {
    "next/navigation": {
      redirect: (url) => {
        throw new Error(`redirect:${url}`);
      },
    },
    "next/headers": { cookies: async () => ({ set() {} }) },
    "@/lib/account": {
      getAccountSummary: async () => ({ status: "signed-out" }),
    },
    "@/lib/identity": {
      createGuestHostedRoom: async (input) => {
        created.push(input);
        return {
          room: { id: "legacy" },
          token: "fixture",
          tokenCookieName: "fixture",
        };
      },
    },
    "./invite": { buildRoomInvitePath: () => "/rooms/legacy" },
  };
  function load(file) {
    const exports = {};
    const code = ts.transpileModule(
      readFileSync(path.join(root, file), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    vm.runInNewContext(code, {
      exports,
      Date,
      FormData,
      process: { env: { NODE_ENV: "test" } },
      require(name) {
      if(name === "next/dist/client/components/redirect-error") return {isRedirectError:()=>false};
        if (name in stubs) return stubs[name];
        if (name === "./kind") return load("lib/rooms/kind.ts");
        return {};
      },
    });
    return exports;
  }
  return { action: load("lib/rooms/actions.ts").createRoomAction, created };
}

for (const kind of [undefined, "legacy"]) {
  test(`old create-room contract still creates Legacy (${kind ?? "omitted"})`, async () => {
    const { action, created } = fixture();
    const form = new FormData();
    form.set("room-name", "Friday night");
    form.set("display-name", "Guest");
    form.set("room-mode", "listen");
    if (kind) form.set("room-kind", kind);
    await assert.rejects(action(form), /redirect:\/rooms\/legacy/);
    assert.equal(created.length, 1);
    assert.equal(created[0].mode, "listen");
  });
}

for (const kind of [
  "personal",
  "shared",
  "themed",
  "temporary",
  "public",
  "",
  "LEGACY",
]) {
  test(`create-room rejects unsupported kind ${JSON.stringify(kind)} before writes`, async () => {
    const { action, created } = fixture();
    const form = new FormData();
    form.set("room-name", "Friday night");
    form.set("display-name", "Guest");
    form.set("room-kind", kind);
    form.set("room-mode", "watch");
    await assert.rejects(action(form), /redirect:\/\?error=/);
    assert.equal(created.length, 0);
  });
}
