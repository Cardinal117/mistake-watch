import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const width of [320, 390, 844])
  qa(
    `Home toolbar fits ${width} and controls the existing stage`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      await page.goto("/dev/listen-design");
      const toolbar = page.locator(".listen-home-toolbar");
      await expect(toolbar).toBeVisible();
      for (const name of ["Watch", "Listen", "Discover", "Visualizer"]) {
        const tab = toolbar.getByRole("tab", { name, exact: true });
        const box = (await tab.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      await page
        .locator("audio")
        .evaluate((el) => el.setAttribute("data-original", "yes"));
      await toolbar
        .getByRole("tab", { name: "Visualizer", exact: true })
        .click();
      await expect(page.locator("#listen-visualizer-panel")).toBeVisible();
      await toolbar.getByRole("tab", { name: "Discover", exact: true }).click();
      await expect(page.locator("#listen-discover-panel")).toBeVisible();
      await page.screenshot({
        path: `test-results/listen-toolbar-${width}.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Expand player", exact: true })
        .click();
      await expect(toolbar).toBeHidden();
      await page
        .getByRole("button", { name: "Minimize player", exact: true })
        .click();
      await expect(toolbar).toBeVisible();
      await expect(page.locator("audio")).toHaveAttribute(
        "data-original",
        "yes",
      );
    },
  );

qa("Listen account icon opens the shared category menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/listen-design");
  await page
    .getByRole("button", { name: "Room and account settings", exact: true })
    .click();
  await expect(page.locator(".room-settings-categories")).toBeVisible();
  await page.locator('[data-category="profile"]').click();
  await expect(page.locator(".room-account-content")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Account sections" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to settings", exact: true })
    .click();
  await expect(page.locator('[data-category="profile"]')).toBeFocused();
});
