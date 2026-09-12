import { expect, test, type Page } from "@playwright/test";
import { previewCatalogue } from "../fixtures/watch-preview-data";

const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

async function openNaturalLibrary(page: Page) {
  const catalogue = previewCatalogue(4);
  const titles = [
    "Voyagers S02E01",
    "Voyagers S01E14",
    "Voyagers S10E01",
    "Voyagers S01E02",
  ];
  catalogue.assets.forEach((asset, index) => {
    asset.title = titles[index];
    asset.folderId = "cinema";
    asset.createdAt = `2026-09-0${index + 1}T12:00:00Z`;
  });
  await page.route("**/api/media/assets", (route) =>
    route.fulfill({ json: catalogue }),
  );
  await page.route("**/api/recommendations/preferences**", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/dev/watch-design?network=1");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.getByLabel("Sort library")).toHaveValue("natural");
}

qa(
  "Library and collection default to natural season and episode order",
  async ({ page }) => {
    await openNaturalLibrary(page);
    const shelf = page.locator('[data-watch-shelf="library"]');
    await expect(shelf.locator(".watch-card-title")).toHaveText([
      "Voyagers S01E02",
      "Voyagers S01E14",
      "Voyagers S02E01",
      "Voyagers S10E01",
    ]);

    await page
      .getByLabel("Collection: All collections", { exact: true })
      .click();
    await page.getByText("Cinema nights", { exact: true }).click();
    await expect(shelf.locator(".watch-card-title")).toHaveText([
      "Voyagers S01E02",
      "Voyagers S01E14",
      "Voyagers S02E01",
      "Voyagers S10E01",
    ]);

    await page.getByLabel("Sort library").selectOption("recent");
    await expect(shelf.locator(".watch-card-title")).toHaveText([
      "Voyagers S01E02",
      "Voyagers S10E01",
      "Voyagers S01E14",
      "Voyagers S02E01",
    ]);
  },
);

qa(
  "History defaults to list and recently watched uses compact horizontal rows",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => Boolean(window.watchQA));
    await page.evaluate(() => {
      window.watchQA!.changeQueuedItem("queue-1", "played");
      window.watchQA!.changeQueuedItem("queue-2", "played");
      window.watchQA!.changeQueuedItem("queue-3", "played");
    });

    await page.getByRole("button", { name: "History", exact: true }).click();
    const history = page.locator(".watch-card-grid--history-list");
    await expect(history).toBeVisible();
    await expect(
      page.getByRole("button", { name: "List view" }),
    ).toHaveAttribute("aria-pressed", "true");
    const historyDetails = history.locator(".watch-card-details").first();
    await expect(historyDetails).toHaveCSS("display", "grid");
    await expect(historyDetails).toContainText("Building Other Worlds");
    await expect(historyDetails).toContainText("Room media");
    await expect(historyDetails).toContainText("1:00");
    await page.screenshot({
      path: ".tmp/watch-catalogue-history-list.png",
      animations: "disabled",
    });

    await page.getByRole("button", { name: "Card view" }).click();
    await expect(page.locator(".watch-card-grid--history-list")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Card view" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Discover", exact: true }).click();
    const recent = page.locator(".watch-card-grid--recent");
    await expect(recent).toBeVisible();
    await expect(recent.locator(".watch-card-details").first()).toHaveCSS(
      "display",
      "grid",
    );
    const card = (await recent
      .locator(".watch-media-card")
      .first()
      .boundingBox())!;
    const art = (await recent
      .locator(".watch-card-art")
      .first()
      .boundingBox())!;
    expect(art.width).toBeLessThan(card.width / 2);
    await page.screenshot({
      path: ".tmp/watch-catalogue-recent.png",
      animations: "disabled",
    });
  },
);

qa("mobile History keeps the compact list readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/watch-design");
  await page.waitForFunction(() => Boolean(window.watchQA));
  await page.evaluate(() => {
    window.watchQA!.changeQueuedItem("queue-1", "played");
    window.watchQA!.changeQueuedItem("queue-2", "played");
    window.watchQA!.changeQueuedItem("queue-3", "played");
  });
  await page.getByRole("button", { name: "History", exact: true }).click();
  const history = page.locator(".watch-card-grid--history-list");
  await expect(history).toBeVisible();
  await expect(history.locator(".watch-card-title").first()).toBeVisible();
  await page.screenshot({
    path: ".tmp/watch-catalogue-history-mobile.png",
    animations: "disabled",
  });
});
