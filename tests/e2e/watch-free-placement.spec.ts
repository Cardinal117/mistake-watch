import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const width of [390, 1440])
  qa(`Watch free positioning at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/watch-design", { waitUntil: "domcontentloaded" });
    if (width >= 1024)
      await page
        .getByRole("button", { name: "Float player", exact: true })
        .click();
    const player = page.locator(".watch-player");
    const grip = page.locator(".watch-drag-handle");
    await page
      .locator("video")
      .evaluate((el) => el.setAttribute("data-original", "yes"));
    const start = (await player.boundingBox())!;
    const handle = (await grip.boundingBox())!;
    const target = { x: width === 390 ? 55 : 450, y: 180 };
    await page.mouse.move(handle.x + 20, handle.y + 20);
    await page.mouse.down();
    await page.mouse.move(
      handle.x + 20 + target.x - start.x,
      handle.y + 20 + target.y - start.y,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForTimeout(250);
    const placed = (await player.boundingBox())!;
    expect(placed.x).toBeCloseTo(target.x, 0);
    expect(placed.y).toBeCloseTo(target.y, 0);
    await grip.press("ArrowUp");
    expect((await player.boundingBox())!.y).toBeCloseTo(target.y - 20, 0);
    // Cancel a second drag and retain the original committed placement.
    const beforeCancel = (await player.boundingBox())!;
    const g = (await grip.boundingBox())!;
    await page.mouse.move(g.x + 10, g.y + 10);
    await page.mouse.down();
    await page.mouse.move(g.x + 30, g.y + 30, { steps: 3 });
    await grip.press("Escape");
    await page.mouse.up();
    expect((await player.boundingBox())!.x).toBeCloseTo(beforeCancel.x, 0);
    expect((await player.boundingBox())!.y).toBeCloseTo(beforeCancel.y, 0);
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    await page.getByRole("button", { name: /Restore player/ }).click();
    await page.screenshot({ path: `.tmp/free-player-${width}.png` });
    await page.setViewportSize({
      width: width === 390 ? 844 : 800,
      height: 390,
    });
    await expect
      .poll(async () => {
        const r = (await player.boundingBox())!;
        return r.x + r.width;
      })
      .toBeLessThanOrEqual(width === 390 ? 844 : 800);
    await expect
      .poll(async () => {
        const r = (await player.boundingBox())!;
        return r.y + r.height;
      })
      .toBeLessThanOrEqual(390);
    await expect(page.locator("video")).toHaveAttribute("data-original", "yes");
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  });

qa("Touch dragging remains available in short landscape", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/dev/watch-design", { waitUntil: "domcontentloaded" });
  const grip = page.locator(".watch-drag-handle");
  await expect(grip).toBeVisible();
  const player = page.locator(".watch-player"),
    start = (await player.boundingBox())!,
    g = (await grip.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = g.x + 10,
    y = g.y + 10;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - 100, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await player.boundingBox())!.x)
    .toBeCloseTo(start.x - 100, 0);
  await page.screenshot({ path: ".tmp/free-player-landscape.png" });
  await cdp.detach();
});
