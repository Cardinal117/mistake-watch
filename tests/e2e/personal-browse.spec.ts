import { expect, test } from "@playwright/test";
import { setupPersonalDiscover as setup } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "Regular tile accent follows its own artwork and count badge",
  async ({ page }) => {
    await setup(page);
    const cards = page.locator(".personal-regular");
    await expect
      .poll(() =>
        cards
          .first()
          .evaluate((el) =>
            el.style.getPropertyValue("--personal-artwork-accent"),
          ),
      )
      .not.toBe("");
    const colors = await cards.evaluateAll((els) =>
      els
        .slice(0, 2)
        .map(
          (el) =>
            getComputedStyle(el.querySelector(".personal-play-count-badge")!)
              .color,
        ),
    );
    expect(colors[0]).not.toBe(colors[1]);
  },
);

for (const width of [1920, 1440, 768, 390]) {
  qa(
    `Browse recommendations fit and retain queue controls at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setup(page, { recommendationCount: 20 });
      await page
        .getByRole("button", { name: "View all recommendations" })
        .click();
      const rows = page.locator(".personal-track-row");
      await expect(rows).toHaveCount(20);
      expect(
        await page
          .locator(".personal-discovery")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const first = rows.first();
      await expect(
        first.getByRole("button", { name: /Add to queue/ }),
      ).toHaveAttribute("title", "Add to queue");
      const boxes = await rows.evaluateAll((els) =>
        els.slice(0, 2).map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y };
        }),
      );
      if (width === 1920) expect(boxes[0].y).toBe(boxes[1].y);
      else expect(boxes[0].x).toBe(boxes[1].x);
      await page.screenshot({
        path: `test-results/personal-browse-${width}.png`,
        animations: "disabled",
      });
    },
  );
}

qa(
  "Regulars browse defaults to searchable sortable list with direct actions",
  async ({ page }) => {
    await setup(page);
    await page.getByRole("button", { name: "View all regulars" }).click();
    await expect(page.locator(".personal-track-row")).toHaveCount(12);
    await page
      .getByRole("searchbox", { name: "Search regulars" })
      .fill("fiery");
    await expect(page.locator(".personal-track-row")).toHaveCount(2);
    await page.getByLabel("Minimum recorded plays").fill("15");
    await expect(page.locator(".personal-track-row")).toHaveCount(1);
    await expect(
      page.getByText("19 recorded plays", { exact: true }),
    ).toBeVisible();
    await page.getByRole("searchbox").fill("no such song");
    await expect(
      page.getByText("No tracks match these filters."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset filters" }).click();
    await page.getByLabel("Sort regulars").selectOption("plays-asc");
    await expect(page.locator(".personal-track-row").first()).toHaveAttribute(
      "data-media-id",
      "dQw4w9Wg011",
    );
    await page.getByLabel("Liked only").check();
    await expect(page.locator(".personal-track-row")).toHaveCount(3);
    await page
      .locator(".personal-track-row")
      .first()
      .getByRole("button", { name: /Add next/ })
      .click();
    expect(
      await page.evaluate(() =>
        window
          .watchQA!.calls.filter((c) => c.action === "add")
          .map((c) => c.input),
      ),
    ).toEqual([expect.objectContaining({ isPlayNext: true })]);
  },
);

for (const width of [1920, 390]) {
  qa(`Regulars list details and controls fit at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.getByRole("button", { name: "View all regulars" }).click();
    await expect(page.locator(".personal-track-row")).toHaveCount(12);
    expect(
      await page
        .locator(".personal-discovery")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const row = page.locator(".personal-track-row").first();
    await expect(
      row.getByRole("button", { name: /Remove Like/ }),
    ).toBeVisible();
    await expect(row.getByRole("button", { name: /Add next/ })).toBeVisible();
    await page.screenshot({
      path: `test-results/personal-regular-list-${width}.png`,
      animations: "disabled",
    });
  });
}
