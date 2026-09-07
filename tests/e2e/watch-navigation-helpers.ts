import type { Page } from "@playwright/test";
/** Follow the visible source navigation on either header layout. */
export async function openBrowsing(page: Page) {
  const catalogue = page.getByRole("button", {
    name: "Catalogue",
    exact: true,
  });
  if (await catalogue.isVisible()) {
    await catalogue.click();
    return;
  }
  const desktopAdd = page.getByRole("button", {
    name: "Add media",
    exact: true,
  });
  if (await desktopAdd.isVisible()) await desktopAdd.click();
  else
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Add", exact: true })
      .click();
  // A resolved catalogue denial intentionally leaves the source on links.
  if (await catalogue.isVisible()) await catalogue.click();
}
