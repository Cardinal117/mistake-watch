import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa("playlist artwork and copy have separate columns", async ({ page }) => {
  await page.goto("/dev/queue-qa");
  const row = page.locator("label").filter({ hasText: "Track 1 —" });
  const image = (await row.locator("img").boundingBox())!;
  const title = (await row
    .getByText("Track 1 — a long playlist title for layout QA", { exact: true })
    .boundingBox())!;
  expect(title.x).toBeGreaterThanOrEqual(image.x + image.width + 4);
});
qa(
  "playlist actions stay reachable in short landscape with More open",
  async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/dev/queue-qa");
    await page.getByRole("button", { name: "More", exact: true }).click();
    const action = page.getByRole("button", {
      name: "Add Selected",
      exact: true,
    });
    await action.scrollIntoViewIfNeeded();
    await action.click({ timeout: 3000 });
    await expect(page.getByRole("status")).toContainText(
      "Import selected: 250 items",
    );
  },
);

qa(
  "playlist footer fits its clipping container without optional rows",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/queue-qa");
    const panel = (await page
      .locator(".watch-workspace-content > div")
      .boundingBox())!;
    const action = (await page
      .getByRole("button", { name: "Add Selected", exact: true })
      .boundingBox())!;
    expect(action.y + action.height).toBeLessThanOrEqual(
      panel.y + panel.height,
    );
  },
);

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  qa(
    `playlist selection and footer at ${viewport.width}x${viewport.height}`,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/dev/queue-qa");
      const selected = page.getByRole("checkbox").first();
      await selected.focus();
      await page.keyboard.press("Space");
      await expect(selected).not.toBeChecked();
      await page
        .getByRole("textbox", { name: "Search playlist" })
        .fill("Track 2 ");
      await expect(page.getByRole("checkbox")).toHaveCount(1);
      await expect(page.getByRole("checkbox")).toBeChecked();
      await page
        .getByRole("combobox", { name: "Sort playlist" })
        .selectOption("title");
      await page
        .getByRole("button", { name: "Add Selected", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("249 items");
      await page
        .getByRole("textbox", { name: "Search playlist" })
        .fill("no such track");
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Listen playlist", exact: true })
        .click();
      const add = page.getByRole("button", {
        name: "Add Selected",
        exact: true,
      });
      await add.click();
      await expect(page.getByRole("status")).toContainText("249 selected");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
}
