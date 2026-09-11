import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { expect, test } from "@playwright/test";

const qa = process.env.PERSONAL_DISCOVER_LOCAL_QA === "1" ? test : test.skip;
qa(
  "Actual Personal route reads completed counts and persists owner-only feedback across reloads",
  async ({ browser }) => {
    test.setTimeout(150_000);
    const env = Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => {
          const at = line.indexOf("=");
          return [line.slice(0, at), line.slice(at + 1)];
        }),
    );
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:55421");
    expect(process.env.PLAYWRIGHT_BASE_URL).toBe("http://127.0.0.1:5387");
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
    );
    const email = `discover-${randomUUID()}@example.test`;
    const password = `Discover-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Discover local QA" },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;
    const context = await browser.newContext({
      viewport: { width: 1680, height: 960 },
    });
    try {
      const cookies: Array<{ name: string; value: string }> = [];
      const auth = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          cookies: {
            getAll: () => cookies,
            setAll: (items) => {
              cookies.splice(0, cookies.length, ...items);
            },
          },
        },
      );
      expect(
        (await auth.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      await context.addCookies(
        cookies.map((c) => ({
          ...c,
          domain: "127.0.0.1",
          path: "/",
          sameSite: "Lax" as const,
          secure: false,
        })),
      );
      await context.addInitScript(() =>
        localStorage.setItem("mw_dashboard_first_run_dismissed", "true"),
      );
      const page = await context.newPage();
      await page.goto("/");
      await page
        .getByRole("button", { name: "Open Personal room", exact: true })
        .click();
      await page.waitForURL(/\/rooms\//);
      const roomId = new URL(page.url()).pathname.split("/").at(-1)!;
      await expect(
        page.getByRole("heading", { name: "Your regulars", exact: true }),
      ).toBeVisible();
      const member = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .single();
      expect(member.error).toBeNull();
      const mediaId = "M7lc1UVf-VE";
      const stamp = new Date().toISOString();
      const occurrence = randomUUID();
      // Synthetic trusted-store fixture, never evidence of a person listening.
      const events = await admin.from("recommendation_events").insert(
        [0, 1, 2].map((n) => ({
          authority_event_id: randomUUID(),
          idempotency_key: randomUUID(),
          schema_version: 1,
          event_type: "playback_completed",
          room_id: roomId,
          room_session_id: "task029-local-qa",
          actor_member_id: member.data!.id,
          account_user_id: userId,
          source_type: "youtube",
          media_id: mediaId,
          playback_occurrence_id: n < 2 ? occurrence : randomUUID(),
          occurred_at: new Date(Date.now() - 10 * 86400000).toISOString(),
          ingested_at: stamp,
          expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
        })),
      );
      expect(events.error).toBeNull();
      const like = await admin.from("media_preferences").insert({
        user_id: userId,
        source_type: "youtube",
        media_id: mediaId,
        preference_state: "liked",
        revision: 1,
        source_event_id: randomUUID(),
        source_event_at: stamp,
      });
      expect(like.error).toBeNull();
      await page.reload();
      const preferenceResponse = await context.request.get(
        `/api/recommendations/preferences?roomId=${roomId}`,
      );
      expect(await preferenceResponse.json()).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({ mediaId, liked: true }),
        ]),
      });
      await expect(
        page
          .locator(".personal-regular-preview")
          .getByText("2 recorded plays", { exact: true }),
      ).toBeVisible({ timeout: 30000 });
      const card = page.locator(
        `.personal-regular[data-media-id="${mediaId}"]`,
      );
      await card.getByRole("button", { name: /Show actions/ }).click();
      await expect(card.locator(".personal-like")).toHaveAttribute(
        "aria-pressed",
        "true",
        { timeout: 15000 },
      );
      await card.getByRole("button", { name: /More options/ }).click();
      await page
        .getByRole("menuitem", {
          name: "Don't suggest this track",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: "Undo", exact: true }),
      ).toBeVisible();
      await expect(card).toHaveCount(0);
      await page.reload();
      await expect(
        page.getByText("Suggestion controls · 1 hidden"),
      ).toBeVisible();
      await page.getByText("Suggestion controls · 1 hidden").click();
      await page
        .getByRole("button", { name: "Allow suggestions again" })
        .click();
      await expect(
        page.getByText("2 recorded plays", { exact: true }),
      ).toBeVisible({ timeout: 30000 });
      const anonymous = await browser.newContext();
      try {
        expect(
          (
            await anonymous.request.get(
              `/api/recommendations/discover?roomId=${roomId}`,
            )
          ).status(),
        ).toBeGreaterThanOrEqual(400);
      } finally {
        await anonymous.close();
      }
      await page.screenshot({
        path: ".tmp/recommendation-baseline/actual-personal-route.png",
      });
    } finally {
      await context.close();
      expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
    }
  },
);
