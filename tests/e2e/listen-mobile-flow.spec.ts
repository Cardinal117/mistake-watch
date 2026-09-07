import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Listen navigation retains the player and paused compact bar",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await expect(page.locator("audio")).toHaveCount(1);
    await page
      .locator("audio")
      .evaluate((el) => el.setAttribute("data-original", "yes"));
    const nav = page.getByRole("navigation", { name: "Listen room" });
    await nav.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Expand player", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await expect(
      page.getByRole("slider", { name: "Listen progress" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    await expect(
      nav.getByRole("button", { name: "Queue", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("audio")).toHaveAttribute("data-original", "yes");
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page.evaluate(() => window.watchQA!.setSource("", "direct"));
    await expect(page.locator(".listen-mobile-player")).toBeHidden();
  },
);

for (const size of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  qa(`Listen controls and compact bar fit ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page
      .getByRole("slider", { name: "Listen progress" })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("slider", { name: "Volume", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/listen-expanded-${size.width}.png`,
    });
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    await page.locator(".listen-mobile-player").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    await page.screenshot({
      path: `test-results/listen-compact-${size.width}.png`,
    });
    const bar = (await page.locator(".listen-mobile-player").boundingBox())!;
    const nav = (await page
      .getByRole("navigation", { name: "Listen room" })
      .boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(nav.y + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Minimize player", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Expand player", exact: true }),
    ).toBeFocused();
  });
}
qa(
  "Listen drag settles, cancels and preserves browse scroll",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    const workspace = page.locator(".listen-mobile-discovery");
    await workspace.evaluate((el) => (el.scrollTop = 80));
    const before = await workspace.evaluate((el) => el.scrollTop);
    const expand = page.getByRole("button", {
      name: "Expand player",
      exact: true,
    });
    await page.locator(".listen-mobile-player").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    const box = (await expand.boundingBox())!;
    await page.mouse.move(box.x + 80, box.y + 25);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y - 90, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    const collapse = page.getByRole("button", {
      name: "Minimize player",
      exact: true,
    });
    await page.locator(".listen-mobile-player").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    const top = (await collapse.boundingBox())!;
    await page.mouse.move(top.x + 80, top.y + 20);
    await page.mouse.down();
    await page.mouse.move(top.x + 80, top.y + 40);
    await page.mouse.up();
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await collapse.click();
    expect(await workspace.evaluate((el) => el.scrollTop)).toBe(before);
  },
);
qa(
  "Listen destination changes do not remount audio; controls respect permission",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .locator("audio")
      .evaluate((el) => el.setAttribute("data-original", "yes"));
    const nav = page.getByRole("navigation", { name: "Listen room" });
    for (const name of ["Add", "Social", "More", "Queue", "Home"]) {
      await nav.getByRole("button", { name, exact: true }).click();
      await expect(page.locator("audio")).toHaveAttribute(
        "data-original",
        "yes",
      );
    }
    await nav.getByRole("button", { name: "Queue", exact: true }).click();
    await page.evaluate(() => window.watchQA!.setPlaybackPermission(false));
    await expect(
      page
        .locator(".listen-mobile-player-top")
        .getByRole("button", { name: "Play", exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  },
);

qa(
  "Listen cancellation, reduced motion and child dialog Escape are independent",
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Expand player",
      exact: true,
    });
    const box = (await handle.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 90, y: box.y + 24, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: box.x + 90, y: box.y - 90, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    await handle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    expect(
      await page
        .locator(".listen-mobile-player")
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
    ).toBeLessThan(0.001);
    await page.getByRole("navigation", { name: "Listen room" }).getByRole("button", { name: "More", exact: true }).click();
    await page.locator(".room-settings-leave").getByRole("button", { name: "Leave room", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "false",
    );
  },
);
qa(
  "Listen queue keeps bounded rows, Play next and dismissible actions",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("navigation", { name: "Listen room" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await page.evaluate(() => window.watchQA!.setQueueCount(1000));
    await expect(page.locator('[data-queue-id="queue-1"]')).toBeVisible();
    expect(await page.locator("[data-queue-id]").count()).toBeLessThan(35);
    const more = page.getByLabel("More actions for The Long Way Home", {
      exact: true,
    });
    await more.click();
    await expect(more.locator("..")).toHaveAttribute("open", "");
    await page.getByRole("heading", { name: "Queue", exact: true }).click();
    await expect(more.locator("..")).not.toHaveAttribute("open", "");
  },
);
qa("Desktop Listen keeps its rail and existing TV action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/listen-design");
  await expect(
    page.getByRole("button", { name: "TV Mode", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".listen-mobile-shell")).toHaveCount(0);
  await expect(page.locator("audio")).toHaveCount(1);
  await page.screenshot({ path: "test-results/listen-desktop.png" });
});

qa(
  "Listen breakpoint changes preserve the same audio instance",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .locator("audio")
      .evaluate((el) => el.setAttribute("data-original", "yes"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
      page.getByRole("button", { name: "TV Mode", exact: true }),
    ).toBeVisible();
    await expect(page.locator("audio")).toHaveAttribute("data-original", "yes");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("audio")).toHaveAttribute("data-original", "yes");
  },
);

qa(
  "Mobile Discover cards keep readable titles and full-size touch actions",
  async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    const card = page.locator(".listen-discovery-card").first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Show actions for/ }).click();
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    for (const action of await card
      .locator(":scope > div:last-child button")
      .all()) {
      const rect = (await action.boundingBox())!;
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: "test-results/listen-discover-320.png" });
  },
);

qa(
  "Listen local transport plays, pauses and seeks without replacing audio",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    const audio = page.locator("audio");
    await expect
      .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).readyState))
      .toBeGreaterThanOrEqual(2);
    await audio.evaluate((el) => el.setAttribute("data-original", "yes"));
    await page
      .getByRole("navigation", { name: "Listen room" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await page
      .locator(".listen-mobile-player-top")
      .getByRole("button", { name: "Play", exact: true })
      .click();
    await expect(audio).toHaveJSProperty("paused", false);
    await page
      .locator(".listen-mobile-player-top")
      .getByRole("button", { name: "Pause", exact: true })
      .click();
    await expect(audio).toHaveJSProperty("paused", true);
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    await page
      .getByRole("slider", { name: "Listen progress" })
      .press("ArrowRight");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter((c) => c.action === "playback").length,
        ),
      )
      .toBe(3);
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await expect(audio).toHaveAttribute("data-original", "yes");
  },
);
