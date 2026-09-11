import { expect, test } from "@playwright/test";
import { setupPersonalDiscover as setup } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const width of [1440, 390])
  qa(
    `Recommendation adds appear immediately and recover rejection at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setup(page);
      await page.waitForFunction(() => Boolean(window.watchQA));
      await page.evaluate(() => {
        window.watchQA!.deferQueueAdds = true;
      });
      const row = page.locator(
        '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
      );
      await row
        .getByRole("button", { name: "Add to queue · Hordes", exact: true })
        .click();
      await expect(row).toHaveCount(0);
      if (width === 390)
        await page
          .getByRole("navigation", { name: "Listen room" })
          .getByRole("button", { name: "Queue", exact: true })
          .click();
      else
        await page.getByRole("button", { name: "Open queue drawer" }).click();
      await expect(page.locator('[data-pending-add="true"]')).toHaveCount(1);
      await expect(
        page
          .locator('[data-pending-add="true"]')
          .getByRole("button", { name: /Play Hordes now/ }),
      ).toBeDisabled();
      await page.evaluate(() => window.watchQA!.rejectQueueAdd(0));
      await expect(page.locator('[data-pending-add="true"]')).toHaveCount(0);
      if (width === 390)
        await page
          .getByRole("navigation", { name: "Listen room" })
          .getByRole("button", { name: "Home", exact: true })
          .click();
      await expect(row).toHaveCount(1);
    },
  );

qa(
  "An uncertain queue retry keeps its identity and one placeholder, then settles a late confirmation",
  async ({ page }) => {
    await setup(page);
    await page.waitForFunction(() => Boolean(window.watchQA));
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await row
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .click();
    await expect(row).toHaveCount(0);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Queue addition was not confirmed" }),
    ).toBeVisible({ timeout: 16000 });
    await expect(row).toBeVisible();
    await row
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .click();
    const ids = await page.evaluate(() =>
      window
        .watchQA!.calls.filter((c) => c.action === "add")
        .map((c) => (c.input as { clientActionId: string }).clientActionId),
    );
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    await page.getByRole("button", { name: "Open queue drawer" }).click();
    await expect(page.locator('[data-pending-add="true"]')).toHaveCount(1);
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect(page.locator('[data-pending-add="true"]')).toHaveCount(0);
    await expect(row).toHaveCount(0);
  },
);

qa(
  "A timed-out addition can confirm without a retry or a false queue-observed event",
  async ({ page }) => {
    const observed: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/recommendations/discover") &&
        request.method() === "POST"
      )
        observed.push(request.postDataJSON().kind);
    });
    await setup(page);
    await page.waitForFunction(() => Boolean(window.watchQA));
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await row
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Queue addition was not confirmed" }),
    ).toBeVisible({ timeout: 16000 });
    expect(observed.filter((kind) => kind === "queue_observed")).toHaveLength(
      0,
    );
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect(row).toHaveCount(0);
    await expect
      .poll(() => observed.filter((kind) => kind === "queue_observed").length)
      .toBe(1);
  },
);

qa(
  "Reordering while an add is unconfirmed never sends a pending row as a server anchor",
  async ({ page }) => {
    await setup(page);
    await page.waitForFunction(() => Boolean(window.watchQA));
    await page
      .locator('.personal-recommendations [data-media-id="dQw4w9Wg004"]')
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .click();
    await page.getByRole("button", { name: "Open queue drawer" }).click();
    await page.evaluate(() => window.watchQA!.setMoveDelay(1000));
    const handle = page.getByRole("button", {
      name: "Drag The Long Way Home to reorder",
    });
    await handle.press("End");
    await handle.press("ArrowUp");
    const calls = await page.evaluate(() =>
      window
        .watchQA!.calls.filter((c) => c.action === "movePlacement")
        .map((c) => c.input),
    );
    expect(calls).toHaveLength(2);
    expect(calls).toEqual([
      expect.objectContaining({ placement: expect.any(Object) }),
      expect.objectContaining({ placement: expect.any(Object) }),
    ]);
    expect(JSON.stringify(calls)).not.toContain("pending:");
  },
);
