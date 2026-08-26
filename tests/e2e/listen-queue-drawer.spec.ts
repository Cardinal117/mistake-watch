import { expect, test } from "@playwright/test";

const roomUrl = process.env.PLAYWRIGHT_LISTEN_ROOM_URL;

test.describe("Listen queue drawer", () => {
  test.skip(
    !roomUrl,
    "Set PLAYWRIGHT_LISTEN_ROOM_URL to a disposable local Listen room.",
  );

  test("Escape closes the drawer and restores focus to its opener", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 720, width: 1280 });
    await page.goto(roomUrl!, { waitUntil: "domcontentloaded" });

    const openDrawer = page.getByRole("button", {
      name: "Open queue drawer",
    });

    await expect(openDrawer).toBeVisible();
    await openDrawer.click();

    const closeDrawer = page.getByRole("button", {
      name: "Collapse queue drawer",
    });

    await expect(closeDrawer).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");

    await expect(openDrawer).toHaveAttribute("aria-expanded", "false");
    await expect(openDrawer).toBeFocused();
  });
});
