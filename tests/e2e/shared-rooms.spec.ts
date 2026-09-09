import { verifySharedPlayback } from "./support/shared-playback";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { expect, test, type BrowserContext } from "@playwright/test";

const qa = process.env.PERSONAL_ROOM_QA === "1" ? test : test.skip;
qa(
  "Shared invitations require approval, consent stays independent, and removal reaches both devices",
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

    try {
      console.log("QA: creating isolated accounts");
      const owner = await account("Shared QA owner");
      const friend = await account("Shared QA friend");
      const other = await account("Shared outsider");
      console.log("QA: opening account devices");
      const desktop = await device(owner);
      const mobile = await device(friend, true);
      const second = await device(friend);
      const outsider = await device(other);
      const signedOutContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      contexts.push(signedOutContext);
      const signedOut = await signedOutContext.newPage();
      console.log("QA: entering dashboard");
      await desktop.goto("http://127.0.0.1:5384/", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      console.log("QA: dashboard loaded");
      await desktop.getByLabel("Shared room name").fill("QA Shared evening");
      await desktop
        .getByRole("button", { name: "Create Shared room", exact: true })
        .click();
      await desktop.waitForURL(/\/rooms\//);
      const roomId = new URL(desktop.url()).pathname.split("/").pop()!;
      const { data: room, error } = await admin
        .from("rooms")
        .select("invite_code,room_kind")
        .eq("id", roomId)
        .single();
      if (error) throw error;
      expect(room.room_kind).toBe("shared");
      await admin
        .from("profiles")
        .update({ account_status: "disabled" })
        .eq("id", owner.id);
      const disabledList = await desktop.request.get(
        "http://127.0.0.1:5384/api/account/rooms",
      );
      expect(
        (await disabledList.json()).rooms.some(
          (r: { id: string }) => r.id === roomId,
        ),
      ).toBe(false);
      await admin
        .from("profiles")
        .update({ account_status: "active" })
        .eq("id", owner.id);
      const url = `http://127.0.0.1:5384/rooms/${roomId}`;
      const invite = `${url}?invite=${room.invite_code}`;
      await signedOut.goto(invite);
      await expect(
        signedOut.getByRole("heading", { name: "QA Shared evening" }),
      ).toBeVisible();
      await expect(
        signedOut.getByRole("button", { name: "Request to join" }),
      ).toHaveCount(0);
      await mobile.goto(invite);
      await mobile.getByRole("button", { name: "Request to join" }).click();
      await expect(mobile.getByRole("status")).toContainText(
        "waiting for the owner",
      );
      expect(
        (
          await mobile.request.post(
            `${url.replace("/rooms/", "/api/rooms/")}/live-admission`,
            { data: { identityHex: "a".repeat(64) } },
          )
        ).status(),
      ).toBe(403);
      // Approval must be reachable from the desktop header in either mode.
      await desktop
        .getByRole("button", { name: /Open audience panel/ })
        .click();
      const audience = desktop.getByRole("dialog", {
        name: "Room members and controls",
      });
      await expect(
        audience.getByRole("button", {
          name: "Approve Shared QA friend",
          exact: true,
        }),
      ).toBeVisible();
      await desktop.screenshot({ path: ".tmp/desktop-membership-listen.png" });
      for (const viewport of [
        { width: 1280, height: 600 },
        { width: 390, height: 844 },
      ]) {
        await desktop.setViewportSize(viewport);
        await audience
          .getByRole("button", {
            name: "Approve Shared QA friend",
            exact: true,
          })
          .scrollIntoViewIfNeeded();
        const bounds = await audience.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
        await expect(
          audience.getByRole("button", { name: "Close permissions" }),
        ).toBeInViewport();
        await expect(
          audience.getByRole("button", {
            name: "Approve Shared QA friend",
            exact: true,
          }),
        ).toBeInViewport();
        await desktop.screenshot({
          path: `.tmp/desktop-membership-${viewport.width}.png`,
        });
      }
      await desktop.setViewportSize({ width: 1440, height: 900 });
      await audience.getByRole("button", { name: "Close permissions" }).click();
      await desktop.getByRole("tab", { name: "Watch", exact: true }).click();
      await desktop
        .getByRole("button", { name: /Open audience panel/ })
        .click();
      await expect(
        audience.getByRole("button", {
          name: "Approve Shared QA friend",
          exact: true,
        }),
      ).toBeVisible();
      await desktop.screenshot({
        path: ".tmp/shared-before-approve.png",
        fullPage: true,
      });
      await desktop
        .getByRole("button", { name: "Approve Shared QA friend", exact: true })
        .click();
      await expect(
        desktop.getByText("Shared QA friend · approved", { exact: true }),
      ).toBeVisible();
      await audience.getByRole("button", { name: "Close permissions" }).click();
      await mobile.getByRole("button", { name: "Check approval" }).click();
      await expect(
        mobile.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      await second.goto(url);
      await second.getByRole("button", { name: /Open audience panel/ }).click();
      const memberAudience = second.getByRole("dialog", {
        name: "Room members and controls",
      });
      await expect(
        memberAudience.getByRole("checkbox", { name: /Use my choices/ }),
      ).toBeVisible();
      await expect(
        memberAudience.getByRole("heading", {
          name: "Requests & return access",
        }),
      ).toHaveCount(0);
      await expect(
        memberAudience.getByRole("button", {
          name: /^Approve |^Remove Shared/,
        }),
      ).toHaveCount(0);
      await memberAudience
        .getByRole("button", { name: "Close permissions" })
        .click();
      await expect(
        second.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      const membership = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", friend.id);
      expect(membership.data).toHaveLength(1);
      await verifySharedPlayback(desktop, mobile, second);
      const closeAndVerify = async () => {
        const accountPage = await desktop.context().newPage();
        await accountPage.goto("http://127.0.0.1:5384/");
        await accountPage
          .getByRole("button", { name: /account/i })
          .first()
          .click();
        await accountPage
          .getByRole("button", { name: "Rooms", exact: true })
          .click();
        await accountPage
          .getByRole("button", { name: "Close QA Shared evening", exact: true })
          .click();
        await accountPage
          .getByRole("button", { name: "Confirm Close", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              (
                await admin
                  .from("rooms")
                  .select("status")
                  .eq("id", roomId)
                  .single()
              ).data?.status,
          )
          .toBe("closed");
        console.log(
          "QA: room closed through account UI; existing sessions must now end",
        );
        try {
          await expect(second).not.toHaveURL(/\/rooms\//, { timeout: 75000 });
        } catch (error) {
          await second.screenshot({
            path: ".tmp/task028-7-close-participant.png",
          });
          const play = desktop
            .getByRole("button", { name: "Play", exact: true })
            .first();
          const canPlay = await play.isEnabled().catch(() => false);
          console.log("QA: post-close host play enabled:", canPlay);
          if (canPlay) {
            await play.click();
            await expect(
              second.locator("video,audio").first(),
            ).toHaveJSProperty("paused", false);
            console.log(
              "QA: post-close playback still propagated to admitted participant",
            );
          }
          throw error;
        }
        for (const page of [desktop, mobile, second]) {
          await expect(page).toHaveURL(/notice=room-ended/, { timeout: 15000 });
          await expect(
            page.getByRole("heading", {
              name: "This room has ended.",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator("video,audio")).toHaveCount(0);
        }
        await mobile.screenshot({ path: ".tmp/task028-r3-closed-mobile.png" });
        await second.goto(url);
        await expect(second).toHaveURL(/notice=room-ended/);
      };
      if (process.env.ROOM_CLOSE_QA === "1") {
        await closeAndVerify();
        return;
      }
      if (process.env.ROOM_DELETE_QA === "1") {
        const deleted = await admin.auth.admin.deleteUser(owner.id);
        expect(deleted.error).toBeNull();
        for (const page of [desktop, mobile, second]) {
          await expect(page).toHaveURL(/notice=room-ended/, { timeout: 75000 });
          await expect(
            page.getByRole("heading", {
              name: "This room has ended.",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator("video,audio")).toHaveCount(0);
        }
        await mobile.screenshot({ path: ".tmp/task028-r3-deleted-mobile.png" });
        await second.goto(url);
        await expect(second).toHaveURL(/notice=room-ended/);
        return;
      }

      await mobile.getByRole("button", { name: "Social", exact: true }).click();
      const contribution = mobile.getByRole("checkbox", {
        name: "Use my choices in this room",
      });
      await expect(contribution).not.toBeChecked();
      await contribution.check();
      await expect(contribution).toBeChecked();
      await mobile
        .getByRole("button", { name: "Save learning choices" })
        .click();
      await expect(mobile.getByRole("status")).toContainText("Saved");
      await expect(
        mobile.getByRole("button", { name: "Save learning choices" }),
      ).toBeEnabled();
      await expect(contribution).toBeChecked();
      await mobile
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await expect(
        mobile.getByRole("button", { name: "Save learning choices" }),
      ).toBeEnabled();
      await expect(contribution).toBeChecked();
      await expect(
        mobile.getByRole("checkbox", { name: "Learn my personal taste" }),
      ).not.toBeChecked();
      await desktop.screenshot({
        path: ".tmp/shared-desktop.png",
        fullPage: true,
      });
      await mobile.screenshot({
        path: ".tmp/shared-mobile.png",
        fullPage: true,
      });
      expect(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await outsider.goto(url);
      await expect(outsider).toHaveURL(/notice=room-unavailable/);
      await desktop
        .getByRole("button", { name: "Remove Shared QA friend", exact: true })
        .click();
      await expect(
        desktop.getByText("Shared QA friend · removed", { exact: true }),
      ).toBeVisible();
      await expect(
        desktop.getByRole("button", {
          name: "Approve Shared QA friend",
          exact: true,
        }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const r = await admin
            .from("room_members")
            .select("id")
            .eq("room_id", roomId)
            .eq("user_id", friend.id);
          return r.data?.length;
        })
        .toBe(0);
      // Both connected sessions receive live removal, then direct reopening remains denied.
      await expect(mobile).toHaveURL(/notice=removed/, { timeout: 15000 });
      await expect(second).toHaveURL(/notice=removed/, { timeout: 15000 });
      await mobile.goto(invite);
      await expect(mobile.getByRole("status")).toContainText(
        "declined or removed",
      );
      await desktop
        .getByRole("button", { name: "Approve Shared QA friend", exact: true })
        .click();
      await mobile.getByRole("button", { name: "Check approval" }).click();
      await mobile.getByRole("button", { name: "Social", exact: true }).click();
      await expect(
        mobile.getByRole("checkbox", { name: "Use my choices in this room" }),
      ).not.toBeChecked();
      const renewed = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", friend.id)
        .single();
      expect(renewed.data?.id).not.toBe(membership.data?.[0].id);
      await desktop.getByRole("tab", { name: "Listen", exact: true }).click();
      await mobile.getByRole("button", { name: "Social", exact: true }).click();
      await expect(
        mobile.getByRole("checkbox", { name: "Use my choices in this room" }),
      ).not.toBeChecked();
      await mobile.screenshot({
        path: ".tmp/shared-listen-mobile.png",
        fullPage: true,
      });
      await mobile.getByRole("button", { name: "More", exact: true }).click();
      await mobile
        .getByRole("button", { name: /People & permissions/ })
        .click();
      await expect(
        mobile.getByRole("checkbox", { name: "Use my choices in this room" }),
      ).toBeVisible();
      await mobile.screenshot({
        path: ".tmp/shared-settings-mobile.png",
        fullPage: true,
      });
      await mobile.setViewportSize({ width: 844, height: 390 });
      expect(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const saveInLandscape = mobile.getByRole("button", {
        name: "Save learning choices",
      });
      await saveInLandscape.scrollIntoViewIfNeeded();
      const saveBox = await saveInLandscape.boundingBox();
      const navBox = await mobile
        .getByRole("button", { name: "More", exact: true })
        .boundingBox();
      expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(navBox!.y);
      await mobile.screenshot({
        path: ".tmp/shared-settings-landscape.png",
        fullPage: true,
      });
      // Account-level permanent Leave must revoke both currently connected devices.
      await desktop.getByRole("tab", { name: "Watch", exact: true }).click();
      await mobile.setViewportSize({ width: 390, height: 844 });
      await second.goto(url);
      await expect(
        second.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      const third = await device(friend, true);
      await third.goto(url);
      await expect(
        third.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      await mobile.goto("http://127.0.0.1:5384/");
      await mobile
        .getByRole("button", { name: /account/i })
        .first()
        .click();
      await mobile.getByRole("button", { name: "Rooms", exact: true }).click();
      await mobile
        .getByRole("button", { name: "Leave QA Shared evening", exact: true })
        .click();
      await mobile.screenshot({
        path: ".tmp/shared-self-withdraw-confirm.png",
        fullPage: true,
      });
      await mobile
        .getByRole("button", { name: "Confirm Leave", exact: true })
        .click();
      await expect(
        mobile.getByRole("button", {
          name: "Leave QA Shared evening",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(second).toHaveURL(/notice=removed/, { timeout: 15000 });
      await expect(third).toHaveURL(/notice=removed/, { timeout: 15000 });
      await mobile.screenshot({
        path: ".tmp/shared-self-withdraw-complete.png",
        fullPage: true,
      });
      const leftList = await mobile.request.get(
        "http://127.0.0.1:5384/api/account/rooms",
      );
      expect(
        (await leftList.json()).rooms.some(
          (r: { id: string }) => r.id === roomId,
        ),
      ).toBe(false);
      await desktop.getByRole("tab", { name: "Watch", exact: true }).click();
      await desktop
        .getByRole("button", { name: "Social", exact: true })
        .click();
      await desktop
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await expect(
        desktop.getByText("Shared QA friend · removed", { exact: true }),
      ).toBeVisible();
      await desktop
        .getByRole("button", { name: "Approve Shared QA friend", exact: true })
        .click();
      await second.goto(url);
      await expect(
        second.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      await mobile.goto(url);
      await expect(
        mobile.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      await closeAndVerify();
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
      await Promise.all(users.map((id) => admin.auth.admin.deleteUser(id)));
    }
  },
);
