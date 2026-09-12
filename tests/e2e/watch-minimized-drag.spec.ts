import { expect, test } from "@playwright/test";

const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Touch dragging the minimized grip stays in bounds and does not restore",
  async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(
      `${process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5371"}/dev/watch-design`,
    );
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .tap();
    const grip = page.getByRole("button", { name: "Move minimized player" });
    const dock = page.getByRole("region", { name: "Watch stage" });
    const video = await page.locator("video").elementHandle();
    const before = (await dock.boundingBox())!;
    const rect = (await grip.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 1, y: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => (await dock.boundingBox())!.y)
      .toBeLessThan(before.y - 100);
    const after = (await dock.boundingBox())!;
    expect(after.x).toBeGreaterThanOrEqual(12);
    expect(after.y).toBeGreaterThanOrEqual(12);
    expect(after.x + after.width).toBeLessThanOrEqual(390 - 12);
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-minimized",
      "true",
    );
    expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("minimized-touch.png") });
    await page.getByRole("button", { name: /Restore player/ }).tap();
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-minimized",
      "false",
    );
    await context.close();
  },
);
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  qa(
    `Minimized player moves without restoring or remounting at ${viewport.width}px`,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/dev/watch-design");
      if (viewport.width >= 1024)
        await page
          .getByRole("button", { name: "Float player", exact: true })
          .click();
      const dock = page.getByRole("region", { name: "Watch stage" });
      const video = await page.locator("video").elementHandle();
      await page
        .getByRole("button", { name: "Minimize player", exact: true })
        .click();
      const grip = page.getByRole("button", {
        name: "Move minimized player",
        exact: true,
      });
      await expect(grip).toBeVisible();
      const before = (await dock.boundingBox())!;
      const handle = (await grip.boundingBox())!;
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        handle.x + handle.width / 2 - 25,
        handle.y + handle.height / 2 - 140,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect
        .poll(async () => (await dock.boundingBox())!.y)
        .toBeLessThan(before.y - 100);
      await expect(page.locator(".watch-redesign")).toHaveAttribute(
        "data-minimized",
        "true",
      );
      const moved = (await dock.boundingBox())!;
      await grip.focus();
      await page.keyboard.press("ArrowDown");
      await expect
        .poll(async () => (await dock.boundingBox())!.y)
        .toBeGreaterThan(moved.y + 15);
      expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
      expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
      await page.getByRole("button", { name: /Restore player/ }).click();
      await expect(page.locator(".watch-redesign")).toHaveAttribute(
        "data-minimized",
        "false",
      );
      expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
    },
  );
}
