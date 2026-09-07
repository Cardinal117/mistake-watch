import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "touch row body scrolls immediately, holds to reorder, and artwork only plays",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await page.evaluate(() => window.watchQA!.setQueueCount(100));
    const client = await page.context().newCDPSession(page);
    const touch = async (
      type: "touchStart" | "touchMove" | "touchEnd",
      x = 0,
      y = 0,
    ) => {
      await client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
      });
    };
    const row = page.locator('[data-queue-id="queue-3"] .watch-queue-copy');
    const from = (await row.boundingBox())!;
    const to = (await page.locator('[data-queue-id="queue-1"]').boundingBox())!;
    await touch("touchStart", from.x + 30, from.y + 20);
    await page.waitForTimeout(340);
    await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
      "data-dragging",
      "true",
    );
    await touch("touchMove", from.x + 30, to.y + 20);
    await page.waitForTimeout(100);
    await touch("touchEnd");
    await expect
      .poll(() =>
        page.evaluate(
          () => window.watchQA!.calls.filter((c) => c.action === "move").length,
        ),
      )
      .toBe(1);
    const first = page.locator('[data-queue-id="queue-3"] .watch-queue-copy');
    const box = (await first.boundingBox())!;
    const scroll = page.locator(".watch-content");
    const before = await scroll.evaluate((el) => el.scrollTop);
    await touch("touchStart", box.x + 20, box.y + 30);
    await touch("touchMove", box.x + 20, box.y - 60);
    await touch("touchEnd");
    expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    expect(
      await page.evaluate(
        () => window.watchQA!.calls.filter((c) => c.action === "move").length,
      ),
    ).toBe(1);
    await page.locator('[data-queue-id="queue-2"] .watch-queue-play').click();
    expect(
      await page.evaluate(
        () =>
          window.watchQA!.calls.filter((c) => c.action === "playQueue").length,
      ),
    ).toBe(1);
  },
);
