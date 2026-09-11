import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Direct player reports its own audible/buffer state and stops on withdrawn permission",
  async ({ page }) => {
    let allowed = true;
    const grants: unknown[] = [];
    await page.route("**/api/**", (route) => {
      if (route.request().url().includes("/listening/grant")) {
        grants.push(route.request().postDataJSON());
        return route.fulfill({
          json: { allowed, expiresAt: Date.now() + 110000 },
        });
      }
      return route.fulfill({ json: { items: [], status: "unavailable" } });
    });
    await page.goto("/dev/listen-design?owner&network&listener");
    await expect.poll(() => grants.length).toBeGreaterThanOrEqual(1);
    const media = page.locator('[aria-label="Synced audio player"]');
    await media.evaluate((element) => {
      const player = element as HTMLMediaElement;
      Object.defineProperty(player, "paused", {
        configurable: true,
        get: () => false,
      });
      Object.defineProperty(player, "currentTime", {
        configurable: true,
        get: () => 10,
      });
      Object.defineProperty(player, "readyState", {
        configurable: true,
        get: () => 4,
      });
      player.muted = false;
      player.volume = 0.5;
      player.dispatchEvent(new Event("playing"));
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter((c) => c.action === "listener").at(-1)
              ?.input,
        ),
      )
      .toMatchObject({
        playing: true,
        buffering: false,
        muted: false,
        volume: 0.5,
        positionSeconds: 10,
        occurrenceId: "fixture",
      });
    await media.evaluate((element) =>
      element.dispatchEvent(new Event("waiting")),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter((c) => c.action === "listener").at(-1)
              ?.input,
        ),
      )
      .toMatchObject({ buffering: true });
    allowed = false;
    const beforeWithdrawal = grants.length;
    await page.evaluate(() =>
      window.dispatchEvent(new Event("mw-listening-settings-changed")),
    );
    await expect.poll(() => grants.length).toBeGreaterThan(beforeWithdrawal);
    const count = await page.evaluate(
      () => window.watchQA!.calls.filter((c) => c.action === "listener").length,
    );
    await media.evaluate((element) =>
      element.dispatchEvent(new Event("playing")),
    );
    expect(
      await page.evaluate(
        () =>
          window.watchQA!.calls.filter((c) => c.action === "listener").length,
      ),
    ).toBe(count);
    expect(grants[0]).not.toHaveProperty("accountId");
  },
);

qa(
  "YouTube playback does not request the gated listener measurement grant",
  async ({ page }) => {
    const grants: string[] = [];
    await page.route("**/api/**", (route) => {
      if (route.request().url().includes("/listening/grant"))
        grants.push(route.request().url());
      return route.fulfill({ json: { items: [], status: "unavailable" } });
    });
    await page.goto("/dev/listen-design?owner&network&listener&youtube");
    await page.waitForFunction(() => Boolean(window.watchQA));
    await expect(
      page.getByRole("button", { name: "Open queue drawer" }),
    ).toBeVisible();
    expect(grants).toHaveLength(0);
  },
);

qa(
  "An older grant response cannot restart recording after a permission change",
  async ({ page }) => {
    let holdNext = false;
    let allowed = true;
    let release: (() => void) | undefined;
    let count = 0;
    await page.route("**/api/**", async (route) => {
      if (!route.request().url().includes("/listening/grant"))
        return route.fulfill({ json: { items: [] } });
      count++;
      const captured = allowed;
      if (holdNext) {
        holdNext = false;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return route.fulfill({
        json: { allowed: captured, expiresAt: Date.now() + 110000 },
      });
    });
    await page.goto("/dev/listen-design?owner&network&listener");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA?.calls.filter((c) => c.action === "listener")
              .length ?? 0,
        ),
      )
      .toBeGreaterThan(0);
    holdNext = true;
    await page.evaluate(() =>
      window.dispatchEvent(new Event("mw-listening-settings-changed")),
    );
    await expect.poll(() => Boolean(release)).toBe(true);
    const before = await page.evaluate(
      () => window.watchQA!.calls.filter((c) => c.action === "listener").length,
    );
    const requestsBefore = count;
    allowed = false;
    await page.evaluate(() =>
      window.dispatchEvent(new Event("mw-listening-settings-changed")),
    );
    release!();
    await expect.poll(() => count).toBeGreaterThan(requestsBefore);
    await page
      .locator('[aria-label="Synced audio player"]')
      .evaluate((element) => element.dispatchEvent(new Event("playing")));
    expect(
      await page.evaluate(
        () =>
          window.watchQA!.calls.filter((c) => c.action === "listener").length,
      ),
    ).toBe(before);
  },
);
