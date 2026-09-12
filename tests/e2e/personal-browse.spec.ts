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
    await page.screenshot({
      path: ".tmp/regulars-ui-qa/regulars-desktop.png",
      animations: "disabled",
    });
  },
);

qa(
  "Regulars pages the available set and drag does not open a tile",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await setup(page);

    const rail = page.getByRole("region", { name: "Your regulars" });
    const cards = rail.locator(".personal-regular");
    await expect(cards).toHaveCount(3);
    await expect(rail.getByText("Page 1 of 4")).toBeVisible();
    await expect(
      page.getByText("Favourites and music you return to"),
    ).toHaveCount(0);

    const info = page.getByRole("button", { name: "About regular counts" });
    await info.click();
    const countHelp = page.getByText(/Seeking can qualify/);
    await expect(countHelp).toBeVisible();
    const helpBox = await countHelp.boundingBox();
    expect(helpBox).not.toBeNull();
    expect(helpBox!.x).toBeGreaterThanOrEqual(0);
    expect(helpBox!.x + helpBox!.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: ".tmp/regulars-ui-qa/regulars-mobile-info.png",
      animations: "disabled",
    });
    await info.click();

    const next = page.getByRole("button", { name: "Next regulars page" });
    await next.click();
    await expect(cards.first()).toHaveAttribute("data-media-id", "dQw4w9Wg003");
    await expect(rail.getByText("Page 2 of 4")).toBeVisible();

    await page
      .getByRole("button", { name: "Previous regulars page" })
      .click();
    const box = await rail.locator(".personal-regular-viewport").boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width - 24, box!.y + 70);
    await page.mouse.down();
    await page.mouse.move(box!.x + 24, box!.y + 70, { steps: 6 });
    await page.mouse.up();

    await expect(cards.first()).toHaveAttribute("data-media-id", "dQw4w9Wg003");
    await expect(rail.locator('.personal-regular[data-expanded="true"]')).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter((call) => call.action === "play"),
      ),
    ).toHaveLength(0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await next.click();
    expect(
      await rail.locator(".personal-regular-page").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration),
      ),
    ).toBeLessThanOrEqual(0.001);
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
