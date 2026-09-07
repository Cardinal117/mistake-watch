import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Compact dock keyboard movement retains the player",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    const video = await page.locator("video").elementHandle();
    const dock = page.getByRole("region", { name: "Watch stage" });
    expect((await dock.boundingBox())!.height).toBeLessThan(330);
    const grip = page.getByRole("button", { name: "Move player" });
    const positions = [];
    for (const key of ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]) {
      await grip.focus();
      await page.keyboard.press(key);
      await page.waitForTimeout(240);
      positions.push(await dock.boundingBox());
      expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
    }
    expect(positions[1]!.x).toBeCloseTo(positions[0]!.x - 20,0);
    expect(positions[2]!.y).toBeCloseTo(positions[1]!.y + 20,0);
    expect(positions[3]!.x).toBeCloseTo(positions[2]!.x + 20,0);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    expect((await dock.boundingBox())!.height).toBeLessThan(80);
    await page.getByRole("button", { name: /Restore player/ }).click();
    expect(await video!.evaluate((v) => v.isConnected)).toBe(true);
  },
);
