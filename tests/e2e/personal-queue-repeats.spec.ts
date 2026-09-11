import { expect, test } from "@playwright/test";
import { setupPersonalDiscover as setup } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa("A late failure from a confirmed addition does not cancel its newer repeat", async ({ page }) => {
  await setup(page);
  const row = page.locator('.personal-regular[data-media-id="dQw4w9Wg004"]');
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Show actions/ }).click();
  await page.evaluate(() => { window.watchQA!.deferQueueAdds = true; });
  const next = row.getByRole("button", { name: "Add next · Hordes", exact: true });
  await next.click();
  await page.evaluate(() => window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"));
  await expect(next).toBeEnabled();
  await next.click();
  await page.evaluate(() => window.watchQA!.rejectQueueAdd(0));
  await expect(next).toBeDisabled();
  await expect(page.getByText("Could not add this track. Please try again.")).toHaveCount(0);
  await page.evaluate(() => window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"));
  await expect(next).toBeEnabled();
});

qa(
  "Intentional repeats require a new occurrence and remain addable",
  async ({ page }) => {
    await setup(page);
    const row = page.locator(
      '.personal-regular[data-media-id="dQw4w9Wg004"]',
    );
    await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Show actions/ }).click();
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    const addNext = row.getByRole("button", {
      name: "Add next · Hordes",
      exact: true,
    });
    await expect(addNext).toBeEnabled();
    await addNext.click();
    await expect(addNext).toBeDisabled();
    // An unrelated new occurrence changes the projection but must not confirm Hordes.
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg005", "Arrival to Earth"),
    );
    await expect(addNext).toBeDisabled();
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect(addNext).toBeEnabled();
    await addNext.click();
    await expect(addNext).toBeDisabled();
    expect(
      await page.evaluate(() =>
        window
          .watchQA!.calls.filter((c) => c.action === "add")
          .map((c) => c.input),
      ),
    ).toEqual([
      expect.objectContaining({ allowDuplicate: true, isPlayNext: true }),
      expect.objectContaining({ allowDuplicate: true, isPlayNext: true }),
    ]);
  },
);
