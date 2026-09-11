import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

for (const width of [1440, 1024]) {
  qa(
    `Desktop Listen queue uses aligned compact rows at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dev/listen-design");
      await page.getByRole("button", { name: "Open queue drawer" }).click();
      const first = page.locator('[data-queue-id="queue-1"]');
      const second = page.locator('[data-queue-id="queue-2"]');
      await expect(first).toBeVisible();
      await expect
        .poll(async () => {
          const a = (await first.boundingBox())!,
            b = (await second.boundingBox())!;
          return Math.round(b.y - a.y);
        })
        .toBe(60);
      await expect(first.locator(".desktop-queue-duration")).toBeVisible();
      expect(
        await first.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/listen-desktop-queue-${width}.png`,
        animations: "disabled",
      });
      await page.evaluate(() => window.watchQA!.setMoveDelay(600));
      const source = page.getByRole("button", {
        name: "Drag Building Other Worlds to reorder",
      });
      const target = page.getByRole("button", {
        name: "Drag The Long Way Home to reorder",
      });
      const from = (await source.boundingBox())!,
        to = (await target.boundingBox())!;
      await page.mouse.move(from.x + 14, from.y + 20);
      await page.mouse.down();
      await page.mouse.move(to.x + 14, to.y + 16, { steps: 8 });
      await page.mouse.up();
      await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
        "data-queue-index",
        "0",
      );
    },
  );
}
