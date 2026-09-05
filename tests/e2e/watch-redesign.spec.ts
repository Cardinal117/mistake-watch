import { expect, test } from "@playwright/test";

const watchTest = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
watchTest(
  "Watch navigation keeps the exact player and never commands playback",
  async ({ page }) => {
    await page.route("**/api/media/assets", (route) =>
      route.fulfill({
        json: {
          access: {
            allowed: false,
            canAccessUploadedCatalogue: false,
            scope: "none",
            reason: "guest",
            message: "Sign in with catalogue access to browse your library.",
          },
          assets: [],
          folders: [],
        },
      }),
    );

    await page.goto("/dev/watch-design?network=1");
    await expect(page.locator("video")).toHaveCount(1);
    await page.evaluate(() => {
      (window as unknown as { originalVideo: Element | null }).originalVideo =
        document.querySelector("video");
    });
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tonight, together" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Back to browsing", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(page.locator("video")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.querySelector("video") ===
          (window as unknown as { originalVideo: Element }).originalVideo,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  },
);
