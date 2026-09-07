import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Discover scroll reaches lower shelves with a wheel over the cards",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await page.locator(".listen-mobile-player").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    await page.locator(".listen-discovery-card").first().hover();
    const before = await page
      .locator(".listen-mobile-discovery")
      .evaluate((el) => el.scrollTop);
    await page.mouse.wheel(0, 700);
    await expect
      .poll(() =>
        page.locator(".listen-mobile-discovery").evaluate((el) => el.scrollTop),
      )
      .toBeGreaterThan(before);
  },
);
qa(
  "Discover thumbnails expand without playing and dismiss outside",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    const card = page.locator(".listen-discovery-card").first();
    await expect(card).toHaveAttribute("data-expanded", "false");
    await card.getByRole("button", { name: /Show actions for/ }).click();
    await expect(card).toHaveAttribute("data-expanded", "true");
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page
      .getByRole("heading", { name: "Room picks", exact: true })
      .click();
    await expect(card).toHaveAttribute("data-expanded", "false");
  },
);
qa(
  "Up Next opens mobile queue and never repeats the ready strip",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Open queue. Up next:/ })
      .first()
      .click();
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await expect(
      page
        .getByRole("navigation", { name: "Listen room" })
        .getByRole("button", { name: "Queue", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  },
);
qa(
  "Account and audience controls stay adjacent on mobile and desktop",
  async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dev/listen-design");
      const audience = page.getByRole("button", {
        name: /Open audience panel/,
      });
      const account = page.getByRole("button", {
        name:
          width === 390 ? "Room and account settings" : "Open account panel",
        exact: true,
      });
      await expect(audience).toBeVisible();
      await expect(account).toBeVisible();
      const a = (await audience.boundingBox())!;
      const b = (await account.boundingBox())!;
      expect(b.x - a.x - a.width).toBeGreaterThanOrEqual(0);
      expect(b.x - a.x - a.width).toBeLessThanOrEqual(20);
      expect(Math.abs(b.y + b.height / 2 - (a.y + a.height / 2))).toBeLessThan(
        8,
      );
      await page.screenshot({
        path: `test-results/listen-header-${width}.png`,
      });
      await account.click();
      if (width === 390)
        await expect(
          page
            .getByRole("navigation", { name: "Listen room" })
            .getByRole("button", { name: "More", exact: true }),
        ).toHaveAttribute("aria-current", "page");
      else
        await expect(
          page.getByRole("button", { name: "Close account panel" }).first(),
        ).toBeVisible();
    }
  },
);
