import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

for (const width of [1440, 390]) {
  qa(
    `Watch queue duplicate indicators count active sources at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dev/watch-design");
      await page
        .getByRole("navigation", {
          name: width < 768 ? "Room navigation" : "Room tools",
        })
        .getByRole("button", { name: "Queue", exact: true })
        .click();
      const current = page.locator('[data-queue-id="queue-0"]');
      await expect(
        current.getByRole("img", { name: "4 copies in queue" }),
      ).toBeVisible();
      await page.evaluate(() =>
        window.watchQA!.changeQueuedItem("queue-3", "played"),
      );
      await expect(
        current.getByRole("img", { name: "3 copies in queue" }),
      ).toBeVisible();
      await page.evaluate(() => {
        window.watchQA!.changeQueuedItem("queue-2", "played");
        window.watchQA!.changeQueuedItem("queue-1", "played");
      });
      await expect(
        current.getByRole("img", { name: /copies in queue/ }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
}

qa(
  "Listen queue counts duplicates beyond the virtualized visible window",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/queue-qa");
    await page
      .getByRole("button", { name: "Listen queue", exact: true })
      .click();
    await expect(
      page
        .locator('[data-queue-id="item-1"]')
        .getByRole("img", { name: "1000 copies in queue" }),
    ).toBeVisible();
    expect(await page.locator("[data-queue-id]").count()).toBeLessThan(40);
    await page.screenshot({
      path: "test-results/listen-queue-duplicates-390.png",
      animations: "disabled",
    });
  },
);
