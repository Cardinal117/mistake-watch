import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "queue menu dismisses on outside click and opening another menu",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await page
      .getByRole("button", { name: "Open full queue", exact: true })
      .click();
    const first = page.getByLabel("More actions for The Long Way Home", {
      exact: true,
    });
    const menu = first.locator("..");
    await first.click();
    await expect(menu).toHaveAttribute("open", "");
    await page.getByRole("heading", { name: "Queue", exact: true }).click();
    await expect(menu).not.toHaveAttribute("open", "");
    await first.click();
    await page
      .getByLabel("More actions for Afterlight", { exact: true })
      .click();
    await expect(menu).not.toHaveAttribute("open", "");
    await expect(
      page
        .getByLabel("More actions for Afterlight", { exact: true })
        .locator(".."),
    ).toHaveAttribute("open", "");
    await page.getByRole("button", { name: "History", exact: true }).focus();
    await expect(
      page
        .getByLabel("More actions for Afterlight", { exact: true })
        .locator(".."),
    ).not.toHaveAttribute("open", "");
  },
);
for (const width of [1440, 390]) {
  qa(
    `detail owns navigation and centers artwork at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dev/watch-design");
      const video = await page.locator("video").elementHandle();
      await page.getByRole("button", { name: "Library", exact: true }).click();
      await page
        .getByRole("searchbox", { name: "Search media" })
        .fill("Afterlight");
      const card = page.getByRole("button", {
        name: "Details: Afterlight",
        exact: true,
      });
      if (width >= 1024)
        await page
          .getByRole("button", { name: "Float player", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Minimize player", exact: true })
        .click();
      await card.click();
      await expect(
        page.getByRole("button", { name: "Library", exact: true }),
      ).toBeHidden();
      await expect(
        page.getByRole("tablist", { name: "Media source" }),
      ).toHaveCount(width >= 1024 ? 1 : 0);
      const art = (await page.locator(".watch-detail-art").boundingBox())!;
      expect(Math.abs(art.x + art.width / 2 - width / 2)).toBeLessThan(20);
      const back = page.getByRole("button", {
        name: "Back to results",
        exact: true,
      });
      expect((await back.boundingBox())!.y).toBeLessThan(art.y);
      await page
        .locator(".watch-details")
        .evaluate((el) =>
          Promise.all(
            el.getAnimations().map((animation) => animation.finished),
          ),
        );
      await page.screenshot({ path: `test-results/detail-${width}.png` });
      await back.click();
      await expect(
        page.getByRole("tablist", { name: "Media source" }),
      ).toBeVisible();
      await expect(
        page.getByRole("searchbox", { name: "Search media" }),
      ).toHaveValue("Afterlight");
      await expect(card).toBeFocused();
      expect(
        await video!.evaluate((el) => el === document.querySelector("video")),
      ).toBe(true);
      expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    },
  );
}

qa(
  "detail entrance respects reduced motion and source controls return in Add",
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("button", { name: "Details: Afterlight", exact: true })
      .click();
    expect(
      await page
        .locator(".watch-details")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    await page.getByRole("button", { name: "Add media", exact: true }).click();
    await expect(
      page.getByRole("tablist", { name: "Media source" }),
    ).toBeVisible();
  },
);
