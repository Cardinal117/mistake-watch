import { expect, test } from "@playwright/test";

const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "cinema queue rail virtualizes, filters, and preserves canonical action indices",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => Boolean(window.watchQA));
    await page.evaluate(() => window.watchQA!.setQueueCount(500));
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();

    const rail = page.getByRole("region", { name: "Queue", exact: true });
    await expect(rail).toBeVisible();
    await expect(rail.locator(".watch-mini-queue-heading span")).toHaveText(
      "499",
    );
    await expect(
      rail.getByRole("searchbox", { name: "Search queue" }),
    ).toBeVisible();
    await expect(rail.getByRole("tab", { name: "Social" })).toHaveCount(0);
    await expect(
      rail.getByRole("button", { name: "Shuffle", exact: true }),
    ).toBeVisible();
    await expect(
      rail.getByRole("combobox", { name: "Queue mode" }),
    ).toBeVisible();
    await expect(rail.locator("[data-queue-id]")).not.toHaveCount(0);
    expect(await rail.locator("[data-queue-id]").count()).toBeLessThan(30);
    expect(await rail.locator("[data-queue-id]").count()).toBeGreaterThan(3);
    await page.screenshot({
      path: ".tmp/watch-mini-queue-500.png",
      animations: "disabled",
    });

    const search = rail.getByRole("searchbox", { name: "Search queue" });
    await search.fill("Queue item 250");
    const filteredRow = rail.locator('[data-queue-id="queue-250"]');
    await expect(filteredRow).toBeVisible();
    await expect(rail.locator("[data-queue-id]")).toHaveCount(1);
    await expect(filteredRow).toHaveAttribute("data-queue-index", "249");

    await filteredRow
      .getByLabel("More actions for Queue item 250", { exact: true })
      .click();
    await expect(
      filteredRow.getByRole("button", { name: "Move to top", exact: true }),
    ).toBeVisible();
    await expect(
      filteredRow.getByRole("button", { name: "Remove…", exact: true }),
    ).toBeVisible();
    await filteredRow
      .getByLabel("More actions for Queue item 250", { exact: true })
      .click();

    await filteredRow
      .getByRole("button", { name: "Play Queue item 250 next", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.find((call) => call.action === "priority"),
        ),
      )
      .toMatchObject({
        input: { id: "queue-250", priority: { isPlayNext: true } },
      });

    const handle = filteredRow.getByRole("button", {
      name: "Drag Queue item 250 to reorder",
      exact: true,
    });
    await handle.focus();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.find((call) => call.action === "move"),
        ),
      )
      .toMatchObject({ input: { id: "queue-250", position: 250 } });

    await page.evaluate(() => window.watchQA!.setPermission(false));
    await expect(
      rail.getByRole("button", { name: "Shuffle", exact: true }),
    ).toBeDisabled();
    await expect(handle).toBeDisabled();
    await expect(
      filteredRow.getByRole("button", {
        name: "Play Queue item 250 next",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      filteredRow.getByRole("button", {
        name: "Play Queue item 250 now",
        exact: true,
      }),
    ).toBeDisabled();
  },
);
