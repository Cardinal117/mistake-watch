import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "An uncached workspace never hides the playing media or transport",
  async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested = false;
    await page.route("**/*watch-workspaces*", async (route) => {
      requested = true;
      await pending;
      await route.continue();
    });
    try {
      await page.goto("/dev/watch-design");
      const video = page.locator("video");
      await expect(video).toBeVisible();
      const original = await video.elementHandle();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Queue", exact: true }).click();
      await expect.poll(() => requested).toBe(true);
      await expect(video).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeVisible();
      expect(await original!.evaluate((el) => el.isConnected)).toBe(true);
      const before = await video.evaluate(
        (el: HTMLVideoElement) => el.currentTime,
      );
      await expect
        .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
        .toBeGreaterThan(before + 0.5);
      release();
      await expect(
        page.getByRole("heading", { name: "Queue", exact: true }),
      ).toBeVisible();
      expect(await original!.evaluate((el) => el.isConnected)).toBe(true);
    } finally {
      release();
    }
  },
);
