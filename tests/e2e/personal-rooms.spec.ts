import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { expect, test, type BrowserContext } from "@playwright/test";

const qa = process.env.PERSONAL_ROOM_QA === "1" ? test : test.skip;
qa(
  "Personal entry isolates accounts and preserves one live membership across devices",
  async ({ browser }) => {
    test.setTimeout(120_000);
    const env = Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i), line.slice(i + 1)];
        }),
    );
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:55421");
    expect(process.env.PLAYWRIGHT_BASE_URL).toBe("http://127.0.0.1:5384");
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
    );
    const contexts: BrowserContext[] = [];
    const users: string[] = [];
    async function account(label: string) {
      const email = `task028-${label.replaceAll(" ", "-")}-${randomBytes(8).toString("hex")}@qa.example.test`;
      const password = randomBytes(24).toString("hex");
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: label },
      });
      if (error || !data.user) throw error;
      users.push(data.user.id);
      return { email, password, id: data.user.id };
    }
    async function device(
      credentials: { email: string; password: string },
      mobile = false,
    ) {
      const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
      });
      context.setDefaultTimeout(15000);
      contexts.push(context);
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
      const { error } = await auth.auth.signInWithPassword(credentials);
      if (error) throw error;
      await context.addCookies(
        cookies.map(({ name, value }) => ({
          name,
          value,
          domain: "127.0.0.1",
          path: "/",
          sameSite: "Lax" as const,
          secure: false,
        })),
      );
      await context.addInitScript(() =>
        localStorage.setItem("mw_dashboard_first_run_dismissed", "true"),
      );
      return context.newPage();
    }
    try {
      const owner = await account("Personal QA owner");
      const other = await account("Unrelated QA account");
      const desktop = await device(owner);
      const mobile = await device(owner, true);
      const outsider = await device(other);
      await Promise.all([
        desktop.goto("http://127.0.0.1:5384/"),
        mobile.goto("http://127.0.0.1:5384/"),
      ]);
      await Promise.all([
        desktop
          .getByRole("button", { name: "Open Personal room", exact: true })
          .click(),
        mobile
          .getByRole("button", { name: "Open Personal room", exact: true })
          .click(),
      ]);
      await Promise.all([
        desktop.waitForURL(/\/rooms\//),
        mobile.waitForURL(/\/rooms\//),
      ]);
      expect(desktop.url()).toBe(mobile.url());
      const roomId = new URL(desktop.url()).pathname.split("/").at(-1)!;
      await expect(
        mobile.getByRole("tab", { name: "Watch", exact: true }),
      ).toBeEnabled({ timeout: 20000 });
      await expect(
        desktop.getByRole("tab", { name: "Listen", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      expect(
        (await admin.from("room_members").select("id").eq("room_id", roomId))
          .data,
      ).toHaveLength(1);
      await expect(desktop.getByText("Invite", { exact: true })).toHaveCount(0);
      await mobile.getByRole("button", { name: "Add", exact: true }).click();
      await mobile
        .getByPlaceholder(
          "YouTube, YouTube Music, playlist, direct audio, or HLS URL",
        )
        .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
      await mobile
        .getByRole("button", { name: "Load Now", exact: true })
        .click();
      await mobile.getByRole("button", { name: "Home", exact: true }).click();
      await mobile
        .getByRole("button", { name: "Play", exact: true })
        .first()
        .click();
      await expect(mobile.locator("video,audio").first()).toBeAttached({
        timeout: 10000,
      });
      await expect
        .poll(
          async () =>
            mobile
              .locator("video,audio")
              .first()
              .evaluate((el: HTMLMediaElement) => el.currentTime),
          { timeout: 15000 },
        )
        .toBeGreaterThan(1);
      await expect
        .poll(
          async () =>
            desktop
              .locator("video,audio")
              .first()
              .evaluate((el: HTMLMediaElement) => el.currentTime),
          { timeout: 15000 },
        )
        .toBeGreaterThan(1);
      await mobile
        .getByRole("button", { name: "Pause", exact: true })
        .first()
        .click();
      await expect(desktop.locator("video,audio").first()).toHaveJSProperty(
        "paused",
        true,
      );
      await expect(mobile.locator("video,audio").first()).toHaveJSProperty(
        "paused",
        true,
      );
      const beforeSwitch = await mobile
        .locator("video,audio")
        .first()
        .evaluate((el: HTMLMediaElement) => el.currentTime);
      await mobile.getByRole("button", { name: "Social", exact: true }).click();
      await expect(
        mobile.getByText("Invite people", { exact: true }),
      ).toHaveCount(0);
      await mobile.getByRole("button", { name: "Home", exact: true }).click();
      const volume = desktop.getByRole("slider", {
        name: "Volume",
        exact: true,
      });
      await volume.press("Home");
      await volume.press("ArrowRight");
      const storedVolume = await volume.inputValue();
      // Wait across the normal account heartbeat before changing presentation.
      await mobile.waitForTimeout(21000);
      await expect(
        mobile.getByRole("tab", { name: "Watch", exact: true }),
      ).toBeEnabled();
      await mobile.getByRole("tab", { name: "Watch", exact: true }).click();
      await expect(desktop.locator(".watch-redesign")).toBeVisible({
        timeout: 15000,
      });
      await expect(mobile.locator(".watch-redesign")).toBeVisible();
      await expect(
        desktop.getByRole("slider", { name: "Volume", exact: true }),
      ).toHaveValue(storedVolume);
      await expect(mobile.locator("video").first()).toHaveJSProperty(
        "paused",
        true,
      );
      await expect
        .poll(async () =>
          mobile
            .locator("video")
            .first()
            .evaluate((el: HTMLMediaElement) => el.currentTime),
        )
        .toBeGreaterThanOrEqual(Math.max(0, beforeSwitch - 0.75));
      await mobile.getByRole("button", { name: "Home", exact: true }).click();
      await mobile.screenshot({ path: ".tmp/personal-watch-player-390.png" });
      await mobile.screenshot({ path: ".tmp/personal-watch-390.png" });
      await desktop.screenshot({ path: ".tmp/personal-watch-1440.png" });
      await mobile.setViewportSize({ width: 844, height: 390 });
      await mobile.screenshot({ path: ".tmp/personal-watch-landscape.png" });
      expect(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await mobile.setViewportSize({ width: 390, height: 844 });
      const stored = await admin
        .from("rooms")
        .select("mode,is_saved,idle_deadline_at")
        .eq("id", roomId)
        .single();
      expect(stored.data?.mode).toBe("watch");
      expect(stored.data?.is_saved).toBe(false);
      expect(stored.data?.idle_deadline_at).toBeNull();
      // Direct access and valid room identifiers never substitute for owning account identity.
      await outsider.goto(
        `http://127.0.0.1:5384/rooms/${roomId}?invite=forged`,
      );
      await expect(outsider).not.toHaveURL(/\/rooms\//);
      const grant = await outsider.request.post(
        `http://127.0.0.1:5384/api/rooms/${roomId}/live-admission`,
        { data: { identityHex: "a".repeat(64) } },
      );
      expect(grant.status()).toBe(403);
      const provider = await outsider.request.get(
        `http://127.0.0.1:5384/api/youtube/search?roomId=${roomId}&q=fixture`,
      );
      expect([401, 403]).toContain(provider.status());
      const recommendations = await outsider.request.post(
        "http://127.0.0.1:5384/api/recommendations/room",
        { data: { roomId, revision: "qa", candidates: [] } },
      );
      expect(recommendations.status()).toBe(403);
      const accountRooms = await outsider.request.get(
        "http://127.0.0.1:5384/api/account/rooms",
      );
      expect(JSON.stringify(await accountRooms.json())).not.toContain(roomId);
      // Log out one device; the other remains authorized. Resume preserves the chosen mode.
      await mobile.context().clearCookies();
      await mobile.reload();
      await expect(mobile).not.toHaveURL(/\/rooms\//);
      await expect(desktop.locator(".watch-redesign")).toBeVisible();
      await expect(
        mobile.getByText("This room is unavailable to this session.", {
          exact: false,
        }),
      ).toBeVisible();
      await mobile.screenshot({ path: ".tmp/personal-signed-out-390.png" });
      // Terminal closure is verified after media/learning checks; never resurrect its UUID.
      expect(
        (await admin.from("room_members").select("id").eq("room_id", roomId))
          .data,
      ).toHaveLength(1);
      expect(
        await desktop.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      // Follow a real queue action from live authority through the durable outbox.
      await desktop
        .getByRole("button", { name: "Add media", exact: true })
        .click();
      await desktop
        .getByPlaceholder("YouTube, playlist, direct video, or HLS URL")
        .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
      await desktop
        .getByRole("button", { name: "Add to Queue", exact: true })
        .click();
      await expect
        .poll(
          async () => {
            const drain = await desktop.request.post(
              "http://127.0.0.1:5384/api/recommendations/drain",
            );
            expect(drain.status()).toBe(200);
            const events = await admin
              .from("recommendation_events")
              .select("id")
              .eq("room_id", roomId)
              .eq("event_type", "queue_added");
            if (events.error) throw events.error;
            return events.data?.length ?? 0;
          },
          { timeout: 20000 },
        )
        .toBe(1);
      const learned = await admin.rpc("read_room_learning_aggregates", {
        target_room: roomId,
        target_account: owner.id,
      });
      expect(learned.error).toBeNull();
      expect(
        learned.data.filter(
          (r: { scope_type: string }) => r.scope_type === "account",
        )[0].queue_added_count,
      ).toBe(1);
      for (let attempt = 0; attempt < 2; attempt++) {
        const ranked = await desktop.request.post(
          "http://127.0.0.1:5384/api/recommendations/room",
          {
            data: {
              roomId,
              revision: "policy-qa",
              limit: 8,
              queuedMedia: [],
              recentHistory: [],
              candidates: [
                {
                  candidateId: "qa-candidate",
                  sourceType: "youtube",
                  mediaId: "qa283video",
                  title: "Local metadata fixture",
                },
              ],
            },
          },
        );
        expect(ranked.status()).toBe(200);
        expect(await ranked.json()).toMatchObject({
          status: "available",
          cache: "miss",
        });
      }
      await admin
        .from("rooms")
        .update({ status: "closed", close_reason: "manual_cleanup" })
        .eq("id", roomId);
      await desktop.goto("http://127.0.0.1:5384/");
      await desktop
        .getByRole("button", { name: "Open Personal room", exact: true })
        .click();
      await expect(
        desktop
          .getByRole("region", { name: "Personal room", exact: true })
          .getByRole("alert"),
      ).toContainText("unavailable");
      await desktop.screenshot({ path: ".tmp/personal-retry-1440.png" });
      const reopen = await admin
        .from("rooms")
        .update({ status: "open", close_reason: null })
        .eq("id", roomId);
      expect(reopen.error?.code).toBe("23514");
      await desktop
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(
        desktop
          .getByRole("region", { name: "Personal room", exact: true })
          .getByRole("alert"),
      ).toContainText("unavailable");
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
      await Promise.all(users.map((id) => admin.auth.admin.deleteUser(id)));
    }
  },
);
