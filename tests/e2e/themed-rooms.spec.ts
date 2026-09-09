import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { expect, test, type BrowserContext } from "@playwright/test";

const qa = process.env.PERSONAL_ROOM_QA === "1" ? test : test.skip;
qa(
  "Themed direction persists across modes, rejects stale edits and accepts invited guests",
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
      const owner = await account("Theme QA owner");
      const desktop = await device(owner);
      const mobile = await device(owner, true);
      await desktop.goto("http://127.0.0.1:5384/");
      const form = desktop.getByRole("form", { name: "Create Themed room" });
      await form.getByLabel("Themed room name").fill("QA Fantasy evenings");
      await form.getByLabel("Room direction").fill("Orchestral fantasy");
      await form
        .getByRole("button", { name: "Create Themed room", exact: true })
        .click();
      await desktop.waitForURL(/\/rooms\//);
      const roomId = new URL(desktop.url()).pathname.split("/").pop()!;
      const url = `http://127.0.0.1:5384/rooms/${roomId}`;
      const { data: room } = await admin
        .from("rooms")
        .select("invite_code")
        .eq("id", roomId)
        .single();
      await mobile.goto(url);
      await mobile.getByRole("button", { name: "Add", exact: true }).click();
      await mobile
        .getByPlaceholder(
          "YouTube, YouTube Music, playlist, direct audio, or HLS URL",
        )
        .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
      await mobile
        .getByRole("button", { name: "Load Now", exact: true })
        .click();
      await expect(mobile.locator("video,audio").first()).toBeAttached();
      await mobile
        .locator("video,audio")
        .first()
        .evaluate((el) => el.setAttribute("data-theme-qa-player", "original"));
      async function openDirection(page: typeof desktop, small = false) {
        if (small)
          await page.getByRole("button", { name: "More", exact: true }).click();
        else {
          await page
            .getByRole("button", { name: "Room settings", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Room Settings", exact: true })
            .click();
        }
        if (small)
          await page
            .getByRole("button", { name: "Room Invites and saved room" })
            .click();
        await expect(
          page.getByRole("textbox", { name: "Direction", exact: true }),
        ).toBeVisible();
      }
      await openDirection(desktop);
      expect(
        await desktop
          .getByRole("button", { name: "Change room direction" })
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).not.toBe("rgba(0, 0, 0, 0)");
      await openDirection(mobile, true);
      await desktop
        .getByRole("textbox", { name: "Direction", exact: true })
        .fill("Quiet fantasy");
      await desktop
        .getByRole("textbox", { name: "Exclude", exact: true })
        .fill("Phonk and heavy percussion");
      await desktop
        .getByRole("button", { name: "Change room direction" })
        .click();
      await expect(
        desktop.getByText("Direction version 2", { exact: true }),
      ).toBeVisible();
      await mobile
        .getByRole("textbox", { name: "Direction", exact: true })
        .fill("Old device edit");
      await mobile
        .getByRole("button", { name: "Change room direction" })
        .click();
      await expect(
        mobile.getByRole("status").filter({ hasText: "another device" }),
      ).toBeVisible();
      await expect(
        mobile.locator("[data-theme-qa-player=original]"),
      ).toHaveCount(1);
      await mobile.getByRole("button", { name: "Reload direction" }).click();
      await expect(
        mobile.getByRole("textbox", { name: "Direction", exact: true }),
      ).toHaveValue("Quiet fantasy");
      await mobile.screenshot({
        path: ".tmp/themed-mobile.png",
        fullPage: true,
      });
      await desktop.screenshot({
        path: ".tmp/themed-desktop.png",
        fullPage: true,
      });
      expect(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await mobile.setViewportSize({ width: 844, height: 390 });
      await mobile
        .getByRole("button", { name: "Change room direction" })
        .scrollIntoViewIfNeeded();
      await expect(
        mobile.getByRole("button", { name: "Change room direction" }),
      ).toBeVisible();
      await mobile.screenshot({
        path: ".tmp/themed-landscape.png",
        fullPage: true,
      });
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      context.setDefaultTimeout(15000);
      contexts.push(context);
      const guest = await context.newPage();
      await guest.goto(url);
      await guest.getByLabel("Display name").fill("Invited theme guest");
      await expect(guest.locator("input[name=invite-code]")).toHaveValue(
        room!.invite_code,
      );
      await guest
        .getByRole("button", { name: "Join Room", exact: true })
        .click();
      await expect(
        guest.getByText("Theme filtering is not ready.", { exact: false }),
      ).toBeVisible();
      await guest.getByRole("button", { name: "More", exact: true }).click();
      await guest
        .getByRole("button", { name: "Room Invites and saved room" })
        .click();
      await expect(
        guest.getByText("Quiet fantasy", { exact: true }),
      ).toBeVisible();
      await expect(
        guest.getByRole("button", { name: "Change room direction" }),
      ).toHaveCount(0);
      console.log(
        "QA: guest direction is read-only; checking recommendation routes",
      );
      for (const page of [desktop, guest]) {
        const response = await page.request.get(
          `${url.split("/rooms/")[0]}/api/youtube/recommendations?roomId=${roomId}&kind=recommended&query=phonk`,
          { timeout: 15000 },
        );
        expect(response.status()).toBe(200);
        const result = await response.json();
        expect(result.items).toEqual([]);
        expect(result.reason).toContain("Theme-filtered");
      }
      await mobile.setViewportSize({ width: 390, height: 844 });
      await mobile.getByRole("button", { name: "Home", exact: true }).click();
      await mobile.getByRole("tab", { name: "Watch", exact: true }).click();
      await expect(
        mobile.getByRole("tab", { name: "Listen", exact: true }),
      ).toBeVisible();
      await openDirection(mobile, true);
      await expect(
        mobile.getByRole("textbox", { name: "Direction", exact: true }),
      ).toHaveValue("Quiet fantasy");
    } finally {
      await Promise.allSettled(contexts.map((c) => c.close()));
      for (const id of users) await admin.auth.admin.deleteUser(id);
    }
  },
);
