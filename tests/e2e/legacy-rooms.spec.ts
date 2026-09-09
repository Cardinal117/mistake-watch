import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Legacy saved grouping preserves account filters at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dev/room-kinds");
    const saved = page.getByRole("region", {
      name: "Saved Rooms",
      exact: true,
    });
    await expect(
      saved.getByRole("heading", { name: "Legacy", exact: true }),
    ).toBeVisible();
    await expect(
      saved.getByText("Friday Night", { exact: true }),
    ).toBeVisible();
    await expect(
      saved.getByText("A long room name", { exact: false }),
    ).toHaveCount(0);
    const account = page.getByRole("region", {
      name: "Account rooms",
      exact: true,
    });
    await account
      .getByRole("combobox", { name: "Relationship", exact: true })
      .selectOption("saved");
    await expect(
      account.getByRole("heading", { name: "Legacy", exact: true }),
    ).toBeVisible();
    await expect(
      account.getByText("2 of 3 shown", { exact: true }),
    ).toBeVisible();
    await account
      .getByRole("searchbox", { name: "Search rooms", exact: true })
      .fill("Last weekend");
    await expect(
      account.getByText("1 of 3 shown", { exact: true }),
    ).toBeVisible();
    await expect(
      account.getByText("Last weekend", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `.tmp/legacy-${viewport.width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });
}

const liveQa = process.env.PERSONAL_ROOM_QA === "1" ? test : test.skip;
liveQa(
  "Legacy guest creation, save, playback and mode changes remain compatible",
  async ({ browser }) => {
    test.setTimeout(90000);
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
    const contexts = await Promise.all([
      browser.newContext({ viewport: { width: 1440, height: 900 } }),
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ]);
    let roomId: string | undefined;
    try {
      for (const c of contexts) c.setDefaultTimeout(15000);
      for (const c of contexts)
        await c.addInitScript(() =>
          localStorage.setItem("mw_dashboard_first_run_dismissed", "true"),
        );
      const [host, guest] = await Promise.all(contexts.map((c) => c.newPage()));
      await host.goto("/");
      const create = host.getByRole("region", { name: "Create", exact: true });
      await create
        .getByPlaceholder("Friday screening", { exact: true })
        .fill("Legacy integration QA");
      await create
        .getByPlaceholder("Mistake Host", { exact: true })
        .fill("Legacy host");
      await create
        .getByRole("button", { name: "Create Room", exact: true })
        .click();
      await host.waitForURL(/\/rooms\//);
      roomId = new URL(host.url()).pathname.split("/").pop()!;
      expect(
        (
          await admin
            .from("rooms")
            .select("room_kind")
            .eq("id", roomId)
            .single()
        ).data?.room_kind,
      ).toBe("legacy");
      await guest.goto(host.url());
      await guest
        .getByLabel("Display name", { exact: true })
        .fill("Legacy guest");
      await guest
        .getByRole("button", { name: "Join Room", exact: true })
        .click();
      await host
        .getByRole("button", { name: "Save room", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (
              await admin
                .from("rooms")
                .select("is_saved")
                .eq("id", roomId!)
                .single()
            ).data?.is_saved,
        )
        .toBe(true);
      await host
        .getByRole("button", { name: "Add media", exact: true })
        .click();
      await host
        .getByPlaceholder("YouTube, playlist, direct video, or HLS URL")
        .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
      await host.getByRole("button", { name: "Load Now", exact: true }).click();
      await guest.getByRole("button", { name: "Home", exact: true }).click();
      await host
        .getByRole("button", { name: "Play", exact: true })
        .first()
        .click();
      await expect
        .poll(() =>
          guest
            .locator("video")
            .first()
            .evaluate((v: HTMLVideoElement) => v.currentTime),
        )
        .toBeGreaterThan(1);
      await expect(
        guest.getByRole("button", { name: "Pause", exact: true }).first(),
      ).toBeDisabled();
      await host
        .getByRole("button", { name: "Pause", exact: true })
        .first()
        .click();
      await expect(guest.locator("video").first()).toHaveJSProperty(
        "paused",
        true,
      );
      await host
        .getByRole("button", { name: "Fullscreen video", exact: true })
        .first()
        .click();
      await expect
        .poll(() => host.evaluate(() => Boolean(document.fullscreenElement)))
        .toBe(true);
      await host
        .getByRole("button", { name: "Exit fullscreen", exact: true })
        .first()
        .click();
      await expect
        .poll(() => host.evaluate(() => Boolean(document.fullscreenElement)))
        .toBe(false);
      await host.getByRole("tab", { name: "Listen", exact: true }).click();
      await expect(
        guest.getByRole("tab", { name: "Listen", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(guest.locator("video,audio").first()).toHaveJSProperty(
        "paused",
        true,
      );
      await guest.reload();
      await expect(
        guest.getByRole("button", { name: "Social", exact: true }),
      ).toBeVisible();
      await host.getByRole("tab", { name: "Watch", exact: true }).click();
      await expect(guest.locator(".watch-redesign")).toBeVisible();
      await guest.screenshot({ path: ".tmp/task028-7-legacy-mobile.png" });
    } finally {
      await Promise.allSettled(contexts.map((c) => c.close()));
      if (roomId)
        await admin
          .from("rooms")
          .delete()
          .eq("id", roomId)
          .eq("room_kind", "legacy");
    }
  },
);
