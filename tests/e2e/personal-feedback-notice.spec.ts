import { expect, test } from "@playwright/test";
import { setupPersonalDiscover as setup } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "A newer feedback confirmation receives its own Undo window",
  async ({ page }) => {
    await setup(page);
    await page.clock.install();
    async function hideFirst() {
      await page
        .locator(".personal-recommendations .personal-track-row")
        .first()
        .getByRole("button", { name: /More options/ })
        .click();
      await page.getByRole("menuitem", { name: "Not now · 7 days" }).click();
      await page.mouse.move(0, 0);
    }
    await hideFirst();
    await page.clock.fastForward(6000);
    await hideFirst();
    await page.clock.fastForward(5000);
    await expect(page.locator(".personal-feedback-notice")).toBeVisible();
    await page.clock.fastForward(5100);
    await expect(page.locator(".personal-feedback-notice")).toHaveCount(0);
    await expect(
      page.getByText("Suggestion controls · 2 hidden"),
    ).toBeVisible();
  },
);

qa(
  "Feedback toast expires without undoing seven-day suppression and history can restore it",
  async ({ page }) => {
    await setup(page);
    await page.clock.install();
    const card = page.locator(".personal-regular").first();
    const id = await card.getAttribute("data-media-id");
    await card.getByRole("button", { name: /Show actions/ }).click();
    await card.getByRole("button", { name: /More options/ }).click();
    await page.getByRole("menuitem", { name: "Not now · 7 days" }).click();
    const notice = page.locator(".personal-feedback-notice");
    await expect(notice).toContainText("Hidden from suggestions for 7 days.");
    await page.mouse.move(0, 0);
    await page.clock.fastForward(10_100);
    await expect(notice).toHaveCount(0);
    await expect(
      page.locator(`.personal-regular[data-media-id="${id}"]`),
    ).toHaveCount(0);
    await page.getByText("Suggestion controls · 1 hidden").click();
    await expect(
      page.getByText("Paused for 7 days", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Allow suggestions again" }).click();
    await expect(
      page.locator(`.personal-regular[data-media-id="${id}"]`),
    ).toHaveCount(1);
  },
);

qa(
  "Undo toast pauses for hover and keyboard focus, then resumes and can be dismissed",
  async ({ page }) => {
    await setup(page);
    await page.clock.install();
    const row = page
      .locator(".personal-recommendations .personal-track-row")
      .first();
    await row.getByRole("button", { name: /More options/ }).click();
    await page.getByRole("menuitem", { name: "Not now · 7 days" }).click();
    const notice = page.locator(".personal-feedback-notice");
    await notice.hover();
    await page.clock.fastForward(15_000);
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Undo", exact: true }).focus();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(15_000);
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Dismiss confirmation" }).click();
    await expect(notice).toHaveCount(0);
    await expect(
      page.getByText("Suggestion controls · 1 hidden"),
    ).toBeVisible();
  },
);
