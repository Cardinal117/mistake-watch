import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const mode of ["watch", "listen"])
  for (const width of [320, 390, 1440])
    qa(
      `${mode} settings categories fit ${width} and open independently`,
      async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/dev/${mode}-design`);
        // Desktop Listen retains its existing desktop account control; this slice is its mobile settings flow.
        if (mode === "listen" && width === 1440) {
          await expect(
            page.getByRole("button", {
              name: "Open account panel",
              exact: true,
            }),
          ).toBeVisible();
          return;
        }
        await page
          .getByRole("button", {
            name: "Room and account settings",
            exact: true,
          })
          .click();
        const menu = page.locator(".room-settings");
        await expect(
          menu.getByRole("heading", { name: "Room & account" }),
        ).toBeVisible();
        await expect(menu.locator(".room-account-content")).toHaveCount(0);
        for (const label of [
          "Profile",
          "Appearance",
          "Room",
          "People & permissions",
          "My rooms",
          "Privacy & account",
        ]) {
          const button = menu
            .locator(".room-settings-categories")
            .getByRole("button", {
              name: new RegExp("^" + label.replace("&", "&")),
            });
          await button.scrollIntoViewIfNeeded();
          const b = (await button.boundingBox())!;
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width).toBeLessThanOrEqual(width);
          expect(b.height).toBeGreaterThanOrEqual(44);
          await button.click();
          await expect(
            menu.getByRole("heading", { name: label, exact: true }).first(),
          ).toBeVisible();
          await expect(menu.locator(".room-settings-categories")).toHaveCount(
            0,
          );
          if (label === "Privacy & account") {
            await menu
              .getByRole("button", { name: "Account", exact: true })
              .click();
            await expect(
              menu.getByRole("link", { name: "Continue with Google" }),
            ).toBeVisible();
          }
          await menu
            .getByRole("button", { name: "Back to settings", exact: true })
            .click();
        }
        await menu
          .getByRole("heading", { name: "Room & account" })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `test-results/settings-${mode}-${width}.png`,
          animations: "disabled",
        });
        await menu
          .getByRole("button", { name: "Leave room", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        const toolbar = page.locator(".listen-home-toolbar");
        await toolbar
          .getByRole("tab", {
            name: mode === "watch" ? "YouTube & links" : "Visualizer",
            exact: true,
          })
          .click();
        if (mode === "watch")
          await expect(
            page.getByRole("heading", { name: "Add media", exact: true }),
          ).toBeVisible();
        else
          await expect(page.locator("#listen-visualizer-panel")).toBeVisible();
      },
    );
qa("Watch Home and Add share the compact source toolbar", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/dev/watch-design");
  const bar = page.locator(".listen-home-toolbar");
  for (const name of ["Watch", "Listen", "Catalogue", "YouTube & links"])
    await expect(bar.getByRole("tab", { name, exact: true })).toBeVisible();
  await bar.getByRole("tab", { name: "YouTube & links", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add media", exact: true }),
  ).toBeVisible();
  await bar.getByRole("tab", { name: "Catalogue", exact: true }).click();
  await expect(page.locator(".watch-home-content")).toBeVisible();
  await page.screenshot({
    path: "test-results/watch-toolbar-320.png",
    animations: "disabled",
  });
});
