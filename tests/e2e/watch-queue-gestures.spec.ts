import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Watch back arrow confirms before leaving and restores focus on No",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    const leave = page.getByRole("button", { name: "Leave room", exact: true });
    await leave.click();
    const dialog = page.getByRole("dialog", { name: "Leave this room?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "No, stay here" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(leave).toBeFocused();
    await expect(page).toHaveURL(/watch-design/);
    await leave.click();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  },
);
qa(
  "Compact Watch queue exposes play-next and swipe confirmation without accidental playback",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    const row = page.getByRole("listitem").filter({
      has: page.getByRole("button", {
        name: "Play The Long Way Home now",
        exact: true,
      }),
    });
    await expect(row).toBeVisible();
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(88);
    await row
      .getByRole("button", { name: "Play The Long Way Home next", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.filter((c) => c.action === "priority"),
        ),
      )
      .toEqual([
        {
          action: "priority",
          input: { id: "queue-1", priority: { isPlayNext: true } },
        },
      ]);
    const swipe = async () => {
      const b = (await row.boundingBox())!;
      await page.mouse.move(b.x + b.width - 90, b.y + 25);
      await page.mouse.down();
      await page.mouse.move(b.x + 50, b.y + 25, { steps: 12 });
      await page.mouse.up();
    };
    await swipe();
    await expect(
      row.getByRole("button", {
        name: "Remove The Long Way Home",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter(
          (c) => c.action === "remove" || c.action === "playQueue",
        ),
      ),
    ).toEqual([]);
    await swipe();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.filter((c) => c.action === "remove"),
        ),
      )
      .toEqual([{ action: "remove", input: "queue-1" }]);
  },
);
qa(
  "Queue dragging moves once on drop; revoked permission cancels a gesture",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Drag Building Other Worlds to reorder",
    });
    const first = page.getByRole("button", {
      name: "Drag The Long Way Home to reorder",
    });
    const b = (await handle.boundingBox())!,
      top = (await first.boundingBox())!;
    await page.mouse.move(b.x + 14, b.y + 22);
    await page.mouse.down();
    await page.mouse.move(top.x + 14, top.y + 22, { steps: 15 });
    await page.waitForTimeout(100);
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter((c) => c.action === "move"),
      ),
    ).toEqual([]);
    await page.mouse.up();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.filter((c) => c.action === "move"),
        ),
      )
      .toEqual([{ action: "move", input: { id: "queue-3", position: 0 } }]);
    const handle2 = (await first.boundingBox())!;
    await page.mouse.move(handle2.x + 14, handle2.y + 22);
    await page.mouse.down();
    await page.mouse.move(handle2.x + 14, handle2.y + 100, { steps: 10 });
    await page.evaluate(() => window.watchQA!.setPermission(false));
    await page.mouse.up();
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter((c) => c.action === "move"),
      ),
    ).toHaveLength(1);
    await expect(first).toBeDisabled();
  },
);
