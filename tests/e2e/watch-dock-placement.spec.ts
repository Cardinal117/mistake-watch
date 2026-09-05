import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Compact dock moves to four corners without replacing the player",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    const video = await page.locator("video").elementHandle();
    const dock = page.getByRole("region", { name: "Watch stage" });
    expect((await dock.boundingBox())!.height).toBeLessThan(270);
    const grip = page.getByRole("button", { name: "Drag player to a corner" });
    const positions = [];
    for (const key of ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]) {
      await grip.focus();
      await page.keyboard.press(key);
      await page.waitForTimeout(240);
      positions.push(await dock.boundingBox());
      expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
    }
    expect(positions[0]!.y).toBeLessThan(250);
    expect(positions[1]!.x).toBeLessThan(30);
    expect(positions[2]!.y).toBeGreaterThan(300);
    expect(positions[3]!.x).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    expect((await dock.boundingBox())!.width).toBeGreaterThan(300);
  },
);
