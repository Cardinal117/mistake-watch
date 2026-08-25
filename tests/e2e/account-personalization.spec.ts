import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

const canRenderApplication =
  Boolean(process.env.PLAYWRIGHT_BASE_URL) ||
  existsSync(".env.local") ||
  existsSync("../watch-together-platform/.env.local");
const applicationTest = canRenderApplication ? test : test.skip;

applicationTest(
  "visualization selection keeps the account header and close action accessible",
  async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("mw_dashboard_first_run_dismissed", "true");
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Open account panel" }).click();
    const dialog = page.getByRole("dialog", { name: /Mistake Guest|Account/i });
    await dialog.getByRole("button", { name: "Personalization" }).click();

    await dialog.getByRole("radio", { name: /Constellation/ }).check();

    const close = dialog.getByRole("button", { name: "Close account panel" });
    await expect(close).toBeVisible();
    await expect(close).toBeInViewport();
    await close.click();
    await expect(dialog).toBeHidden();
  },
);
