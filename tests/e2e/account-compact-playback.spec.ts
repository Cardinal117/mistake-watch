import { expect, test, type Page } from "@playwright/test";
async function mockYouTube(page: Page) {
  await page.addInitScript((delay) => {
    class FixturePlayer {
      iframe: HTMLIFrameElement;
      position = 0;
      seekTimer = 0;
      constructor(id: string, options: { events: { onReady?: () => void } }) {
        this.iframe = document.createElement("iframe");
        this.iframe.title = "YouTube cadence fixture";
        this.iframe.srcdoc = "<body>Provider cadence fixture</body>";
        this.iframe.style.cssText = "width:100%;height:100%";
        document.getElementById(id)!.replaceWith(this.iframe);
        setTimeout(() => options.events.onReady?.(), 0);
      }
      destroy() {
        clearTimeout(this.seekTimer);
        this.iframe.remove();
      }
      getCurrentTime() {
        return this.position;
      }
      getDuration() {
        return 60;
      }
      getPlaybackRate() {
        return 1;
      }
      getPlayerState() {
        return 2;
      }
      getVideoData() {
        return { title: "Cadence fixture" };
      }
      cueVideoById() {}
      loadVideoById() {}
      mute() {}
      unMute() {}
      pauseVideo() {}
      playVideo() {}
      setVolume() {}
      setPlaybackRate() {}
      seekTo(seconds: number) {
        clearTimeout(this.seekTimer);
        this.seekTimer = window.setTimeout(() => {
          this.position = seconds;
          this.iframe.dataset.position = String(seconds);
        }, 0);
      }
    }
    window.YT = {
      Player: FixturePlayer,
      PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
    };
  }, 0);
}
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
async function account(page: Page, allowed: boolean, id = "compact-fixture") {
  await page.waitForFunction(() => window.watchQA);
  await page.evaluate(
    ({ allowed, id }) =>
      window.watchQA!.setAccount({
        status: "signed-in",
        id,
        role: "member",
        accountStatus: "active",
        displayName: "Fixture",
        email: null,
        googleAvatarUrl: null,
        avatarUrl: null,
        avatarKey: null,
        avatarSource: "guest_avatar",
        handle: null,
        canUseCompactPlayback: allowed,
      }),
    { allowed, id },
  );
}
qa(
  "Watch capability allows playing minimization and revocation restores it",
  async ({ page }, testInfo) => {
    await mockYouTube(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setSource(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "youtube",
      ),
    );
    await expect(page.getByTitle("YouTube cadence fixture")).toBeVisible();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const minimize = page.getByRole("button", {
      name: "Minimize player",
      exact: true,
    });
    await expect(minimize).toBeDisabled();
    await account(page, true);
    await expect(minimize).toBeEnabled();
    const video = await page
      .getByTitle("YouTube cadence fixture")
      .elementHandle();
    await minimize.click();
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-minimized",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Move minimized player" }),
    ).toBeVisible();
    expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("watch-compact.png") });
    await account(page, false);
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-minimized",
      "false",
    );
  },
);
qa(
  "Listen compact choice is eligible-only and retains its mounted provider",
  async ({ page }, testInfo) => {
    await mockYouTube(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setSource(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "youtube",
      ),
    );
    await expect(
      page.getByRole("button", { name: "Use compact player" }),
    ).toHaveCount(0);
    await account(page, true);
    await expect(page.getByTitle("YouTube cadence fixture")).toBeVisible();
    const frame = await page
      .getByTitle("YouTube cadence fixture")
      .elementHandle();
    await page.getByRole("button", { name: "Use compact player" }).click();
    const player = page.getByRole("region", {
      name: "Now playing",
      exact: true,
    });
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await expect(player).toHaveAttribute("data-expanded", "true");
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
    expect(await frame!.evaluate((el) => el.isConnected)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("listen-compact.png") });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
    await page.setViewportSize({ width: 390, height: 844 });
    await account(page, true, "other-eligible-fixture");
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeGreaterThanOrEqual(200);
    await account(page, true);
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
    await account(page, false);
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeGreaterThanOrEqual(200);
    await account(page, true);
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
    await page.getByRole("button", { name: "Show browsing player" }).click();
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeGreaterThanOrEqual(200);
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error("Storage unavailable");
      };
    });
    await page.getByRole("button", { name: "Use compact player" }).click();
    await expect
      .poll(async () => (await player.boundingBox())!.height)
      .toBeLessThan(100);
  },
);
