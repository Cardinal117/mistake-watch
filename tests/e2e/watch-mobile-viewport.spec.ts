import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "Phone rotation keeps navigation and workspace scrolling inside the viewport",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    const shell = page.locator(".watch-redesign");
    const nav = page.getByRole("navigation", { name: "Room navigation" });
    await expect(nav).toBeVisible();
    for (const size of [
      { width: 844, height: 390 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await expect(nav).toBeVisible();
      await nav.getByRole("button", { name: "Home", exact: true }).click();
      await nav.getByRole("button", { name: "More", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Room & account", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "Play", exact: true }),
      ).toBeInViewport();
      const box = (await nav.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 1200);
      await expect
        .poll(() => shell.evaluate((el) => el.getBoundingClientRect().top))
        .toBe(0);
      await expect
        .poll(() =>
          nav.evaluate((el) => Math.round(el.getBoundingClientRect().bottom)),
        )
        .toBe(size.height);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await expect(
        page.getByRole("button", { name: "Leave room", exact: true }).last(),
      ).toBeAttached();
      if (size.width > size.height) {
        await page.locator(".watch-content").evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect(
          page.getByRole("button", { name: "Leave room", exact: true }).last(),
        ).toBeInViewport();
      }
    }
  },
);

qa(
  "Landscape Home uses the stage width and keeps transport reachable",
  async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/dev/watch-design");
    const nav = page.getByRole("navigation", { name: "Room navigation" });
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    const stage = page.getByRole("region", { name: "Watch stage" });
    expect((await stage.boundingBox())!.width).toBeGreaterThan(800);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("slider", { name: "Playback position", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Fullscreen video", exact: true }),
    ).toBeInViewport();
    await page.setViewportSize({ width: 667, height: 375 });
    expect(
      (await page
        .getByRole("slider", { name: "Volume", exact: true })
        .boundingBox())!.width,
    ).toBeGreaterThanOrEqual(40);
  },
);
