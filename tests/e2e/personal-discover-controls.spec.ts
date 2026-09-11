import { expect, test } from "@playwright/test";
import { setupPersonalDiscover as setup } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "Regular and recommendation queue controls follow room permissions",
  async ({ page }) => {
    await setup(page);
    const card = page.locator('.personal-regular[data-media-id="dQw4w9Wg001"]');
    await card.getByRole("button", { name: /Show actions/ }).click();
    await page.evaluate(() => window.watchQA!.setPermission(false));
    await expect(
      card.getByRole("button", {
        name: "Add to queue · Fiery Dragon",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", {
        name: "Add next · Fiery Dragon",
        exact: true,
      }),
    ).toBeDisabled();
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await expect(
      row.getByRole("button", { name: "Add next · Hordes", exact: true }),
    ).toBeDisabled();
  },
);

for (const width of [1680, 390]) {
  qa(
    `Compact regulars expand without playback, dismiss and expose explicit queue controls at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await setup(page);
      const card = page.locator(
        '.personal-regular[data-media-id="dQw4w9Wg001"]',
      );
      const preview = card.getByRole("button", {
        name: "Show actions for Fiery Dragon",
      });
      await expect(preview).toBeVisible();
      await expect(
        card.getByRole("img", { name: "19 recorded plays" }),
      ).toBeVisible();
      const before = await page.evaluate(() => window.watchQA!.calls.length);
      await preview.click();
      await expect(card).toHaveAttribute("data-expanded", "true");
      await expect(
        card.getByRole("button", { name: "Play Fiery Dragon", exact: true }),
      ).toBeFocused();
      await expect(
        card.getByRole("button", {
          name: "Add next · Fiery Dragon",
          exact: true,
        }),
      ).toBeVisible();
      expect(await page.evaluate(() => window.watchQA!.calls.length)).toBe(
        before,
      );
      await card
        .getByRole("button", {
          name: "Add to queue · Fiery Dragon",
          exact: true,
        })
        .focus();
      await page.keyboard.press("Escape");
      await expect(preview).toBeFocused();
      await expect(card).toHaveAttribute("data-expanded", "false");
      await preview.click();
      await page.getByRole("heading", { name: "Your regulars" }).click();
      await expect(card).toHaveAttribute("data-expanded", "false");
      await preview.click();
      await page.getByRole("button", { name: "View all regulars" }).focus();
      await expect(card).toHaveAttribute("data-expanded", "false");
      await preview.click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/regular-controls-${width}.png`,
        animations: "disabled",
      });
      await card
        .getByRole("button", { name: "Add next · Fiery Dragon", exact: true })
        .click();
      expect(
        await page.evaluate(() =>
          window
            .watchQA!.calls.filter((call) => call.action === "add")
            .map((call) => call.input),
        ),
      ).toEqual([expect.objectContaining({ isPlayNext: true })]);
      await expect(
        card.getByRole("button", {
          name: "Adding… · Fiery Dragon",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        card.getByRole("button", {
          name: "Add next · Fiery Dragon",
          exact: true,
        }),
      ).toBeDisabled();
    },
  );
}

qa(
  "Recommendation Add next is visible and reduced motion collapses regulars immediately",
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setup(page);
    const card = page.locator(".personal-regular").first();
    await card.getByRole("button", { name: /Show actions/ }).click();
    await page.getByRole("heading", { name: "Your regulars" }).click();
    await expect(card).toHaveAttribute("data-closing", "false");
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await row
      .getByRole("button", { name: "Add next · Hordes", exact: true })
      .click();
    expect(
      await page.evaluate(() =>
        window
          .watchQA!.calls.filter((call) => call.action === "add")
          .map((call) => call.input),
      ),
    ).toEqual([expect.objectContaining({ isPlayNext: true })]);
    await expect(
      row.getByRole("button", { name: "Adding… · Hordes", exact: true }),
    ).toBeDisabled();
  },
);
