import { expect, test } from "@playwright/test";
import { setupPersonalDiscover } from "../fixtures/personal-discover-fixture";

const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

for (const mode of [
  "personal-desktop",
  "personal-mobile",
  "room-mobile",
] as const) {
  qa(
    `one pointer activation switches expandable cards without losing the target: ${mode}`,
    async ({ page }) => {
      await page.setViewportSize({
        width: mode === "personal-desktop" ? 1680 : 390,
        height: 960,
      });
      if (mode.startsWith("personal")) await setupPersonalDiscover(page);
      else await page.goto("/dev/listen-design");
      const cards = page.locator(
        mode.startsWith("personal")
          ? ".personal-regular"
          : ".listen-discovery-card",
      );
      const first = cards.nth(0),
        second = cards.nth(1);
      await first.getByRole("button", { name: /Show actions for/ }).click();
      const next = second.getByRole("button", { name: /Show actions for/ });
      await next.scrollIntoViewIfNeeded();
      const box = (await next.boundingBox())!;
      const before = await page.evaluate(() => window.watchQA!.calls.length);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Do not move the requested target under the pointer before its click lands.
      await expect(first).toHaveAttribute("data-closing", "false");
      await page.mouse.up();
      await expect(second).toHaveAttribute("data-expanded", "true");
      await expect(first).toHaveAttribute("data-expanded", "false");
      expect(await page.evaluate(() => window.watchQA!.calls.length)).toBe(
        before,
      );
      await second
        .getByRole("button")
        .filter({ visible: true })
        .first()
        .focus();
      await page.keyboard.press("Escape");
      await expect(next).toBeFocused();
      await expect(second).toHaveAttribute("data-expanded", "false");
    },
  );
}

test.describe("Touch card switching", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 960 } });
  qa(
    "one touchscreen tap switches regulars and preserves reduced-motion behavior",
    async ({ page }) => {
      await setupPersonalDiscover(page);
      const cards = page.locator(".personal-regular");
      const first = cards.nth(0),
        second = cards.nth(1);
      await first.getByRole("button", { name: /Show actions for/ }).tap();
      await second.getByRole("button", { name: /Show actions for/ }).tap();
      await expect(second).toHaveAttribute("data-expanded", "true");
      await expect(first).toHaveAttribute("data-expanded", "false");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await first.getByRole("button", { name: /Show actions for/ }).tap();
      await expect(first).toHaveAttribute("data-expanded", "true");
      await expect(second).toHaveAttribute("data-expanded", "false");
      await expect(second).toHaveAttribute("data-closing", "false");
    },
  );
});

qa(
  "keyboard focus and rapid activations leave only the last regular expanded",
  async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 960 });
    await setupPersonalDiscover(page);
    const cards = page.locator(".personal-regular");
    await cards
      .nth(0)
      .getByRole("button", { name: /Show actions for/ })
      .click();
    const next = cards.nth(1).getByRole("button", { name: /Show actions for/ });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(cards.nth(1)).toHaveAttribute("data-expanded", "true");
    await cards
      .nth(2)
      .getByRole("button", { name: /Show actions for/ })
      .click();
    await expect(cards.nth(2)).toHaveAttribute("data-expanded", "true");
    await expect(cards.nth(0)).toHaveAttribute("data-expanded", "false");
    await expect(cards.nth(1)).toHaveAttribute("data-expanded", "false");
    await page.getByRole("heading", { name: "Your regulars" }).click();
    await expect(cards.nth(2)).toHaveAttribute("data-expanded", "false");
  },
);
