import { expect, type Page } from "@playwright/test";

// Actual UI + media state, with separate account/browser sessions. No sync mocks.
export async function verifySharedPlayback(
  host: Page,
  guest: Page,
  duplicate: Page,
) {
  const media = (page: Page) => page.locator("video,audio").first();
  const paused = async (value: boolean) => {
    for (const page of [host, guest, duplicate])
      await expect(media(page)).toHaveJSProperty("paused", value);
  };
  await host.getByRole("button", { name: "Add media", exact: true }).click();
  await host
    .getByPlaceholder("YouTube, playlist, direct video, or HLS URL")
    .fill("http://127.0.0.1:5384/dev/watch-fixture.webm");
  await host.getByRole("button", { name: "Load Now", exact: true }).click();
  await guest.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "Play", exact: true }).first(),
  ).toBeDisabled();
  await host.getByRole("button", { name: "Play", exact: true }).first().click();
  await paused(false);
  for (const page of [host, guest, duplicate]) {
    await expect
      .poll(
        () => media(page).evaluate((el: HTMLMediaElement) => el.currentTime),
        { timeout: 15000 },
      )
      .toBeGreaterThan(1);
  }
  await media(host).evaluate((el) =>
    el.setAttribute("data-integration-player", "persistent"),
  );
  for (const name of ["Queue", "Add media", "Social"]) {
    await host.getByRole("button", { name, exact: true }).first().click();
    await expect(media(host)).toHaveAttribute(
      "data-integration-player",
      "persistent",
    );
    await expect(media(host)).toHaveJSProperty("paused", false);
  }
  // Shared approval is not playback permission: only the separate toggle enables it.
  const editable = host
    .locator("button:not([disabled])")
    .filter({ hasText: /^Playback$/ });
  await expect(editable).toHaveCount(1);
  await expect(editable).toHaveAttribute("aria-pressed", "false");
  await editable.click();
  await expect(
    guest.getByRole("button", { name: "Pause", exact: true }).first(),
  ).toBeEnabled();
  await guest
    .getByRole("button", { name: "Pause", exact: true })
    .first()
    .click();
  await paused(true);
  const progress = guest
    .getByRole("slider", { name: "Playback position", exact: true })
    .first();
  await progress.press("Home");
  for (let i = 0; i < 12; i++) await progress.press("ArrowRight");
  await expect
    .poll(() => media(host).evaluate((el: HTMLMediaElement) => el.currentTime))
    .toBeGreaterThan(5);
  const times = await Promise.all(
    [host, guest, duplicate].map((page) =>
      media(page).evaluate((el: HTMLMediaElement) => el.currentTime),
    ),
  );
  expect(Math.max(...times) - Math.min(...times)).toBeLessThan(1);
  const volume = host
    .getByRole("slider", { name: "Volume", exact: true })
    .first();
  await volume.press("Home");
  await volume.press("ArrowRight");
  const savedVolume = await volume.inputValue();
  await host.getByRole("tab", { name: "Listen", exact: true }).click();
  await expect(
    guest.getByRole("tab", { name: "Listen", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    host.getByRole("slider", { name: "Volume", exact: true }).first(),
  ).toHaveValue(savedVolume);
  await paused(true);
  await guest
    .getByRole("button", { name: "Play", exact: true })
    .first()
    .click();
  await paused(false);
  await guest.reload();
  await expect
    .poll(
      () => media(guest).evaluate((el: HTMLMediaElement) => el.currentTime),
      { timeout: 15000 },
    )
    .toBeGreaterThan(5);
  await host.getByRole("tab", { name: "Watch", exact: true }).click();
  await guest.getByRole("button", { name: "Home", exact: true }).click();
  await host.getByRole("button", { name: "Social", exact: true }).click();
  await host
    .locator("button:not([disabled])")
    .filter({ hasText: /^Playback$/ })
    .click();
  await expect(
    guest.getByRole("button", { name: "Pause", exact: true }).first(),
  ).toBeDisabled();
  await expect(media(guest)).toHaveJSProperty("paused", false);
  await host
    .getByRole("button", { name: "Pause", exact: true })
    .first()
    .click();
  await paused(true);
  await guest.screenshot({ path: ".tmp/task028-7-shared-mobile.png" });
  await host.screenshot({ path: ".tmp/task028-7-shared-desktop.png" });
}
