import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { expect, test, type BrowserContext } from "@playwright/test";

const qa = process.env.PERSONAL_ROOM_QA === "1" ? test : test.skip;
qa(
  "Temporary guest/account flow, recovery, expiry and cleanup",
  async ({ browser }) => {
    test.setTimeout(180_000);
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
      const profile = await admin
        .from("profiles")
        .update({ display_name: label })
        .eq("id", data.user.id);
      if (profile.error) throw profile.error;
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

    const created: string[] = [];
    function sql(statement: string) {
      const result = spawnSync(
        "docker",
        [
          "exec",
          "-i",
          "supabase_db_mistake-watch-task028",
          "psql",
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-At",
        ],
        { input: statement, encoding: "utf8" },
      );
      if (result.status !== 0) throw new Error(result.stderr);
      return result.stdout;
    }
    try {
      const credentials = await account("Temporary account");
      const accountPage = await device(credentials, true);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      contexts.push(context);
      await context.addInitScript(() =>
        localStorage.setItem("mw_dashboard_first_run_dismissed", "true"),
      );
      const desktop = await context.newPage();
      desktop.setDefaultTimeout(15000);
      await desktop.goto("http://127.0.0.1:5384/");
      const details = desktop
        .locator("details")
        .filter({ has: desktop.getByText("Temporary room", { exact: true }) });
      await details.locator("summary").click();
      await details
        .getByLabel("Room name", { exact: true })
        .fill("Temporary guest QA");
      await details.getByLabel("Your display name").fill("Guest host");
      await details
        .getByRole("button", { name: "Create Room", exact: true })
        .click();
      await desktop.waitForURL(/\/rooms\//);
      const roomId = new URL(desktop.url()).pathname.split("/").pop()!;
      created.push(roomId);
      expect(roomId).toMatch(/^[a-f0-9-]{36}$/);
      const url = `http://127.0.0.1:5384/rooms/${roomId}`;
      expect(
        (
          await admin
            .from("rooms")
            .select("room_kind")
            .eq("id", roomId)
            .single()
        ).data?.room_kind,
      ).toBe("temporary");
      await accountPage.goto(url);
      await accountPage.getByLabel("Display name").fill("Account guest");
      await accountPage
        .getByRole("button", { name: "Join Room", exact: true })
        .click();
      await expect(
        accountPage.getByRole("button", { name: "More", exact: true }),
      ).toBeVisible();
      await accountPage
        .getByRole("button", { name: "More", exact: true })
        .click();
      await accountPage
        .getByRole("button", { name: "Room Invites and saved room" })
        .click();
      await expect(
        accountPage.getByText("Rejoin within one hour", { exact: false }),
      ).toBeVisible();
      await expect(
        accountPage.getByText("Save this room", { exact: true }),
      ).toHaveCount(0);
      await accountPage.screenshot({
        path: ".tmp/temporary-mobile.png",
        fullPage: true,
      });
      expect(
        await accountPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await accountPage.setViewportSize({ width: 844, height: 390 });
      await accountPage
        .getByText("Rejoin within one hour", { exact: false })
        .scrollIntoViewIfNeeded();
      await accountPage.screenshot({
        path: ".tmp/temporary-landscape.png",
        fullPage: true,
      });
      await desktop
        .getByRole("button", { name: "Add media", exact: true })
        .click();
      await desktop
        .getByPlaceholder("YouTube, playlist, direct video, or HLS URL")
        .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
      await desktop
        .getByRole("button", { name: "Load Now", exact: true })
        .click();
      await expect(desktop.locator("video,audio").first()).toBeAttached();
      await desktop.getByRole("tab", { name: "Listen", exact: true }).click();
      await expect(
        desktop.getByText("Temporary listening starts", { exact: false }),
      ).toBeVisible();
      await desktop.screenshot({
        path: ".tmp/temporary-desktop.png",
        fullPage: true,
      });
      const response = await accountPage.request.get(
        `http://127.0.0.1:5384/api/youtube/recommendations?roomId=${roomId}&kind=recommended&query=test`,
      );
      expect((await response.json()).items).toEqual([]);
      // Close both active views before controlled clock manipulation.
      await desktop.goto("http://127.0.0.1:5384/");
      await accountPage.goto("http://127.0.0.1:5384/");
      sql(
        `update private.temporary_room_lifecycle set last_activity_at=now()-interval '59 minutes' where room_id='${roomId}';`,
      );
      await desktop.reload();
      expect(
        sql(
          `select last_activity_at<now()-interval '58 minutes' from private.temporary_room_lifecycle where room_id='${roomId}';`,
        ).trim(),
      ).toBe("t");
      await desktop.goto(url);
      await expect(
        desktop.getByText("Temporary listening starts", { exact: false }),
      ).toBeVisible();
      expect(
        sql(
          `select last_activity_at>now()-interval '1 minute' from private.temporary_room_lifecycle where room_id='${roomId}';`,
        ).trim(),
      ).toBe("t");
      sql(
        `update private.temporary_room_lifecycle set last_activity_at=now()-interval '61 minutes' where room_id='${roomId}';select private.close_expired_temporary_rooms();`,
      );
      await desktop.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(
        desktop.getByText("This Temporary room has ended.", { exact: false }),
      ).toBeVisible();
      await expect(desktop).not.toHaveURL(/\/rooms\//);
      expect(
        (await admin.from("rooms").select("status").eq("id", roomId).single())
          .data?.status,
      ).toBe("closed");
      await expect
        .poll(() =>
          sql(
            `select live_retired from private.temporary_room_lifecycle where room_id='${roomId}';`,
          ).trim(),
        )
        .toBe("t");
      await accountPage.goto(url);
      await expect(accountPage).not.toHaveURL(/\/rooms\//);
      await expect(
        accountPage.getByText("This Temporary room has ended.", {
          exact: false,
        }),
      ).toBeVisible();
      sql(
        `update private.temporary_room_lifecycle set closed_at=now()-interval '25 hours' where room_id='${roomId}';`,
      );
      await desktop.reload();
      await expect
        .poll(
          async () =>
            (await admin.from("rooms").select("id").eq("id", roomId)).data,
        )
        .toEqual([]);
      await accountPage.goto(url);
      await expect(
        accountPage.getByText("This Temporary room has ended.", {
          exact: false,
        }),
      ).toBeVisible();
      await accountPage.setViewportSize({ width: 390, height: 844 });
      const expiryHeading = accountPage.getByRole("heading", {
        name: "This Temporary room has ended.",
      });
      const headingBox = await expiryHeading.boundingBox();
      expect(headingBox!.y).toBeGreaterThanOrEqual(64);
      expect(headingBox!.y + headingBox!.height).toBeLessThan(844);
      await accountPage.screenshot({
        path: ".tmp/temporary-expired-mobile.png",
      });
      await accountPage
        .getByRole("button", { name: "Dismiss room notice" })
        .click();
      await expect(expiryHeading).toHaveCount(0);
      // Active accounts can also create through the same actual form.
      await accountPage.goto("http://127.0.0.1:5384/");
      const second = accountPage.locator("details").filter({
        has: accountPage.getByText("Temporary room", { exact: true }),
      });
      await second.locator("summary").click();
      await second
        .getByLabel("Room name", { exact: true })
        .fill("Temporary account QA");
      await second.getByLabel("Your display name").fill("Account owner");
      await second
        .getByRole("button", { name: "Create Room", exact: true })
        .click();
      await accountPage.waitForURL(/\/rooms\//);
      const secondId = new URL(accountPage.url()).pathname.split("/").pop()!;
      created.push(secondId);
      expect(
        (
          await admin
            .from("rooms")
            .select("owner_user_id")
            .eq("id", secondId)
            .single()
        ).data?.owner_user_id,
      ).toBe(credentials.id);
    } finally {
      await Promise.allSettled(contexts.map((c) => c.close()));
      for (const id of created)
        await admin
          .from("rooms")
          .delete()
          .eq("id", id)
          .eq("room_kind", "temporary");
      for (const id of users) await admin.auth.admin.deleteUser(id);
    }
  },
);
