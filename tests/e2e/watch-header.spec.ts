import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Watch exposes the Listen room identity and audience controls",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(
      page.getByRole("textbox", { name: "Room name", exact: true }),
    ).toHaveValue("Friday Night");
    await expect(
      page.getByRole("button", { name: "Save room", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Open audience panel/ }).click();
    await expect(
      page.getByText("Room members and controls", { exact: true }),
    ).toBeVisible();
  },
);

qa(
  "Room renaming follows canonical updates, commits once, cancels and handles failure",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    const name = page.getByRole("textbox", { name: "Room name", exact: true });
    await expect(name).toHaveValue("Friday Night");
    await name.fill("  Saturday   Cinema  ");
    await name.press("Enter");
    await expect(name).toHaveValue("Saturday Cinema");
    expect(
      await page.evaluate(() =>
        window.watchQA?.calls.filter((c) => c.action === "rename"),
      ),
    ).toEqual([{ action: "rename", input: "Saturday Cinema" }]);
    await name.fill("Do not save");
    await name.press("Escape");
    await expect(name).toHaveValue("Saturday Cinema");
    expect(
      await page.evaluate(
        () => window.watchQA?.calls.filter((c) => c.action === "rename").length,
      ),
    ).toBe(1);
    await page.evaluate(() =>
      window.watchQA?.setRoomName("Remote host update"),
    );
    await expect(name).toHaveValue("Remote host update");
    await name.fill(" ");
    await name.press("Enter");
    await expect(name).toHaveValue("Remote host update");
    await page.evaluate(() => window.watchQA?.setRenameFailure(true));
    await name.fill("Retry name");
    await name.press("Tab");
    await expect(
      page.locator(".watch-room-name").getByRole("alert"),
    ).toContainText("could not be saved");
    await expect(name).toHaveValue("Retry name");
    await page.evaluate(() => window.watchQA?.setRenameFailure(false));
    await name.focus();
    await name.press("Enter");
    await expect(
      page.locator(".watch-room-name").getByRole("alert"),
    ).toHaveCount(0);
    await expect(name).toHaveValue("Retry name");
    await page.evaluate(() => window.watchQA?.setConnected(false));
    await expect(name).toBeDisabled();
    await page.evaluate(() => {
      window.watchQA?.setConnected(true);
      window.watchQA?.setPermission(false);
    });
    await expect(name).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Save room", exact: true }),
    ).toHaveCount(0);
  },
);
qa(
  "Shared save star reflects persistence and retains its state on failure",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await page.getByRole("button", { name: "Save room", exact: true }).click();
    const saved = page.getByRole("button", {
      name: "Remove saved room",
      exact: true,
    });
    await expect(saved).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => window.watchQA?.setSaveFailure(true));
    await saved.click();
    await expect(
      page
        .locator(".watch-room-title-row [aria-live=polite]")
        .filter({ hasText: /error|failed/i }),
    ).toHaveCount(1);
    await expect(saved).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => window.watchQA?.setSaveFailure(false));
    await saved.click();
    await expect(
      page.getByRole("button", { name: "Save room", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  },
);
for (const width of [320, 390, 768, 1440])
  qa(`Audience and header remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/dev/watch-design");
    const trigger = page.getByRole("button", {
      name: "Open audience panel, 1 online",
      exact: true,
    });
    await expect(trigger).toContainText("+1");
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "Room members and controls",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Active", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Idle", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Alex", { exact: true })).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close permissions" });
    await expect(close).toBeFocused();
    await close.press("Shift+Tab");
    expect(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
    ).toBe(true);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(
      await dialog.evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--listen-primary").trim(),
      ),
    ).toBe(
      await page
        .locator(".watch-redesign")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--listen-primary").trim(),
        ),
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.evaluate(() => window.watchQA?.setPermission(false));
    await trigger.click();
    for (const button of await dialog
      .getByRole("button", { name: "Playback", exact: true })
      .all())
      await expect(button).toBeDisabled();
    await close.click();
    await page.evaluate(() =>
      window.watchQA?.setRoomName(
        "An extremely long room name to verify small screen truncation",
      ),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    for (const selector of [
      ".watch-room-name input",
      ".watch-header-audience",
      ".watch-account-button",
    ]) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect!.width).toBeGreaterThan(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    }
  });

for (const [width, height] of [
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [667, 375],
  [844, 390],
  [390, 360],
] as const)
  qa(
    `Long room names and scrolling audience fit ${width}x${height}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/dev/watch-design");
      const name = page.getByRole("textbox", {
        name: "Room name",
        exact: true,
      });
      await expect(name).toBeVisible();
      await page.evaluate(() => {
        window.watchQA?.setRoomName(
          "AnExtremelyLongUnbrokenRoomNameForNarrowMobileScreensAndKeyboards",
        );
        window.watchQA?.setParticipants(
          Array.from({ length: 24 }, (_, i) => ({
            id: `member-${i}`,
            name: `Participant with a long display name ${i}`,
            role: i === 0 ? "host" : "guest",
            avatarKey: "processor",
            status: i < 12 ? "online" : "idle",
            isController: i === 0,
            permissions: {
              queue: true,
              manageQueue: false,
              playback: false,
              browser: false,
            },
          })),
        );
      });
      const trigger = page.getByRole("button", {
        name: "Open audience panel, 12 online",
        exact: true,
      });
      await expect(trigger).toContainText("+23");
      const header = page.locator(".watch-room-header");
      expect(
        await header.evaluate((e) => e.scrollWidth <= e.clientWidth),
        JSON.stringify(
          await header.evaluate((e) => ({
            width: e.clientWidth,
            scroll: e.scrollWidth,
            overflow: Array.from(e.querySelectorAll("*"))
              .filter(
                (c) =>
                  c.getBoundingClientRect().right >
                  e.getBoundingClientRect().right,
              )
              .map((c) => ({
                tag: c.tagName,
                cls: c.className,
                right: c.getBoundingClientRect().right,
              })),
          })),
        ),
      ).toBe(true);
      await name.click();
      await name.press("End");
      await name.press("Escape");
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: "Room members and controls",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
        true,
      );
      await dialog
        .getByText("Participant with a long display name 23", { exact: true })
        .scrollIntoViewIfNeeded();
      const last = await dialog
        .getByText("Participant with a long display name 23", { exact: true })
        .boundingBox();
      expect(last!.y).toBeGreaterThan(bounds!.y);
      expect(last!.y + last!.height).toBeLessThanOrEqual(
        bounds!.y + bounds!.height,
      );
      await dialog.getByRole("button", { name: "Close permissions" }).click();
      await expect(trigger).toBeFocused();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    },
  );
