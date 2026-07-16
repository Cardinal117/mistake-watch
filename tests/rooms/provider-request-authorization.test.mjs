import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const guardSource = await readFile(
  path.join(rootDir, "lib/rooms/request-guards.ts"),
  "utf8",
);

test("provider request authorization accepts account-backed room members", () => {
  assert.match(guardSource, /createSupabaseServerClient/);
  assert.match(guardSource, /serverClient\.auth\.getUser\(\)/);
  assert.match(guardSource, /\.eq\("status", "open"\)/);
  assert.match(guardSource, /\.from\("room_members"\)/);
  assert.match(guardSource, /\.eq\("user_id", data\.user\.id\)/);
  assert.match(guardSource, /memberId: accountMemberId/);
});

test("provider request authorization retains guest membership fallback", () => {
  assert.match(guardSource, /getGuestIdentityCookieName\(roomId\)/);
  assert.match(guardSource, /reclaimGuestMembership\(\{ roomId, token \}\)/);
  assert.match(guardSource, /memberId: session\.member\.id/);
});

test("all quota-bearing YouTube routes use the shared room-member guard", async () => {
  const routePaths = [
    "app/api/youtube/search/route.ts",
    "app/api/youtube/playlist/route.ts",
    "app/api/youtube/recommendations/route.ts",
  ];

  for (const routePath of routePaths) {
    const routeSource = await readFile(path.join(rootDir, routePath), "utf8");
    assert.match(routeSource, /requireRoomMemberRequestContext/);
  }
});
