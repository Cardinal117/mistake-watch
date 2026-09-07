import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa("Cinema fills the stage and groups the transport", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/dev/watch-design");
  await page.getByRole("button", { name: "Open cinema", exact: true }).click();
  const stage = (await page.locator(".watch-player").boundingBox())!;
  const video = (await page.locator(".watch-viewport").boundingBox())!;
  expect(video.height).toBeGreaterThan(stage.height * 0.65);
  const transport = (await page.locator(".watch-transport").boundingBox())!;
  const volume = (await page
    .getByRole("slider", { name: "Volume", exact: true })
    .boundingBox())!;
  expect(volume.y).toBeGreaterThanOrEqual(transport.y);
  expect(volume.y + volume.height).toBeLessThanOrEqual(
    transport.y + transport.height,
  );
});
qa("paused dock minimizes and restores the exact media", async ({ page }) => {
  await page.goto("/dev/watch-design");
  const video = await page.locator("video").elementHandle();
  await page
    .getByRole("button", { name: "Minimize player", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Restore player/ }),
  ).toBeVisible();
  expect(
    (await page.locator(".watch-player").boundingBox())!.height,
  ).toBeLessThan(80);
  await page.getByRole("button", { name: /Restore player/ }).click();
  expect(
    await video!.evaluate((el) => el === document.querySelector("video")),
  ).toBe(true);
  expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Move player left", exact: true }),
  ).toHaveCount(0);
});
qa("queue text drags without invoking play", async ({ page }) => {
  await page.goto("/dev/watch-design");
  await page.getByRole("button", { name: "Queue", exact: true }).click();
  const row = page.locator('[data-queue-id="queue-3"] .watch-queue-copy');
  const from = (await row.boundingBox())!;
  const to = (await page.locator('[data-queue-id="queue-1"]').boundingBox())!;
  await page.mouse.move(from.x + 40, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, to.y + 12, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.watchQA!.calls.filter((c) => c.action === "move").length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(() =>
      window.watchQA!.calls.some((c) => c.action === "play"),
    ),
  ).toBe(false);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  qa(
    `minimized bar has no scrollable overflow at ${viewport.width}`,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/dev/watch-design");
      await page
        .getByRole("button", { name: "Minimize player", exact: true })
        .click();
      const player = page.locator(".watch-player");
      await expect(
        page.getByRole("button", { name: /Restore player/ }),
      ).toBeVisible();
      expect(
        await player.evaluate((el) => {
          const style = getComputedStyle(el);
          el.scrollTop = 100;
          el.scrollLeft = 100;
          return {
            x: style.overflowX,
            y: style.overflowY,
            top: el.scrollTop,
            left: el.scrollLeft,
          };
        }),
      ).toEqual({ x: "clip", y: "clip", top: 0, left: 0 });
      await page.screenshot({
        path: `test-results/paused-bar-${viewport.width}.png`,
      });
    },
  );
}

qa(
  "mobile mode bar is hidden in catalogue and restored on the Home player",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    const mode = page.locator('.watch-mobile-mode [role="tablist"]');
    await expect(mode).toBeHidden();
    await page.locator(".watch-mobile-nav").getByRole("button", { name: "Home", exact: true }).click();
    await expect(mode).toBeVisible();
    for (const name of ["Watch", "Listen"]) {
      await expect(
        mode.getByRole("tab", { name, exact: true }).locator("svg"),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Browse media", exact: true }),
    ).toBeHidden();
    await page.locator(".watch-mobile-nav").getByRole("button", { name: "Add", exact: true }).click();
    await page.locator(".watch-source-switch").getByRole("button", { name: "Catalogue", exact: true }).click();
    await expect(mode).toBeHidden();
    await page.screenshot({ path: "test-results/mobile-mode-bar.png" });
  },
);

qa(
  "landscape dock exposes volume and fullscreen above navigation",
  async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    const nav = (await page.locator(".watch-mobile-nav").boundingBox())!;
    for (const control of [
      page.getByRole("slider", { name: "Volume", exact: true }),
      page.getByRole("button", { name: "Fullscreen video", exact: true }),
    ]) {
      await expect(control).toBeVisible();
      const rect = (await control.boundingBox())!;
      expect(rect.y + rect.height).toBeLessThanOrEqual(nav.y);
    }
    await page.screenshot({ path: "test-results/landscape-dock-controls.png" });
  },
);
